<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Models\Inscricao;

/**
 * Respostas do formulário de inscrição (tarefa 4.4, design D9) — mesma regra de visibilidade da
 * inscrição (`InscricaoPolicy::view`: próprio participante, Administrador, instrutores da
 * turma), mas negada com `404` em vez do `403` padrão de `authorize()` (spec: "recusa com 404"):
 * não confirma nem nega a existência da inscrição pra quem não pode vê-la, mesmo dado pessoal
 * das respostas de outro participante nunca vaza nem indiretamente pelo código do erro. Outro
 * tenant já vira `404` sozinho, antes de chegar aqui — o binding da rota não enxerga fora do
 * tenant (`Inscricao` é `TenantAware`).
 */
final class RespostaInscricaoController extends Controller
{
    public function index(Request $request, Inscricao $inscricao): JsonResponse
    {
        abort_if($request->user()?->cannot('view', $inscricao) ?? true, 404);

        return response()->json($inscricao->respostas()->orderBy('id')->get(['id', 'campo_id', 'rotulo', 'tipo', 'valor']));
    }
}
