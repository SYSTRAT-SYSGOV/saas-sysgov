<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Pessoas\Models\PessoaDivergencia;
use Modules\Pessoas\Services\AdocaoPessoaService;
use Modules\Pessoas\Services\DivergenciaPessoaService;

/** Revisão das divergências entre o dado civil de um módulo e o do cadastro central. */
final class DivergenciaController extends Controller
{
    use AutorizaPermissao;

    private const PERMISSAO = 'cadastros.pessoas.divergencias.manage';

    public function __construct(
        private readonly DivergenciaPessoaService $divergencias,
        private readonly AdocaoPessoaService $adocao,
        private readonly AuditLogger $audit,
    ) {}

    /** GET /api/pessoas/divergencias?modulo=&estado=aberta|resolvida&per_page= */
    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, self::PERMISSAO);

        $filtros = $request->validate([
            'modulo' => ['nullable', 'string', 'max:40'],
            'estado' => ['nullable', Rule::in([PessoaDivergencia::ABERTA, PessoaDivergencia::RESOLVIDA])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $lista = PessoaDivergencia::query()
            ->with('pessoa:id,nome')
            ->when($filtros['modulo'] ?? null, fn ($q, $modulo) => $q->where('modulo', $modulo))
            ->where('estado', $filtros['estado'] ?? PessoaDivergencia::ABERTA)
            ->orderBy('modulo')->orderBy('id')
            ->paginate((int) ($filtros['per_page'] ?? 25));

        // Os valores são dado civil: a leitura é auditada, sem gravar os valores no registro.
        $this->audit->record('pessoas', 'pessoa.divergencias_visualizadas', 'Divergências de pessoas', null, [
            'modulo' => $filtros['modulo'] ?? null,
            'total' => $lista->total(),
        ]);

        return response()->json([
            'data' => collect($lista->items())->map(fn (PessoaDivergencia $d): array => $this->paraArray($d))->all(),
            'current_page' => $lista->currentPage(),
            'last_page' => $lista->lastPage(),
            'per_page' => $lista->perPage(),
            'total' => $lista->total(),
        ]);
    }

    /** GET /api/pessoas/adocao — totais por módulo, sem dado civil individual. */
    public function adocao(Request $request): JsonResponse
    {
        $this->autorizar($request, self::PERMISSAO);

        return response()->json($this->adocao->relatorio());
    }

    /** POST /api/pessoas/divergencias/{divergencia}/resolver  { decisao: modulo|mdm } */
    public function resolver(Request $request, PessoaDivergencia $divergencia): JsonResponse
    {
        $this->autorizar($request, self::PERMISSAO);
        // O binding da rota roda antes de o tenant ser definido: a conferência é explícita (como `mesmoTenant` nas policies).
        abort_unless((int) $divergencia->tenant_id === app(TenantContext::class)->id(), 404);

        $dados = $request->validate(['decisao' => ['required', Rule::in(PessoaDivergencia::DECISOES)]]);

        $resolvida = $this->divergencias->resolver($divergencia, $dados['decisao'], $request->user());

        return response()->json($this->paraArray($resolvida));
    }

    /** @return array<string, mixed> */
    private function paraArray(PessoaDivergencia $d): array
    {
        return [
            'id' => $d->id,
            'pessoa_id' => $d->pessoa_id,
            'pessoa_nome' => $d->pessoa?->nome,
            'modulo' => $d->modulo,
            'tabela' => $d->tabela,
            'registro_id' => $d->registro_id,
            'campo' => $d->campo,
            'valor_modulo' => $d->valor_modulo,
            'valor_mdm' => $d->valor_mdm,
            'estado' => $d->estado,
            'decisao' => $d->decisao,
            'resolvida_em' => $d->resolvida_em?->toIso8601String(),
        ];
    }
}
