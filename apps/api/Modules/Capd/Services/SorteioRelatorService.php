<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use Carbon\Carbon;
use Modules\Capd\Models\ComissaoMembro;
use Modules\Capd\Models\Impedimento;
use Modules\Capd\Models\Recurso;

/**
 * Serviço de Sorteio Aleatório Criptográfico de Relator de Recursos (RN-C05).
 *
 * Utiliza random_int() (CSPRNG) para garantir impessoalidade e auditabilidade.
 * Exclui automaticamente membros impedidos ou suspeitos (RN-C03 / TC-03).
 * Estabelece o prazo regulamentar de 5 dias úteis para emissão do parecer.
 */
final class SorteioRelatorService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Sorteia um relator para o recurso entre os membros titulares ativos e aptos.
     *
     * @throws \DomainException Se não houver membros aptos (todos impedidos ou sem quórum)
     */
    public function sortear(Recurso $recurso): ComissaoMembro
    {
        $tenantId = (int) app(TenantContext::class)->id();

        // Identifica comissão vinculada ao ciclo da avaliação
        $avaliacao = $recurso->avaliacao()->with('ciclo.comissao.membros')->firstOrFail();
        $comissao  = $avaliacao->ciclo->comissao;

        if (! $comissao || ! $comissao->ativa) {
            throw new \DomainException('Não há comissão CAPD ativa configurada para este ciclo de avaliação.');
        }

        // Membros impedidos para este servidor recorrente
        $membrosImpedidosIds = Impedimento::query()
            ->where('servidor_alvo_id', $recurso->recorrente_id)
            ->pluck('comissao_membro_id')
            ->toArray();

        // Candidatos elegíveis: membros ativos da comissão, não impedidos e que não sejam o próprio recorrente
        $candidatos = $comissao->membros()
            ->where('ativo', true)
            ->where('servidor_id', '!=', $recurso->recorrente_id)
            ->whereNotIn('id', $membrosImpedidosIds)
            ->get();

        if ($candidatos->isEmpty()) {
            throw new \DomainException(
                'Não há membros da comissão aptos e desimpedidos para relatar este recurso.'
            );
        }

        // Sorteio criptograficamente seguro via random_int (CSPRNG)
        $indiceSorteado = random_int(0, $candidatos->count() - 1);
        $relator        = $candidatos[$indiceSorteado];

        // Prazo legal de 5 dias úteis (RN-C05)
        $prazo = $this->calcularDiasUteis(Carbon::now(), 5);

        $recurso->update([
            'relator_id'        => $relator->id,
            'prazo_relator_ate' => $prazo,
            'status'            => 'em_instrucao',
        ]);

        $this->audit->record(
            'capd',
            'recurso.relator_sorteado',
            "Recurso #{$recurso->id} → Relator sorteado: Membro #{$relator->id} (Servidor #{$relator->servidor_id})",
            null,
            [
                'recurso_id'       => $recurso->id,
                'relator_id'       => $relator->id,
                'prazo_limite'     => $prazo->toIso8601String(),
                'candidatos_total' => $candidatos->count(),
            ],
        );

        return $relator;
    }

    /**
     * Adiciona N dias úteis ignorando fins de semana (sábado e domingo).
     */
    private function calcularDiasUteis(Carbon $dataInicial, int $dias): Carbon
    {
        $data = $dataInicial->copy();
        $adicionados = 0;

        while ($adicionados < $dias) {
            $data->addDay();
            if (! $data->isWeekend()) {
                $adicionados++;
            }
        }

        return $data->endOfDay();
    }
}
