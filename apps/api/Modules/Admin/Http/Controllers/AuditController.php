<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;

final class AuditController
{
    public function index(): JsonResponse { return response()->json(AuditLog::query()->latest('created_at')->paginate(50)); }
}
