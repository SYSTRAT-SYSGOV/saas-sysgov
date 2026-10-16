<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AuditController
{
    private const MAX_PER_PAGE = 100;

    /** Filtros opcionais: module, action, user_id, from, to (datas) e per_page (padrão 50, máx. 100). */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query();

        foreach (['module', 'action'] as $field) {
            if ($value = $request->string($field)->toString()) {
                $query->where($field, $value);
            }
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }
        if ($from = $request->string('from')->toString()) {
            $query->where('created_at', '>=', $from . ' 00:00:00');
        }
        if ($to = $request->string('to')->toString()) {
            $query->where('created_at', '<=', $to . ' 23:59:59');
        }

        $perPage = $request->integer('per_page', 50);
        $perPage = $perPage < 1 ? 50 : min($perPage, self::MAX_PER_PAGE);

        return response()->json($query->latest('created_at')->latest('id')->paginate($perPage));
    }
}
