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
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Services\ConcessaoService;
use Modules\Cemiterios\Support\Documento;

/** Concessionários e concessões (spec: concessoes; RF-11..RF-14; RN-05). */
final class ConcessaoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly ConcessaoService $concessoes,
        private readonly AuditLogger $audit,
    ) {}

    public function titulares(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');
        $q = trim((string) $request->query('q'));
        $perPage = min(max((int) $request->query('per_page', 30), 1), 100);

        return response()->json(
            Concessionario::query()
                ->select(['id', 'tenant_id', 'nome', 'documento', 'tipo_doc', 'titular_falecido', 'email', 'telefone'])
                ->when($q !== '', fn ($query) => strlen(Documento::somenteDigitos($q)) >= 11
                    ? $query->where('documento_hash', Documento::hash($q))
                    : $query->where('nome', 'like', "%{$q}%"))
                ->orderBy('nome')
                ->paginate($perPage)
        );
    }

    public function showTitular(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $titular = Concessionario::with('concessoes.jazigo:id,codigo')->findOrFail($id);

        return response()->json($titular->toArray() + ['documento' => $titular->documento]);
    }

    public function storeTitular(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $dados = $this->validarTitular($request, null);
        $titular = Concessionario::create($dados + ['tipo_doc' => Documento::tipo($dados['documento'])]);
        $this->audit->record('cemiterios', 'concessionario.created', "Concessionario #{$titular->id}", null, $titular->toArray());

        return response()->json($titular, 201);
    }

    public function updateTitular(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $titular = Concessionario::findOrFail($id);
        $dados = $this->validarTitular($request, $titular);
        if (isset($dados['documento'])) {
            $dados['tipo_doc'] = Documento::tipo($dados['documento']);
        }

        $antes = $titular->toArray();
        $titular->update($dados);
        $this->audit->record('cemiterios', 'concessionario.updated', "Concessionario #{$id}", $antes, $titular->toArray());

        $titular->makeVisible(['documento']);

        return response()->json($titular);
    }

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        $paginador = Concessao::with([
            'jazigo:id,codigo,park_id,sector_id,estado,processo_administrativo',
            'jazigo.cemiterio:id,nome',
            'jazigo.setor:id,codigo',
            'concessionario:id,nome,documento,tipo_doc,email,telefone,endereco,titular_falecido,data_falecimento_titular,processo_inventario',
        ])
            ->withCount('guias')
            ->withExists(['guias as inadimplente' => fn ($q) => $q->where('situacao', 'emitida')->whereDate('vencimento', '<', today())])
            ->when($request->query('park_id'), fn ($q, $v) => $q->whereHas('jazigo', fn ($jq) => $jq->where('park_id', $v)))
            ->when($request->query('setor_id'), fn ($q, $v) => $q->whereHas('jazigo', fn ($jq) => $jq->where('sector_id', $v)))
            ->when($request->query('estado') ?? $request->query('situacao'), function ($q, $v) {
                // 'situacao' preserva o contrato legado (vigente|expirada|extinta) dos consumidores atuais.
                if (in_array($v, ['vigente', 'expirada', 'extinta'], true)) {
                    match ($v) {
                        'vigente' => $q->vigentes(),
                        'expirada' => $q->whereIn('estado', ['Vencendo', 'Vencida']),
                        default => $q->whereIn('estado', Concessao::ESTADOS_EXTINTOS),
                    };

                    return;
                }

                $q->where('estado', $v);
            })
            ->when($request->query('tipo') ?? $request->query('modalidade'), fn ($q, $v) => $q->where('tipo', $v))
            ->when($request->query('vence_ate'), fn ($q, $v) => $q->whereDate('data_fim', '<=', $v))
            ->when($request->query('vencendo') !== null, fn ($q) => $q->where('estado', 'Vencendo'))
            ->when($request->query('vencida') !== null, fn ($q) => $q->where('estado', 'Vencida'))
            ->when($request->query('holder_id'), fn ($q, $v) => $q->where('holder_id', $v))
            ->when($request->query('plot_id'), fn ($q, $v) => $q->where('plot_id', $v))
            ->when($request->query('numero'), fn ($q, $v) => $q->where('numero', 'like', "%{$v}%"))
            ->when($request->query('processo_administrativo'), fn ($q, $v) => $q->where('processo_administrativo', 'like', "%{$v}%"))
            ->when($request->query('titular_falecido') !== null, fn ($q) => $q->whereHas('concessionario', fn ($cq) => $cq->where('titular_falecido', filter_var($request->query('titular_falecido'), FILTER_VALIDATE_BOOLEAN))))
            ->when($request->query('pendencia_regularizacao') !== null, fn ($q) => $q->where('pendencia_regularizacao', filter_var($request->query('pendencia_regularizacao'), FILTER_VALIDATE_BOOLEAN)))
            ->when($request->query('busca'), function ($q, $v) {
                $termo = trim((string) $v);
                $q->where(function ($sub) use ($termo) {
                    $sub->where('numero', 'like', "%{$termo}%")
                        ->orWhere('processo_administrativo', 'like', "%{$termo}%")
                        ->orWhereHas('jazigo', fn ($jq) => $jq->where('codigo', 'like', "%{$termo}%"))
                        ->orWhereHas('concessionario', function ($cq) use ($termo) {
                            $cq->where('nome', 'like', "%{$termo}%");
                            if (strlen(Documento::somenteDigitos($termo)) >= 11) {
                                $cq->orWhere('documento_hash', Documento::hash($termo));
                            }
                        });
                });
            })
            ->when($request->query('financeiro'), function ($q, $v) {
                $vencida = fn ($g) => $g->where('situacao', 'emitida')->whereDate('vencimento', '<', today());
                match ($v) {
                    'inadimplente' => $q->whereHas('guias', $vencida),
                    'adimplente' => $q->whereDoesntHave('guias', $vencida),
                    'sem_guias' => $q->whereDoesntHave('guias'),
                    default => null,
                };
            })
            ->when(
                $request->query('plot_id'),
                fn ($q) => $q->orderBy('numero')->orderBy('id'),
                fn ($q) => $q->orderByDesc('id')
            )
            ->paginate(min(max((int) $request->query('per_page', 30), 1), 100));

        if ($request->boolean('com_documento') || $request->has('plot_id')) {
            $paginador->getCollection()->each(function (Concessao $c) {
                if ($c->concessionario) {
                    $c->concessionario->makeVisible(['documento']);
                }
            });
        }

        return response()->json($paginador);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json(Concessao::with(['jazigo.cemiterio:id,nome', 'concessionario'])->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $dados = $request->validate([
            'plot_id' => ['required', 'integer'],
            'holder_id' => ['required', 'integer'],
            'tipo' => ['required_without:modalidade', 'nullable', Rule::in(['temporaria', 'perpetua'])],
            'modalidade' => ['nullable', Rule::in(['temporaria', 'perpetua'])], // alias legado de tipo
            'inicio' => ['nullable', 'date'],
            'processo_administrativo' => ['nullable', 'string', 'max:50'],
            'lock_version' => ['required', 'integer'],
            'sujeita_taxa_anual' => ['sometimes', 'boolean'],
            'base_legal' => ['sometimes', 'string', 'max:40'],
            'prazo_anos' => ['nullable', 'integer', 'min:1', 'max:100'],
            'taxa_manutencao_centavos' => ['nullable', 'integer', 'min:0'],
            'vigencia_manifestacao_dias' => ['nullable', 'integer', 'min:0', 'max:365'],
        ]);
        Concessionario::findOrFail($dados['holder_id']);

        $concessao = $this->concessoes->solicitar([
            'plot_id' => $dados['plot_id'],
            'holder_id' => $dados['holder_id'],
            'tipo' => (string) ($dados['tipo'] ?? $dados['modalidade']),
            'data_inicio' => $dados['inicio'] ?? null,
            'lock_version' => $dados['lock_version'],
            'sujeita_taxa_anual' => $dados['sujeita_taxa_anual'] ?? true,
            'base_legal' => $dados['base_legal'] ?? null,
            'prazo_anos' => $dados['prazo_anos'] ?? null,
            'taxa_manutencao_centavos' => $dados['taxa_manutencao_centavos'] ?? null,
            'vigencia_manifestacao_dias' => $dados['vigencia_manifestacao_dias'] ?? null,
        ]);
        $this->audit->record('cemiterios', 'concessao.created', "Concessao #{$concessao->id}", null, $concessao->toArray());

        return response()->json($concessao->load('jazigo'), 201);
    }

    public function renovar(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $request->validate([
            'processo_administrativo' => ['nullable', 'string', 'max:50'],
        ]);

        $concessao = Concessao::findOrFail($id);
        $antes = $concessao->toArray();
        $resultado = $this->concessoes->renovar($concessao, $request->input('processo_administrativo'));
        $this->audit->record('cemiterios', 'concessao.renovada', "Concessao #{$id}", $antes, $resultado['concessao']->toArray());

        return response()->json($resultado);
    }

    public function renunciar(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');

        $dados = $request->validate([
            'motivo' => ['required', 'string', 'max:1000'],
            'processo_administrativo' => ['nullable', 'string', 'max:50'],
        ]);

        $concessao = Concessao::findOrFail($id);
        $antes = $concessao->toArray();
        $concessao = $this->concessoes->renunciar($concessao, $dados['motivo'], $dados['processo_administrativo'] ?? null);
        $this->audit->record('cemiterios', 'concessao.renunciada', "Concessao #{$id}", $antes, $concessao->toArray());

        return response()->json($concessao->load('jazigo'));
    }

    public function historico(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        Concessao::findOrFail($id);

        $eventos = \App\Models\AuditLog::query()
            ->where('module', 'cemiterios')
            ->where('resource', "Concessao #{$id}")
            ->orderByDesc('created_at')
            ->paginate(min(max((int) $request->query('per_page', 30), 1), 100));

        return response()->json($eventos);
    }

    /** @return array<string, mixed> */
    private function validarTitular(Request $request, ?Concessionario $atual): array
    {
        $obrigatorio = $atual ? 'sometimes' : 'required';

        return $request->validate([
            'nome' => [$obrigatorio, 'string', 'max:255'],
            'documento' => [$obrigatorio, 'string', function (string $campo, mixed $valor, Closure $falha) use ($atual): void {
                if (!Documento::valido((string) $valor)) {
                    $falha('CPF/CNPJ inválido.');

                    return;
                }
                $duplicado = Concessionario::withTrashed()
                    ->where('documento_hash', Documento::hash((string) $valor))
                    ->when($atual, fn ($q) => $q->whereKeyNot($atual->id))
                    ->exists();
                if ($duplicado) {
                    $falha('Já existe concessionário com este documento.');
                }
            }],
            'email' => ['nullable', 'email', 'max:255'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'endereco' => ['nullable', 'string', 'max:500'],
            'base_legal' => ['sometimes', Rule::in(['execucao_contrato', 'obrigacao_legal', 'consentimento'])],
            'titular_falecido' => ['sometimes', 'boolean'],
            'data_falecimento_titular' => ['nullable', 'date'],
            'processo_inventario' => ['nullable', 'string', 'max:50'],
        ]);
    }
}
