<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Models\User;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Recurso;
use Modules\Capd\Models\Servidor;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Serviço de Inteligência e Painel Gerencial da Comissão CAPD.
 *
 * Provê filtros combináveis com 'E' estrito, agregação de KPIs,
 * visões especializadas por perfil (Comissão, DRH, Gestor) e exportação.
 */
final class PainelGerencialService
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly HierarquiaService $hierarquia,
    ) {}

    /**
     * Consulta principal do painel com filtros combináveis.
     *
     * @param array<string, mixed> $filtros
     */
    public function listarServidoresComFiltros(array $filtros, int $perPage = 25): LengthAwarePaginator
    {
        $query = $this->montarQueryFiltros($filtros);

        return $query->paginate($perPage);
    }

    /**
     * Monta a query Eloquent aplicando todos os filtros solicitados.
     */
    public function montarQueryFiltros(array $filtros): Builder
    {
        $cicloId = $filtros['ciclo_id'] ?? null;
        if (! $cicloId) {
            $cicloAtivo = CicloAvaliacao::query()->ativo()->latest()->first();
            $cicloId = $cicloAtivo?->id;
        }

        $query = Servidor::query()
            ->with([
                'avaliacoes' => function ($q) use ($cicloId): void {
                    if ($cicloId) {
                        $q->where('ciclo_id', (int) $cicloId);
                    }
                    $q->with('recursos');
                },
                'orgUnit:id,name,code,path,type',
                'chefiaImediata:id,name,email',
            ]);

        // 1. Filtro de Secretaria / Órgão com drill-down recursivo pela árvore do OrgChart
        if (! empty($filtros['org_unit_id'])) {
            $unit = OrgUnit::find((int) $filtros['org_unit_id']);
            if ($unit !== null) {
                $descendantIds = OrgUnit::query()
                    ->where('path', 'like', "{$unit->path}%")
                    ->pluck('id')
                    ->all();

                $query->whereIn('org_unit_id', $descendantIds);
            } else {
                $query->where('org_unit_id', (int) $filtros['org_unit_id']);
            }
        } elseif (! empty($filtros['secretaria'])) {
            $query->where('orgao_lotacao', 'like', "%{$filtros['secretaria']}%");
        }

        // 2. Filtro de Cargo e Função / Plano de Carreira
        if (! empty($filtros['cargo'])) {
            $query->where('cargo_efetivo', 'like', "%{$filtros['cargo']}%");
        }

        if (! empty($filtros['plano_carreira'])) {
            $query->where('metadata->plano_carreira', $filtros['plano_carreira']);
        }

        // 3. Filtro por Ciclo / Ano de Competência
        if (! empty($filtros['ano_competencia'])) {
            $query->whereHas('avaliacoes.ciclo', function ($q) use ($filtros): void {
                $q->where('ano_competencia', (int) $filtros['ano_competencia'])
                    ->orWhere('ano_referencia', (int) $filtros['ano_competencia']);
            });
        }

        // 4. Filtro por Status da Avaliação
        if (! empty($filtros['status_avaliacao'])) {
            $status = $filtros['status_avaliacao'];
            $query->whereHas('avaliacoes', function ($q) use ($status, $cicloId): void {
                if ($cicloId) {
                    $q->where('ciclo_id', (int) $cicloId);
                }

                match ($status) {
                    'pendente'   => $q->whereNull('data_conclusao'),
                    'rascunho'   => $q->whereNull('data_conclusao')->whereNotNull('respostas_fatores'),
                    'submetida'  => $q->whereNotNull('data_conclusao')->where('homologada', false),
                    'em_recurso' => $q->whereHas('recursos', fn ($r) => $r->whereIn('status', ['interposto', 'em_instrucao', 'pautado'])),
                    'homologada' => $q->where('homologada', true),
                    default      => null,
                };
            });
        }

        // 5. Filtro por Faixa de Nota
        if (! empty($filtros['faixa_nota'])) {
            $faixa = $filtros['faixa_nota'];
            $query->whereHas('avaliacoes', function ($q) use ($faixa, $cicloId): void {
                if ($cicloId) {
                    $q->where('ciclo_id', (int) $cicloId);
                }
                $q->whereNotNull('data_conclusao');

                match ($faixa) {
                    'abaixo_6'  => $q->where('nota_final', '<', '6.00'),
                    '6_a_7'     => $q->whereBetween('nota_final', ['6.00', '6.99']),
                    '7_a_8_5'   => $q->whereBetween('nota_final', ['7.00', '8.49']),
                    'acima_8_5' => $q->where('nota_final', '>=', '8.50'),
                    'acima_9_5' => $q->where('nota_final', '>=', '9.50'),
                    default     => null,
                };
            });
        }

        if (isset($filtros['nota_min'])) {
            $query->whereHas('avaliacoes', function ($q) use ($filtros, $cicloId): void {
                if ($cicloId) {
                    $q->where('ciclo_id', (int) $cicloId);
                }
                $q->whereNotNull('data_conclusao')
                    ->where('nota_final', '>=', number_format((float) $filtros['nota_min'], 2, '.', ''));
            });
        }

        if (isset($filtros['nota_max'])) {
            $query->whereHas('avaliacoes', function ($q) use ($filtros, $cicloId): void {
                if ($cicloId) {
                    $q->where('ciclo_id', (int) $cicloId);
                }
                $q->whereNotNull('data_conclusao')
                    ->where('nota_final', '<=', number_format((float) $filtros['nota_max'], 2, '.', ''));
            });
        }

        // 6. Filtro por Avaliador (Superior Imediato) e Avaliado
        if (! empty($filtros['avaliador_id'])) {
            $query->where(function ($q) use ($filtros, $cicloId): void {
                $q->where('chefia_imediata_id', (int) $filtros['avaliador_id'])
                    ->orWhereHas('avaliacoes', function ($av) use ($filtros, $cicloId): void {
                        if ($cicloId) {
                            $av->where('ciclo_id', (int) $cicloId);
                        }
                        $av->where('avaliador_id', (int) $filtros['avaliador_id']);
                    });
            });
        }

        if (! empty($filtros['servidor_id'])) {
            $query->where('id', (int) $filtros['servidor_id']);
        }

        if (! empty($filtros['busca'])) {
            $busca = $filtros['busca'];
            $query->where(function ($q) use ($busca): void {
                $q->where('nome_completo', 'like', "%{$busca}%")
                    ->orWhere('matricula', 'like', "%{$busca}%")
                    ->orWhere('cpf', 'like', "%{$busca}%");
            });
        }

        // 7. Filtro por Situação de Prazos (Ciência e Recurso)
        if (! empty($filtros['situacao_prazo'])) {
            $query->whereHas('avaliacoes', function ($q) use ($filtros, $cicloId): void {
                if ($cicloId) {
                    $q->where('ciclo_id', (int) $cicloId);
                }

                if ($filtros['situacao_prazo'] === 'ciencia_pendente') {
                    $q->whereNotNull('data_conclusao')->whereNull('ciencia_servidor_em');
                } elseif ($filtros['situacao_prazo'] === 'recurso_vencido') {
                    $q->whereNotNull('data_conclusao')
                        ->whereHas('ciclo', fn ($c) => $c->where('data_limite_recurso', '<', now()));
                } elseif ($filtros['situacao_prazo'] === 'vencendo_7_dias') {
                    $q->whereHas('ciclo', fn ($c) => $c->whereBetween('data_limite_preenchimento', [now(), now()->addDays(7)]));
                }
            });
        }

        return $query->orderBy('nome_completo');
    }

    /**
     * Calcula os KPIs principais para exibição no topo do painel.
     *
     * @return array{total_servidores: int, percentual_concluidas: float, pendencias: int, recursos_abertos: int, notas_extremas_auditoria: int, prazos_vencendo: int}
     */
    public function calcularKpis(?int $cicloId = null): array
    {
        $ciclo = $cicloId
            ? CicloAvaliacao::findOrFail($cicloId)
            : CicloAvaliacao::query()->ativo()->latest()->first();

        if (! $ciclo) {
            return [
                'total_servidores'          => 0,
                'percentual_concluidas'     => 0.0,
                'pendencias'                => 0,
                'recursos_abertos'          => 0,
                'notas_extremas_auditoria'  => 0,
                'prazos_vencendo'           => 0,
            ];
        }

        $totalServidores = Servidor::count();

        $avaliacoesCiclo = Avaliacao::where('ciclo_id', $ciclo->id);
        $totalAvaliacoes = (clone $avaliacoesCiclo)->count();
        $concluidas = (clone $avaliacoesCiclo)->whereNotNull('data_conclusao')->count();
        $pendencias = max(0, $totalServidores - $concluidas);

        $percentual = $totalServidores > 0
            ? round(($concluidas / $totalServidores) * 100, 1)
            : 0.0;

        $recursosAbertos = Recurso::whereHas('avaliacao', fn ($q) => $q->where('ciclo_id', $ciclo->id))
            ->whereIn('status', ['interposto', 'em_instrucao', 'pautado'])
            ->count();

        // Notas extremas para auditoria da comissão: notas < 4.00 ou >= 9.50
        $notasExtremas = (clone $avaliacoesCiclo)
            ->whereNotNull('data_conclusao')
            ->where(function ($q): void {
                $q->where('nota_final', '<', '4.00')
                    ->orWhere('nota_final', '>=', '9.50');
            })
            ->count();

        // Prazos vencendo nos próximos 7 dias
        $prazosVencendo = 0;
        if ($ciclo->data_limite_preenchimento && Carbon::parse($ciclo->data_limite_preenchimento)->isFuture()) {
            $dias = Carbon::now()->diffInDays(Carbon::parse($ciclo->data_limite_preenchimento));
            if ($dias <= 7) {
                $prazosVencendo = $pendencias;
            }
        }

        return [
            'total_servidores'          => $totalServidores,
            'percentual_concluidas'     => $percentual,
            'pendencias'                => $pendencias,
            'recursos_abertos'          => $recursosAbertos,
            'notas_extremas_auditoria'  => $notasExtremas,
            'prazos_vencendo'           => $prazosVencendo,
        ];
    }

    /**
     * RF-12 — Relatório de Aderência do Ciclo: evolução do preenchimento por
     * secretaria/departamento (orgao_lotacao), destacando os gestores com
     * subordinados pendentes de avaliação.
     *
     * @return array{ciclo_id: int, por_secretaria: array<int, array<string, mixed>>, gestores_pendentes: array<int, array<string, mixed>>}
     */
    public function relatorioAderencia(int $cicloId): array
    {
        $ciclo = CicloAvaliacao::findOrFail($cicloId);

        $servidores = Servidor::query()->get();

        // Avaliacao.servidor_id referencia o User (não o Servidor) — mesmo
        // padrão de fallback já usado em ConsolidacaoController::nfc().
        $concluidosPorUserId = Avaliacao::where('ciclo_id', $ciclo->id)
            ->whereNotNull('data_conclusao')
            ->pluck('servidor_id')
            ->all();

        $porSecretaria      = [];
        $pendentesPorGestor = [];

        foreach ($servidores->groupBy(fn (Servidor $s) => $s->orgao_lotacao ?? 'Não informado') as $secretaria => $grupo) {
            $total      = $grupo->count();
            $concluidas = $grupo->filter(
                fn (Servidor $s) => in_array($s->user_id ?? $s->id, $concluidosPorUserId, true)
            )->count();

            $porSecretaria[] = [
                'secretaria'             => $secretaria,
                'total'                  => $total,
                'concluidas'             => $concluidas,
                'pendentes'              => $total - $concluidas,
                'percentual_concluidas'  => $total > 0 ? round(($concluidas / $total) * 100, 1) : 0.0,
            ];

            foreach ($grupo as $servidor) {
                $concluida = in_array($servidor->user_id ?? $servidor->id, $concluidosPorUserId, true);
                if (! $concluida && $servidor->chefia_imediata_id) {
                    $pendentesPorGestor[$servidor->chefia_imediata_id] = ($pendentesPorGestor[$servidor->chefia_imediata_id] ?? 0) + 1;
                }
            }
        }

        $gestoresPendentes = [];
        foreach ($pendentesPorGestor as $gestorId => $qtd) {
            $gestor              = Servidor::find($gestorId);
            $gestoresPendentes[] = [
                'avaliador_id' => $gestorId,
                'nome'         => $gestor?->nome_completo ?? "Servidor #{$gestorId}",
                'pendentes'    => $qtd,
            ];
        }

        return [
            'ciclo_id'           => $ciclo->id,
            'por_secretaria'     => array_values($porSecretaria),
            'gestores_pendentes' => $gestoresPendentes,
        ];
    }

    /**
     * Retorna dados consolidados para cada perfil de acesso.
     *
     * @return array<string, mixed>
     */
    public function obterVisaoPerfil(string $perfil, ?int $cicloId = null, ?int $userId = null): array
    {
        $ciclo = $cicloId
            ? CicloAvaliacao::findOrFail($cicloId)
            : CicloAvaliacao::query()->ativo()->latest()->first();

        return match ($perfil) {
            'comissao' => $this->visaoComissao($ciclo),
            'drh'      => $this->visaoDrh($ciclo),
            'gestor'   => $this->visaoGestor($ciclo, $userId),
            default    => throw new \InvalidArgumentException("Perfil de visão inválido: {$perfil}"),
        };
    }

    private function visaoComissao(?CicloAvaliacao $ciclo): array
    {
        if (! $ciclo) {
            return [];
        }

        // Fila de auditoria: notas extremas que exigem amostragem e validação da comissão
        $filaAuditoria = Avaliacao::with(['servidor', 'avaliador'])
            ->where('ciclo_id', $ciclo->id)
            ->whereNotNull('data_conclusao')
            ->where(function ($q): void {
                $q->where('nota_final', '<', '4.00')
                    ->orWhere('nota_final', '>=', '9.50');
            })
            ->latest('data_conclusao')
            ->limit(20)
            ->get();

        // Fila de recursos pendentes
        $filaRecursos = Recurso::with(['avaliacao.servidor', 'relator'])
            ->whereHas('avaliacao', fn ($q) => $q->where('ciclo_id', $ciclo->id))
            ->whereIn('status', ['interposto', 'em_instrucao', 'pautado'])
            ->latest()
            ->limit(20)
            ->get();

        return [
            'perfil'            => 'comissao',
            'fila_auditoria'    => $filaAuditoria,
            'fila_recursos'     => $filaRecursos,
            'pronto_homologar'  => $ciclo->isHomologavel(),
        ];
    }

    private function visaoDrh(?CicloAvaliacao $ciclo): array
    {
        if (! $ciclo) {
            return [];
        }

        // Visão consolidada por Secretaria / Órgão
        $porSecretaria = Servidor::query()
            ->select('orgao_lotacao', DB::raw('count(*) as total'))
            ->groupBy('orgao_lotacao')
            ->get()
            ->map(function ($sec) use ($ciclo): array {
                $concluidas = Avaliacao::where('ciclo_id', $ciclo->id)
                    ->whereHas('servidor', fn ($s) => $s->where('orgao_lotacao', $sec->orgao_lotacao))
                    ->whereNotNull('data_conclusao')
                    ->count();

                $media = Avaliacao::where('ciclo_id', $ciclo->id)
                    ->whereHas('servidor', fn ($s) => $s->where('orgao_lotacao', $sec->orgao_lotacao))
                    ->whereNotNull('data_conclusao')
                    ->avg('nota_final');

                return [
                    'secretaria' => $sec->orgao_lotacao,
                    'total'      => $sec->total,
                    'concluidas' => $concluidas,
                    'pendentes'  => max(0, $sec->total - $concluidas),
                    'media_nota' => $media ? number_format((float) $media, 2, '.', '') : '0.00',
                ];
            });

        // Curva de distribuição de notas
        $curvaNotas = [
            '0_a_3.99' => Avaliacao::where('ciclo_id', $ciclo->id)->whereNotNull('data_conclusao')->where('nota_final', '<', '4.00')->count(),
            '4_a_5.99' => Avaliacao::where('ciclo_id', $ciclo->id)->whereNotNull('data_conclusao')->whereBetween('nota_final', ['4.00', '5.99'])->count(),
            '6_a_6.99' => Avaliacao::where('ciclo_id', $ciclo->id)->whereNotNull('data_conclusao')->whereBetween('nota_final', ['6.00', '6.99'])->count(),
            '7_a_8.49' => Avaliacao::where('ciclo_id', $ciclo->id)->whereNotNull('data_conclusao')->whereBetween('nota_final', ['7.00', '8.49'])->count(),
            '8.5_a_10' => Avaliacao::where('ciclo_id', $ciclo->id)->whereNotNull('data_conclusao')->where('nota_final', '>=', '8.50')->count(),
        ];

        // Leniência por avaliador
        $rankingLeniencia = Avaliacao::where('ciclo_id', $ciclo->id)
            ->whereNotNull('data_conclusao')
            ->select('avaliador_id', DB::raw('count(*) as total'), DB::raw('round(avg(nota_final), 2) as media'))
            ->groupBy('avaliador_id')
            ->orderByDesc('media')
            ->limit(10)
            ->with('avaliador:id,name,email')
            ->get();

        return [
            'perfil'             => 'drh',
            'por_secretaria'     => $porSecretaria,
            'curva_notas'        => $curvaNotas,
            'ranking_leniencia'  => $rankingLeniencia,
        ];
    }

    private function visaoGestor(?CicloAvaliacao $ciclo, ?int $userId): array
    {
        if (! $ciclo || ! $userId) {
            return [];
        }

        $subordinados = Servidor::where('chefia_imediata_id', $userId)
            ->with(['avaliacoes' => fn ($q) => $q->where('ciclo_id', $ciclo->id)])
            ->get();

        $pendentes = $subordinados->filter(function ($s): bool {
            $av = $s->avaliacoes->first();
            return $av === null || $av->data_conclusao === null;
        });

        return [
            'perfil'            => 'gestor',
            'total_equipe'      => $subordinados->count(),
            'total_pendentes'   => $pendentes->count(),
            'subordinados'      => $subordinados,
            'pendencias'        => $pendentes->values(),
        ];
    }

    /**
     * Gera os dados em formato CSV para exportação das grids.
     */
    public function exportarCsv(array $filtros): string
    {
        $query = $this->montarQueryFiltros($filtros);
        $servidores = $query->get();

        $output = fopen('php://temp', 'r+');
        fputcsv($output, [
            'Matrícula',
            'Nome Completo',
            'CPF',
            'Cargo Efetivo',
            'Órgão / Lotação',
            'Avaliador Imediato',
            'Nota Final',
            'Status Avaliação',
            'Homologada',
            'Data Conclusão',
            'Ciência Servidor',
        ], ';');

        foreach ($servidores as $servidor) {
            $av = $servidor->avaliacoes->first();
            fputcsv($output, [
                $servidor->matricula,
                $servidor->nome_completo,
                $servidor->cpf,
                $servidor->cargo_efetivo,
                $servidor->orgao_lotacao,
                $servidor->chefiaImediata?->name ?? 'Não Definido',
                $av?->nota_final !== null ? number_format((float) $av->nota_final, 2, '.', '') : '0.00',
                $av?->data_conclusao ? ($av->homologada ? 'Homologada' : 'Submetida') : 'Pendente',
                $av?->homologada ? 'Sim' : 'Não',
                $av?->data_conclusao ? Carbon::parse($av->data_conclusao)->format('d/m/Y H:i') : '-',
                $av?->ciencia_servidor_em ? Carbon::parse($av->ciencia_servidor_em)->format('d/m/Y H:i') : 'Pendente',
            ], ';');
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv ?: '';
    }
}
