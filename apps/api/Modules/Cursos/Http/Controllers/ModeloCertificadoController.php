<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Rules\ImagemPngOuJpeg;
use Modules\Cursos\Services\CertificadoService;
use Modules\Cursos\Services\LeiauteCertificado;
use Modules\Cursos\Services\ModeloCertificadoService;
use Symfony\Component\HttpFoundation\Response;

final class ModeloCertificadoController extends Controller
{
    use RespondeErroDeNegocio;

    private const REGRA_IMAGEM = ['required', 'image', 'mimes:jpg,jpeg,png', 'max:2048'];

    /** Fundo: PNG ou JPEG verificado pelo conteúdo, até 5 MB (salvo como JPEG de até 2480 px). */
    private const REGRA_FUNDO = ['required', 'file', 'max:5120'];

    public function __construct(
        private readonly ModeloCertificadoService $modelos,
        private readonly CertificadoService $certificados,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', ModeloCertificado::class);

        return response()->json([
            'modelos' => ModeloCertificado::query()->orderByDesc('padrao')->orderBy('nome')->get(),
            'campos_dinamicos' => array_keys(ModeloCertificadoService::VARIAVEIS),
            // Catálogo do construtor visual: tudo o que o painel precisa para montar o leiaute.
            'leiaute' => [
                'paginas' => LeiauteCertificado::PAGINA,
                'campos' => LeiauteCertificado::CAMPOS,
                'campos_texto_livre' => array_keys(ModeloCertificadoService::VARIAVEIS),
                'fontes' => LeiauteCertificado::FONTES,
                'alinhamentos' => LeiauteCertificado::ALINHAMENTOS,
                'max_elementos' => LeiauteCertificado::MAX_ELEMENTOS,
                'tamanho_min' => LeiauteCertificado::TAMANHO_MIN,
                'tamanho_max' => LeiauteCertificado::TAMANHO_MAX,
                'padrao' => ['paisagem' => LeiauteCertificado::padrao('paisagem'), 'retrato' => LeiauteCertificado::padrao('retrato')],
            ],
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

    public function fundo(Request $request, ModeloCertificado $modelo): JsonResponse
    {
        $this->authorize('update', $modelo);
        $request->validate(['imagem' => [...self::REGRA_FUNDO, new ImagemPngOuJpeg()]]);

        return response()->json($this->modelos->definirFundo($modelo, $request->file('imagem')));
    }

    public function versoFundo(Request $request, ModeloCertificado $modelo): JsonResponse
    {
        $this->authorize('update', $modelo);
        $request->validate(['imagem' => [...self::REGRA_FUNDO, new ImagemPngOuJpeg()]]);

        return response()->json($this->modelos->definirVersoFundo($modelo, $request->file('imagem')));
    }

    /**
     * PDF de exemplo do modelo com as alterações do construtor ainda não salvas (opcionais no
     * corpo da requisição). Não grava modelo nem certificado.
     */
    public function preVisualizar(Request $request, ModeloCertificado $modelo): JsonResponse|Response
    {
        $this->authorize('update', $modelo);
        $dados = $request->validate($this->regras(parcial: true));

        try {
            $pdf = $this->certificados->preVisualizar($this->modelos->previa($modelo, $dados));
        } catch (\DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="pre-visualizacao.pdf"',
        ]);
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
            'tipo' => ['sometimes', 'string', 'in:' . ModeloCertificado::TIPO_PADRAO . ',' . ModeloCertificado::TIPO_VISUAL],
            'orientacao' => ['sometimes', 'string', 'in:' . implode(',', LeiauteCertificado::ORIENTACOES)],
            // Formato de cada elemento validado em LeiauteCertificado (mensagens com o elemento).
            'elementos' => ['sometimes', 'nullable', 'array', 'max:' . LeiauteCertificado::MAX_ELEMENTOS],
            'verso_ativo' => ['sometimes', 'boolean'],
            'assinaturas' => ['sometimes', 'array', 'max:' . ModeloCertificadoService::MAX_ASSINATURAS],
            'assinaturas.*.nome' => ['required', 'string', 'max:150'],
            'assinaturas.*.cargo' => ['required', 'string', 'max:150'],
        ];
    }
}
