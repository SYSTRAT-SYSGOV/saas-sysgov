<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Fundo;
use Modules\Cursos\Models\TextoCertificado;
use Modules\Cursos\Rules\ImagemPngOuJpeg;
use Modules\Cursos\Services\BibliotecaCertificadoService;
use Modules\Cursos\Services\ModeloCertificadoService;

/** Bibliotecas de fundos e de modelos de texto do certificado (D8). */
final class BibliotecaCertificadoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly BibliotecaCertificadoService $biblioteca,
    ) {}

    // ------------------------------------------------------------------ fundos

    public function fundos(): JsonResponse
    {
        $this->authorize('viewAny', Fundo::class);

        return response()->json(['fundos' => Fundo::query()->orderByDesc('ativo')->orderBy('nome')->get()]);
    }

    public function criarFundo(Request $request): JsonResponse
    {
        $this->authorize('create', Fundo::class);
        $dados = $request->validate([...$this->regrasFundo(), 'imagem' => ['required', 'file', 'max:5120', new ImagemPngOuJpeg()]]);
        unset($dados['imagem']);

        return $this->executar(fn () => response()->json($this->biblioteca->criarFundo($dados, $request->file('imagem')), 201));
    }

    /** Atualiza nome, descrição e status; com `imagem` (multipart), troca também o arquivo. */
    public function atualizarFundo(Request $request, Fundo $fundo): JsonResponse
    {
        $this->authorize('update', $fundo);
        $dados = $request->validate([...$this->regrasFundo(parcial: true), 'imagem' => ['sometimes', 'file', 'max:5120', new ImagemPngOuJpeg()]]);
        unset($dados['imagem']);

        return $this->executar(fn () => response()->json($this->biblioteca->atualizarFundo($fundo, $dados, $request->file('imagem'))));
    }

    public function excluirFundo(Fundo $fundo): JsonResponse
    {
        $this->authorize('delete', $fundo);

        return $this->executar(function () use ($fundo): JsonResponse {
            $this->biblioteca->excluirFundo($fundo);

            return response()->json(['deleted' => true]);
        });
    }

    // ------------------------------------------------------------------ textos

    public function textos(): JsonResponse
    {
        $this->authorize('viewAny', TextoCertificado::class);

        return response()->json([
            'textos' => TextoCertificado::query()->orderByDesc('ativo')->orderBy('nome')->get(),
            'campos' => array_keys(ModeloCertificadoService::VARIAVEIS),
        ]);
    }

    public function criarTexto(Request $request): JsonResponse
    {
        $this->authorize('create', TextoCertificado::class);

        return $this->executar(fn () => response()->json($this->biblioteca->criarTexto($request->validate($this->regrasTexto())), 201));
    }

    public function atualizarTexto(Request $request, TextoCertificado $texto): JsonResponse
    {
        $this->authorize('update', $texto);

        return $this->executar(fn () => response()->json($this->biblioteca->atualizarTexto($texto, $request->validate($this->regrasTexto(parcial: true)))));
    }

    public function excluirTexto(TextoCertificado $texto): JsonResponse
    {
        $this->authorize('delete', $texto);

        return $this->executar(function () use ($texto): JsonResponse {
            $this->biblioteca->excluirTexto($texto);

            return response()->json(['deleted' => true]);
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function regrasFundo(bool $parcial = false): array
    {
        return [
            'nome' => [$parcial ? 'sometimes' : 'required', 'string', 'max:150'],
            'descricao' => ['sometimes', 'nullable', 'string', 'max:255'],
            'ativo' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function regrasTexto(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'nome' => [$obrigatorio, 'string', 'max:150'],
            'tipo_certificado' => ['sometimes', 'nullable', 'string', 'max:150'],
            'texto_principal' => [$obrigatorio, 'string', 'max:5000'],
            'texto_complementar' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'observacoes' => ['sometimes', 'nullable', 'string', 'max:255'],
            'ativo' => ['sometimes', 'boolean'],
        ];
    }
}
