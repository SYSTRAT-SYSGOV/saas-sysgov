<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Pessoas\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Pessoas\Models\PessoaIntegracao;

final class IntegracaoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.integracoes.manage');

        return response()->json(PessoaIntegracao::orderBy('nome')->get());
    }

    public function show(Request $request, PessoaIntegracao $integracao): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.integracoes.manage');

        return response()->json($integracao);
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.integracoes.manage');

        $integracao = PessoaIntegracao::create($this->validar($request));
        $this->audit->record('pessoas', 'integracao.criada', "Integracao #{$integracao->id}", null, $this->paraAuditoria($integracao));

        return response()->json($integracao, 201);
    }

    public function update(Request $request, PessoaIntegracao $integracao): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.integracoes.manage');

        $antes = $this->paraAuditoria($integracao);
        $integracao->update($this->validar($request, $integracao));
        $this->audit->record('pessoas', 'integracao.atualizada', "Integracao #{$integracao->id}", $antes, $this->paraAuditoria($integracao));

        return response()->json($integracao);
    }

    /** @return array<string, mixed> */
    private function validar(Request $request, ?PessoaIntegracao $atual = null): array
    {
        $obrigatorio = $atual ? 'sometimes' : 'required';

        return $request->validate([
            'nome' => [$obrigatorio, 'string', 'max:100'],
            'api_url' => ['nullable', 'string', 'max:500', 'url'],
            'api_token' => ['nullable', 'string'],
            'field_mappings' => ['nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    /**
     * Nunca inclui o token em texto plano no log de auditoria.
     *
     * @return array<string, mixed>
     */
    private function paraAuditoria(PessoaIntegracao $integracao): array
    {
        return [...$integracao->toArray(), 'api_token_definido' => !empty($integracao->api_token)];
    }
}
