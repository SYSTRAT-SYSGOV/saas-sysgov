<?php

declare(strict_types=1);

namespace Modules\Protocolo\Services;

use App\Models\User;
use App\Support\OrgScope;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Protocolo\Models\Andamento;
use Modules\Protocolo\Models\Processo;

final class DashboardService
{
    public function __construct(
        private readonly OrgScope $orgScope,
        private readonly TramitacaoService $tramitacaoService,
    ) {}

    /**
     * Gera os dados e indicadores consolidados do dashboard gerencial do Protocolo.
     *
     * @param array{data_inicio?: ?string, data_fim?: ?string} $filtros
     * @return array<string, mixed>
     */
    public function obterDados(User $user, array $filtros = []): array
    {
        $tenantId = app(TenantContext::class)->id();
        $unitIds = $this->orgScope->unitIdsFor($user);

        // 1. Query base de processos com escopo e período
        $processosQuery = Processo::query()->where('tenant_id', $tenantId);

        if ($unitIds !== null) {
            $processosQuery->whereIn('orgao_atual_id', $unitIds);
        }

        if (!empty($filtros['data_inicio'])) {
            $processosQuery->whereDate('data_abertura', '>=', $filtros['data_inicio']);
        }

        if (!empty($filtros['data_fim'])) {
            $processosQuery->whereDate('data_abertura', '<=', $filtros['data_fim']);
        }

        $processos = $processosQuery->with(['orgaoAtual'])->get();

        // 2. Contagens por status
        $statusCounts = [
            'aberto' => 0,
            'em_tramitacao' => 0,
            'aguardando' => 0,
            'concluido' => 0,
            'arquivado' => 0,
        ];

        foreach ($processos as $proc) {
            if (isset($statusCounts[$proc->status])) {
                $statusCounts[$proc->status]++;
            }
        }

        // 3. Contagens por origem
        $origemCounts = [
            'interna' => 0,
            'externa' => 0,
        ];

        foreach ($processos as $proc) {
            if (isset($origemCounts[$proc->origem])) {
                $origemCounts[$proc->origem]++;
            }
        }

        // 4. Distribuição por órgão atual
        $porOrgao = [];
        $gruposOrgao = $processos->groupBy('orgao_atual_id');

        foreach ($gruposOrgao as $orgaoId => $lista) {
            if ($orgaoId === null || $orgaoId === '') {
                continue;
            }
            $primeiro = $lista->first();
            $porOrgao[] = [
                'orgao_id' => (int) $orgaoId,
                'orgao_nome' => $primeiro?->orgaoAtual?->name ?? "Órgão #{$orgaoId}",
                'orgao_sigla' => $primeiro?->orgaoAtual?->code ?? '',
                'total' => $lista->count(),
            ];
        }

        usort($porOrgao, fn (array $a, array $b): int => $b['total'] <=> $a['total']);

        // 5. Tempo médio de tramitação de processos concluídos no período
        $processosConcluidos = $processos->filter(
            fn (Processo $p): bool => $p->status === 'concluido' && $p->data_conclusao !== null && $p->data_abertura !== null
        );

        $tempoMedioTramitacaoSegundos = null;
        $tempoMedioTramitacaoDias = null;

        if ($processosConcluidos->isNotEmpty()) {
            $totalSegundos = 0;
            foreach ($processosConcluidos as $p) {
                $totalSegundos += abs((int) $p->data_conclusao->diffInSeconds($p->data_abertura));
            }
            $mediaSegundos = (int) round($totalSegundos / $processosConcluidos->count());
            $tempoMedioTramitacaoSegundos = $mediaSegundos;
            $tempoMedioTramitacaoDias = round($mediaSegundos / 86400, 1);
        }

        // 6. Tempo médio de permanência por órgão (andamentos encerrados)
        $andamentosEncerradosQuery = Andamento::query()
            ->where('tenant_id', $tenantId)
            ->whereNotNull('data_recebimento')
            ->whereNotNull('data_envio')
            ->with(['orgaoDestino']);

        if ($unitIds !== null) {
            $andamentosEncerradosQuery->whereIn('orgao_destino_id', $unitIds);
        }

        if (!empty($filtros['data_inicio'])) {
            $andamentosEncerradosQuery->whereDate('created_at', '>=', $filtros['data_inicio']);
        }

        if (!empty($filtros['data_fim'])) {
            $andamentosEncerradosQuery->whereDate('created_at', '<=', $filtros['data_fim']);
        }

        $andamentosEncerrados = $andamentosEncerradosQuery->get();
        $gruposPermanencia = $andamentosEncerrados->groupBy('orgao_destino_id');

        $permanenciaPorOrgao = [];
        foreach ($gruposPermanencia as $orgaoDestinoId => $listaAndamentos) {
            if ($orgaoDestinoId === null || $orgaoDestinoId === '') {
                continue;
            }

            $somaSegundos = 0;
            foreach ($listaAndamentos as $and) {
                $somaSegundos += abs((int) $and->data_envio->diffInSeconds($and->data_recebimento));
            }

            $mediaSeg = (int) round($somaSegundos / $listaAndamentos->count());
            $primeiroAnd = $listaAndamentos->first();

            $permanenciaPorOrgao[] = [
                'orgao_id' => (int) $orgaoDestinoId,
                'orgao_nome' => $primeiroAnd?->orgaoDestino?->name ?? "Órgão #{$orgaoDestinoId}",
                'orgao_sigla' => $primeiroAnd?->orgaoDestino?->code ?? '',
                'tempo_medio_segundos' => $mediaSeg,
                'tempo_medio_dias' => round($mediaSeg / 86400, 1),
                'total_andamentos' => $listaAndamentos->count(),
            ];
        }

        usort($permanenciaPorOrgao, fn (array $a, array $b): int => $b['tempo_medio_segundos'] <=> $a['tempo_medio_segundos']);

        // 7. Prazos excedidos por órgão
        $todosExcedidos = $this->tramitacaoService->prazosExcedidos();

        if ($unitIds !== null) {
            $todosExcedidos = $todosExcedidos->filter(
                fn (array $item): bool => in_array($item['orgao_id'], $unitIds, true)
            );
        }

        $excedidosPorOrgaoGrupo = $todosExcedidos->groupBy('orgao_id');
        $prazosExcedidosPorOrgao = [];

        foreach ($excedidosPorOrgaoGrupo as $orgaoId => $itens) {
            $primeiroItem = $itens->first();
            $prazosExcedidosPorOrgao[] = [
                'orgao_id' => (int) $orgaoId,
                'orgao_nome' => $primeiroItem['orgao_nome'] ?? "Órgão #{$orgaoId}",
                'total_excedidos' => $itens->count(),
            ];
        }

        usort($prazosExcedidosPorOrgao, fn (array $a, array $b): int => $b['total_excedidos'] <=> $a['total_excedidos']);

        return [
            'total_processos' => $processos->count(),
            'por_status' => $statusCounts,
            'por_origem' => $origemCounts,
            'por_orgao' => $porOrgao,
            'tempo_medio_tramitacao_segundos' => $tempoMedioTramitacaoSegundos,
            'tempo_medio_tramitacao_dias' => $tempoMedioTramitacaoDias,
            'tempo_permanencia_por_orgao' => $permanenciaPorOrgao,
            'total_prazos_excedidos' => $todosExcedidos->count(),
            'prazos_excedidos_por_orgao' => $prazosExcedidosPorOrgao,
        ];
    }
}
