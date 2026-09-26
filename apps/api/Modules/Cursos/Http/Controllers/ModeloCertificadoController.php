<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Services\ModeloCertificadoService;

final class ModeloCertificadoController extends Controller
{
    use RespondeErroDeNegocio;

    private const REGRA_IMAGEM = ['required', 'image', 'mimes:jpg,jpeg,png', 'max:2048'];

    public function __construct(
        private readonly ModeloCertificadoService $modelos,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', ModeloCertificado::class);

        return response()->json([
            'modelos' => ModeloCertificado::query()->orderByDesc('padrao')->orderBy('nome')->get(),
            'campos_dinamicos' => ModeloCertificadoService::PLACEHOLDERS,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ModeloCertificado::class);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json($this->modelos->criar($dados), 201));
    }

    public function update(Request $request, ModeloCertificado $modelo): JsonResponse
    {
        $this->authorize('update', $modelo);
        $dados = $request->validate($this->regras(parcial: true));

        return $this->executar(fn () => response()->json($this->modelos->atualizar($modelo, $dados)));
    }

    public function destroy(ModeloCertificado $modelo): JsonResponse
    {
        $this->authorize('delete', $modelo);
        $this->modelos->excluir($modelo);

        return response()->json(['deleted' => true]);
    }

    public function logotipo(Request $request, ModeloCertificado $modelo): JsonResponse
    {
        $this->authorize('update', $modelo);
        $request->validate(['imagem' => self::REGRA_IMAGEM]);

        return response()->json($this->modelos->definirLogotipo($modelo, $request->file('imagem')));
    }

    public function imagemAssinatura(Request $request, ModeloCertificado $modelo, int $indice): JsonResponse
    {
        $this->authorize('update', $modelo);
        $request->validate(['imagem' => self::REGRA_IMAGEM]);

        return $this->executar(fn () => response()->json($this->modelos->definirImagemAssinatura($modelo, $indice, $request->file('imagem'))));
    }

    /**
     * @return array<string, mixed>
     */
    private function regras(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'nome' => [$obrigatorio, 'string', 'max:150'],
            'titulo' => [$obrigatorio, 'string', 'max:150'],
            'corpo' => [$obrigatorio, 'string', 'max:5000'],
            'padrao' => ['sometimes', 'boolean'],
            'assinaturas' => ['sometimes', 'array', 'max:' . ModeloCertificadoService::MAX_ASSINATURAS],
            'assinaturas.*.nome' => ['required', 'string', 'max:150'],
            'assinaturas.*.cargo' => ['required', 'string', 'max:150'],
        ];
    }
}
