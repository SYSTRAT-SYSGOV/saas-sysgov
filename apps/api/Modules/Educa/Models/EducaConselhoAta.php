<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

final class EducaConselhoAta extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_conselho_atas';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'school_class_id',
        'cronograma_id',
        'numero_ata',
        'periodo',
        'data_reuniao',
        'horario_inicio',
        'horario_fim',
        'resumo_geral',
        'deliberacoes_coletivas',
        'status',
        'finalizado_por_user_id',
        'finalizado_em',
        'homologado_por_user_id',
        'homologado_em',
    ];

    protected function casts(): array
    {
        return [
            'data_reuniao' => 'date',
            'finalizado_em' => 'datetime',
            'homologado_em' => 'datetime',
        ];
    }

    public function isFinalizada(): bool
    {
        return in_array($this->status, ['finalizada', 'homologada'], true);
    }

    /**
     * @return BelongsTo<EducaSchool, $this>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    /**
     * @return BelongsTo<EducaSchoolClass, $this>
     */
    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(EducaSchoolClass::class, 'school_class_id');
    }

    /**
     * @return BelongsTo<EducaConselhoCronograma, $this>
     */
    public function cronograma(): BelongsTo
    {
        return $this->belongsTo(EducaConselhoCronograma::class, 'cronograma_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function finalizadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalizado_por_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function homologadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'homologado_por_user_id');
    }

    /**
     * @return HasMany<EducaConselhoDeliberacaoAluno, $this>
     */
    public function deliberacoesAlunos(): HasMany
    {
        return $this->hasMany(EducaConselhoDeliberacaoAluno::class, 'ata_id');
    }

    /**
     * @return HasMany<EducaConselhoMembro, $this>
     */
    public function membros(): HasMany
    {
        return $this->hasMany(EducaConselhoMembro::class, 'ata_id');
    }
}
