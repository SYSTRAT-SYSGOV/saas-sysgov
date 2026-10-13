<?php

declare(strict_types=1);

namespace Modules\Inservivel\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Inservivel\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Inservivel\Models\Configuracao;
use Modules\Inservivel\Services\ConfiguracaoService;

/** Configurações do módulo por prefeitura (D10; spec: Configurações e importação). */
final class ConfiguracaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly ConfiguracaoService $configuracao,
        private readonly TenantContext $tenant,
    ) {}

    public function show(): JsonResponse
    {
        $this->authorize('viewAny', Configuracao::class);

        return response()->json($this->formatar($this->configuracao->vigente()));
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorize('create', Configuracao::class);
        $dados = $request->validate([
            'doador_nome' => ['nullable', 'string', 'max:255'],
            'doador_cnpj' => ['nullable', 'string', 'max:20'],
            'doador_cidade' => ['nullable', 'string', 'max:120'],
            'doador_uf' => ['nullable', 'string', 'size:2'],
            'foro' => ['nullable', 'string', 'max:120'],
            'responsavel_nome' => ['nullable', 'string', 'max:255'],
            'responsavel_cargo' => ['nullable', 'string', 'max:255'],
            'legislacao' => ['sometimes', 'array', 'max:30'],
            'legislacao.*' => ['nullable', 'string', 'max:500'],
            'documentos_exigidos' => ['sometimes', 'array', 'min:1', 'max:30'],
            'documentos_exigidos.*.chave' => ['nullable', 'string', 'max:60'],
            'documentos_exigidos.*.nome' => ['required', 'string', 'max:150'],
            'documentos_exigidos.*.obrigatorio' => ['required', 'boolean'],
        ]);

        return $this->executar(fn (): JsonResponse => response()->json($this->formatar($this->configuracao->atualizar($dados))));
    }

    /** @return array<string, mixed> */
    private function formatar(Configuracao $c): array
    {
        $slug = $this->tenant->get()->getAttribute('slug');

        return [
            ...$c->only(['doador_nome', 'doador_cnpj', 'doador_cidade', 'doador_uf', 'foro', 'responsavel_nome', 'responsavel_cargo']),
            'legislacao' => $c->legislacao ?? [],
            'documentos_exigidos' => $c->documentos_exigidos ?? [],
            // Caminho no painel do cliente: o front monta o link completo com a própria origem.
            'caminho_cadastro_publico' => "/inservivel/entidades/{$slug}/cadastro",
        ];
    }
}
