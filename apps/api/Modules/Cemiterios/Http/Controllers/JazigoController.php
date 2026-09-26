<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\Setor;
use Modules\Cemiterios\Services\JazigoEstadoService;
use Modules\Cemiterios\Services\JazigoHistoricoService;

/** Jazigos e ossuários (RF-03, RF-04, RF-19). */
final class JazigoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly JazigoEstadoService $estados,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        $perPage = min(max((int) $request->query('per_page', 50), 1), 100);

        $jazigos = Jazigo::query()
            ->with([
                'setor:id,park_id,codigo,descricao',
                'cemiterio:id,codigo,nome',
                'concessoes:id,plot_id,holder_id,numero,modalidade,situacao' => [
                    'concessionario:id,nome,documento,titular_falecido',
                ],
                'inumacoes:id,plot_id,deceased_id,sepultado_em,gaveta_numero' => [
                    'falecido:id,nome',
                ],
            ])
            ->when($request->query('parque'), fn ($q, $v) => $q->where('park_id', $v))
            ->when($request->query('setor'), fn ($q, $v) => $q->where('sector_id', $v))
            ->when($request->query('estado'), fn ($q, $v) => $q->where('estado', $v))
            ->when($request->query('tipo'), fn ($q, $v) => $q->where('tipo', $v))
            ->when($request->query('q'), fn ($q, $v) => $q->where('codigo', 'like', "%{$v}%"))
            ->when($request->query('sepultado'), function ($q, $v) {
                $termo = trim((string) $v);
                $normalizado = Falecido::normalizar($termo);
                $q->where(function ($sub) use ($termo, $normalizado) {
                    $sub->whereHas('inumacoes.falecido', function ($fq) use ($termo, $normalizado) {
                        $fq->where('nome', 'like', "%{$termo}%")
                            ->orWhere('nome_normalizado', 'like', "%{$normalizado}%")
                            ->orWhere('certidao_numero', 'like', "%{$termo}%")
                            ->orWhere('certidao_cartorio', 'like', "%{$termo}%");
                    })->orWhereHas('inumacoes', function ($iq) use ($termo) {
                        $iq->where('cartorio', 'like', "%{$termo}%")
                            ->orWhere('medico', 'like', "%{$termo}%")
                            ->orWhere('coveiro_nome', 'like', "%{$termo}%")
                            ->orWhere('pedreiro_nome', 'like', "%{$termo}%")
                            ->orWhere('livro_referencia', 'like', "%{$termo}%");
                    });
                });
            })
            ->when($request->query('concessao_status'), function ($q, $v) {
                match ($v) {
                    'com_concessao' => $q->whereHas('concessoes', fn ($c) => $c->where('situacao', 'vigente')),
                    'sem_concessao' => $q->whereDoesntHave('concessoes', fn ($c) => $c->where('situacao', 'vigente')),
                    'vencida' => $q->whereHas('concessoes', fn ($c) => $c->where('situacao', 'vencida')->orWhere(fn ($sub) => $sub->whereNotNull('termino')->whereDate('termino', '<', today()))),
                    'sucessao' => $q->whereHas('concessoes.processosSucessao', fn ($ps) => $ps->whereIn('situacao', ['aberto', 'em_analise', 'em_processamento'])),
                    default => null,
                };
            })
            ->when($request->query('financeiro_status'), function ($q, $v) {
                match ($v) {
                    'inadimplente' => $q->whereHas('concessoes.guias', fn ($g) => $g->where('situacao', 'emitida')->whereDate('vencimento', '<', today())),
                    'adimplente' => $q->whereHas('concessoes', fn ($c) => $c->whereDoesntHave('guias', fn ($g) => $g->where('situacao', 'emitida')->whereDate('vencimento', '<', today()))),
                    'sem_guias' => $q->whereDoesntHave('concessoes.guias'),
                    default => null,
                };
            })
            ->when($request->query('faixa_ocupacao'), function ($q, $v) {
                match ($v) {
                    'vazio' => $q->where('ocupacao', 0),
                    'parcial' => $q->where('ocupacao', '>', 0)->whereColumn('ocupacao', '<', 'capacidade'),
                    'lotado' => $q->whereColumn('ocupacao', '>=', 'capacidade'),
                    default => null,
                };
            })
            ->when($request->query('georreferenciado'), function ($q, $v) {
                match ($v) {
                    'com_gps' => $q->whereNotNull('lat')->whereNotNull('lng'),
                    'sem_gps' => $q->where(fn ($sub) => $sub->whereNull('lat')->orWhereNull('lng')),
                    default => null,
                };
            })
            ->orderBy('codigo')
            ->paginate($perPage);

        return response()->json($jazigos);
    }

    public function show(Request $request, int $jazigo): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json(Jazigo::with(['setor', 'cemiterio'])->findOrFail($jazigo));
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.inventario.manage');

        $dados = $request->validate([
            'sector_id' => ['required', 'integer'],
            'codigo' => ['required', 'string', 'max:40'],
            'tipo' => ['required', Rule::in(Jazigo::TIPOS)],
            'capacidade' => ['required', 'integer', 'min:1', 'max:50'],
            'comprimento_m' => ['nullable', 'numeric', 'gt:0'],
            'largura_m' => ['nullable', 'numeric', 'gt:0'],
        ]);

        $setor = Setor::findOrFail($dados['sector_id']);
        abort_if(
            Jazigo::where('park_id', $setor->park_id)->where('codigo', $dados['codigo'])->exists(),
            422,
            'Já existe jazigo com este código no cemitério.'
        );

        $jazigo = Jazigo::create($dados + ['park_id' => $setor->park_id]);
        $this->audit->record('cemiterios', 'jazigo.created', "Jazigo #{$jazigo->id}", null, $jazigo->toArray());

        return response()->json($jazigo->refresh(), 201);
    }

    public function update(Request $request, int $jazigo): JsonResponse
    {
        if (!$request->user()->hasPermission('cemiterios.inventario.manage')) {
            $this->autorizar($request, 'cemiterios.gis.edit');
        }

        $registro = Jazigo::findOrFail($jazigo);
        $dados = $request->validate([
            'codigo' => [
                'sometimes',
                'string',
                'max:40',
                Rule::unique('plot_inventory', 'codigo')
                    ->where('park_id', $registro->park_id)
                    ->whereNull('deleted_at')
                    ->ignore($registro->id),
            ],
            'codigo_legado' => ['nullable', 'string', 'max:50'],
            'processo_administrativo' => ['nullable', 'string', 'max:50'],
            'tipo' => ['sometimes', Rule::in(Jazigo::TIPOS)],
            'capacidade' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'comprimento_m' => ['nullable', 'numeric', 'gt:0'],
            'largura_m' => ['nullable', 'numeric', 'gt:0'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $antes = $registro->toArray();
        $registro->update($dados);
        $this->audit->record('cemiterios', 'jazigo.updated', "Jazigo #{$registro->id}", $antes, $registro->toArray());

        return response()->json($registro->fresh(['setor', 'cemiterio']));
    }

    /** Transição manual: entrar/sair de Em Ruína/Manutenção (RF-04). */
    public function estado(Request $request, int $jazigo): JsonResponse
    {
        if (!$request->user()->hasPermission('cemiterios.inventario.manage')) {
            $this->autorizar($request, 'cemiterios.gis.edit');
        }

        $dados = $request->validate([
            'para' => ['required', Rule::in(['manutencao', 'restaurar'])],
            'motivo' => ['required', 'string', 'max:255'],
            'lock_version' => ['required', 'integer'],
        ]);

        $registro = Jazigo::findOrFail($jazigo);
        $antes = $registro->toArray();
        $registro = $this->estados->manual($registro, $dados['para'], $dados['motivo'], $dados['lock_version']);
        $this->audit->record('cemiterios', 'jazigo.estado', "Jazigo #{$registro->id}", $antes, $registro->toArray());

        return response()->json($registro);
    }

    public function historico(Request $request, int $jazigo, JazigoHistoricoService $historico): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json($historico->linhaDoTempo(Jazigo::findOrFail($jazigo)));
    }
}
