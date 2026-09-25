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

        return response()->json(
            Concessionario::query()
                ->when($q !== '', fn ($query) => strlen(Documento::somenteDigitos($q)) >= 11
                    ? $query->where('documento_hash', Documento::hash($q))
                    : $query->where('nome', 'like', "%{$q}%"))
                ->orderBy('nome')
                ->paginate(min((int) $request->query('per_page', 30), 100))
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

        return response()->json($titular);
    }

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json(
            Concessao::with(['jazigo:id,codigo,park_id,estado,processo_administrativo', 'concessionario:id,nome,titular_falecido'])
                ->when($request->query('situacao'), fn ($q, $v) => $q->where('situacao', $v))
                ->when($request->query('holder_id'), fn ($q, $v) => $q->where('holder_id', $v))
                ->when($request->query('plot_id'), fn ($q, $v) => $q->where('plot_id', $v))
                ->when($request->query('numero'), fn ($q, $v) => $q->where('numero', 'like', "%{$v}%"))
                ->when($request->query('processo_administrativo'), fn ($q, $v) => $q->where('processo_administrativo', 'like', "%{$v}%"))
                ->when($request->query('titular_falecido') !== null, fn ($q) => $q->whereHas('concessionario', fn ($cq) => $cq->where('titular_falecido', filter_var($request->query('titular_falecido'), FILTER_VALIDATE_BOOLEAN))))
                ->orderByDesc('id')
                ->paginate(min((int) $request->query('per_page', 30), 100))
        );
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
            'modalidade' => ['required', Rule::in(['temporaria', 'perpetua'])],
            'inicio' => ['nullable', 'date'],
            'processo_administrativo' => ['nullable', 'string', 'max:50'],
            'lock_version' => ['required', 'integer'],
            'sujeita_taxa_anual' => ['sometimes', 'boolean'],
        ]);
        Concessionario::findOrFail($dados['holder_id']);

        $concessao = $this->concessoes->conceder($dados);
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
            'endereco' => ['nullable', 'string', 'max:255'],
            'base_legal' => ['sometimes', Rule::in(['execucao_contrato', 'obrigacao_legal', 'consentimento'])],
            'titular_falecido' => ['sometimes', 'boolean'],
            'data_falecimento_titular' => ['nullable', 'date'],
            'processo_inventario' => ['nullable', 'string', 'max:50'],
        ]);
    }
}
