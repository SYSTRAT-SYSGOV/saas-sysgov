<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\ProcessoService;

final class ProcessoController extends Controller
{
    public function __construct(
        private readonly ProcessoService $processos,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Processo::class);

        $query = Processo::query()->with('dfd')->latest();

        if ($fase = $request->query('fase_atual')) {
            $query->where('fase_atual', $fase);
        }

        if ($status = $request->query('status_geral')) {
            $query->where('status_geral', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('numero', 'like', "%{$search}%")
                    ->orWhere('objeto', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate((int) $request->query('per_page', 25)));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Processo::class);

        $data = $request->validate([
            'numero' => ['required', 'string', 'max:50'],
            'ano' => ['required', 'integer', 'min:2000', 'max:2100'],
            'objeto' => ['nullable', 'string', 'max:500'],
        ]);

        $processo = $this->processos->criar($data, $request->user());

        return response()->json($processo, 201);
    }

    public function show(int $id): JsonResponse
    {
        $processo = Processo::with(['dfd.elaborador', 'dfd.aprovador', 'dfd.versoes.usuario', 'criador'])->findOrFail($id);
        $this->authorize('view', $processo);

        return response()->json($processo);
    }
}
