<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Veículo da frota de transporte escolar (próprio ou terceirizado).
 */
final class EducaTransportVehicle extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const STATUS_REGULAR = 'regular';
    public const STATUS_EM_MANUTENCAO = 'em_manutencao';
    public const STATUS_INTERDITADO = 'interditado';

    public const PROPRIEDADE_PROPRIO = 'proprio';
    public const PROPRIEDADE_TERCEIRIZADO = 'terceirizado';

    public const TIPO_ONIBUS = 'onibus';
    public const TIPO_MICROONIBUS = 'microonibus';
    public const TIPO_VAN = 'van';
    public const TIPO_EMBARCACAO = 'embarcacao';
    public const TIPO_OUTROS = 'outros';

    protected $table = 'educa_transport_vehicles';

    protected $fillable = [
        'tenant_id',
        'placa',
        'renavam',
        'marca_modelo',
        'ano_fabricacao',
        'tipologia',
        'tipo_propriedade',
        'capacidade_passageiros',
        'ocupacao_efetiva',
        'status',
    ];

    protected $casts = [
        'ano_fabricacao' => 'integer',
        'capacidade_passageiros' => 'integer',
        'ocupacao_efetiva' => 'integer',
    ];

    public function inspections(): HasMany
    {
        return $this->hasMany(EducaTransportInspection::class, 'vehicle_id')->orderByDesc('data_validade');
    }

    public function latestInspection(): HasOne
    {
        return $this->hasOne(EducaTransportInspection::class, 'vehicle_id')->latestOfMany('data_validade');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(EducaTransportStudentAllocation::class, 'vehicle_id');
    }

    /**
     * Verifica se o veículo possui vistoria aprovada e dentro do prazo de validade semestral.
     */
    public function temVistoriaValida(): bool
    {
        /** @var EducaTransportInspection|null $ultima */
        $ultima = $this->latestInspection;

        if (! $ultima) {
            return false;
        }

        return $ultima->resultado === EducaTransportInspection::RESULTADO_APROVADO
            && Carbon::parse($ultima->data_validade)->isFuture();
    }

    /**
     * Retorna o saldo disponível de assentos para novos estudantes.
     */
    public function assentosDisponiveis(): int
    {
        return max(0, $this->capacidade_passageiros - $this->ocupacao_efetiva);
    }
}
