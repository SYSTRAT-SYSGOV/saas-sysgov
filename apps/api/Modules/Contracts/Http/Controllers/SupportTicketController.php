<?php

declare(strict_types=1);

namespace Modules\Contracts\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Contracts\Models\SupportTicket;
use Modules\Contracts\Services\SupportTicketService;

final class SupportTicketController extends Controller
{
    public function __construct(
        private readonly SupportTicketService $ticketService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = SupportTicket::query()->with(['requester:id,name,email', 'assigned:id,name']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($priority = $request->query('priority')) {
            $query->where('priority', $priority);
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        $tickets = $query->latest()->paginate((int) $request->query('per_page', 25));
        return response()->json($tickets);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'in:duvida,suporte_tecnico,integracao_siconfi,white_label,reclamacao,outro'],
            'priority' => ['nullable', 'string', 'in:baixa,media,alta,critica'],
            'initial_message' => ['nullable', 'string'],
            'attachments' => ['nullable', 'array'],
        ]);

        $ticket = $this->ticketService->openTicket($validated, $request->user()->id);
        return response()->json($ticket, 201);
    }

    public function show(int $id): JsonResponse
    {
        $ticket = SupportTicket::with(['requester:id,name,email', 'assigned:id,name', 'messages.user:id,name,email'])
            ->findOrFail($id);

        return response()->json($ticket);
    }

    public function addMessage(Request $request, int $id): JsonResponse
    {
        $ticket = SupportTicket::findOrFail($id);

        $validated = $request->validate([
            'message' => ['required', 'string'],
            'is_internal_note' => ['nullable', 'boolean'],
            'attachments' => ['nullable', 'array'],
        ]);

        $msg = $this->ticketService->addMessage(
            $ticket,
            $request->user()->id,
            $validated['message'],
            (bool) ($validated['is_internal_note'] ?? false),
            $validated['attachments'] ?? null
        );

        return response()->json($msg, 201);
    }

    public function resolve(int $id): JsonResponse
    {
        $ticket = SupportTicket::findOrFail($id);
        $resolved = $this->ticketService->resolveTicket($ticket);
        return response()->json($resolved);
    }
}
