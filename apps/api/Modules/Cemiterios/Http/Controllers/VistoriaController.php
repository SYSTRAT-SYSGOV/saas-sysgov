<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\FotoVistoria;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\ProcessoAbandono;
use Modules\Cemiterios\Models\Vistoria;
use Modules\Cemiterios\Services\AbandonoService;
use Modules\Cemiterios\Services\JazigoEstadoService;
use Modules\Cemiterios\Support\Arquivo;
use Modules\Cemiterios\Support\EstadoJazigo;
use Modules\Cemiterios\Support\RegraNegocioException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Vistorias com fotos e processo administrativo de abandono (spec: vistoria-abandono; RF-33..RF-36). */
final class VistoriaController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly AbandonoService $abandono,
        private readonly JazigoEstadoService $estados,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json(
            Vistoria::with('fotos:id,inspection_id,capturada_em')
                ->when($request->query('plot_id'), fn ($q, $v) => $q->where('plot_id', $v))
                ->orderByDesc('data')->orderByDesc('id')
                ->paginate(min((int) $request->query('per_page', 30), 100))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.vistoria.create');

        $dados = $request->validate([
            'plot_id' => ['required', 'integer'],
            'data' => ['nullable', 'date', 'before_or_equal:today'],
            'estado_conservacao' => ['required', Rule::in(Vistoria::ESTADOS)],
            'risco' => ['required', Rule::in(['baixo', 'medio', 'alto'])],
            'observacoes' => ['nullable', 'string', 'max:4000'],
            'fotos' => ['required', 'array', 'min:1', 'max:20'],
            'fotos.*' => ['image', 'max:10240'],
            'mover_para_manutencao' => ['sometimes', 'boolean'],
        ]);

        $jazigo = Jazigo::findOrFail($dados['plot_id']);
        $mover = $request->boolean('mover_para_manutencao');
        if ($mover && $dados['estado_conservacao'] !== 'em_ruina') {
            throw new RegraNegocioException('vistoria.transicao_invalida', 'Só a vistoria "em ruína" move o jazigo para Em Ruína/Manutenção.');
        }

        $caminhos = array_map(fn ($foto) => Arquivo::guardar($foto, 'vistorias'), $request->file('fotos'));

        $vistoria = DB::transaction(function () use ($dados, $jazigo, $mover, $caminhos, $request): Vistoria {
            $vistoria = Vistoria::create([
                'plot_id' => $jazigo->id, 'vistoriador_id' => $request->user()->id, 'data' => $dados['data'] ?? today()->toDateString(),
                'estado_conservacao' => $dados['estado_conservacao'], 'risco' => $dados['risco'], 'observacoes' => $dados['observacoes'] ?? null,
            ]);
            foreach ($caminhos as $caminho) {
                $vistoria->fotos()->create(['arquivo' => $caminho, 'capturada_em' => now()]);
            }
            if ($mover && $jazigo->estado !== EstadoJazigo::Manutencao) {
                $this->estados->manual($jazigo, EstadoJazigo::Manutencao->value, "Vistoria #{$vistoria->id}: em ruína", null);
            }

            return $vistoria;
        });

        $this->audit->record('cemiterios', 'vistoria.created', "Vistoria #{$vistoria->id}", null, $vistoria->toArray());

        return response()->json($vistoria->load('fotos:id,inspection_id,capturada_em'), 201);
    }

    /** Fotos em disco privado: download só com autorização (RF-33). */
    public function foto(Request $request, int $id, int $foto): StreamedResponse
    {
        if (!$request->user()->hasPermission('cemiterios.abandono.manage')) {
            $this->autorizar($request, 'cemiterios.vistoria.create');
        }

        return Arquivo::download(FotoVistoria::where('inspection_id', $id)->findOrFail($foto)->arquivo);
    }

    public function processos(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.abandono.manage');

        return response()->json(
            ProcessoAbandono::with(['jazigo:id,codigo,estado', 'concessao:id,numero,situacao'])
                ->when($request->query('situacao'), fn ($q, $v) => $q->where('situacao', $v))
                ->orderByDesc('id')
                ->paginate(min((int) $request->query('per_page', 30), 100))
        );
    }

    public function processo(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.abandono.manage');

        return response()->json(ProcessoAbandono::with(['jazigo', 'concessao.concessionario:id,nome'])->findOrFail($id));
    }

    public function instaurar(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.abandono.manage');

        $processo = $this->abandono->instaurar((int) $request->validate(['plot_id' => ['required', 'integer']])['plot_id']);
        $this->audit->record('cemiterios', 'abandono.instaurado', "ProcessoAbandono #{$processo->id}", null, $processo->toArray());

        return response()->json($processo, 201);
    }

    public function etapa(Request $request, int $id, string $etapa): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.abandono.manage');

        $processo = ProcessoAbandono::findOrFail($id);
        $antes = $processo->toArray();

        $processo = match ($etapa) {
            'edital' => $this->abandono->edital($processo, (string) $request->validate(['publicado_em' => ['required', 'date']])['publicado_em']),
            'manifestacao' => $this->abandono->manifestacao(
                $processo,
                (string) $request->validate(['texto' => ['required', 'string', 'max:4000']])['texto'],
                $request->boolean('arquivar'),
            ),
            default => $this->abandono->decidir($processo, (string) $request->validate(['decisao' => ['required', 'string', 'max:4000']])['decisao']),
        };

        $this->audit->record('cemiterios', "abandono.{$etapa}", "ProcessoAbandono #{$id}", $antes, $processo->toArray());

        return response()->json($processo);
    }
}
