<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Modules\Vistoria\Events\OrdemServicoAtribuida;
use Modules\Vistoria\Events\OrdemServicoCriada;
use Modules\Vistoria\Events\OrdemServicoReatribuida;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;

final class OrdemServicoService
{
    public function __construct(
        private AuditLogger $audit,
        private OutboxPublisher $outbox,
    ) {}

    /**
     * @param array<string, mixed> $dados
     *
     * @throws \DomainException quando local, unidade organizacional ou fiscal informados não
     *                           existem no tenant atual
     */
    public function criarOrdemServico(array $dados): OrdemServico
    {
        if (! LocalFiscalizavel::find($dados['local_id'])) {
            throw new \DomainException('Local fiscalizável não encontrado.');
        }

        if (! OrgUnit::find($dados['org_unit_id'])) {
            throw new \DomainException('Unidade organizacional não encontrada.');
        }

        if (isset($dados['fiscal_id']) && ! User::find($dados['fiscal_id'])) {
            throw new \DomainException('Fiscal informado não encontrado.');
        }

        $ordem = DB::transaction(fn (): OrdemServico => OrdemServico::create([
            ...$dados,
            'status' => OrdemServico::STATUS_AGENDADA,
        ]));

        $this->audit->record('vistoria', 'ordem_servico.criada', "OrdemServico #{$ordem->id}", null, $ordem->toArray());
        $this->outbox->publish('vistoria.ordem_servico.criada', ['ordem_servico_id' => $ordem->id]);
        OrdemServicoCriada::dispatch($ordem);

        if ($ordem->fiscal_id === null) {
            return $this->distribuirAutomaticamente($ordem);
        }

        OrdemServicoAtribuida::dispatch($ordem);

        return $ordem;
    }

    /**
     * Atribui a ordem ao fiscal com menor carga de ordens pendentes (agendada/em_execucao)
     * entre os vinculados à mesma unidade organizacional (`org_unit_user`).
     *
     * @throws \DomainException quando não há fiscal vinculado à unidade organizacional
     */
    public function distribuirAutomaticamente(OrdemServico $ordem): OrdemServico
    {
        $candidatoIds = OrgUnitUser::query()
            ->where('org_unit_id', $ordem->org_unit_id)
            ->pluck('user_id');

        if ($candidatoIds->isEmpty()) {
            throw new \DomainException('Não há fiscal vinculado à unidade organizacional para distribuição automática.');
        }

        // Carga pendente por fiscal (fiscais sem nenhuma ordem pendente não aparecem aqui — carga 0).
        $cargaPorFiscal = OrdemServico::query()
            ->selectRaw('fiscal_id, COUNT(*) as carga')
            ->whereIn('fiscal_id', $candidatoIds)
            ->whereIn('status', [OrdemServico::STATUS_AGENDADA, OrdemServico::STATUS_EM_EXECUCAO])
            ->groupBy('fiscal_id')
            ->pluck('carga', 'fiscal_id');

        $fiscalEscolhidoId = null;
        $menorCarga = null;
        foreach ($candidatoIds as $candidatoId) {
            $carga = (int) ($cargaPorFiscal[$candidatoId] ?? 0);
            if ($menorCarga === null || $carga < $menorCarga) {
                $menorCarga = $carga;
                $fiscalEscolhidoId = $candidatoId;
            }
        }

        $antes = $ordem->toArray();
        $ordem->update(['fiscal_id' => $fiscalEscolhidoId]);

        $this->audit->record('vistoria', 'ordem_servico.distribuida', "OrdemServico #{$ordem->id}", $antes, $ordem->toArray());
        OrdemServicoAtribuida::dispatch($ordem);

        return $ordem;
    }

    /**
     * Listagem para a tela de planejamento: chefia (`vistoria.ordens.manage`/`vistoria.chefia`)
     * vê todas as ordens do tenant; fiscal sem essas permissões só vê as próprias
     * (`OrdemServico::scopeVisivelPara()` — mesmo critério de `OrdemServicoPolicy::view()`,
     * aplicado aqui à listagem).
     *
     * @param array<string, mixed> $filtros
     *
     * @return LengthAwarePaginator<int, OrdemServico>
     */
    public function listar(User $user, array $filtros): LengthAwarePaginator
    {
        $query = OrdemServico::query()->with(['local', 'orgUnit', 'fiscal'])->visivelPara($user)->orderBy('data_prevista');

        if ($status = $filtros['status'] ?? null) {
            $query->where('status', $status);
        }

        if ($criticidade = $filtros['criticidade'] ?? null) {
            $query->where('criticidade', $criticidade);
        }

        return $query->paginate((int) ($filtros['per_page'] ?? 15));
    }

    /**
     * Reatribui a ordem a outro fiscal vinculado à mesma unidade organizacional, notificando
     * o fiscal anterior e o novo (evento de domínio — ver nota em `OrdemServicoAtribuida`
     * sobre a ausência de infraestrutura de notificação real neste repositório) e registrando
     * em auditoria.
     *
     * @throws \DomainException quando a ordem já está concluída/cancelada, ou o novo fiscal
     *                           não está vinculado à unidade organizacional da ordem
     */
    public function reatribuir(OrdemServico $ordem, User $novoFiscal): OrdemServico
    {
        if (in_array($ordem->status, [OrdemServico::STATUS_CONCLUIDA, OrdemServico::STATUS_CANCELADA], true)) {
            throw new \DomainException('Não é possível reatribuir uma ordem de serviço já concluída ou cancelada.');
        }

        $vinculadoAUnidade = OrgUnitUser::query()
            ->where('org_unit_id', $ordem->org_unit_id)
            ->where('user_id', $novoFiscal->id)
            ->exists();

        if (! $vinculadoAUnidade) {
            throw new \DomainException('O fiscal informado não está vinculado à unidade organizacional desta ordem de serviço.');
        }

        $fiscalAnteriorId = $ordem->fiscal_id;
        $antes = $ordem->toArray();

        DB::transaction(function () use ($ordem, $novoFiscal): void {
            $ordem->update(['fiscal_id' => $novoFiscal->id]);
        });

        $this->audit->record('vistoria', 'ordem_servico.reatribuida', "OrdemServico #{$ordem->id}", $antes, $ordem->toArray());

        $fiscalAnterior = $fiscalAnteriorId !== null ? User::find($fiscalAnteriorId) : null;
        OrdemServicoReatribuida::dispatch($ordem, $fiscalAnterior, $novoFiscal);

        return $ordem;
    }
}
