<?php

declare(strict_types=1);

namespace Modules\Contracts\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class TicketMessage extends Model
{
    use TenantAware;

    protected $table = 'ticket_messages';

    protected $fillable = [
        'tenant_id',
        'ticket_id',
        'user_id',
        'message',
        'is_internal_note',
        'attachments',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ticket_id' => 'integer',
        'user_id' => 'integer',
        'is_internal_note' => 'boolean',
        'attachments' => 'array',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'ticket_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
