<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Capd\Models\CapdItem;

final class CapdController extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox
    ) {}

    public function index(Request $request): JsonResponse
    {
        $items = CapdItem::query()
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

        $item = CapdItem::create($validated);

        $this->audit->record('capd', 'item.created', "CapdItem #{$item->id}", null, $item->toArray());
        $this->outbox->publish('capd', 'ItemCreated', ['id' => $item->id, 'title' => $item->title]);

        return response()->json($item, 201);
    }

    public function show(int $id): JsonResponse
    {
        $item = CapdItem::findOrFail($id);
        return response()->json($item);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $item = CapdItem::findOrFail($id);
        $before = $item->toArray();

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'amount_cents' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'string'],
        ]);

        $item->update($validated);
        $this->audit->record('capd', 'item.updated', "CapdItem #{$item->id}", $before, $item->toArray());

        return response()->json($item);
    }

    public function destroy(int $id): JsonResponse
    {
        $item = CapdItem::findOrFail($id);
        $before = $item->toArray();
        $item->delete();

        $this->audit->record('capd', 'item.deleted', "CapdItem #{$id}", $before, null);

        return response()->json(['deleted' => true]);
    }
}