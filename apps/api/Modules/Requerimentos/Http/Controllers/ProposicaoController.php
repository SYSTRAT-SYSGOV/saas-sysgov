<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Requerimentos\Models\Proposicao;
use Modules\Requerimentos\Services\ProposicaoService;

final class ProposicaoController extends Controller
{
    public function __construct(
        private readonly ProposicaoService $proposicaoService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Proposicao::class);

        $query = Proposicao::query()
            ->with(['tipoInstrumento', 'autorPrincipal']);

        if ($tipo = $request->input('tipo_slug')) {
            $query->whereHas('tipoInstrumento', fn ($q) => $q->where('slug', $tipo));
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($exercicio = $request->input('exercicio')) {
            $query->doExercicio((int) $exercicio);
        }

        if ($area = $request->input('area_tematica')) {
            $query->where('area_tematica', $area);
        }

        $proposicoes = $query->latest()->paginate($request->input('per_page', 15));

        return response()->json($proposicoes);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Proposicao::class);

        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'tipo_slug'                  => ['required', 'string', 'max:100'],
            'ementa'                     => ['required', 'string', 'max:500'],
            'justificativa'              => ['nullable', 'string'],
            'conteudo'                   => ['nullable', 'string'],
            'area_tematica'              => ['nullable', 'string', 'max:100'],
            'dispositivos_legais'        => ['nullable', 'string', 'max:500'],
            'poder_origem'               => ['nullable', 'string', 'in:camara,prefeitura'],
            'partido_bancada'            => ['nullable', 'string', 'max:100'],
            'visibilidade_publica'       => ['nullable', 'boolean'],
            'vinculacao_proposicao_id'   => ['nullable', 'integer', 'exists:requerimentos_proposicoes,id'],
            'vinculacao_processo_id'     => ['nullable', 'integer'],
            'dados_pessoais'             => ['nullable', 'array'],
            'metadata'                   => ['nullable', 'array'],
            'coautores'                  => ['nullable', 'array'],
            'coautores.*.user_id'        => ['required_with:coautores', 'integer'],
            'coautores.*.tipo_autor'     => ['nullable', 'string'],
        ]);

        try {
            $proposicao = $this->proposicaoService->criar($validated, $user);
            return response()->json($proposicao->load('tipoInstrumento', 'autorPrincipal'), 201);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $proposicao = Proposicao::findOrFail($id);
        $this->authorize('update', $proposicao);

        $validated = $request->validate([
            'ementa'                     => ['sometimes', 'required', 'string', 'max:500'],
            'justificativa'              => ['nullable', 'string'],
            'conteudo'                   => ['nullable', 'string'],
            'area_tematica'              => ['nullable', 'string', 'max:100'],
            'dispositivos_legais'        => ['nullable', 'string', 'max:500'],
            'partido_bancada'            => ['nullable', 'string', 'max:100'],
            'visibilidade_publica'       => ['nullable', 'boolean'],
            'dados_pessoais'             => ['nullable', 'array'],
            'metadata'                   => ['nullable', 'array'],
        ]);

        try {
            $proposicao = $this->proposicaoService->atualizar($proposicao, $validated);
            return response()->json($proposicao->load('tipoInstrumento', 'autorPrincipal'));
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function show(int $id): JsonResponse
    {
        $proposicao = Proposicao::with([
            'tipoInstrumento',
            'autorPrincipal',
            'autores.usuario',
            'anexos.uploader:id,name',
            'tramitacoesPoderes',
            'etapasTramitacao',
        ])->findOrFail($id);

        $this->authorize('view', $proposicao);

        return response()->json($proposicao);
    }

    public function historico(int $id): JsonResponse
    {
        $proposicao = Proposicao::findOrFail($id);

        $this->authorize('view', $proposicao);

        $tramitacoesPoderes = $proposicao->tramitacoesPoderes()
            ->with(['respostas', 'remetente', 'responsavel'])
            ->orderBy('created_at')
            ->get();

        $etapasInternas = $proposicao->etapasTramitacao()
            ->with('responsavel')
            ->orderBy('ordem')
            ->get();

        return response()->json([
            'proposicao'           => $proposicao->load('tipoInstrumento', 'autorPrincipal', 'anexos.uploader:id,name'),
            'tramitacoes_poderes'  => $tramitacoesPoderes,
            'etapas_internas'      => $etapasInternas,
        ]);
    }

    public function minhasProposicoes(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $query = Proposicao::doAutor($user->id)
            ->orWhereHas('autores', fn ($q) => $q->where('user_id', $user->id));

        // KPIs
        $total = (clone $query)->count();
        $emTramitacao = (clone $query)->emTramitacao()->count();
        $respondidas = (clone $query)->where('status', Proposicao::STATUS_RESPONDIDO)->count();
        $vencidas = (clone $query)->where('status', Proposicao::STATUS_VENCIDO)->count();

        $proposicoes = $query->with('tipoInstrumento')->latest()->paginate($request->input('per_page', 10));

        return response()->json([
            'kpis' => [
                'total'          => $total,
                'em_tramitacao'  => $emTramitacao,
                'respondidas'    => $respondidas,
                'vencidas'       => $vencidas,
            ],
            'proposicoes' => $proposicoes,
        ]);
    }
}