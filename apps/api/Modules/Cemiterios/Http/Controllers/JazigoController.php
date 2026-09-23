<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\Setor;
use Modules\Cemiterios\Services\JazigoEstadoService;
use Modules\Cemiterios\Services\JazigoHistoricoService;

/** Jazigos e ossuários (RF-03, RF-04, RF-19). */
final class JazigoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly JazigoEstadoService $estados,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        $jazigos = Jazigo::query()
            ->with(['setor', 'cemiterio'])
            ->when($request->query('parque'), fn ($q, $v) => $q->where('park_id', $v))
            ->when($request->query('setor'), fn ($q, $v) => $q->where('sector_id', $v))
            ->when($request->query('estado'), fn ($q, $v) => $q->where('estado', $v))
            ->when($request->query('tipo'), fn ($q, $v) => $q->where('tipo', $v))
            ->when($request->query('q'), fn ($q, $v) => $q->where('codigo', 'like', "%{$v}%"))
            ->orderBy('codigo')
            ->paginate(min((int) $request->query('per_page', 50), 200));

        return response()->json($jazigos);
    }

    public function show(Request $request, int $jazigo): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json(Jazigo::with(['setor', 'cemiterio'])->findOrFail($jazigo));
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.inventario.manage');

        $dados = $request->validate([
            'sector_id' => ['required', 'integer'],
            'codigo' => ['required', 'string', 'max:40'],
            'tipo' => ['required', Rule::in(Jazigo::TIPOS)],
            'capacidade' => ['required', 'integer', 'min:1', 'max:50'],
            'comprimento_m' => ['nullable', 'numeric', 'gt:0'],
            'largura_m' => ['nullable', 'numeric', 'gt:0'],
        ]);

        $setor = Setor::findOrFail($dados['sector_id']);
        abort_if(
            Jazigo::where('park_id', $setor->park_id)->where('codigo', $dados['codigo'])->exists(),
            422,
            'Já existe jazigo com este código no cemitério.'
        );

        $jazigo = Jazigo::create($dados + ['park_id' => $setor->park_id]);
        $this->audit->record('cemiterios', 'jazigo.created', "Jazigo #{$jazigo->id}", null, $jazigo->toArray());

        return response()->json($jazigo->refresh(), 201);
    }

    public function update(Request $request, int $jazigo): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.inventario.manage');

        $registro = Jazigo::findOrFail($jazigo);
        $dados = $request->validate([
            'tipo' => ['sometimes', Rule::in(Jazigo::TIPOS)],
            'capacidade' => ['sometimes', 'integer', 'min:' . max(1, $registro->ocupacao), 'max:50'],
            'comprimento_m' => ['nullable', 'numeric', 'gt:0'],
            'largura_m' => ['nullable', 'numeric', 'gt:0'],
        ]);

        $antes = $registro->toArray();
        $registro->update($dados);
        $this->audit->record('cemiterios', 'jazigo.updated', "Jazigo #{$registro->id}", $antes, $registro->toArray());

        return response()->json($registro);
    }

    /** Transição manual: entrar/sair de Em Ruína/Manutenção (RF-04). */
    public function estado(Request $request, int $jazigo): JsonResponse
    {
        if (!$request->user()->hasPermission('cemiterios.inventario.manage')) {
            $this->autorizar($request, 'cemiterios.gis.edit');
        }

        $dados = $request->validate([
            'para' => ['required', Rule::in(['manutencao', 'restaurar'])],
            'motivo' => ['required', 'string', 'max:255'],
            'lock_version' => ['required', 'integer'],
        ]);

        $registro = Jazigo::findOrFail($jazigo);
        $antes = $registro->toArray();
        $registro = $this->estados->manual($registro, $dados['para'], $dados['motivo'], $dados['lock_version']);
        $this->audit->record('cemiterios', 'jazigo.estado', "Jazigo #{$registro->id}", $antes, $registro->toArray());

        return response()->json($registro);
    }

    public function historico(Request $request, int $jazigo, JazigoHistoricoService $historico): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json($historico->linhaDoTempo(Jazigo::findOrFail($jazigo)));
    }
}
