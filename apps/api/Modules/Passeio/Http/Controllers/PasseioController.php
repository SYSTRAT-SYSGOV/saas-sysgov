<?php

declare(strict_types=1);

namespace Modules\Passeio\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Passeio\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Passeio\Http\Requests\AtualizarInscricaoRequest;
use Modules\Passeio\Http\Requests\InscreverRequest;
use Modules\Passeio\Http\Requests\InscricoesEmLoteRequest;
use Modules\Passeio\Http\Requests\SalvarPasseioRequest;
use Modules\Passeio\Models\Inscricao;
use Modules\Passeio\Models\Passeio;
use Modules\Passeio\Services\InscricaoService;
use Modules\Passeio\Services\PasseioService;

final class PasseioController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly PasseioService $passeios,
        private readonly InscricaoService $inscricoes,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Passeio::class);

        return response()->json(Passeio::query()
            ->withCount(['inscricoes', 'veiculos'])
            ->when($request->query('status'), fn ($q, $v) => $q->where('status', (string) $v))
            ->orderByDesc('data_passeio')
            ->get());
    }

    public function store(SalvarPasseioRequest $request): JsonResponse
    {
        return response()->json($this->passeios->criar($request->validated()), 201);
    }

    public function show(Passeio $passeio): JsonResponse
    {
        $this->authorize('view', $passeio);

        return response()->json($passeio->loadCount(['inscricoes', 'veiculos']));
    }

    public function update(SalvarPasseioRequest $request, Passeio $passeio): JsonResponse
    {
        return response()->json($this->passeios->atualizar($passeio, $request->validated()));
    }

    public function destroy(Passeio $passeio): JsonResponse
    {
        $this->authorize('delete', $passeio);
        $this->passeios->excluir($passeio);

        return response()->json(['deleted' => true]);
    }

    public function indicadores(Passeio $passeio): JsonResponse
    {
        $this->authorize('view', $passeio);

        return response()->json($this->passeios->indicadores($passeio));
    }

    public function indicadoresGerais(): JsonResponse
    {
        $this->authorize('viewAny', Passeio::class);

        return response()->json($this->passeios->indicadores());
    }

    public function inscricoes(Passeio $passeio): JsonResponse
    {
        $this->authorize('view', $passeio);

        // Situação e telefone principal vêm do Cadastro Escolar, só para leitura (D18).
        return response()->json(Inscricao::query()
            ->where('passeio_id', $passeio->id)
            ->with('aluno:id,nome,numero,turma_id,situacao', 'aluno.turma:id,nome', 'aluno.contatos')
            ->get()
            ->sortBy(fn (Inscricao $i): string => ($i->aluno->turma->nome ?? '') . sprintf('%05d', $i->aluno->numero ?? 0) . ($i->aluno->nome ?? ''))
            ->values()
            ->map(function (Inscricao $i): array {
                $linha = $i->toArray();
                if ($i->aluno !== null) {
                    unset($linha['aluno']['contatos']);
                    $linha['aluno']['telefone'] = $i->aluno->contatos->first()?->telefone;
                }

                return $linha;
            }));
    }

    /** Inscreve um aluno (aluno_id) ou a turma inteira (turma_id), sem duplicar. */
    public function inscrever(InscreverRequest $request, Passeio $passeio): JsonResponse
    {
        $this->authorize('view', $passeio);
        $dados = $request->validated();

        return $this->executar(function () use ($passeio, $dados): JsonResponse {
            if (isset($dados['turma_id'])) {
                return response()->json($this->inscricoes->inscreverTurma($passeio, Turma::query()->findOrFail((int) $dados['turma_id'])), 201);
            }

            return response()->json($this->inscricoes->inscrever($passeio, Aluno::query()->findOrFail((int) $dados['aluno_id'])), 201);
        });
    }

    /** Marca ou desmarca "vai" para a turma inteira (D18). */
    public function inscricoesEmLote(InscricoesEmLoteRequest $request, Passeio $passeio): JsonResponse
    {
        $this->authorize('view', $passeio);
        $dados = $request->validated();

        return $this->executar(fn (): JsonResponse => response()->json(
            $this->inscricoes->emLote($passeio, Turma::query()->findOrFail((int) $dados['turma_id']), (bool) $dados['vai']),
        ));
    }

    public function atualizarInscricao(AtualizarInscricaoRequest $request, Inscricao $inscricao): JsonResponse
    {
        /** @var array{vai?: bool, autorizacao_entregue?: bool, pago?: bool, observacao?: string|null} $dados */
        $dados = $request->validated();

        return $this->executar(fn (): JsonResponse => response()->json($this->inscricoes->atualizar($inscricao, $dados)));
    }

    public function excluirInscricao(Inscricao $inscricao): JsonResponse
    {
        $this->authorize('delete', $inscricao);
        $this->inscricoes->excluir($inscricao);

        return response()->json(['deleted' => true]);
    }
}
