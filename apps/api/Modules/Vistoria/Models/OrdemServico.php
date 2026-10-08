<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Ordem de serviço de vistoria/inspeção: vincula um local fiscalizável a um
 * fiscal responsável, com tipo de ação, data prevista e criticidade.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $local_id
 * @property int $org_unit_id
 * @property int|null $fiscal_id
 * @property string $tipo_acao
 * @property string $criticidade
 * @property string $status
 * @property \Illuminate\Support\Carbon $data_prevista
 * @property string|null $roteiro_deslocamento
 */
final class OrdemServico extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'vistoria_ordens_servico';

    public const TIPO_ACAO_VISTORIA_ROTINA = 'vistoria_rotina';
    public const TIPO_ACAO_INSPECAO_SANITARIA = 'inspecao_sanitaria';
    public const TIPO_ACAO_ATENDIMENTO_DENUNCIA = 'atendimento_denuncia';
    public const TIPO_ACAO_REINSPECAO = 'reinspecao';
    public const TIPO_ACAO_AUTUACAO = 'autuacao';

    public const CRITICIDADE_BAIXA = 'baixa';
    public const CRITICIDADE_MEDIA = 'media';
    public const CRITICIDADE_ALTA = 'alta';
    public const CRITICIDADE_URGENTE = 'urgente';

    public const STATUS_AGENDADA = 'agendada';
    public const STATUS_EM_EXECUCAO = 'em_execucao';
    public const STATUS_CONCLUIDA = 'concluida';
    public const STATUS_CANCELADA = 'cancelada';

    protected $fillable = [
        'tenant_id',
        'local_id',
        'org_unit_id',
        'fiscal_id',
        'tipo_acao',
        'criticidade',
        'status',
        'resultado',
        'data_prevista',
        'roteiro_deslocamento',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'local_id' => 'integer',
        'org_unit_id' => 'integer',
        'fiscal_id' => 'integer',
        'data_prevista' => 'date',
    ];

    /** @return BelongsTo<LocalFiscalizavel, $this> */
    public function local(): BelongsTo
    {
        return $this->belongsTo(LocalFiscalizavel::class, 'local_id');
    }

    /** @return BelongsTo<OrgUnit, $this> */
    public function orgUnit(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }

    /** @return BelongsTo<User, $this> */
    public function fiscal(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fiscal_id');
    }

    /**
     * Escopo de consulta (seção 12.2): restringe a listagem às próprias ordens do fiscal
     * autenticado — a menos que ele tenha `vistoria.ordens.manage` ou `vistoria.chefia`
     * (ou seja platform admin), que veem o tenant inteiro sem essa restrição. Mesmo
     * critério de `OrdemServicoPolicy::view()`, só que aplicado à listagem em vez de um
     * registro isolado.
     *
     * @param Builder<OrdemServico> $query
     *
     * @return Builder<OrdemServico>
     */
    public function scopeVisivelPara(Builder $query, User $user): Builder
    {
        if ($user->is_platform_admin || $user->hasPermission('vistoria.ordens.manage') || $user->hasPermission('vistoria.chefia')) {
            return $query;
        }

        return $query->where('fiscal_id', $user->id);
    }
}
