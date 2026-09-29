<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Http\Requests\AtualizarOperadorRequest;
use Modules\Cemiterios\Http\Requests\CadastrarOperadorRequest;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Services\OperadorCemiterioService;
use Modules\Cemiterios\Support\Documento;

final class OperadorCemiterioController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly OperadorCemiterioService $operadores,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.cadastros.view');

        $tipo = $request->query('tipo');
        $situacao = $request->query('situacao');
        $statusAlvara = $request->query('status_alvara');
        $statusSaude = $request->query('status_saude_ocupacional');
        $parkId = $request->query('park_id');
        $q = trim((string) $request->query('q'));

        $query = OperadorCemiterio::query()
            ->when($tipo, fn ($query) => $query->where('tipo', $tipo))
            ->when($situacao, fn ($query) => $query->where('situacao', $situacao))
            ->when($parkId, fn ($query) => $query->where('park_id', $parkId))
            ->when($statusAlvara === 'vencido', fn ($query) => $query->where('tipo', 'pedreiro')->whereDate('alvara_validade', '<', today()))
            ->when($statusAlvara === 'vencendo', fn ($query) => $query->where('tipo', 'pedreiro')->whereBetween('alvara_validade', [today(), today()->addDays(30)]))
            ->when($statusAlvara === 'valido', fn ($query) => $query->where('tipo', 'pedreiro')->whereDate('alvara_validade', '>', today()->addDays(30)))
            ->when($statusSaude === 'vencido', fn ($query) => $query->whereNotNull('aso_validade')->whereDate('aso_validade', '<', today()))
            ->when($statusSaude === 'a_vencer', fn ($query) => $query->whereBetween('aso_validade', [today(), today()->addDays(30)]))
            ->when($statusSaude === 'valido', fn ($query) => $query->whereDate('aso_validade', '>', today()->addDays(30)))
            ->when($statusSaude === 'nao_informado', fn ($query) => $query->whereNull('aso_validade'))
            ->when($q !== '', function ($query) use ($q): void {
                $documentoHash = Documento::hash($q);
                $query->where(function ($sub) use ($q, $documentoHash): void {
                    $sub->where('nome', 'like', "%{$q}%")
                        ->orWhere('matricula_funcional', 'like', "%{$q}%")
                        ->orWhere('alvara_numero', 'like', "%{$q}%")
                        ->orWhere('documento_hash', $documentoHash);
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
            'aso_vencendo' => OperadorCemiterio::query()->where('situacao', 'ativo')->whereBetween('aso_validade', [today(), today()->addDays(30)])->count(),
            'aso_vencido' => OperadorCemiterio::query()->where('situacao', 'ativo')->whereNotNull('aso_validade')->whereDate('aso_validade', '<', today())->count(),
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

    public function store(CadastrarOperadorRequest $request): JsonResponse
    {
        $dados = $request->validated();
        $docLimpo = Documento::somenteDigitos($dados['cpf_cnpj'] ?? '');
        $dados['cpf_cnpj'] = $docLimpo ?: null;
        $dados['documento_hash'] = $docLimpo ? Documento::hash($docLimpo) : null;

        $operador = $this->operadores->cadastrar($dados);

        return response()->json($operador, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.cadastros.view');

        $operador = OperadorCemiterio::findOrFail($id);

        return response()->json($operador->toArray() + [
            'status_alvara' => $operador->statusAlvara(),
            'is_alvara_vencido' => $operador->isAlvaraVencido(),
            'is_alvara_vencendo' => $operador->isAlvaraVencendo(),
            'status_credenciamento' => $this->operadores->statusCredenciamento($operador),
            'status_saude_ocupacional' => $this->operadores->statusSaudeOcupacional($operador),
        ]);
    }

    public function update(AtualizarOperadorRequest $request, int $id): JsonResponse
    {
        $operador = OperadorCemiterio::findOrFail($id);
        $dados = $request->validated();

        if (array_key_exists('cpf_cnpj', $dados)) {
            $docLimpo = Documento::somenteDigitos($dados['cpf_cnpj'] ?? '');
            $dados['cpf_cnpj'] = $docLimpo ?: null;
            $dados['documento_hash'] = $docLimpo ? Documento::hash($docLimpo) : null;
        }

        $operador = $this->operadores->atualizar($operador, $dados);

        return response()->json($operador->fresh());
    }

    public function historico(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.cadastros.view');

        $operador = OperadorCemiterio::findOrFail($id);

        $query = Inumacao::query()
            ->with([
                'falecido:id,nome,falecimento',
                'jazigo.cemiterio:id,codigo,nome',
                'jazigo.setor:id,codigo,descricao',
            ]);

        if ($operador->tipo === 'coveiro') {
            $query->where(function ($sub) use ($operador): void {
                $sub->where('coveiro_id', $operador->id)
                    ->orWhere(function ($legado) use ($operador): void {
                        $legado->whereNull('coveiro_id')
                            ->where(function ($nome) use ($operador): void {
                                $nome->where('coveiro_nome', $operador->nome)
                                    ->orWhere('coveiro_nome', $operador->matricula_funcional);
                            });
                    });
            });
        } else {
            $query->where(function ($sub) use ($operador): void {
                $sub->where('pedreiro_id', $operador->id)
                    ->orWhere(function ($legado) use ($operador): void {
                        $legado->whereNull('pedreiro_id')
                            ->where(function ($nome) use ($operador): void {
                                $nome->where('pedreiro_nome', $operador->nome)
                                    ->orWhere('pedreiro_nome', $operador->alvara_numero);
                            });
                    });
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
