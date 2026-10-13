<?php

declare(strict_types=1);

namespace Modules\Formatura\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Escola\Models\Aluno;
use Modules\Formatura\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Formatura\Http\Requests\FiltroPeriodoRequest;
use Modules\Formatura\Http\Requests\ParticipacaoEmLoteRequest;
use Modules\Formatura\Http\Requests\RegistrarPagamentoRequest;
use Modules\Formatura\Http\Requests\SalvarConfiguracaoRequest;
use Modules\Formatura\Http\Requests\SalvarParticipacaoRequest;
use Modules\Formatura\Models\Configuracao;
use Modules\Formatura\Models\Pagamento;
use Modules\Formatura\Models\Participacao;
use Modules\Formatura\Services\ConfiguracaoService;
use Modules\Formatura\Services\FormandoService;
use Modules\Formatura\Services\PagamentoService;
use Modules\Formatura\Services\RelatorioFormaturaService;
use Symfony\Component\HttpKernel\Exception\HttpException;

/** Mediação HTTP do módulo Formatura; regras e cálculos ficam nos Services (valores em centavos). */
final class FormaturaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly ConfiguracaoService $configuracoes,
        private readonly FormandoService $formandos,
        private readonly PagamentoService $pagamentos,
        private readonly RelatorioFormaturaService $relatorio,
    ) {}

    public function configuracao(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Configuracao::class);

        $configuracao = $this->configuracoes->doAno($this->ano($request));

        // response()->json(null) serializa como {}; o contrato é null quando o ano não foi configurado.
        return $configuracao !== null ? response()->json($configuracao) : JsonResponse::fromJsonString('null');
    }

    public function salvarConfiguracao(SalvarConfiguracaoRequest $request): JsonResponse
    {
        return response()->json($this->configuracoes->salvar($request->validated()));
    }

    public function formandos(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Participacao::class);
        $configuracao = $this->configuracaoObrigatoria($request);
        $turma = $request->query('turma_id');

        return response()->json($this->formandos->listar($configuracao, $turma !== null ? (int) $turma : null, $request->query('busca')));
    }

    public function salvarParticipacao(SalvarParticipacaoRequest $request, Aluno $aluno): JsonResponse
    {
        $configuracao = $this->configuracaoObrigatoria($request);
        /** @var array{participa: bool, convidados?: int, convidados_incluidos?: int, convidados_extras?: int, observacoes?: string|null, telefone?: string|null} $dados */
        $dados = collect($request->validated())->except('ano_letivo')->all();
        $participacao = $this->formandos->salvarParticipacao($configuracao, $aluno, $dados);

        return response()->json($this->formandos->linha($aluno->load(['turma', 'contatos']), $participacao, $configuracao));
    }

    public function participacaoEmLote(ParticipacaoEmLoteRequest $request): JsonResponse
    {
        $configuracao = $this->configuracaoObrigatoria($request);

        return response()->json($this->formandos->participacaoEmLote($configuracao, $request->integer('turma_id'), $request->boolean('participa'))->values());
    }

    public function pagamentosDoFormando(Request $request, Aluno $aluno): JsonResponse
    {
        $this->authorize('viewAny', Pagamento::class);
        $configuracao = $this->configuracaoObrigatoria($request);

        return response()->json(Pagamento::query()
            ->whereHas('participacao', fn ($q) => $q->where('configuracao_id', $configuracao->id)->where('aluno_id', $aluno->id))
            ->orderBy('numero_parcela')->orderBy('data_pagamento')
            ->get());
    }

    public function registrarPagamento(RegistrarPagamentoRequest $request): JsonResponse
    {
        $configuracao = $this->configuracaoObrigatoria($request);
        $dados = $request->validated();
        $aluno = Aluno::query()->findOrFail((int) $dados['aluno_id']);
        /** @var array{numero_parcela: int, data_pagamento: string, valor_centavos: int, forma_pagamento: string, chave_pix?: string|null, observacao?: string|null} $pagamento */
        $pagamento = collect($dados)->except(['ano_letivo', 'aluno_id'])->all();

        return $this->executar(fn (): JsonResponse => response()->json($this->pagamentos->registrar($configuracao, $aluno, $pagamento, $request->user()), 201));
    }

    public function estornarPagamento(Pagamento $pagamento): JsonResponse
    {
        $this->authorize('delete', $pagamento);
        $this->pagamentos->estornar($pagamento);

        return response()->json(['deleted' => true]);
    }

    public function pagamentos(FiltroPeriodoRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Pagamento::class);

        return response()->json($this->pagamentos->doAno($this->configuracaoObrigatoria($request), $request->inicio(), $request->fim())->values());
    }

    public function relatorio(FiltroPeriodoRequest $request): JsonResponse
    {
        return response()->json($this->relatorio->gerar($this->configuracaoObrigatoria($request), $request->inicio(), $request->fim()));
    }

    private function ano(Request $request): int
    {
        return (int) $request->input('ano_letivo', (string) now()->year);
    }

    private function configuracaoObrigatoria(Request $request): Configuracao
    {
        $ano = $this->ano($request);

        return $this->configuracoes->doAno($ano)
            ?? throw new HttpException(422, "Configure a formatura de {$ano} antes de continuar.");
    }
}
