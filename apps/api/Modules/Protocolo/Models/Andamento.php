<?php

declare(strict_types=1);

namespace Modules\Protocolo\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;
use Modules\OrgChart\Models\OrgUnit;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_id
 * @property int $orgao_origem_id
 * @property int $orgao_destino_id
 * @property int $tipo_tramitacao_id
 * @property int $usuario_id
 * @property int|null $usuario_recebedor_id
 * @property string|null $descricao
 * @property \Illuminate\Support\Carbon|null $data_recebimento
 * @property \Illuminate\Support\Carbon|null $data_envio
 * @property bool $and_atual
 * @property int $sequencia
 * @property int|null $and_atual_chave
 */
final class Andamento extends Model
{
    use TenantAware;
    use HasFactory;

    protected $table = 'protocolo_andamentos';

    protected $fillable = [
        'tenant_id',
        'processo_id',
        'orgao_origem_id',
        'orgao_destino_id',
        'tipo_tramitacao_id',
        'usuario_id',
        'usuario_recebedor_id',
        'descricao',
        'data_recebimento',
        'data_envio',
        'and_atual',
        'sequencia',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_id' => 'integer',
        'orgao_origem_id' => 'integer',
        'orgao_destino_id' => 'integer',
        'tipo_tramitacao_id' => 'integer',
        'usuario_id' => 'integer',
        'usuario_recebedor_id' => 'integer',
        'data_recebimento' => 'datetime',
        'data_envio' => 'datetime',
        'and_atual' => 'boolean',
        'sequencia' => 'integer',
    ];

    protected static function booted(): void
    {
        static::deleting(static function (self $model): void {
            throw new LogicException('Andamentos de processos são imutáveis e não podem ser excluídos.');
        });

        static::updating(static function (self $model): void {
            $dirty = array_keys($model->getDirty());

            foreach ($dirty as $campo) {
                if ($campo === 'updated_at') {
                    continue;
                }

                if ($campo === 'data_recebimento') {
                    if ($model->getOriginal('data_recebimento') !== null) {
                        throw new LogicException('A data de recebimento já foi preenchida e não pode ser alterada.');
                    }
                    continue;
                }

                if ($campo === 'usuario_recebedor_id') {
                    if ($model->getOriginal('usuario_recebedor_id') !== null) {
                        throw new LogicException('O usuário recebedor já foi definido e não pode ser alterado.');
                    }
                    continue;
                }

                if ($campo === 'data_envio') {
                    if ($model->getOriginal('data_envio') !== null) {
                        throw new LogicException('A data de envio já foi preenchida e não pode ser alterada.');
                    }
                    continue;
                }

                if ($campo === 'and_atual') {
                    // Apenas transição true -> false é permitida (fechamento do andamento)
                    if ($model->getOriginal('and_atual') === true && $model->and_atual === false) {
                        continue;
                    }
                    throw new LogicException('A flag de andamento atual só pode ser desativada.');
                }

                // Qualquer outro campo (descricao, orgaos, tipo, usuario_id, sequencia, etc.) é proibido
                throw new LogicException("Andamentos são imutáveis. O campo '{$campo}' não pode ser editado após o registro.");
            }
        });
    }

    public function processo(): BelongsTo
    {
        return $this->belongsTo(Processo::class, 'processo_id');
    }

    public function orgaoOrigem(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'orgao_origem_id');
    }

    public function orgaoDestino(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'orgao_destino_id');
    }

    public function tipoTramitacao(): BelongsTo
    {
        return $this->belongsTo(TipoTramitacao::class, 'tipo_tramitacao_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function usuarioRecebedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_recebedor_id');
    }
}
