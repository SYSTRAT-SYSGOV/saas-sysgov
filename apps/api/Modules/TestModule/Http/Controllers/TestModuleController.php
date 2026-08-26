<?php

declare(strict_types=1);

namespace Modules\TestModule\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\TestModule\Models\TestModuleItem;

final class TestModuleController extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox
    ) {}

    public function index(Request $request): JsonResponse
    {
        $items = TestModuleItem::query()
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

        $item = TestModuleItem::create($validated);

        $this->audit->record('testmodule', 'item.created', "TestModuleItem #{$item->id}", null, $item->toArray());
        $this->outbox->publish('testmodule', 'ItemCreated', ['id' => $item->id, 'title' => $item->title]);

        return response()->json($item, 201);
    }

    public function show(int $id): JsonResponse
    {
        $item = TestModuleItem::findOrFail($id);
        return response()->json($item);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $item = TestModuleItem::findOrFail($id);
        $before = $item->toArray();

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'amount_cents' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'string'],
        ]);

        $item->update($validated);
        $this->audit->record('testmodule', 'item.updated', "TestModuleItem #{$item->id}", $before, $item->toArray());

        return response()->json($item);
    }

    public function destroy(int $id): JsonResponse
    {
        $item = TestModuleItem::findOrFail($id);
        $before = $item->toArray();
        $item->delete();

        $this->audit->record('testmodule', 'item.deleted', "TestModuleItem #{$id}", $before, null);

        return response()->json(['deleted' => true]);
    }
}