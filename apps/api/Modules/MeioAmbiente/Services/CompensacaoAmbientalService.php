<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Services;

use Modules\MeioAmbiente\Models\CompensacaoAmbiental;
use Modules\MeioAmbiente\Models\DestinacaoCompensacao;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\PagamentoCompensacao;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Support\RegraNegocioException;

/**
 * Cálculo, cobrança e destinação da compensação ambiental devida por empreendimentos
 * de impacto significativo — ver spec `meio-ambiente/compensacao-ambiental`.
 */
final readonly class CompensacaoAmbientalService
{
    public function calcularCompensacaoDevida(Empreendimento $empreendimento): int
    {
        $valorEmpreendimento = $empreendimento->valor_empreendimento_centavos ?? 0;

        return (int) round($valorEmpreendimento * CompensacaoAmbiental::PERCENTUAL_PADRAO / 100);
    }

    /**
     * Chamado por `ProcessoLicenciamentoService::deferir()` — cria a compensação ambiental
     * devida quando o empreendimento é de impacto significativo, idempotente por
     * `processo_licenciamento_id`. Empreendimento sem impacto significativo não gera
     * compensação (retorna `null`).
     */
    public function criarSeNecessario(ProcessoLicenciamento $processo): ?CompensacaoAmbiental
    {
        $empreendimento = $processo->empreendimento;

        if (! $empreendimento->impacto_significativo) {
            return null;
        }

        $existente = CompensacaoAmbiental::where('processo_licenciamento_id', $processo->id)->first();
        if ($existente !== null) {
            return $existente;
        }

        return CompensacaoAmbiental::create([
            'empreendimento_id' => $empreendimento->id,
            'processo_licenciamento_id' => $processo->id,
            'percentual' => CompensacaoAmbiental::PERCENTUAL_PADRAO,
            'valor_devido_centavos' => $this->calcularCompensacaoDevida($empreendimento),
        ]);
    }

    /** @param array{valor_centavos: int, pago_em?: string, comprovante?: string|null} $dados */
    public function registrarPagamento(CompensacaoAmbiental $compensacao, array $dados): PagamentoCompensacao
    {
        return PagamentoCompensacao::create([
            'compensacao_ambiental_id' => $compensacao->id,
            'valor_centavos' => $dados['valor_centavos'],
            'pago_em' => $dados['pago_em'] ?? now(),
            'comprovante' => $dados['comprovante'] ?? null,
        ]);
    }

    /** @param array{destino: string, valor_centavos: int} $dados */
    public function registrarDestinacao(CompensacaoAmbiental $compensacao, array $dados): DestinacaoCompensacao
    {
        $disponivel = $compensacao->valorPagoCentavos() - $compensacao->valorDestinadoCentavos();

        if ($dados['valor_centavos'] > $disponivel) {
            throw new RegraNegocioException(
                'destinacao_excede_valor_pago',
                'Destinação não pode exceder o valor pago.',
            );
        }

        return DestinacaoCompensacao::create([
            'compensacao_ambiental_id' => $compensacao->id,
            'destino' => $dados['destino'],
            'valor_centavos' => $dados['valor_centavos'],
            'registrada_em' => now(),
        ]);
    }

    /**
     * Usado por `ProcessoLicenciamentoService::deferir()` para bloquear a Licença de
     * Operação enquanto houver compensação ambiental com saldo pendente (ver spec,
     * cenário "Licença de operação bloqueada por saldo pendente"). Parcelamento da
     * compensação não foi implementado nesta fase — ver nota em tasks.md.
     */
    public function empreendimentoTemSaldoPendente(Empreendimento $empreendimento): bool
    {
        return $empreendimento->compensacoesAmbientais()
            ->get()
            ->some(fn (CompensacaoAmbiental $compensacao): bool => $compensacao->saldoDevedorCentavos() > 0);
    }
}
