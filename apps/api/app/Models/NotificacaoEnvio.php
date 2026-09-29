<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registro de cada e-mail enviado (ou tentado) pelo ouvinte do Outbox (design D2). Não usa
 * TenantAware — `tenant_id` é nulo-permitido (eventos de plataforma sem tenant, ex.: recuperação
 * de senha de usuário sem órgão), mesmo padrão de OutboxEvent — quem cria/consulta trata o
 * tenant explicitamente.
 *
 * @property int $id
 * @property int|null $tenant_id
 * @property string $event_id
 * @property string $tipo
 * @property string $destinatario
 * @property string $situacao
 * @property int $tentativas
 * @property string|null $erro
 * @property \Illuminate\Support\Carbon|null $enviado_em
 */
final class NotificacaoEnvio extends Model
{
    protected $table = 'notificacoes_envios';

    protected $fillable = ['tenant_id', 'event_id', 'tipo', 'destinatario', 'situacao', 'tentativas', 'erro', 'enviado_em'];

    protected $casts = [
        'tenant_id' => 'integer',
        'tentativas' => 'integer',
        'enviado_em' => 'datetime',
    ];

    /** @return BelongsTo<OutboxEvent, $this> */
    public function evento(): BelongsTo
    {
        return $this->belongsTo(OutboxEvent::class, 'event_id', 'event_id');
    }
}
