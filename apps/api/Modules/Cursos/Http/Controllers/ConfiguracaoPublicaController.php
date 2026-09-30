<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Services\ConfiguracaoPublicaService;

/**
 * Configuração da página pública do órgão (tarefa 3.2, design D10/D11) — `cursos.manage`, mesmo
 * corte de acesso de `EnvioController`/relatórios (`viewAny` de `Curso`, sem instância própria).
 */
final class ConfiguracaoPublicaController extends Controller
{
    public function __construct(
        private readonly ConfiguracaoPublicaService $configuracao,
        private readonly TenantContext $tenantContext,
    ) {}

    public function show(): JsonResponse
    {
        $this->authorize('viewAny', Curso::class);

        return response()->json($this->configuracao->obter($this->tenantContext->get()));
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Curso::class);

        $dados = $request->validate([
            'publico_habilitado' => ['sometimes', 'boolean'],
            'boas_vindas' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'documento_obrigatorio' => ['sometimes', 'boolean'],
            'termo' => ['sometimes', 'array'],
            'termo.texto' => ['sometimes', 'nullable', 'string', 'max:20000'],
        ]);

        return response()->json($this->configuracao->atualizar($this->tenantContext->get(), $dados));
    }
}
