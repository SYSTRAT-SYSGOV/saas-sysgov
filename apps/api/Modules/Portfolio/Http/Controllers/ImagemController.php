<?php

declare(strict_types=1);

namespace Modules\Portfolio\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Modules\Portfolio\Http\Requests\EnviarImagemRequest;
use Modules\Portfolio\Models\Imagem;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Services\ImagemService;
use Modules\Portfolio\Services\TrabalhoService;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ImagemController extends Controller
{
    public function __construct(private readonly ImagemService $imagens) {}

    public function store(EnviarImagemRequest $request, Trabalho $trabalho): JsonResponse
    {
        abort_unless(Gate::allows('view', $trabalho), 404);
        $this->authorize('update', $trabalho);
        /** @var \Illuminate\Http\UploadedFile $arquivo */
        $arquivo = $request->file('imagem');
        $imagem = $this->imagens->adicionar($trabalho, $arquivo);

        return response()->json(['data' => [
            'id' => $imagem->id,
            'nome' => $imagem->nome_original,
            'url' => "/portfolio/trabalhos/{$trabalho->id}/imagens/{$imagem->id}",
        ]], 201);
    }

    public function show(Trabalho $trabalho, Imagem $imagem): StreamedResponse
    {
        $this->daquele($trabalho, $imagem);
        abort_unless(Storage::disk(TrabalhoService::DISCO)->exists($imagem->path), 404);

        return Storage::disk(TrabalhoService::DISCO)->response($imagem->path, $imagem->nome_original, ['Content-Type' => 'image/jpeg']);
    }

    public function destroy(Trabalho $trabalho, Imagem $imagem): JsonResponse
    {
        $this->daquele($trabalho, $imagem);
        $this->authorize('update', $trabalho);
        $this->imagens->remover($imagem);

        return response()->json(['deleted' => true]);
    }

    private function daquele(Trabalho $trabalho, Imagem $imagem): void
    {
        abort_unless(Gate::allows('view', $trabalho) && $imagem->trabalho_id === $trabalho->id, 404);
    }
}
