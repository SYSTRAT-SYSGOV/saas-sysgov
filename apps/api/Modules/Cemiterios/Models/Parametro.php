<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Modules\Cemiterios\Models\Concerns\Imutavel;

/**
 * Versão dos parâmetros legais do município (ADR-003). Append-only.
 *
 * @property int $prazo_exumacao_adulto_anos
 * @property int $prazo_exumacao_crianca_anos
 * @property int $idade_limite_crianca
 * @property float $distanciamento_min_m
 * @property float $tumulo_max_comprimento_m
 * @property float $tumulo_max_largura_m
 * @property int $edital_prazo_dias
 * @property int $obras_simultaneas_max
 * @property int $notificacao_antecedencia_dias
 * @property int $suspensoes_para_cancelamento
 * @property int $concessao_temporaria_anos
 * @property bool $portal_habilitado
 * @property string|null $instrucoes_pagamento
 * @property string|null $chave_pix
 *
 * @property int $id
 * @property int $tenant_id
 * @property \Illuminate\Support\Carbon $vigencia_inicio
 * @property int|null $autor_id
 * @property \Illuminate\Support\Carbon|null $created_at
 */
final class Parametro extends Model
{
    use TenantAware;
    use Imutavel;

    public const UPDATED_AT = null;

    protected $table = 'cemetery_settings';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'vigencia_inicio' => 'datetime',
        'prazo_exumacao_adulto_anos' => 'integer',
        'prazo_exumacao_crianca_anos' => 'integer',
        'idade_limite_crianca' => 'integer',
        'distanciamento_min_m' => 'float',
        'tumulo_max_comprimento_m' => 'float',
        'tumulo_max_largura_m' => 'float',
        'edital_prazo_dias' => 'integer',
        'obras_simultaneas_max' => 'integer',
        'notificacao_antecedencia_dias' => 'integer',
        'suspensoes_para_cancelamento' => 'integer',
        'concessao_temporaria_anos' => 'integer',
        'portal_habilitado' => 'boolean',
    ];
}
