<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Requerimentos\Models\RequerimentosItem;

final class RequerimentosController extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox
    ) {}

    public function index(Request $request): JsonResponse
    {
        $items = RequerimentosItem::query()
            ->latest()
            ->paginate((int) $request->query('per_page', 25));

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:50'],
            'title' => ['required', 'string', 'max:255'],
            'amount_cents' => ['required', 'integer', 'min:0'],
            'status' => ['nullable', 'string'],
        ]);

        $item = RequerimentosItem::create($validated);

        $this->audit->record('requerimentos', 'item.created', "RequerimentosItem #{$item->id}", null, $item->toArray());
        $this->outbox->publish('requerimentos', 'ItemCreated', ['id' => $item->id, 'title' => $item->title]);

        return response()->json($item, 201);
    }

    public function show(int $id): JsonResponse
    {
        $item = RequerimentosItem::findOrFail($id);
        return response()->json($item);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $item = RequerimentosItem::findOrFail($id);
        $before = $item->toArray();

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'amount_cents' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'string'],
        ]);

        $item->update($validated);
        $this->audit->record('requerimentos', 'item.updated', "RequerimentosItem #{$item->id}", $before, $item->toArray());

        return response()->json($item);
    }

    public function destroy(int $id): JsonResponse
    {
        $item = RequerimentosItem::findOrFail($id);
        $before = $item->toArray();
        $item->delete();

        $this->audit->record('requerimentos', 'item.deleted', "RequerimentosItem #{$id}", $before, null);

        return response()->json(['deleted' => true]);
    }
}