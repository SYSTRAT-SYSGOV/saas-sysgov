<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Requerimentos\Models\TipoInstrumento;

final class TipoInstrumentoController extends Controller
{
    public function index(): JsonResponse
    {
        $tipos = TipoInstrumento::ativo()->ordenado()->get();

        return response()->json($tipos);
    }

    public function show(string $slug): JsonResponse
    {
        $tipo = TipoInstrumento::where('slug', $slug)->ativo()->firstOrFail();

        return response()->json($tipo);
    }

    public function store(Request $request): JsonResponse
    {
        // Parametrização de tipos de instrumento é ação de administração do módulo (module.json),
        // não de quem só cria/acompanha proposições — sem Policy própria (não há um único
        // recurso "dono" aqui), checagem direta da permissão dedicada.
        if (!$request->user()?->hasPermission('requerimentos.admin')) {
            abort(403);
        }

        $validated = $request->validate([
            'nome'                     => ['required', 'string', 'max:100'],
            'slug'                     => ['required', 'string', 'max:100', 'unique:requerimentos_tipos_instrumento,slug'],
            'descricao'                => ['nullable', 'string', 'max:255'],
            'poder_origem'             => ['required', 'string', 'in:camara,prefeitura'],
            'prazo_regimental_dias'    => ['nullable', 'integer', 'min:1'],
            'campos_especificos'       => ['nullable', 'array'],
            'exige_tramitacao_interna' => ['nullable', 'boolean'],
            'ordem'                    => ['nullable', 'integer', 'min:0'],
        ]);

        $tipo = TipoInstrumento::create($validated + ['ativo' => true]);

        return response()->json($tipo, 201);
    }

    public function update(string $slug, Request $request): JsonResponse
    {
        if (!$request->user()?->hasPermission('requerimentos.admin')) {
            abort(403);
        }

        $tipo = TipoInstrumento::where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'nome'                     => ['nullable', 'string', 'max:100'],
            'descricao'                => ['nullable', 'string', 'max:255'],
            'poder_origem'             => ['nullable', 'string', 'in:camara,prefeitura'],
            'prazo_regimental_dias'    => ['nullable', 'integer', 'min:1'],
            'campos_especificos'       => ['nullable', 'array'],
            'exige_tramitacao_interna' => ['nullable', 'boolean'],
            'ativo'                    => ['nullable', 'boolean'],
            'ordem'                    => ['nullable', 'integer', 'min:0'],
        ]);

        $tipo->update($validated);

        return response()->json($tipo);
    }
}