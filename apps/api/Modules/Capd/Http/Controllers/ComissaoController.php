<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Comissao;
use Modules\Capd\Models\ComissaoMembro;
use Modules\Capd\Models\Impedimento;

/**
 * Gestão das Comissões de Avaliação Periódica de Desempenho (CAPD).
 */
final class ComissaoController extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $comissoes = Comissao::with(['ciclo:id,nome,ano_referencia', 'membros.servidor:id,name,email'])
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return response()->json($comissoes);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();

        $validated = $request->validate([
            'ciclo_id'                 => ['required', 'integer', 'exists:capd_ciclos,id'],
            'numero_portaria'          => ['required', 'string', 'max:50'],
            'data_publicacao_portaria' => ['required', 'date'],
        ]);

        $existente = Comissao::where('ciclo_id', $validated['ciclo_id'])->exists();
        abort_if($existente, 422, 'Já existe uma comissão CAPD cadastrada para este ciclo.');

        $comissao = Comissao::create([
            ...$validated,
            'tenant_id' => $tenantId,
            'ativa'     => true,
        ]);

        $this->audit->record('capd', 'comissao.created', "Comissão Portaria {$comissao->numero_portaria}", null, $comissao->toArray());

        return response()->json($comissao, 201);
    }

    public function show(int $id): JsonResponse
    {
        $comissao = Comissao::with([
            'ciclo',
            'membros.servidor:id,name,email',
            'membros.impedimentos.servidorAlvo:id,name',
        ])->findOrFail($id);

        return response()->json($comissao);
    }

    public function adicionarMembro(Request $request, int $id): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $comissao = Comissao::findOrFail($id);

        $validated = $request->validate([
            'servidor_id'         => ['required', 'integer', 'exists:users,id'],
            'papel'               => ['required', 'string', 'in:presidente,secretario,titular_gestao,titular_servidor,suplente'],
            'data_inicio_mandato' => ['nullable', 'date'],
            'data_fim_mandato'    => ['nullable', 'date', 'after_or_equal:data_inicio_mandato'],
        ]);

        $jaMembro = ComissaoMembro::where('comissao_id', $comissao->id)
            ->where('servidor_id', $validated['servidor_id'])
            ->exists();

        abort_if($jaMembro, 422, 'Este servidor já faz parte desta comissão.');

        $membro = ComissaoMembro::create([
            ...$validated,
            'tenant_id'   => $tenantId,
            'comissao_id' => $comissao->id,
            'ativo'       => true,
        ]);

        $this->audit->record('capd', 'comissao.membro_adicionado', "Membro #{$membro->id} adicionado à Comissão #{$comissao->id}", null, $membro->toArray());

        return response()->json($membro->load('servidor:id,name,email'), 201);
    }

    public function declararImpedimento(Request $request, int $membroId): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $membro   = ComissaoMembro::findOrFail($membroId);

        $validated = $request->validate([
            'servidor_alvo_id' => ['required', 'integer', 'exists:users,id', 'different:' . $membro->servidor_id],
            'tipo_impedimento' => ['required', 'string', 'in:grau_parentesco,subordinacao_direta,recorrente,avaliador,autodeclarado'],
            'motivo'           => ['required', 'string', 'min:10', 'max:255'],
        ]);

        $impedimento = Impedimento::create([
            ...$validated,
            'tenant_id'          => $tenantId,
            'comissao_membro_id' => $membro->id,
            'declarado_por'      => $request->user()->id,
            'declarado_em'       => now(),
        ]);

        $this->audit->record(
            'capd',
            'comissao.impedimento_declarado',
            "Impedimento declarado: Membro #{$membro->id} vs Servidor #{$validated['servidor_alvo_id']} ({$validated['tipo_impedimento']})",
            null,
            $impedimento->toArray(),
        );

        return response()->json($impedimento, 201);
    }
}
