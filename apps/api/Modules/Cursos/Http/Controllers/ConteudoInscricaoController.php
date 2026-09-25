<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Services\ConteudoInscricaoService;

/** Materiais, avaliações e nota de uma inscrição (área do participante). */
final class ConteudoInscricaoController extends Controller
{
    public function __construct(
        private readonly ConteudoInscricaoService $conteudo,
    ) {}

    public function show(Inscricao $inscricao): JsonResponse
    {
        $this->authorize('view', $inscricao);

        return response()->json($this->conteudo->montar($inscricao->load('turma.curso')));
    }
}
