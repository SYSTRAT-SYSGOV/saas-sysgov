<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string $tipo
 * @property string|null $cpf_cnpj
 * @property string|null $documento_hash
 * @property string|null $matricula_funcional
 * @property string|null $alvara_numero
 * @property \Illuminate\Support\Carbon|null $alvara_validade
 * @property string|null $telefone
 * @property string|null $email
 * @property string $situacao
 * @property string|null $observacoes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class OperadorCemiterio extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'cemetery_operators';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'alvara_validade' => 'date',
    ];

    /** @param Builder<$this> $query */
    public function scopeCoveiros(Builder $query): Builder
    {
        return $query->where('tipo', 'coveiro');
    }

    /** @param Builder<$this> $query */
    public function scopePedreiros(Builder $query): Builder
    {
        return $query->where('tipo', 'pedreiro');
    }

    /** @param Builder<$this> $query */
    public function scopeAtivos(Builder $query): Builder
    {
        return $query->where('situacao', 'ativo');
    }

    public function isAlvaraVencido(): bool
    {
        if ($this->tipo !== 'pedreiro' || !$this->alvara_validade) {
            return false;
        }

        return $this->alvara_validade->isPast();
    }

    public function isAlvaraVencendo(int $dias = 30): bool
    {
        if ($this->tipo !== 'pedreiro' || !$this->alvara_validade || $this->isAlvaraVencido()) {
            return false;
        }

        return $this->alvara_validade->diffInDays(today(), absolute: true) <= $dias;
    }

    public function statusAlvara(): string
    {
        if ($this->tipo !== 'pedreiro') {
            return 'dispensado';
        }

        if (!$this->alvara_validade) {
            return 'sem_alvara';
        }

        if ($this->isAlvaraVencido()) {
            return 'vencido';
        }

        if ($this->isAlvaraVencendo()) {
            return 'vencendo';
        }

        return 'valido';
    }
}
