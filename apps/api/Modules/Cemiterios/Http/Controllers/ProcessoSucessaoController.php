<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\ProcessoSucessao;
use Modules\Cemiterios\Services\SucessaoService;

final class ProcessoSucessaoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly SucessaoService $sucessao,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $situacao = $request->query('situacao');
        $q = trim((string) $request->query('q'));

        $processos = ProcessoSucessao::query()
            ->with([
                'concessao.jazigo.cemiterio:id,codigo,nome',
                'concessao.concessionario:id,nome,documento,documento_hash,titular_falecido',
                'herdeiros',
                'novoTitular:id,nome,documento,documento_hash',
                'deferidoPor:id,name',
            ])
            ->when($situacao, fn ($query) => $query->where('situacao', $situacao))
            ->when($q !== '', function ($query) use ($q): void {
                $query->where('numero_processo', 'like', "%{$q}%")
                    ->orWhereHas('herdeiros', fn ($hq) => $hq->where('nome', 'like', "%{$q}%"))
                    ->orWhereHas('concessao.concessionario', fn ($cq) => $cq->where('nome', 'like', "%{$q}%"));
            })
            ->orderByDesc('id')
            ->paginate(min((int) $request->query('per_page', 20), 100));

        return response()->json($processos);
    }

    public function pendencias(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $necropoleId = $request->query('necropole_id');

        $concessoes = Concessao::query()
            ->with([
                'jazigo.cemiterio:id,codigo,nome',
                'jazigo.setor:id,codigo,descricao',
                'concessionario:id,nome,documento,documento_hash,titular_falecido,telefone,endereco',
                'processosSucessao' => fn ($q) => $q->orderByDesc('id'),
            ])
            ->where(function ($query): void {
                $query->where('pendencia_regularizacao', true)
                    ->orWhereHas('concessionario', fn ($cq) => $cq->where('titular_falecido', true));
            })
            ->when($necropoleId, function ($query) use ($necropoleId): void {
                $query->whereHas('jazigo', fn ($jq) => $jq->where('park_id', $necropoleId));
            })
            ->orderBy('id')
            ->paginate(min((int) $request->query('per_page', 30), 100));

        return response()->json($concessoes);
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $dados = $request->validate([
            'concession_id' => ['required', 'integer', 'exists:concessions,id'],
            'numero_processo' => ['required', 'string', 'max:50'],
            'tipo_documento' => ['required', 'string', 'in:inventario_judicial,inventario_extrajudicial,alvara_judicial,outro'],
            'vara_ou_cartorio' => ['nullable', 'string', 'max:100'],
        ]);

        $processo = $this->sucessao->abrirProcesso($dados);

        return response()->json($processo->load(['concessao.jazigo', 'concessao.concessionario']), 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $processo = ProcessoSucessao::with([
            'concessao.jazigo.cemiterio:id,codigo,nome',
            'concessao.jazigo.setor:id,codigo,descricao',
            'concessao.concessionario:id,nome,documento,documento_hash,titular_falecido,telefone,endereco',
            'herdeiros',
            'novoTitular:id,nome,documento,documento_hash,telefone,email,endereco',
            'deferidoPor:id,name',
        ])->findOrFail($id);

        return response()->json($processo);
    }

    public function adicionarHerdeiro(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $processo = ProcessoSucessao::findOrFail($id);

        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'parentesco' => ['required', 'string', 'max:30'],
            'documento' => ['nullable', 'string', 'max:20'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:100'],
            'titular_indicado' => ['nullable', 'boolean'],
        ]);

        $herdeiro = $this->sucessao->adicionarHerdeiro($processo, $dados);

        return response()->json($herdeiro, 201);
    }

    public function deferir(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $processo = ProcessoSucessao::findOrFail($id);

        $dados = $request->validate([
            'despacho_fundamentacao' => ['required', 'string', 'min:10'],
            'herdeiro_id' => ['nullable', 'integer', 'exists:cemetery_succession_heirs,id'],
            'novo_titular_id' => ['nullable', 'integer', 'exists:concession_holders,id'],
        ]);

        $deferido = $this->sucessao->deferir($processo, $dados, $request->user()?->getKey());

        return response()->json($deferido);
    }

    public function indeferir(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $processo = ProcessoSucessao::findOrFail($id);

        $dados = $request->validate([
            'despacho_fundamentacao' => ['required', 'string', 'min:10'],
        ]);

        $indeferido = $this->sucessao->indeferir($processo, $dados['despacho_fundamentacao'], $request->user()?->getKey());

        return response()->json($indeferido);
    }

    public function termoDados(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $processo = ProcessoSucessao::with([
            'concessao.jazigo.cemiterio',
            'concessao.jazigo.setor',
            'concessao.concessionario',
            'herdeiros',
            'novoTitular',
            'deferidoPor',
        ])->findOrFail($id);

        return response()->json([
            'termo_numero' => $processo->termo_numero,
            'processo_numero' => $processo->numero_processo,
            'tipo_documento' => $processo->tipo_documento,
            'vara_ou_cartorio' => $processo->vara_ou_cartorio,
            'deferido_em' => $processo->deferido_em?->toIso8601String(),
            'deferido_por' => $processo->deferidoPor?->name,
            'despacho_fundamentacao' => $processo->despacho_fundamentacao,
            'titular_anterior' => [
                'nome' => $processo->concessao?->concessionario?->nome,
                'documento' => $processo->concessao?->concessionario?->documento,
            ],
            'novo_titular' => [
                'nome' => $processo->novoTitular?->nome,
                'documento' => $processo->novoTitular?->documento,
                'telefone' => $processo->novoTitular?->telefone,
                'endereco' => $processo->novoTitular?->endereco,
            ],
            'jazigo' => [
                'codigo' => $processo->concessao?->jazigo?->codigo,
                'tipo' => $processo->concessao?->jazigo?->tipo,
                'quadra' => $processo->concessao?->jazigo?->setor?->codigo,
                'necropole' => $processo->concessao?->jazigo?->cemiterio?->nome,
            ],
            'herdeiros' => $processo->herdeiros->map(fn ($h) => [
                'nome' => $h->nome,
                'parentesco' => $h->parentesco,
                'documento' => $h->documento,
                'titular_indicado' => $h->titular_indicado,
            ]),
        ]);
    }
}
