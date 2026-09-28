<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\AlvaraObra;
use Modules\Cemiterios\Models\Empreiteiro;
use Modules\Cemiterios\Services\EmpreiteiroService;
use Modules\Cemiterios\Support\Arquivo;
use Modules\Cemiterios\Support\Documento;

/** Empreiteiros, alvarás anuais, alvarás de obra e penalidades (spec: empreiteiros). */
final class EmpreiteiroController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly EmpreiteiroService $empreiteiros,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.empreiteiros.manage');

        return response()->json(
            Empreiteiro::query()
                ->when($request->query('situacao'), fn ($q, $v) => $q->where('situacao', $v))
                ->when($request->query('q'), fn ($q, $v) => $q->where('nome', 'like', "%{$v}%"))
                ->orderBy('nome')
                ->paginate(min((int) $request->query('per_page', 30), 100))
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.empreiteiros.manage');

        return response()->json(Empreiteiro::with(['alvaras', 'obras', 'penalidades'])->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.empreiteiros.manage');

        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'documento' => ['required', 'string', function (string $campo, mixed $valor, Closure $falha): void {
                if (!Documento::valido((string) $valor)) {
                    $falha('CPF/CNPJ inválido.');
                } elseif (Empreiteiro::withTrashed()->where('documento_hash', Documento::hash((string) $valor))->exists()) {
                    $falha('Já existe empreiteiro com este documento.');
                }
            }],
            'responsavel_tecnico' => ['nullable', 'string', 'max:255'],
            'contatos' => ['nullable', 'string', 'max:500'],
        ]);

        $empreiteiro = Empreiteiro::create($dados + ['tipo_doc' => Documento::tipo($dados['documento'])]);
        $this->audit->record('cemiterios', 'empreiteiro.created', "Empreiteiro #{$empreiteiro->id}", null, $empreiteiro->toArray());

        return response()->json($empreiteiro->refresh(), 201);
    }

    public function alvara(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.empreiteiros.manage');

        $dados = $request->validate([
            'numero' => ['required', 'string', 'max:40'],
            'validade' => ['required', 'date'],
            'arquivo' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        $empreiteiro = Empreiteiro::findOrFail($id);
        $alvara = $empreiteiro->alvaras()->create([
            'numero' => $dados['numero'], 'validade' => $dados['validade'],
            'arquivo' => $request->hasFile('arquivo') ? Arquivo::guardar($request->file('arquivo'), 'alvaras') : null,
        ]);
        $this->empreiteiros->atualizarAptidao($empreiteiro);
        $this->audit->record('cemiterios', 'empreiteiro.alvara_anual', "Empreiteiro #{$id}", null, $alvara->toArray());

        return response()->json($empreiteiro->refresh()->load('alvaras'), 201);
    }

    public function penalidade(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.empreiteiros.manage');

        $dados = $request->validate([
            'tipo' => ['required', Rule::in(['advertencia', 'suspensao'])],
            'inicio' => ['required_if:tipo,suspensao', 'nullable', 'date'],
            'fim' => ['required_if:tipo,suspensao', 'nullable', 'date', 'after_or_equal:inicio'],
            'motivo' => ['required', 'string', 'max:2000'],
            'arquivo' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        $empreiteiro = Empreiteiro::findOrFail($id);
        $antes = $empreiteiro->toArray();
        $this->empreiteiros->penalizar($empreiteiro, [
            'tipo' => $dados['tipo'], 'inicio' => $dados['inicio'] ?? null, 'fim' => $dados['fim'] ?? null, 'motivo' => $dados['motivo'],
            'arquivo' => $request->hasFile('arquivo') ? Arquivo::guardar($request->file('arquivo'), 'penalidades') : null,
        ]);
        $this->audit->record('cemiterios', 'empreiteiro.penalidade', "Empreiteiro #{$id}", $antes, $empreiteiro->refresh()->toArray());

        return response()->json($empreiteiro->load(['penalidades', 'obras']), 201);
    }

    public function obras(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.empreiteiros.manage');

        return response()->json(
            AlvaraObra::query()
                ->when($request->query('contractor_id'), fn ($q, $v) => $q->where('contractor_id', $v))
                ->when($request->query('situacao'), fn ($q, $v) => $q->where('situacao', $v))
                ->when($request->boolean('sinalizada'), fn ($q) => $q->where('sinalizada', true))
                ->orderByDesc('id')
                ->paginate(min((int) $request->query('per_page', 30), 100))
        );
    }

    public function storeObra(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.empreiteiros.manage');

        $dados = $request->validate([
            'contractor_id' => ['required', 'integer'],
            'plot_id' => ['required', 'integer'],
            'descricao' => ['required', 'string', 'max:2000'],
            'comprimento_m' => ['required', 'numeric', 'gt:0', 'max:99'],
            'largura_m' => ['required', 'numeric', 'gt:0', 'max:99'],
            'prazo_fim' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $obra = $this->empreiteiros->emitirObra(Empreiteiro::findOrFail($dados['contractor_id']), [
            'plot_id' => (int) $dados['plot_id'], 'descricao' => $dados['descricao'],
            'comprimento_m' => (float) $dados['comprimento_m'], 'largura_m' => (float) $dados['largura_m'], 'prazo_fim' => $dados['prazo_fim'],
        ]);
        $this->audit->record('cemiterios', 'obra.alvara', "AlvaraObra #{$obra->id}", null, $obra->toArray());

        return response()->json($obra, 201);
    }

    public function updateObra(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.empreiteiros.manage');

        $dados = $request->validate(['situacao' => ['required', Rule::in(['concluida', 'cancelada'])]]);
        $obra = AlvaraObra::where('situacao', 'pendente')->findOrFail($id);
        $antes = $obra->toArray();
        $obra->update($dados);
        $this->audit->record('cemiterios', "obra.{$dados['situacao']}", "AlvaraObra #{$id}", $antes, $obra->toArray());

        return response()->json($obra);
    }
}
