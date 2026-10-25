<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Educa\Http\Requests\InfrequenceAlertRequest;
use Modules\Educa\Models\EducaStudentIncident;
use Modules\Educa\Services\NotificationDispatcherService;

final class NotificationController extends Controller
{
    public function __construct(
        private readonly NotificationDispatcherService $dispatcherService,
    ) {}

    public function dispararInfrequencia(InfrequenceAlertRequest $request): JsonResponse
    {
        $this->authorize('sendNotificacoes', EducaStudentIncident::class);

        $enrollmentId = $request->validated('enrollment_id');
        $totalFaltas = (int) $request->validated('total_faltas');
        $canal = (string) ($request->validated('canal') ?? 'todos');

        $event = $this->dispatcherService->notificarInfrequencia($enrollmentId, $totalFaltas, $canal);

        return response()->json([
            'message' => 'Alerta de infrequência publicado com sucesso no Outbox.',
            'event_id' => $event->event_id ?? (string) $event->getKey(),
        ], 202);
    }
}
