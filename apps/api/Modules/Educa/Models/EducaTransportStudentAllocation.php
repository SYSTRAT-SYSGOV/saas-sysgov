<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Alocação nominal de estudante em rota, veículo e ponto de parada do transporte escolar.
 */
final class EducaTransportStudentAllocation extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const STATUS_ATIVA = 'ativa';
    public const STATUS_ENCERRADA = 'encerrada';

    protected $table = 'educa_transport_student_allocations';

    protected $fillable = [
        'tenant_id',
        'route_id',
        'vehicle_id',
        'stop_id',
        'enrollment_id',
        'aluno_pessoa_id',
        'data_inicio',
        'data_fim',
        'status',
    ];

    protected $casts = [
        'aluno_pessoa_id' => 'integer',
        'data_inicio' => 'date:Y-m-d',
        'data_fim' => 'date:Y-m-d',
    ];

    public function route(): BelongsTo
    {
        return $this->belongsTo(EducaTransportRoute::class, 'route_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(EducaTransportVehicle::class, 'vehicle_id');
    }

    public function stop(): BelongsTo
    {
        return $this->belongsTo(EducaTransportStop::class, 'stop_id');
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(EducaEnrollment::class, 'enrollment_id');
    }

    public function alunoPessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'aluno_pessoa_id');
    }
}
