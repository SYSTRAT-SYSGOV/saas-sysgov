<?php

declare(strict_types=1);

namespace Modules\Inservivel\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Models\EntidadeDocumento;
use Modules\Inservivel\Models\Interesse;
use Modules\Inservivel\Services\ArquivoService;
use Modules\Inservivel\Services\CadastroEntidadeService;
use Modules\Inservivel\Services\ConfiguracaoService;
use Modules\Inservivel\Services\EntidadeService;
use Modules\Inservivel\Services\ValidadeDocumentoService;
use Modules\Inservivel\Support\FormataEntidade;
use Modules\Inservivel\Support\RegrasEntidade;
use Symfony\Component\HttpFoundation\Response;

/** Entidades na área interna do Gestor (spec: Entidades sem fins lucrativos; Validade dos documentos). */
final class EntidadeController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly EntidadeService $entidades,
        private readonly CadastroEntidadeService $cadastro,
        private readonly ConfiguracaoService $configuracao,
        private readonly ValidadeDocumentoService $validade,
        private readonly ArquivoService $arquivos,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Entidade::class);
        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(StatusEntidade::class)],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $consulta = Entidade::query()
            ->when(!empty($filtros['q']), function (Builder $q) use ($filtros): void {
                $termo = '%' . $filtros['q'] . '%';
                $digitos = preg_replace('/\D/', '', (string) $filtros['q']);
                $q->where(fn (Builder $w) => $w->where('razao_social', 'like', $termo)->orWhere('nome_fantasia', 'like', $termo)
                    ->orWhere('representante_legal', 'like', $termo)->when($digitos !== '', fn ($x) => $x->orWhere('cnpj', 'like', "%{$digitos}%")));
            })
            ->when(!empty($filtros['status']), fn ($q) => $q->where('status', $filtros['status']))
            ->latest('id');
        $pagina = $consulta->paginate((int) ($filtros['per_page'] ?? 15));
        $bloqueadas = $this->validade->bloqueiosPorEntidade(array_map(fn (Entidade $e): int => $e->id, $pagina->items()));

        return response()->json([
            'data' => array_map(fn (Entidade $e): array => [...FormataEntidade::resumo($e), 'bloqueada_por_documento' => isset($bloqueadas[$e->id])], $pagina->items()),
            'meta' => ['current_page' => $pagina->currentPage(), 'last_page' => $pagina->lastPage(), 'per_page' => $pagina->perPage(), 'total' => $pagina->total()],
        ]);
    }

    public function show(Entidade $entidade): JsonResponse
    {
        $this->authorize('view', $entidade);

        return response()->json($this->ficha($entidade));
    }

    /** O Gestor cadastra a entidade (conta criada do mesmo jeito; documentos opcionais, senha inicial informada). */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Entidade::class);
        $dados = $request->validate([
            ...RegrasEntidade::dados(true),
            'email' => ['required', 'email', 'max:255'],
            'senha' => ['required', 'string', 'min:8', 'max:100'],
        ]);
        $senha = $dados['senha'];
        unset($dados['senha']);

        return $this->executar(fn (): JsonResponse => response()->json($this->ficha($this->cadastro->cadastrar($dados, $senha, [], [], 'gestor', exigirObrigatorios: false)), 201));
    }

    public function update(Request $request, Entidade $entidade): JsonResponse
    {
        $this->authorize('update', $entidade);
        $dados = $request->validate(RegrasEntidade::dados(false));

        return $this->executar(fn (): JsonResponse => response()->json($this->ficha($this->entidades->atualizar($entidade, $dados))));
    }

    public function alterarStatus(Request $request, Entidade $entidade): JsonResponse
    {
        $this->authorize('update', $entidade);
        $dados = $request->validate([
            'status' => ['required', Rule::enum(StatusEntidade::class)],
            'documentos_faltantes' => ['sometimes', 'array', 'max:30'],
            'documentos_faltantes.*' => ['string', 'max:150'],
            'observacao' => ['nullable', 'string', 'max:5000'],
        ]);

        return $this->executar(fn (): JsonResponse => response()->json($this->ficha($this->entidades->alterarStatus(
            $entidade,
            StatusEntidade::from($dados['status']),
            array_values($dados['documentos_faltantes'] ?? []),
            $dados['observacao'] ?? null,
        ))));
    }

    public function analisarDocumento(Request $request, Entidade $entidade, EntidadeDocumento $documento): JsonResponse
    {
        $this->authorize('update', $entidade);
        abort_unless($documento->entidade_id === $entidade->id, 404);
        $dados = $request->validate([
            'situacao' => ['required', Rule::in(['pendente', 'aprovado', 'reprovado'])],
            'observacao' => ['nullable', 'string', 'max:2000'],
            'validade' => ['nullable', 'date'],
        ]);
        $this->entidades->analisarDocumento($documento, $dados['situacao'], $dados['observacao'] ?? null, $dados['validade'] ?? null, $request->has('validade'));

        return response()->json($this->ficha($entidade->refresh()));
    }

    public function documento(Entidade $entidade, EntidadeDocumento $documento): Response
    {
        $this->authorize('view', $entidade);
        abort_unless($documento->entidade_id === $entidade->id, 404);

        return $this->arquivos->resposta($documento->caminho, $documento->mime, "{$documento->tipo}-{$entidade->id}")
            ?? response()->json(['error' => 'Arquivo não encontrado.'], 404);
    }

    public function redefinirSenha(Request $request, Entidade $entidade): JsonResponse
    {
        $this->authorize('update', $entidade);
        $dados = $request->validate(['senha' => ['required', 'string', 'min:8', 'max:100', 'confirmed']]);

        return $this->executar(function () use ($entidade, $dados): JsonResponse {
            $this->entidades->redefinirSenha($entidade, $dados['senha']);

            return response()->json(['ok' => true]);
        });
    }

    public function destroy(Request $request, Entidade $entidade): JsonResponse
    {
        $this->authorize('delete', $entidade);
        $dados = $request->validate(['senha' => ['required', 'string']]);
        $gestor = $request->user();
        abort_unless($gestor instanceof User, 401);

        return $this->executar(function () use ($entidade, $dados, $gestor): JsonResponse {
            $this->entidades->excluir($entidade, $dados['senha'], $gestor);

            return response()->json(['deleted' => true]);
        });
    }

    /** @return array<string, mixed> */
    private function ficha(Entidade $entidade): array
    {
        $lotes = Interesse::query()->where('entidade_id', $entidade->id)->with('lote.sorteio')->latest('id')->get()
            ->map(fn (Interesse $i): array => [
                'lote_id' => $i->lote_id, 'numero' => $i->lote->numero, 'status' => $i->lote->status->value, 'status_rotulo' => $i->lote->status->rotulo(),
                'inscrita_em' => $i->getAttribute('created_at')?->toIso8601String(),
                'vencedora' => $i->lote->sorteio?->entidade_vencedora_id === $entidade->id,
            ])->all();

        return FormataEntidade::completo($entidade, $this->configuracao->documentosExigidos(), [
            'bloqueios' => $this->validade->bloqueios($entidade),
            'alertas_documentos' => $this->validade->alertasDa($entidade),
            'lotes' => $lotes,
        ]);
    }
}
