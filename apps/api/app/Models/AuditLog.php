<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class AuditLog extends Model
{
    public $timestamps = false;
    protected $fillable = ['tenant_id', 'user_id', 'module', 'action', 'resource', 'before', 'after', 'ip', 'user_agent', 'hash', 'prev_hash', 'created_at'];
    protected $casts = ['before' => 'array', 'after' => 'array', 'created_at' => 'datetime'];
    protected static function booted(): void
    {
        static::updating(fn (): never => throw new \LogicException('AuditLog é imutável.'));
        static::deleting(fn (): never => throw new \LogicException('AuditLog é imutável.'));
    }
}
