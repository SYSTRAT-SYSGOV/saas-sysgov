<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Models\Role;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Impedimento;
use Modules\Capd\Models\NivelHierarquia;
use Modules\Capd\Models\PendenciaHierarquia;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Models\ServidorAfastamento;
use Modules\Capd\Support\ResolvedAvaliador;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Resolve o superior imediato de um servidor subindo a árvore real do
 * OrgChart, parametrizado por tenant via capd_niveis_hierarquia. Também
 * trata substituição por afastamento e divisão proporcional de avaliação
 * por transferência de unidade no meio do ciclo.
 */
final readonly class HierarquiaService
{
    public function __construct(
        private AuditLogger $audit,
        private OutboxPublisher $outbox,
        private TenantContext $tenantContext,
    ) {
    }

    public function resolverAvaliador(Servidor $servidor, Carbon $data): ResolvedAvaliador
    {
        // Prioriza a unidade vigente na data informada (histórico), para suportar
        // resolução retroativa em avaliações parciais por transferência; cai para
        // o org_unit_id atual do servidor quando não há histórico registrado.
        $orgUnitId = $servidor->unitHistory()
            ->where('valido_de', '<=', $data->toDateString())
            ->where(function ($q) use ($data): void {
                $q->whereNull('valido_ate')->orWhere('valido_ate', '>=', $data->toDateString());
            })
            ->orderByDesc('valido_de')
            ->value('org_unit_id') ?? $servidor->org_unit_id;

        if ($orgUnitId === null) {
            $this->criarOuAtualizarPendencia(
                $servidor,
                null,
                PendenciaHierarquia::TIPO_SEM_SUPERIOR,
                'Servidor sem org_unit_id configurado.'
            );

            return ResolvedAvaliador::pendente();
        }

        $niveis = NivelHierarquia::query()->ativos()->ordenados()->get();

        if ($niveis->isEmpty()) {
            $this->criarOuAtualizarPendencia(
                $servidor,
                null,
                PendenciaHierarquia::TIPO_SEM_SUPERIOR,
                'Nenhum nível hierárquico configurado para o tenant.'
            );

            return ResolvedAvaliador::pendente();
        }

        $orgUnit = OrgUnit::find($orgUnitId);

        if ($orgUnit === null) {
            $this->criarOuAtualizarPendencia(
                $servidor,
                null,
                PendenciaHierarquia::TIPO_SEM_SUPERIOR,
                'Unidade organizacional do servidor não encontrada.'
            );

            return ResolvedAvaliador::pendente();
        }

        // Do próprio nó do servidor até a raiz. Nível 0 = responsável da própria
        // unidade do servidor (o "chefe" do departamento/setor em que ele está lotado).
        $ancestorPaths = array_reverse($orgUnit->getAncestorPaths());

        $nivelIndex = 0;

        foreach ($ancestorPaths as $path) {
            if ($nivelIndex >= $niveis->count()) {
                break;
            }

            $segments = explode('.', $path);
            $unitId = (int) end($segments);
            $unit = OrgUnit::find($unitId);

            if ($unit !== null) {
                $responsaveis = $unit->responsibles()
                    ->wherePivot('valid_from', '<=', $data->toDateString())
                    ->where(function ($q) use ($data): void {
                        $q->whereNull('org_unit_user.valid_to')
                            ->orWhere('org_unit_user.valid_to', '>=', $data->toDateString());
                    })
                    ->get();

                foreach ($responsaveis as $responsavel) {
                    if (! $this->estaImpedido((int) $responsavel->id, $servidor)) {
                        return ResolvedAvaliador::resolvido(
                            (int) $responsavel->id,
                            (int) $niveis[$nivelIndex]->nivel
                        );
                    }
                }
            }

            $nivelIndex++;
        }

        $topo = $niveis->firstWhere('is_topo', true);

        if ($topo !== null) {
            $userId = $this->resolverAvaliadorTopo($topo);

            if ($userId !== null) {
                return ResolvedAvaliador::resolvido($userId, (int) $topo->nivel, viaTopo: true);
            }

            $this->criarOuAtualizarPendencia(
                $servidor,
                null,
                PendenciaHierarquia::TIPO_TOPO_SEM_CONFIG,
                'Nível topo configurado sem avaliador_topo_user_id nem avaliador_topo_role resolvível.'
            );

            return ResolvedAvaliador::pendente();
        }

        $this->criarOuAtualizarPendencia(
            $servidor,
            null,
            PendenciaHierarquia::TIPO_SEM_SUPERIOR,
            'Árvore esgotada sem responsável elegível e sem nível topo configurado.'
        );

        return ResolvedAvaliador::pendente();
    }

    public function resolverSubstituicao(ServidorAfastamento $afastamento): void
    {
        $servidor = $afastamento->servidor;

        if ($servidor === null) {
            return;
        }

        $fim = $afastamento->data_fim ?? Carbon::now();
        $dias = $afastamento->data_inicio->diffInDays($fim);
        $emAberto = $afastamento->data_fim === null;

        $ultrapassou180 = $dias > 180
            || ($emAberto && $afastamento->data_inicio->diffInDays(Carbon::now()) > 180);

        if ($ultrapassou180) {
            $cicloAtual = CicloAvaliacao::query()->emAvaliacao()->first();

            if ($cicloAtual !== null) {
                Avaliacao::query()
                    ->where('servidor_id', $servidor->user_id)
                    ->where('ciclo_id', $cicloAtual->id)
                    ->where('homologada', false)
                    ->update(['status_avaliacao' => Avaliacao::STATUS_SUSPENSA]);
            }

            $this->audit->record(
                'capd',
                'afastamento.suspende_avaliacao',
                "Servidor #{$servidor->id}",
                null,
                ['afastamento_id' => $afastamento->id, 'dias' => $dias]
            );

            $this->outbox->publish('CapdAvaliacaoSuspensaLicenca', [
                'servidor_id'     => $servidor->id,
                'afastamento_id'  => $afastamento->id,
            ]);

            return;
        }

        $resolvido = $this->resolverAvaliador($servidor, $afastamento->data_inicio);

        if ($resolvido->pendente) {
            return;
        }

        $nivel = NivelHierarquia::query()->where('nivel', $resolvido->nivelUsado)->first();

        if ($nivel?->regra_substituicao === NivelHierarquia::REGRA_SUBSTITUTO_LEGAL
            && $afastamento->substituto_id === null) {
            $this->criarOuAtualizarPendencia(
                $servidor,
                null,
                PendenciaHierarquia::TIPO_AFASTAMENTO_SEM_SUBSTITUTO,
                'Afastamento curto sem substituto_id formal registrado.'
            );
        }

        // regra_substituicao = superior_hierarquico é um no-op: resolverAvaliador
        // já sobe a árvore naturalmente na próxima chamada.
    }

    public function dividirPorTransferencia(Servidor $servidor, CicloAvaliacao $ciclo): void
    {
        $history = $servidor->unitHistory()
            ->where('valido_de', '<=', $ciclo->data_fim_avaliacao)
            ->where(function ($q) use ($ciclo): void {
                $q->whereNull('valido_ate')
                    ->orWhere('valido_ate', '>=', $ciclo->data_inicio_avaliacao);
            })
            ->orderBy('valido_de')
            ->get();

        if ($history->count() <= 1) {
            return;
        }

        $consolidada = Avaliacao::query()->firstOrCreate(
            [
                'tenant_id'       => $servidor->tenant_id,
                'ciclo_id'        => $ciclo->id,
                'servidor_id'     => $servidor->user_id,
                'tipo_avaliacao'  => Avaliacao::TIPO_CONSOLIDADA,
                'periodo_inicio'  => null,
            ],
            [
                'avaliador_id'      => null,
                'respostas_fatores' => [],
                'homologada'        => false,
            ]
        );

        foreach ($history as $period) {
            $inicio = $period->valido_de->max($ciclo->data_inicio_avaliacao);
            $fim = ($period->valido_ate ?? $ciclo->data_fim_avaliacao)->min($ciclo->data_fim_avaliacao);
            $dias = (int) $inicio->diffInDays($fim) + 1;
            $meio = $inicio->copy()->addDays(intdiv($dias, 2));

            $resolvido = $this->resolverAvaliador($servidor, $meio);

            Avaliacao::query()->firstOrCreate(
                [
                    'tenant_id'      => $servidor->tenant_id,
                    'ciclo_id'       => $ciclo->id,
                    'servidor_id'    => $servidor->user_id,
                    'tipo_avaliacao' => Avaliacao::TIPO_PARCIAL,
                    'periodo_inicio' => $inicio->toDateString(),
                ],
                [
                    'periodo_fim'               => $fim->toDateString(),
                    'dias_exercicio'            => $dias,
                    'avaliador_id'              => $resolvido->pendente ? null : $resolvido->userId,
                    'avaliacao_consolidada_id'  => $consolidada->id,
                    'respostas_fatores'         => [],
                    'homologada'                => false,
                ]
            );
        }

        $this->audit->record(
            'capd',
            'avaliacao.dividida_transferencia',
            "Servidor #{$servidor->id}",
            null,
            ['ciclo_id' => $ciclo->id, 'partes' => $history->count()]
        );

        $this->outbox->publish('CapdAvaliacaoDivididaPorTransferencia', [
            'servidor_id' => $servidor->id,
            'ciclo_id'    => $ciclo->id,
            'partes'      => $history->count(),
        ]);
    }

    private function resolverAvaliadorTopo(NivelHierarquia $topo): ?int
    {
        if ($topo->avaliador_topo_user_id !== null) {
            return $topo->avaliador_topo_user_id;
        }

        if ($topo->avaliador_topo_role === null) {
            return null;
        }

        $tenantId = $this->tenantContext->id();

        $roleId = Role::query()
            ->where('slug', $topo->avaliador_topo_role)
            ->where(function ($q) use ($tenantId): void {
                $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
            })
            ->value('id');

        if ($roleId === null) {
            return null;
        }

        $userId = DB::table('tenant_user')
            ->where('tenant_id', $tenantId)
            ->where('role_id', $roleId)
            ->value('user_id');

        if ($userId !== null) {
            return (int) $userId;
        }

        $userId = DB::table('role_user')
            ->where('role_id', $roleId)
            ->where('tenant_id', $tenantId)
            ->value('user_id');

        return $userId !== null ? (int) $userId : null;
    }

    private function estaImpedido(int $candidatoUserId, Servidor $servidor): bool
    {
        if ($candidatoUserId === $servidor->user_id) {
            return true;
        }

        return Impedimento::query()
            ->where('servidor_alvo_id', $servidor->user_id)
            ->whereHas('membro', fn ($q) => $q->where('servidor_id', $candidatoUserId))
            ->exists();
    }

    private function criarOuAtualizarPendencia(
        Servidor $servidor,
        ?int $cicloId,
        string $tipo,
        string $motivo,
    ): PendenciaHierarquia {
        $pendencia = PendenciaHierarquia::query()
            ->where('servidor_id', $servidor->id)
            ->where('tipo_pendencia', $tipo)
            ->abertas()
            ->first();

        if ($pendencia !== null) {
            return $pendencia;
        }

        $pendencia = PendenciaHierarquia::query()->create([
            'tenant_id'      => $servidor->tenant_id,
            'servidor_id'    => $servidor->id,
            'ciclo_id'       => $cicloId,
            'tipo_pendencia' => $tipo,
            'motivo'         => $motivo,
            'status'         => PendenciaHierarquia::STATUS_ABERTA,
        ]);

        $this->audit->record(
            'capd',
            'pendencia_hierarquia.criada',
            "Servidor #{$servidor->id}",
            null,
            ['tipo_pendencia' => $tipo, 'motivo' => $motivo]
        );

        $this->outbox->publish('CapdPendenciaHierarquiaCriada', [
            'servidor_id'    => $servidor->id,
            'tipo_pendencia' => $tipo,
        ]);

        return $pendencia;
    }
}
