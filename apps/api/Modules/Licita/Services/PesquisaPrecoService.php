<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Licita\Enums\StatusPesquisaPreco;
use Modules\Licita\Models\PesquisaPreco;
use Modules\Licita\Models\Processo;

final class PesquisaPrecoService
{
    private const CAMPOS_DIFF = [
        'equipe_planejamento',
        'itens',
        'metodo_referencia',
        'justificativa_metodo',
        'campos_extras',
    ];

    /** RN-006 (IN SEGES/ME nº 65/2021, art. 5º-6º): mínimo de fontes de cotação por item exigido para a aprovação final do processo. */
    private const MINIMO_COTACOES_POR_ITEM = 3;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenantContext,
        private readonly CampoConfiguracaoService $camposConfiguracao,
    ) {}

    /**
     * @param array<string, mixed> $data
     */
    public function criar(Processo $processo, array $data, User $user): PesquisaPreco
    {
        if (!$this->tenantContext->hasTenant()) {
            throw new DomainException('RN-001: tenant não identificado para criação da Pesquisa de Preços.');
        }

        // RN-002: a Pesquisa de Preços só existe depois de haver um Mapa de
        // Riscos (não precisa mais estar aprovado — ver comentário
        // equivalente em EtpService::criar).
        $mapaRisco = $processo->mapaRisco;
        if ($mapaRisco === null) {
            throw new DomainException('Cadastre o Mapa de Riscos deste processo antes de iniciar a Pesquisa de Preços.');
        }

        if ($processo->pesquisaPreco()->exists()) {
            throw new DomainException('Este processo já possui uma Pesquisa de Preços. Edite a existente em vez de criar outra.');
        }

        $this->camposConfiguracao->validarRespostas('pesquisa_precos', $data['campos_extras'] ?? []);

        // Equipe de planejamento nasce como cópia da equipe já cadastrada no
        // Mapa de Riscos do mesmo processo (mesmo raciocínio do Mapa de
        // Riscos em relação ao ETP) — editável independentemente dali em
        // diante.
        if (!array_key_exists('equipe_planejamento', $data) || $data['equipe_planejamento'] === null) {
            $data['equipe_planejamento'] = $mapaRisco->equipe_planejamento;
        }

        // Itens nascem como cópia dos itens do DFD do processo (só
        // codigo/descricao/unidade_medida/quantidade — o valor_unitario do
        // DFD é só uma estimativa inicial, a Pesquisa de Preços é quem
        // apura o valor de referência de verdade a partir das cotações),
        // cada um começando sem cotações.
        if (!array_key_exists('itens', $data) || $data['itens'] === null) {
            $itensDfd = $processo->dfd->itens ?? [];
            $data['itens'] = array_map(static fn (array $item): array => [
                'codigo' => $item['codigo'],
                'descricao' => $item['descricao'],
                'unidade_medida' => $item['unidade_medida'],
                'quantidade' => $item['quantidade'],
                'cotacoes' => [],
            ], $itensDfd);
        }

        return DB::transaction(function () use ($processo, $data, $user): PesquisaPreco {
            $pesquisaPreco = PesquisaPreco::create([
                ...$data,
                'processo_id' => $processo->id,
                'status' => StatusPesquisaPreco::Rascunho->value,
                'elaborado_por' => $user->id,
            ]);

            $this->registrarVersao($pesquisaPreco, 'criado', $user);
            $this->audit->record('licita', 'pesquisa_precos.criado', "PesquisaPreco #{$pesquisaPreco->id}", null, $pesquisaPreco->toArray());
            $this->outbox->publish('licita.PesquisaPrecoCriado', ['id' => $pesquisaPreco->id, 'processo_id' => $processo->id]);

            return $pesquisaPreco->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * @param array<string, mixed> $data
     */
    public function atualizar(PesquisaPreco $pesquisaPreco, array $data, User $user): PesquisaPreco
    {
        if ($pesquisaPreco->statusEnum()->is(StatusPesquisaPreco::Aprovado)) {
            throw new DomainException('Pesquisa de Preços aprovada é imutável — a aprovação final do processo já travou este documento.');
        }

        $camposExtras = array_key_exists('campos_extras', $data) ? $data['campos_extras'] : ($pesquisaPreco->campos_extras ?? []);
        $this->camposConfiguracao->validarRespostas('pesquisa_precos', $camposExtras ?? []);

        return DB::transaction(function () use ($pesquisaPreco, $data, $user): PesquisaPreco {
            $antes = $pesquisaPreco->toArray();
            $pesquisaPreco->update(array_intersect_key($data, array_flip(self::CAMPOS_DIFF)));
            $pesquisaPreco->refresh();
            $diff = $this->calcularDiff($antes, $pesquisaPreco->toArray());

            if ($diff !== []) {
                $this->registrarVersao($pesquisaPreco, 'revisado', $user, $diff);
                $this->audit->record('licita', 'pesquisa_precos.revisado', "PesquisaPreco #{$pesquisaPreco->id}", $antes, $pesquisaPreco->toArray());
                $this->outbox->publish('licita.PesquisaPrecoRevisado', ['id' => $pesquisaPreco->id, 'campos' => array_keys($diff)]);
            }

            return $pesquisaPreco->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * RN-006 (IN SEGES/ME nº 65/2021): cada item precisa de no mínimo 3
     * cotações válidas (valor_unitario > 0) para a Pesquisa de Preços poder
     * entrar na aprovação final do processo. Chamado por
     * `AprovacaoFinalService::solicitar()` — não há mais "enviar para
     * revisão" individual.
     */
    public function validarCompletude(PesquisaPreco $pesquisaPreco): void
    {
        $itens = $pesquisaPreco->itens ?? [];
        if ($itens === []) {
            throw new DomainException('A Pesquisa de Preços precisa de ao menos um item com cotações antes de solicitar a aprovação final.');
        }

        foreach ($itens as $index => $item) {
            $cotacoesValidas = array_filter(
                $item['cotacoes'],
                static fn (array $c): bool => (float) $c['valor_unitario'] > 0,
            );

            if (count($cotacoesValidas) < self::MINIMO_COTACOES_POR_ITEM) {
                $descricao = $item['descricao'] !== '' ? $item['descricao'] : ('item ' . ($index + 1));
                throw new DomainException(
                    "RN-006: o item \"{$descricao}\" da Pesquisa de Preços precisa de no mínimo " . self::MINIMO_COTACOES_POR_ITEM . ' cotações válidas antes de solicitar a aprovação final.'
                );
            }
        }
    }

    /**
     * @param array<string, mixed> $antes
     * @param array<string, mixed> $depois
     * @return array<string, array{de: mixed, para: mixed}>
     */
    private function calcularDiff(array $antes, array $depois): array
    {
        $diff = [];

        foreach (self::CAMPOS_DIFF as $campo) {
            $de = $antes[$campo] ?? null;
            $para = $depois[$campo] ?? null;

            if ($de !== $para) {
                $diff[$campo] = ['de' => $de, 'para' => $para];
            }
        }

        return $diff;
    }

    /**
     * @param array<string, mixed> $camposAlterados
     */
    private function registrarVersao(PesquisaPreco $pesquisaPreco, string $acao, User $user, array $camposAlterados = []): void
    {
        $proxima = ((int) $pesquisaPreco->versoes()->max('versao')) + 1;

        $pesquisaPreco->versoes()->create([
            'versao' => $proxima,
            'acao' => $acao,
            'campos_alterados' => $camposAlterados !== [] ? $camposAlterados : null,
            'dados' => $pesquisaPreco->toArray(),
            'user_id' => $user->id,
        ]);
    }
}
