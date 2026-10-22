<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Assinatura;
use Modules\Cursos\Rules\ImagemPngOuJpeg;
use Modules\Cursos\Services\AssinaturaService;

/** Biblioteca de assinaturas do órgão (nome, cargo, registro profissional, imagem e selo). */
final class AssinaturaController extends Controller
{
    use RespondeErroDeNegocio;


    public function __construct(
        private readonly AssinaturaService $assinaturas,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Assinatura::class);

        return response()->json(['assinaturas' => Assinatura::query()->orderByDesc('ativa')->orderBy('nome')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Assinatura::class);

        return response()->json($this->assinaturas->criar($request->validate($this->regras())), 201);
    }

    public function update(Request $request, Assinatura $assinatura): JsonResponse
    {
        $this->authorize('update', $assinatura);

        return response()->json($this->assinaturas->atualizar($assinatura, $request->validate($this->regras(parcial: true))));
    }

    public function destroy(Assinatura $assinatura): JsonResponse
    {
        $this->authorize('delete', $assinatura);

        return $this->executar(function () use ($assinatura): JsonResponse {
            $this->assinaturas->excluir($assinatura);

            return response()->json(['deleted' => true]);
        });
    }

    public function imagem(Request $request, Assinatura $assinatura): JsonResponse
    {
        $this->authorize('update', $assinatura);
        $request->validate(['imagem' => self::regraImagem()]);

        return response()->json($this->assinaturas->definirImagem($assinatura, $request->file('imagem')));
    }

    public function selo(Request $request, Assinatura $assinatura): JsonResponse
    {
        $this->authorize('update', $assinatura);
        $request->validate(['imagem' => self::regraImagem()]);

        return response()->json($this->assinaturas->definirSelo($assinatura, $request->file('imagem')));
    }

    /**
     * PNG ou JPEG verificado pelo conteúdo real, até 2 MB.
     *
     * @return list<mixed>
     */
    private static function regraImagem(): array
    {
        return ['required', 'file', 'max:2048', new ImagemPngOuJpeg()];
    }

    /**
     * @return array<string, mixed>
     */
    private function regras(bool $parcial = false): array
    {
        return [
            'nome' => [$parcial ? 'sometimes' : 'required', 'string', 'max:150'],
            'cargo' => ['sometimes', 'nullable', 'string', 'max:150'],
            'registro_profissional' => ['sometimes', 'nullable', 'string', 'max:60'],
            'ativa' => ['sometimes', 'boolean'],
        ];
    }
}
