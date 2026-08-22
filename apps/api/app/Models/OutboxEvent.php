<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

final class OutboxEvent extends Model
{
    protected $table = 'outbox_events';
    protected $primaryKey = 'event_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;
    protected $fillable = ['event_id', 'event_type', 'event_version', 'tenant_id', 'payload', 'status', 'attempts', 'available_at', 'processed_at', 'error'];
    protected $casts = ['payload' => 'array', 'available_at' => 'datetime', 'processed_at' => 'datetime'];
    protected static function booted(): void { static::creating(fn (self $event): self => tap($event, fn (self $model) => $model->event_id ??= (string) Str::uuid())); }
}
