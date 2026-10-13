<?php

declare(strict_types=1);

namespace Modules\Inservivel\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Modules\Inservivel\Enums\StatusLote;
use Modules\Inservivel\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Models\LoteDocumento;
use Modules\Inservivel\Services\ArquivoService;
use Modules\Inservivel\Services\LoteService;
use Modules\Inservivel\Services\SorteioService;
use Modules\Inservivel\Services\TermoService;
use Modules\Inservivel\Support\DetalheLote;
use Modules\Inservivel\Support\FormataBem;
use Modules\Inservivel\Support\FormataLote;
use Symfony\Component\HttpFoundation\Response;

/** Lotes, bens do lote, status, exclusão e anexos (spec: Lotes; D4, D5, D12). */
final class LoteController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly LoteService $lotes,
        private readonly ArquivoService $arquivos,
        private readonly DetalheLote $detalhe,
        private readonly SorteioService $sorteios,
        private readonly TermoService $termos,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lote::class);
        $filtros = $request->validate(['status' => ['nullable', Rule::enum(StatusLote::class)], 'q' => ['nullable', 'string', 'max:100']]);
        $usuario = $this->usuario($request);

        $consulta = FormataLote::comTotais(Lote::query())
            ->when(!Gate::allows('gestao', Lote::class), fn ($q) => $q->where('criado_por', $usuario->id))
            ->when(!empty($filtros['status']), fn ($q) => $q->where('status', $filtros['status']))
            ->when(!empty($filtros['q']), fn ($q) => $q->where(fn ($w) => $w->where('numero', 'like', '%' . $filtros['q'] . '%')->orWhere('descricao', 'like', '%' . $filtros['q'] . '%')))
            ->latest('id');

        return response()->json(['lotes' => $consulta->get()->map(fn (Lote $l): array => FormataLote::card($l))]);
    }

    public function show(Lote $lote): JsonResponse
    {
        $this->authorize('view', $lote);

        return response()->json($this->detalhe->montar($lote));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Lote::class);
        $dados = $request->validate([...$this->regras(true), 'bens' => ['sometimes', 'array', 'max:500'], 'bens.*' => ['integer']]);
        $bens = array_map('intval', $dados['bens'] ?? []);
        unset($dados['bens']);

        return $this->executar(fn (): JsonResponse => response()->json($this->detalhe->montar($this->lotes->criar($dados, $bens, $this->usuario($request))), 201));
    }

    public function update(Request $request, Lote $lote): JsonResponse
    {
        $this->authorize('update', $lote);
        $dados = $request->validate($this->regras(false));

        return $this->executar(fn (): JsonResponse => response()->json($this->detalhe->montar($this->lotes->atualizar($lote, $dados))));
    }

    /** Adiciona por seleção (`bens`) ou pelo nº patrimonial (`numero_patrimonial`). */
    public function adicionarBens(Request $request, Lote $lote): JsonResponse
    {
        $this->authorize('update', $lote);
        $dados = $request->validate([
            'bens' => ['required_without:numero_patrimonial', 'array', 'max:500'],
            'bens.*' => ['integer'],
            'numero_patrimonial' => ['required_without:bens', 'string', 'max:50'],
        ]);

        return $this->executar(function () use ($lote, $dados): JsonResponse {
            if (isset($dados['numero_patrimonial'])) {
                $bem = $this->lotes->adicionarPorPatrimonio($lote, $dados['numero_patrimonial']);

                return response()->json(['adicionado' => FormataBem::resumo($bem->refresh()->load('situacao'))]);
            }
            $this->lotes->adicionarBens($lote, array_map('intval', $dados['bens']));

            return response()->json(['ok' => true]);
        });
    }

    public function retirarBem(Lote $lote, Bem $bem): JsonResponse
    {
        $this->authorize('update', $lote);

        return $this->executar(function () use ($lote, $bem): JsonResponse {
            $this->lotes->retirarBem($lote, $bem);

            return response()->json(['ok' => true]);
        });
    }

    public function alterarStatus(Request $request, Lote $lote): JsonResponse
    {
        $this->authorize('gerir', $lote);
        $dados = $request->validate(['status' => ['required', Rule::enum(StatusLote::class)]]);

        return $this->executar(fn (): JsonResponse => response()->json($this->detalhe->montar($this->lotes->alterarStatus($lote, StatusLote::from($dados['status'])))));
    }

    public function destroy(Request $request, Lote $lote): JsonResponse
    {
        $this->authorize('delete', $lote);
        $dados = $request->validate(['senha' => ['required', 'string']]);

        return $this->executar(function () use ($lote, $dados, $request): JsonResponse {
            $this->lotes->excluir($lote, $dados['senha'], $this->usuario($request));

            return response()->json(['deleted' => true]);
        });
    }

    public function anexar(Request $request, Lote $lote): JsonResponse
    {
        $this->authorize('update', $lote);
        $dados = $request->validate(['nome' => ['required', 'string', 'max:255'], 'arquivo' => ArquivoService::REGRA_DOCUMENTO_LOTE]);

        return $this->executar(fn (): JsonResponse => response()->json(
            ['id' => $this->lotes->anexar($lote, $dados['nome'], $request->file('arquivo'), $this->usuario($request))->id],
            201
        ));
    }

    public function documento(Lote $lote, LoteDocumento $documento): Response
    {
        $this->authorize('view', $lote);
        abort_unless($documento->lote_id === $lote->id, 404);

        return $this->arquivos->resposta($documento->caminho, $documento->mime, $documento->nome)
            ?? response()->json(['error' => 'Arquivo não encontrado.'], 404);
    }

    public function sortear(Request $request, Lote $lote): JsonResponse
    {
        $this->authorize('gerir', $lote);

        return $this->executar(function () use ($lote, $request): JsonResponse {
            $this->sorteios->sortear($lote, $this->usuario($request));

            return response()->json($this->detalhe->montar($lote));
        });
    }

    /** Termos de conferência, entrega e doação: gestão e criador do lote, a partir de Sorteado (D9). */
    public function termo(Lote $lote, string $tipo): Response
    {
        $this->authorize('view', $lote);
        abort_unless(isset(TermoService::TERMOS_LOTE[$tipo]), 404);

        return $this->executarArquivo(fn (): Response => response($this->termos->termoLote($lote, $tipo), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="termo-' . $tipo . '-lote-' . str_replace('/', '-', $lote->numero) . '.pdf"',
        ]));
    }

    /** @param callable(): Response $acao */
    private function executarArquivo(callable $acao): Response
    {
        try {
            return $acao();
        } catch (\DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /** @return array<string, mixed> */
    private function regras(bool $criando): array
    {
        $obrig = $criando ? 'required' : 'sometimes';

        return [
            'numero' => [$obrig, 'string', 'max:30'],
            'descricao' => [$obrig, 'string', 'max:5000'],
            'data_criacao' => [$obrig, 'date'],
            'responsavel' => [$obrig, 'string', 'max:255'],
            'data_sorteio_prevista' => ['nullable', 'date'],
            'observacoes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    private function usuario(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
