<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Http\Requests\AbrirSucessaoRequest;
use Modules\Cemiterios\Http\Requests\AtualizarSucessaoRequest;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Services\SucessaoService;

final class SucessaoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly SucessaoService $sucessao,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.view');

        $estado = $request->query('estado');
        $via = $request->query('via');
        $parkId = $request->query('park_id');
        $concessionId = $request->query('concession_id');
        $dataInicio = $request->query('data_falecimento_inicio');
        $dataFim = $request->query('data_falecimento_fim');
        $q = trim((string) $request->query('q'));

        $processos = Sucessao::query()
            ->with([
                'concessao.jazigo.cemiterio:id,codigo,nome',
                'concessao.jazigo.setor:id,codigo,descricao',
                'concessao.concessionario:id,nome,documento,documento_hash,titular_falecido',
                'herdeiros',
                'documentos',
                'requerente:id,name',
                'titularFalecido:id,nome,documento,documento_hash',
            ])
            ->when($estado, fn ($query) => $query->where('estado', $estado))
            ->when($via, fn ($query) => $query->where('via', $via))
            ->when($parkId, fn ($query) => $query->where('park_id', $parkId))
            ->when($concessionId, fn ($query) => $query->where('concession_id', $concessionId))
            ->when($dataInicio, fn ($query) => $query->whereDate('data_falecimento', '>=', $dataInicio))
            ->when($dataFim, fn ($query) => $query->whereDate('data_falecimento', '<=', $dataFim))
            ->when($q !== '', function ($query) use ($q): void {
                $query->where('processo_referencia', 'like', "%{$q}%")
                    ->orWhereHas('herdeiros', fn ($hq) => $hq->where('nome', 'like', "%{$q}%"))
                    ->orWhereHas('concessao.concessionario', fn ($cq) => $cq->where('nome', 'like', "%{$q}%"));
            })
            ->orderByDesc('id')
            ->paginate(min((int) $request->query('per_page', 20), 100));

        return response()->json($processos);
    }

    public function store(AbrirSucessaoRequest $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.manage');

        $dados = $request->validated();
        $dados['via'] = $dados['via']; // já é enum via FormRequest

        $processo = $this->sucessao->abrirProcesso($dados);

        return response()->json($processo->load(['concessao.jazigo', 'concessao.concessionario']), 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.view');

        $processo = Sucessao::with([
            'concessao.jazigo.cemiterio:id,codigo,nome',
            'concessao.jazigo.setor:id,codigo,descricao',
            'concessao.concessionario:id,nome,documento,documento_hash,titular_falecido,telefone,endereco',
            'herdeiros',
            'documentos',
            'historico.usuario:id,name',
            'requerente:id,name',
            'titularFalecido:id,nome,documento,documento_hash,telefone,endereco',
        ])->findOrFail($id);

        return response()->json($processo);
    }

    public function update(AtualizarSucessaoRequest $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.manage');

        $processo = Sucessao::findOrFail($id);
        $dados = $request->validated();

        $processo = $this->sucessao->atualizarDados($processo, $dados);

        return response()->json($processo->load(['concessao.jazigo', 'concessao.concessionario']));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.manage');

        $processo = Sucessao::findOrFail($id);

        // Só permite excluir se estiver em estado terminal
        if (!in_array($processo->estado->value, ['sucedida', 'indeferida', 'arquivada'], true)) {
            return response()->json([
                'message' => 'Apenas processos em estado terminal podem ser excluídos.'
            ], 422);
        }

        $processo->delete();

        return response()->json(['message' => 'Processo excluído com sucesso.']);
    }
}