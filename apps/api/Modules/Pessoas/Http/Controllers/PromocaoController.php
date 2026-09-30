<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Pessoas\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\PromocaoUsuarioService;

final class PromocaoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(private readonly PromocaoUsuarioService $promocao) {}

    public function promover(Request $request, Pessoa $pessoa): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.promote');

        $dados = $request->validate([
            'email' => ['required', 'email'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
        ]);

        $role = Role::findOrFail($dados['role_id']);
        $vinculo = $this->promocao->promover($pessoa, $dados['email'], $role, $request->user()->id);

        return response()->json($vinculo, 201);
    }
}
