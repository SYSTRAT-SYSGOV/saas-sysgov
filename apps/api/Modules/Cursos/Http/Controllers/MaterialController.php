<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Modules\Cursos\Enums\RegraLiberacao;
use Modules\Cursos\Enums\TipoMaterial;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Material;
use Modules\Cursos\Services\MaterialService;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class MaterialController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly MaterialService $materiais,
    ) {}

    public function index(Curso $curso): JsonResponse
    {
        $this->authorize('listar', [Material::class, $curso]);

        return response()->json($curso->materiais()->get());
    }

    public function store(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json($this->materiais->criar($curso, $dados), 201));
    }

    public function show(Material $material): JsonResponse
    {
        $this->authorize('view', $material);

        return response()->json($material);
    }

    public function update(Request $request, Material $material): JsonResponse
    {
        $this->authorize('update', $material->curso);
        $dados = $request->validate($this->regras(parcial: true));

        return $this->executar(fn () => response()->json($this->materiais->atualizar($material, $dados)));
    }

    public function destroy(Material $material): JsonResponse
    {
        $this->authorize('update', $material->curso);
        $this->materiais->excluir($material);

        return response()->json(['deleted' => true]);
    }

    public function reordenar(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);
        $dados = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']]);

        return $this->executar(fn () => response()->json($this->materiais->reordenar($curso, $dados['ids'])));
    }

    public function definirArquivo(Request $request, Material $material): JsonResponse
    {
        $this->authorize('update', $material->curso);
        $request->validate(['arquivo' => ['required', 'file', 'mimetypes:application/pdf', 'max:20480']]);

        return $this->executar(fn () => response()->json($this->materiais->definirArquivo($material, $request->file('arquivo'))));
    }

    /** O PDF só sai por aqui, depois da política de acesso (design D3): nunca por URL pública. */
    public function arquivo(Material $material): StreamedResponse|JsonResponse
    {
        $this->authorize('view', $material);

        $disco = Storage::disk(MaterialService::DISCO_ARQUIVOS);
        if (!$material->tipoEnum()->is(TipoMaterial::Arquivo) || $material->arquivo_path === null || !$disco->exists($material->arquivo_path)) {
            return response()->json(['error' => 'Este material não tem arquivo.'], 404);
        }

        return $disco->response($material->arquivo_path, $material->arquivo_nome, [
            'Content-Type' => 'application/pdf',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }

    /**
     * @return array<string, mixed>
     */
    private function regras(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'tipo' => [$obrigatorio, Rule::enum(TipoMaterial::class)],
            'titulo' => [$obrigatorio, 'string', 'max:255'],
            'descricao' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'aula_id' => ['sometimes', 'nullable', 'integer'],
            'ordem' => ['sometimes', 'integer', 'min:1'],
            'publicado' => ['sometimes', 'boolean'],
            'conteudo' => ['sometimes', 'nullable', 'string', 'max:200000'],
            'url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'liberacao_regra' => ['sometimes', Rule::enum(RegraLiberacao::class)],
            'liberacao_dias' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:365'],
        ];
    }
}
