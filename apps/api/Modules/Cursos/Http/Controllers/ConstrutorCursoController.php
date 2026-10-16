<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Services\CertificadoService;
use Modules\Cursos\Services\ConstrutorCursoService;

/** Construtor visual por curso (D8): leiaute salvo como o modelo visual do curso. */
final class ConstrutorCursoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly ConstrutorCursoService $construtor,
        private readonly CertificadoService $certificados,
    ) {}

    public function show(Curso $curso): JsonResponse
    {
        $this->authorize('create', ModeloCertificado::class);

        return response()->json(['leiaute' => $this->construtor->leiaute($curso)]);
    }

    public function update(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('create', ModeloCertificado::class);
        $dados = $request->validate(self::regras());

        return $this->executar(fn () => response()->json(['leiaute' => $this->construtor->salvar($curso, $dados)]));
    }

    /** PDF de exemplo com as alterações ainda não salvas; não grava modelo nem certificado. */
    public function preVisualizar(Request $request, Curso $curso): JsonResponse|Response
    {
        $this->authorize('create', ModeloCertificado::class);
        $dados = $request->validate(self::regras());

        try {
            $pdf = $this->certificados->preVisualizar($this->construtor->previa($curso, $dados), $curso);
        } catch (\DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="pre-visualizacao.pdf"',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private static function regras(): array
    {
        return [
            'fundo_id' => ['required', 'integer'],
            'texto_id' => ['required', 'integer'],
            'elementos' => ['present', 'array'],
            'verso_ativo' => ['sometimes', 'boolean'],
        ];
    }
}
