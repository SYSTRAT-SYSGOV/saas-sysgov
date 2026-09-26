<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Setor;
use Modules\Cemiterios\Support\RegraNegocioException;

/** Cemitérios e setores/quadras (RF-01, RF-02). */
final class CemiterioController extends Controller
{
    use AutorizaPermissao;

    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        $tenantId = app(TenantContext::class)->id();
        $cacheKey = "tenant:{$tenantId}:cemiterios:parques:all";
        $ttl = now()->addMinutes(30);
        $queryBuilder = fn () => Cemiterio::query()
            ->with(['setores' => fn ($q) => $q->orderBy('codigo')])
            ->withCount(['setores', 'jazigos'])
            ->orderBy('nome')
            ->get();

        $cemiterios = Cache::supportsTags()
            ? Cache::tags(["tenant:{$tenantId}", 'cemiterios'])->remember($cacheKey, $ttl, $queryBuilder)
            : Cache::remember($cacheKey, $ttl, $queryBuilder);

        return response()->json($cemiterios);
    }

    public function show(Request $request, int $parque): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json(Cemiterio::with('setores')->findOrFail($parque));
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.inventario.manage');

        $cemiterio = Cemiterio::create($this->validarCemiterio($request));
        $this->audit->record('cemiterios', 'parque.created', "Cemiterio #{$cemiterio->id}", null, $cemiterio->toArray());
        $this->limparCache();

        return response()->json($cemiterio, 201);
    }

    public function update(Request $request, int $parque): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.inventario.manage');

        $cemiterio = Cemiterio::findOrFail($parque);
        $antes = $cemiterio->toArray();
        $cemiterio->update($this->validarCemiterio($request, $cemiterio));
        $this->audit->record('cemiterios', 'parque.updated', "Cemiterio #{$cemiterio->id}", $antes, $cemiterio->toArray());
        $this->limparCache();

        return response()->json($cemiterio);
    }

    public function destroy(Request $request, int $parque): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.inventario.manage');

        $cemiterio = Cemiterio::findOrFail($parque);

        if ($cemiterio->jazigos()->where('ocupacao', '>', 0)->exists()) {
            throw new RegraNegocioException('parque.com_jazigos_ocupados', 'Cemitério com jazigos ocupados não pode ser excluído; inative-o.');
        }

        $antes = $cemiterio->toArray();
        $cemiterio->delete();
        $this->audit->record('cemiterios', 'parque.deleted', "Cemiterio #{$parque}", $antes, null);
        $this->limparCache();

        return response()->json(['deleted' => true]);
    }

    public function storeSetor(Request $request, int $parque): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.inventario.manage');

        $cemiterio = Cemiterio::findOrFail($parque);
        $dados = $request->validate([
            'codigo' => ['required', 'string', 'max:30', Rule::unique('cemetery_sectors')->where('park_id', $cemiterio->id)->whereNull('deleted_at')],
            'descricao' => ['nullable', 'string', 'max:255'],
            'tipo_zona' => ['required', Rule::in(['jazigos', 'gavetas', 'ossuario', 'cova_publica'])],
        ]);

        $setor = $cemiterio->setores()->create($dados);
        $this->audit->record('cemiterios', 'setor.created', "Setor #{$setor->id}", null, $setor->toArray());
        $this->limparCache();

        return response()->json($setor, 201);
    }

    public function updateSetor(Request $request, int $parque, int $setor): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.inventario.manage');

        $registro = Setor::where('park_id', $parque)->findOrFail($setor);
        $antes = $registro->toArray();
        $registro->update($request->validate([
            'descricao' => ['nullable', 'string', 'max:255'],
            'tipo_zona' => ['sometimes', Rule::in(['jazigos', 'gavetas', 'ossuario', 'cova_publica'])],
        ]));
        $this->audit->record('cemiterios', 'setor.updated', "Setor #{$registro->id}", $antes, $registro->toArray());
        $this->limparCache();

        return response()->json($registro);
    }

    private function limparCache(): void
    {
        $tenantId = app(TenantContext::class)->id();
        if (Cache::supportsTags()) {
            Cache::tags(["tenant:{$tenantId}", 'cemiterios'])->flush();
        } else {
            Cache::forget("tenant:{$tenantId}:cemiterios:parques:all");
        }
    }

    /** @return array<string, mixed> */
    private function validarCemiterio(Request $request, ?Cemiterio $atual = null): array
    {
        $obrigatorio = $atual ? 'sometimes' : 'required';

        return $request->validate([
            'codigo' => [$obrigatorio, 'string', 'max:30', Rule::unique('cemetery_parks')
                ->where('tenant_id', app(TenantContext::class)->id())
                ->whereNull('deleted_at')
                ->ignore($atual?->id)],
            'nome' => [$obrigatorio, 'string', 'max:255'],
            'endereco' => ['nullable', 'string', 'max:255'],
            'tipo' => ['sometimes', 'nullable', Rule::in(['municipal', 'publico', 'tradicional', 'parque', 'distrital', 'privado', 'outro'])],
            'situacao' => ['sometimes', Rule::in(['ativo', 'inativo'])],
            'responsavel' => ['nullable', 'string', 'max:255'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'portaria_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'portaria_lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);
    }
}
