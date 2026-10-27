<?php

declare(strict_types=1);

namespace Modules\Client\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Client\Services\DashboardSummaryService;

final class DashboardSummaryController
{
    public function __construct(private readonly DashboardSummaryService $service) {}

    /** GET /api/client/dashboard-summary */
    public function __invoke(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->para($request->user())]);
    }
}
