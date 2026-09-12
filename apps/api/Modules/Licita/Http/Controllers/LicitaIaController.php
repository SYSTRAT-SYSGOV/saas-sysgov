<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\Ai\AiException;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Licita\Services\LicitaTextoIaService;

/**
 * "Sugerir com IA" genérico para qualquer campo de texto rico (TinyMCE) do
 * Licita — usado pelo componente `RichTextEditorWithIa` do front sempre que
 * a tela não tem um prompt dedicado (ver DfdIaController para o caso
 * dedicado da Justificativa do DFD). Não grava nada: é só sugestão de texto,
 * por isso a permissão exigida é `licita.view` (o mesmo necessário para
 * sequer abrir as telas do módulo), não uma policy de escrita de uma
 * entidade específica.
 */
final class LicitaIaController extends Controller
{
    public function __construct(
        private readonly LicitaTextoIaService $service,
    ) {}

    public function sugerirTexto(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->is_platform_admin || $request->user()?->hasPermission('licita.view', app(TenantContext::class)->id()),
            403,
            'Sem permissão para usar a IA do módulo Licita.',
        );

        $data = $request->validate([
            'campo' => ['required', 'string', 'max:200'],
            'contexto' => ['sometimes', 'nullable', 'string', 'max:5000'],
            // Conteúdo já escrito no campo — quando vem preenchido, o botão
            // do front virou "Melhorar com IA": a IA expande esse texto em
            // vez de escrever do zero.
            'texto_atual' => ['sometimes', 'nullable', 'string', 'max:8000'],
        ]);

        try {
            $resultado = $this->service->sugerirTexto($data['campo'], $data['contexto'] ?? '', $data['texto_atual'] ?? null);
        } catch (AiException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($resultado);
    }
}
