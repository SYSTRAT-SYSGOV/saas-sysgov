<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Support\Documento;

final class OperadorCemiterioController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.cadastros.manage');

        $tipo = $request->query('tipo');
        $situacao = $request->query('situacao');
        $statusAlvara = $request->query('status_alvara');
        $q = trim((string) $request->query('q'));

        $query = OperadorCemiterio::query()
            ->when($tipo, fn ($query) => $query->where('tipo', $tipo))
            ->when($situacao, fn ($query) => $query->where('situacao', $situacao))
            ->when($statusAlvara === 'vencido', fn ($query) => $query->where('tipo', 'pedreiro')->whereDate('alvara_validade', '<', today()))
            ->when($statusAlvara === 'vencendo', fn ($query) => $query->where('tipo', 'pedreiro')->whereBetween('alvara_validade', [today(), today()->addDays(30)]))
            ->when($statusAlvara === 'valido', fn ($query) => $query->where('tipo', 'pedreiro')->whereDate('alvara_validade', '>', today()->addDays(30)))
            ->when($q !== '', function ($query) use ($q): void {
                $query->where(function ($sub) use ($q): void {
                    $sub->where('nome', 'like', "%{$q}%")
                        ->orWhere('matricula_funcional', 'like', "%{$q}%")
                        ->orWhere('alvara_numero', 'like', "%{$q}%")
                        ->orWhere('cpf_cnpj', 'like', "%{$q}%");
                });
            })
            ->orderBy('nome');

        $itens = $query->paginate(min((int) $request->query('per_page', 25), 100));

        // Metadados estatísticos para cards do topo da tela
        $stats = [
            'total_coveiros' => OperadorCemiterio::coveiros()->where('situacao', 'ativo')->count(),
            'total_pedreiros' => OperadorCemiterio::pedreiros()->where('situacao', 'ativo')->count(),
            'alvaras_vencendo' => OperadorCemiterio::pedreiros()->where('situacao', 'ativo')->whereBetween('alvara_validade', [today(), today()->addDays(30)])->count(),
            'alvaras_vencidos' => OperadorCemiterio::pedreiros()->where('situacao', 'ativo')->whereDate('alvara_validade', '<', today())->count(),
        ];

        return response()->json([
            'data' => $itens->items(),
            'current_page' => $itens->currentPage(),
            'last_page' => $itens->lastPage(),
            'total' => $itens->total(),
            'per_page' => $itens->perPage(),
            'stats' => $stats,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.cadastros.manage');

        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'tipo' => ['required', 'string', 'in:coveiro,pedreiro'],
            'cpf_cnpj' => ['nullable', 'string', 'max:20'],
            'matricula_funcional' => ['nullable', 'string', 'max:30'],
            'alvara_numero' => ['nullable', 'string', 'max:50'],
            'alvara_validade' => ['nullable', 'date'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:100'],
            'situacao' => ['nullable', 'string', 'in:ativo,suspenso,inativo'],
            'observacoes' => ['nullable', 'string'],
        ]);

        $docLimpo = Documento::somenteDigitos($dados['cpf_cnpj'] ?? '');
        $dados['cpf_cnpj'] = $docLimpo ?: null;
        $dados['documento_hash'] = $docLimpo ? Documento::hash($docLimpo) : null;

        $operador = OperadorCemiterio::create($dados);

        $this->audit->record(
            module: 'cemiterios',
            action: 'operador.created',
            resource: "OperadorCemiterio:{$operador->id}",
            before: null,
            after: ['nome' => $operador->nome, 'tipo' => $operador->tipo]
        );

        return response()->json($operador, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.cadastros.manage');

        $operador = OperadorCemiterio::findOrFail($id);

        return response()->json($operador->toArray() + [
            'status_alvara' => $operador->statusAlvara(),
            'is_alvara_vencido' => $operador->isAlvaraVencido(),
            'is_alvara_vencendo' => $operador->isAlvaraVencendo(),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.cadastros.manage');

        $operador = OperadorCemiterio::findOrFail($id);
        $before = $operador->toArray();

        $dados = $request->validate([
            'nome' => ['sometimes', 'required', 'string', 'max:255'],
            'tipo' => ['sometimes', 'required', 'string', 'in:coveiro,pedreiro'],
            'cpf_cnpj' => ['nullable', 'string', 'max:20'],
            'matricula_funcional' => ['nullable', 'string', 'max:30'],
            'alvara_numero' => ['nullable', 'string', 'max:50'],
            'alvara_validade' => ['nullable', 'date'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:100'],
            'situacao' => ['nullable', 'string', 'in:ativo,suspenso,inativo'],
            'observacoes' => ['nullable', 'string'],
        ]);

        if (array_key_exists('cpf_cnpj', $dados)) {
            $docLimpo = Documento::somenteDigitos($dados['cpf_cnpj'] ?? '');
            $dados['cpf_cnpj'] = $docLimpo ?: null;
            $dados['documento_hash'] = $docLimpo ? Documento::hash($docLimpo) : null;
        }

        $operador->update($dados);

        $this->audit->record(
            module: 'cemiterios',
            action: 'operador.updated',
            resource: "OperadorCemiterio:{$operador->id}",
            before: $before,
            after: $operador->fresh()->toArray()
        );

        return response()->json($operador);
    }

    public function historico(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.cadastros.manage');

        $operador = OperadorCemiterio::findOrFail($id);

        $query = Inumacao::query()
            ->with([
                'falecido:id,nome,falecimento',
                'jazigo.cemiterio:id,codigo,nome',
                'jazigo.setor:id,codigo,descricao',
            ]);

        if ($operador->tipo === 'coveiro') {
            $query->where(function ($sub) use ($operador): void {
                $sub->where('coveiro_nome', $operador->nome)
                    ->orWhere('coveiro_nome', $operador->matricula_funcional);
            });
        } else {
            $query->where(function ($sub) use ($operador): void {
                $sub->where('pedreiro_nome', $operador->nome)
                    ->orWhere('pedreiro_nome', $operador->alvara_numero);
            });
        }

        $atendimentos = $query->orderByDesc('sepultado_em')->paginate(20);

        return response()->json([
            'operador' => [
                'id' => $operador->id,
                'nome' => $operador->nome,
                'tipo' => $operador->tipo,
                'matricula_funcional' => $operador->matricula_funcional,
                'alvara_numero' => $operador->alvara_numero,
                'status_alvara' => $operador->statusAlvara(),
            ],
            'total_operacoes' => $atendimentos->total(),
            'operacoes' => $atendimentos->items(),
            'current_page' => $atendimentos->currentPage(),
            'last_page' => $atendimentos->lastPage(),
        ]);
    }
}
