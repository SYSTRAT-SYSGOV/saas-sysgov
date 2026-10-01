<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Modules\Requerimentos\Events\ProposicaoCriada;
use Modules\Requerimentos\Models\Contador;
use Modules\Requerimentos\Models\Proposicao;
use Modules\Requerimentos\Models\TipoInstrumento;

final class ProposicaoService
{
    /**
     * Cria uma nova proposição com numeração sequencial atômica.
     *
     * @param array<string, mixed> $dados
     * @throws \DomainException
     */
    public function criar(array $dados, User $autor): Proposicao
    {
        $tipoInstrumento = TipoInstrumento::where('slug', $dados['tipo_slug'])
            ->ativo()
            ->first();

        if (! $tipoInstrumento) {
            throw new \DomainException('Tipo de instrumento não parametrizado ou inativo.');
        }

        $exercicio = $dados['exercicio'] ?? (int) date('Y');

        $proposicao = DB::transaction(function () use ($dados, $tipoInstrumento, $exercicio, $autor) {
            // Contador e Proposicao são TenantAware: tenant_id vem sempre do TenantContext da
            // requisição (middleware 'resolve.tenant'), nunca de um campo vindo do cliente —
            // aceitar um 'tenant_id' do corpo da requisição seria uma falha de isolamento entre
            // tenants (a pessoa poderia protocolar proposição em nome de outro órgão).
            $contador = Contador::where('tipo_slug', $tipoInstrumento->slug)
                ->where('exercicio', $exercicio)
                ->lockForUpdate()
                ->first();

            if (! $contador) {
                $contador = Contador::create([
                    'tipo_slug'     => $tipoInstrumento->slug,
                    'exercicio'     => $exercicio,
                    'ultimo_numero' => 0,
                ]);
            }

            $contador->increment('ultimo_numero');
            $numeroSequencial = $contador->ultimo_numero;

            $numero = sprintf('%s/%d/%d', $tipoInstrumento->slug, $numeroSequencial, $exercicio);

            $proposicao = Proposicao::create([
                'tipo_instrumento_id'        => $tipoInstrumento->id,
                'numero'                     => $numero,
                'numero_sequencial'          => $numeroSequencial,
                'exercicio'                  => $exercicio,
                'ementa'                     => $dados['ementa'],
                'justificativa'              => $dados['justificativa'] ?? null,
                'conteudo'                   => $dados['conteudo'] ?? null,
                'area_tematica'              => $dados['area_tematica'] ?? null,
                'dispositivos_legais'        => $dados['dispositivos_legais'] ?? null,
                'poder_origem'               => $dados['poder_origem'] ?? $tipoInstrumento->poder_origem,
                'autor_principal_id'         => $autor->id,
                'partido_bancada'            => $dados['partido_bancada'] ?? null,
                'status'                     => Proposicao::STATUS_PROTOCOLADO,
                'visibilidade_publica'       => $dados['visibilidade_publica'] ?? true,
                'vinculacao_proposicao_id'   => $dados['vinculacao_proposicao_id'] ?? null,
                'vinculacao_processo_id'     => $dados['vinculacao_processo_id'] ?? null,
                'dados_pessoais'             => $dados['dados_pessoais'] ?? null,
                'metadata'                   => $dados['metadata'] ?? null,
            ]);

            // Adiciona coautores se informados
            if (! empty($dados['coautores'])) {
                foreach ($dados['coautores'] as $i => $coautor) {
                    $proposicao->autores()->create([
                        'tenant_id'  => $proposicao->tenant_id,
                        'user_id'    => $coautor['user_id'],
                        'tipo_autor' => $coautor['tipo_autor'] ?? 'vereador',
                        'ordem'      => $i + 1,
                    ]);
                }
            }

            return $proposicao;
        });

        event(new ProposicaoCriada($proposicao));

        return $proposicao;
    }

    /**
     * Vincula uma proposição a outra.
     */
    public function vincular(Proposicao $origem, Proposicao $destino, string $tipoVinculacao, ?string $observacao = null): void
    {
        \Modules\Requerimentos\Models\Vinculacao::create([
            'tenant_id'             => $origem->tenant_id,
            'proposicao_origem_id'  => $origem->id,
            'proposicao_destino_id' => $destino->id,
            'tipo_vinculacao'       => $tipoVinculacao,
            'observacao'            => $observacao,
        ]);
    }

    /**
     * Altera o status da proposição.
     */
    public function alterarStatus(Proposicao $proposicao, string $novoStatus): void
    {
        $statusAnterior = $proposicao->status;
        $proposicao->update(['status' => $novoStatus]);

        event(new \Modules\Requerimentos\Events\ProposicaoStatusChanged($proposicao, $statusAnterior, $novoStatus));
    }
}