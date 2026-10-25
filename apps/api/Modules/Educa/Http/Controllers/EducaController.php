<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Educa\Models\EducaItem;

final class EducaController extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox
    ) {}

    public function index(Request $request): JsonResponse
    {
        $items = EducaItem::query()
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

        $item = EducaItem::create($validated);

        $this->audit->record('educa', 'item.created', "EducaItem #{$item->id}", null, $item->toArray());
        $this->outbox->publish('educa', 'ItemCreated', ['id' => $item->id, 'title' => $item->title]);

        return response()->json($item, 201);
    }

    public function show(int $id): JsonResponse
    {
        $item = EducaItem::findOrFail($id);
        return response()->json($item);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $item = EducaItem::findOrFail($id);
        $before = $item->toArray();

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'amount_cents' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'string'],
        ]);

        $item->update($validated);
        $this->audit->record('educa', 'item.updated', "EducaItem #{$item->id}", $before, $item->toArray());

        return response()->json($item);
    }

    public function destroy(int $id): JsonResponse
    {
        $item = EducaItem::findOrFail($id);
        $before = $item->toArray();
        $item->delete();

        $this->audit->record('educa', 'item.deleted', "EducaItem #{$id}", $before, null);

        return response()->json(['deleted' => true]);
    }
}