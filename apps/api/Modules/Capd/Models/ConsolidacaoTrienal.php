<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Consolidação Trienal (NFC) — RN-02, RN-04, RN-05.
 *
 * Registro imutável e versionado: cada reprocessamento do mesmo par
 * (servidor, triênio) cria uma nova versão em vez de sobrescrever a anterior.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $servidor_id
 * @property int $ciclo_id
 * @property int $trienio
 * @property array<string, string> $notas_ciclos
 * @property string $nfc            — DECIMAL(5,2) como string, nunca float
 * @property string $conceito
 * @property bool $elegivel_progressao
 * @property array<string, mixed> $parametros
 * @property int $versao
 */
final class ConsolidacaoTrienal extends Model
{
    use TenantAware;

    protected $table = 'capd_consolidacoes';

    protected $fillable = [
        'tenant_id',
        'servidor_id',
        'ciclo_id',
        'trienio',
        'notas_ciclos',
        'nfc',
        'conceito',
        'elegivel_progressao',
        'parametros',
        'versao',
    ];

    protected $casts = [
        'tenant_id'            => 'integer',
        'servidor_id'          => 'integer',
        'ciclo_id'             => 'integer',
        'trienio'              => 'integer',
        'notas_ciclos'         => 'array',
        // DECIMAL armazenado como string para evitar perda de precisão (RN)
        'nfc'                  => 'string',
        'elegivel_progressao'  => 'boolean',
        'parametros'           => 'array',
        'versao'               => 'integer',
    ];

    public function servidor(): BelongsTo
    {
        return $this->belongsTo(Servidor::class, 'servidor_id');
    }

    public function ciclo(): BelongsTo
    {
        return $this->belongsTo(CicloAvaliacao::class, 'ciclo_id');
    }

    public function scopeDoTrienio(Builder $query, int $trienio): Builder
    {
        return $query->where('trienio', $trienio);
    }

    public function scopeUltimaVersao(Builder $query): Builder
    {
        return $query->orderByDesc('versao');
    }
}
