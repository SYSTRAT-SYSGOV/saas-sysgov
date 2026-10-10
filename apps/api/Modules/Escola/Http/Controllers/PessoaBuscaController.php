<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Escola\Models\MembroEquipe;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;

/**
 * Busca no Cadastro de Pessoas para escolher membros da equipe gestora (D7). Devolve só o mínimo
 * (id, nome e CPF mascarado) e exige a mesma permissão de cadastrar a equipe — o usuário do
 * Escola não precisa das permissões do módulo Pessoas para isso.
 */
final class PessoaBuscaController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('create', MembroEquipe::class);
        $busca = trim((string) $request->query('busca', ''));
        if (mb_strlen($busca) < 3) {
            return response()->json([]);
        }

        $cpf = Documento::somenteDigitos($busca);
        $pessoas = Pessoa::query()
            ->when(strlen($cpf) === 11, fn ($q) => $q->where('cpf_hash', Documento::hash($cpf)), fn ($q) => $q->where('nome', 'like', "%{$busca}%"))
            ->orderBy('nome')
            ->limit(20)
            ->get();

        return response()->json($pessoas->map(fn (Pessoa $p): array => ['id' => $p->id, 'nome' => $p->nome, 'cpf_mascarado' => $p->cpf_mascarado])->values());
    }
}
