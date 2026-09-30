<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Modules\Pessoas\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Pessoas\Http\Requests\PromoverPessoaRequest;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\PromocaoUsuarioService;

final class PromocaoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(private readonly PromocaoUsuarioService $promocao) {}

    public function promover(PromoverPessoaRequest $request, Pessoa $pessoa): JsonResponse
    {
        $this->authorize('promote', $pessoa);

        $dados = $request->validated();
        $role = Role::findOrFail($dados['role_id']);
        $vinculo = $this->promocao->promover($pessoa, $dados['email'], $role, $request->user()?->id);

        return response()->json($vinculo, 201);
    }
}
