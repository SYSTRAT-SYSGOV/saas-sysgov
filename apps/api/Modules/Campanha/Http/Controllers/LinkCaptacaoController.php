<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Modules\Campanha\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Campanha\Models\LinkCaptacao;
use Modules\Campanha\Services\LinkCaptacaoService;

/** Links de captação de eleitores da campanha de trabalho, com contagem de cadastros e QR Code. */
final class LinkCaptacaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly LinkCaptacaoService $links,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', LinkCaptacao::class);
        $links = LinkCaptacao::query()->with(['coordenador', 'cabo'])->withCount('eleitores')->orderByDesc('ativo')->orderByDesc('id')->get()
            ->map(fn (LinkCaptacao $l): array => $this->formatar($l));

        return response()->json(['links' => $links]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', LinkCaptacao::class);
        $dados = $request->validate([
            'tipo' => ['required', Rule::in(LinkCaptacao::TIPOS)],
            'coordenador_id' => ['required_if:tipo,coordenador', 'nullable', 'integer'],
            'cabo_id' => ['required_if:tipo,cabo', 'nullable', 'integer'],
            'descricao' => ['nullable', 'string', 'max:150'],
        ]);

        return $this->executar(fn () => response()->json($this->formatar($this->links->criar($dados)->loadCount('eleitores')), 201));
    }

    public function update(Request $request, LinkCaptacao $link): JsonResponse
    {
        $this->authorize('update', $link);
        $dados = $request->validate([
            'ativo' => ['sometimes', 'boolean'],
            'descricao' => ['sometimes', 'nullable', 'string', 'max:150'],
        ]);

        return $this->executar(fn () => response()->json($this->formatar($this->links->atualizar($link, $dados)->loadCount('eleitores'))));
    }

    public function destroy(LinkCaptacao $link): JsonResponse
    {
        $this->authorize('delete', $link);

        return $this->executar(function () use ($link): JsonResponse {
            $this->links->excluir($link);

            return response()->json(['deleted' => true]);
        });
    }

    public function qrcode(LinkCaptacao $link): Response
    {
        $this->authorize('view', $link);

        return response($this->links->qrcode($link), 200, ['Content-Type' => 'image/svg+xml']);
    }

    /** @return array<string, mixed> */
    private function formatar(LinkCaptacao $link): array
    {
        return [
            'id' => $link->id,
            'codigo' => $link->codigo,
            'url' => $link->url(),
            'tipo' => $link->tipo,
            'coordenador_id' => $link->coordenador_id,
            'cabo_id' => $link->cabo_id,
            'responsavel' => $link->nomeResponsavel(),
            'descricao' => $link->descricao,
            'ativo' => $link->ativo,
            'cadastros' => (int) $link->getAttribute('eleitores_count'),
            'created_at' => $link->getAttribute('created_at')?->toIso8601String(),
        ];
    }
}
