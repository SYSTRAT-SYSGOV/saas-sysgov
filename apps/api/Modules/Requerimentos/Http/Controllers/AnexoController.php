<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Modules\Requerimentos\Models\Anexo;
use Modules\Requerimentos\Models\Proposicao;
use Modules\Requerimentos\Models\Resposta;
use Modules\Requerimentos\Services\AnexoService;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class AnexoController extends Controller
{
    public function __construct(
        private readonly AnexoService $anexos,
    ) {}

    public function storeParaProposicao(Request $request, int $proposicao): JsonResponse
    {
        $proposicao = Proposicao::findOrFail($proposicao);
        $this->authorize('anexar', $proposicao);
        $this->requestFileValidado($request);

        /** @var User $user */
        $user = $request->user();

        $anexo = $this->anexos->anexar($proposicao, $request->file('arquivo'), $user);

        return response()->json($anexo->load('uploader:id,name'), 201);
    }

    public function storeParaResposta(Request $request, int $resposta): JsonResponse
    {
        $resposta = Resposta::findOrFail($resposta);
        $this->authorize('responder', $resposta->tramitacao->proposicao);
        $this->requestFileValidado($request);

        if ($resposta->isEnviado()) {
            return response()->json(['message' => 'Resposta já enviada não pode receber novos anexos.'], 422);
        }

        /** @var User $user */
        $user = $request->user();

        $anexo = $this->anexos->anexar($resposta, $request->file('arquivo'), $user);

        return response()->json($anexo->load('uploader:id,name'), 201);
    }

    public function download(int $id): StreamedResponse|JsonResponse
    {
        $anexo = Anexo::findOrFail($id);
        $this->authorize('view', $this->proposicaoDoAnexo($anexo));

        $disco = Storage::disk(AnexoService::DISCO);
        if (! $disco->exists($anexo->url_armazenamento)) {
            return response()->json(['message' => 'Arquivo não encontrado.'], 404);
        }

        return $disco->response($anexo->url_armazenamento, $anexo->nome_arquivo, [
            'Content-Type' => $anexo->mime_type,
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }

    public function destroy(int $id): JsonResponse
    {
        $anexo = Anexo::findOrFail($id);
        $anexavel = $anexo->anexavel;
        $proposicao = $this->proposicaoDoAnexo($anexo);

        $this->authorize($anexavel instanceof Resposta ? 'responder' : 'anexar', $proposicao);

        if ($anexavel instanceof Resposta && $anexavel->isEnviado()) {
            return response()->json(['message' => 'Resposta já enviada não pode ter anexos removidos.'], 422);
        }

        $this->anexos->excluir($anexo);

        return response()->json(['deleted' => true]);
    }

    private function requestFileValidado(Request $request): void
    {
        $request->validate([
            'arquivo' => [
                'required',
                'file',
                'mimetypes:' . implode(',', AnexoService::MIMES_PERMITIDOS),
                'max:' . AnexoService::TAMANHO_MAXIMO_KB,
            ],
        ]);
    }

    private function proposicaoDoAnexo(Anexo $anexo): Proposicao
    {
        $anexavel = $anexo->anexavel;

        if ($anexavel instanceof Resposta) {
            return $anexavel->tramitacao->proposicao;
        }

        if ($anexavel instanceof Proposicao) {
            return $anexavel;
        }

        throw new \RuntimeException('Anexo com entidade associada desconhecida.');
    }
}
