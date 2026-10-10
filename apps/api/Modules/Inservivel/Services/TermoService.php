<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use App\Support\TenantContext;
use Barryvdh\DomPDF\Facade\Pdf;
use DomainException;
use Illuminate\Support\Facades\View;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Models\Sorteio;
use Modules\Inservivel\Models\Transferencia;
use Modules\Inservivel\Support\Documento;

/**
 * Relatório do sorteio e termos em PDF (D9; spec: Termos do lote). Os dados do doador, a legislação e a cidade vêm
 * das configurações da prefeitura e o nome do órgão vem do tenant: nada fixo de um município.
 */
final class TermoService
{
    /** Termos do lote disponíveis a partir de Sorteado. */
    public const TERMOS_LOTE = ['conferencia' => 'Termo de conferência', 'entrega' => 'Termo de entrega', 'doacao' => 'Termo de doação com encargo'];

    public function __construct(
        private readonly ConfiguracaoService $configuracao,
        private readonly TenantContext $tenant,
    ) {}

    public function relatorioSorteio(Lote $lote, Sorteio $sorteio): string
    {
        return $this->pdf($this->htmlRelatorioSorteio($lote, $sorteio));
    }

    public function htmlRelatorioSorteio(Lote $lote, Sorteio $sorteio): string
    {
        return View::make('inservivel::pdf.relatorio-sorteio', [
            ...$this->contexto(),
            ...$this->dadosLote($lote),
            'vencedora' => $this->dadosEntidade($sorteio->vencedora),
            'sorteio' => [
                'data' => $sorteio->data_sorteio->format('d/m/Y H:i:s'),
                'regra' => $sorteio->regra,
                'semente' => $sorteio->semente,
                'hash' => $sorteio->hash,
                'participantes' => array_map(fn (array $p): array => [...$p, 'cnpj' => Documento::formatarCnpj((string) $p['cnpj'])], $sorteio->participantes),
                'empatadas' => $sorteio->empatadas ?? [],
            ],
        ])->render();
    }

    public function termoLote(Lote $lote, string $tipo): string
    {
        return $this->pdf($this->htmlTermoLote($lote, $tipo));
    }

    public function htmlTermoLote(Lote $lote, string $tipo): string
    {
        if (!isset(self::TERMOS_LOTE[$tipo])) {
            throw new DomainException('Termo desconhecido.');
        }
        $sorteio = $lote->sorteio()->with('vencedora')->first();
        if (!$lote->status->sorteado() || $sorteio === null) {
            throw new DomainException('Os termos só ficam disponíveis depois do sorteio do lote.');
        }

        return View::make("inservivel::pdf.termo-{$tipo}", [
            ...$this->contexto(),
            ...$this->dadosLote($lote),
            'entidade' => $this->dadosEntidade($sorteio->vencedora),
            'data_sorteio' => $sorteio->data_sorteio->format('d/m/Y H:i'),
        ])->render();
    }

    public function termoTransferencia(Transferencia $transferencia): string
    {
        return $this->pdf($this->htmlTermoTransferencia($transferencia));
    }

    public function htmlTermoTransferencia(Transferencia $transferencia): string
    {
        $transferencia->loadMissing(['bem.estadoConservacao', 'bem.categoria', 'origem', 'destino', 'anunciante', 'solicitante', 'aprovador']);

        return View::make('inservivel::pdf.termo-transferencia', [
            ...$this->contexto(),
            'bem' => $this->dadosBem($transferencia->bem),
            'origem' => $transferencia->origem->name,
            'destino' => $transferencia->destino?->name,
            'anunciante' => $transferencia->anunciante?->name,
            'solicitante' => $transferencia->solicitante?->name,
            'aprovador' => $transferencia->aprovador?->name,
            'data_conclusao' => $transferencia->data_conclusao?->format('d/m/Y H:i'),
            'numero' => $transferencia->id,
        ])->render();
    }

    private function pdf(string $html): string
    {
        return Pdf::loadHTML($html)->setPaper('a4')
            ->setOption(['isFontSubsettingEnabled' => true, 'defaultFont' => 'DejaVu Sans', 'isRemoteEnabled' => false])
            ->output();
    }

    /** @return array<string, mixed> */
    private function contexto(): array
    {
        $c = $this->configuracao->vigente();
        $orgao = (string) $this->tenant->get()->getAttribute('name');
        $cidade = trim((string) $c->doador_cidade);
        $sede = $cidade === '' ? null : ($c->doador_uf ? "{$cidade}/{$c->doador_uf}" : $cidade);
        $cnpj = $c->doador_cnpj ? Documento::formatarCnpj($c->doador_cnpj) : null;
        $representante = $c->responsavel_nome
            ? 'por ' . $c->responsavel_nome . ($c->responsavel_cargo ? ", {$c->responsavel_cargo}" : '')
            : 'por seu representante legal';
        $qualificacao = 'pessoa jurídica de direito público interno'
            . ($cnpj !== null ? ", inscrita no CNPJ sob nº {$cnpj}" : '')
            . ($sede !== null ? ", com sede em {$sede}" : '')
            . ", neste ato representada {$representante}, nos termos da legislação vigente";

        return [
            'orgao' => $orgao,
            'doador' => [
                'sede' => $sede,
                'qualificacao' => $qualificacao,
                'nome' => $c->doador_nome ?: $orgao,
                'cnpj' => $c->doador_cnpj ? Documento::formatarCnpj($c->doador_cnpj) : null,
                'cidade' => $cidade !== '' ? $cidade : null,
                'uf' => $c->doador_uf,
                'foro' => $c->foro ?: ($cidade !== '' ? $cidade : null),
                'responsavel_nome' => $c->responsavel_nome,
                'responsavel_cargo' => $c->responsavel_cargo,
            ],
            'legislacao' => $c->legislacao ?? [],
            'data_extenso' => now()->locale('pt_BR')->translatedFormat('d \d\e F \d\e Y'),
            'emitido_em' => now()->format('d/m/Y H:i'),
        ];
    }

    /** @return array<string, mixed> */
    private function dadosLote(Lote $lote): array
    {
        $lote->loadMissing(['bens.estadoConservacao', 'bens.categoria']);
        $bens = $lote->bens->sortBy('numero_patrimonial')->values()->map(fn (Bem $b): array => $this->dadosBem($b))->all();
        $total = array_sum(array_column($bens, 'valor_cents'));

        return [
            'lote' => ['numero' => $lote->numero, 'descricao' => $lote->getAttribute('descricao'), 'responsavel' => $lote->getAttribute('responsavel'), 'status' => $lote->status->rotulo()],
            'bens' => $bens,
            'total' => self::reais($total),
        ];
    }

    /** @return array<string, mixed> */
    private function dadosBem(Bem $b): array
    {
        return [
            'numero_patrimonial' => $b->numero_patrimonial,
            'descricao' => $b->getAttribute('descricao'),
            'marca' => $b->getAttribute('marca'),
            'modelo' => $b->getAttribute('modelo'),
            'categoria' => $b->categoria?->getAttribute('nome'),
            'estado' => $b->estadoConservacao?->getAttribute('nome'),
            'valor_cents' => $b->valorReferenciaCents(),
            'valor' => self::reais($b->valorReferenciaCents()),
        ];
    }

    /** @return array<string, mixed> */
    private function dadosEntidade(Entidade $e): array
    {
        $cpf = Documento::digitos($e->cpf_representante);

        return [
            'id' => $e->id,
            'razao_social' => $e->razao_social,
            'nome_fantasia' => $e->nome_fantasia,
            'cnpj' => Documento::formatarCnpj($e->cnpj),
            'endereco' => $e->getAttribute('endereco'),
            'cidade' => $e->getAttribute('cidade'),
            'uf' => $e->getAttribute('uf'),
            'telefone' => $e->getAttribute('telefone') ?: $e->getAttribute('celular'),
            'email' => $e->email,
            'representante' => $e->getAttribute('representante_legal'),
            'cargo' => $e->getAttribute('cargo_representante'),
            'cpf' => strlen($cpf) === 11 ? substr($cpf, 0, 3) . '.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-' . substr($cpf, 9, 2) : $cpf,
            'lotes_ganhos' => $e->lotes_ganhos,
        ];
    }

    public static function reais(int $cents): string
    {
        return 'R$ ' . number_format($cents / 100, 2, ',', '.');
    }
}
