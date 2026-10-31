<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Escola;
use Modules\Transporte\Enums\MediacaoDidatica;
use Modules\Transporte\Enums\OrigemVeiculo;
use Modules\Transporte\Enums\PoderPublico;
use Modules\Transporte\Enums\TipoEmpresa;
use Modules\Transporte\Enums\TipoRede;
use Modules\Transporte\Enums\Turno;
use Modules\Transporte\Models\Empresa;
use Modules\Transporte\Models\Motorista;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Support\Tipologias;

/** Listas de apoio dos formulários e as permissões do usuário no módulo. */
final class OpcoesController extends Controller
{
    public function __construct(private readonly TransportePolicy $policy) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->ver($user), 403);

        return response()->json(['data' => [
            'tipos_empresa' => array_map(fn (TipoEmpresa $t): array => ['valor' => $t->value, 'rotulo' => $t->label()], TipoEmpresa::cases()),
            'origens' => array_map(fn (OrigemVeiculo $o): array => [
                'valor' => $o->value, 'rotulo' => $o->label(), 'tipo_empresa' => $o->empresaExigida()?->value,
            ], OrigemVeiculo::cases()),
            'tipos_rede' => array_map(fn (TipoRede $t): array => ['valor' => $t->value, 'rotulo' => $t->label()], TipoRede::cases()),
            'turnos' => array_map(fn (Turno $t): array => ['valor' => $t->value, 'rotulo' => $t->label()], Turno::cases()),
            'escolas' => Escola::query()->where('ativa', true)->orderBy('nome')->get(['id', 'nome'])
                ->map(fn (Escola $e): array => ['id' => $e->id, 'nome' => $e->nome])->values(),
            'anos_letivos' => $this->anosLetivos(),
            'veiculos' => Veiculo::query()->where('ativo', true)->orderBy('placa')->get(['id', 'placa', 'descricao'])
                ->map(fn (Veiculo $v): array => ['id' => $v->id, 'placa' => $v->placa, 'descricao' => $v->descricao])->values(),
            'poderes_publicos' => array_map(fn (PoderPublico $p): array => ['valor' => $p->value, 'rotulo' => $p->label()], PoderPublico::cases()),
            'mediacoes' => array_map(fn (MediacaoDidatica $m): array => ['valor' => $m->value, 'rotulo' => $m->label()], MediacaoDidatica::cases()),
            'categorias_cnh' => ['D', 'E'],
            'tipologias' => Tipologias::lista(),
            'empresas' => Empresa::query()->with('pessoa')->where('ativa', true)->get()
                ->map(fn (Empresa $e): array => ['id' => $e->id, 'nome' => $e->nome(), 'tipo' => $e->tipo])->sortBy('nome')->values(),
            'motoristas' => Motorista::query()->with('pessoa')->where('ativo', true)->get()
                ->map(fn (Motorista $m): array => ['id' => $m->id, 'nome' => $m->nome()])->sortBy('nome')->values(),
            'permissoes' => [
                'gerenciar_frota' => $this->policy->gerenciarFrota($user),
                'gerenciar_rotas' => $this->policy->gerenciarRotas($user),
                'gerenciar_alocacoes' => $this->policy->gerenciarAlocacoes($user),
                'exceder_capacidade' => $this->policy->excederCapacidade($user),
                'auditar' => $this->policy->auditar($user),
            ],
        ]]);
    }

    /**
     * Anos letivos das turmas do tenant, mais o ano corrente (D12), do mais recente ao mais antigo.
     *
     * @return list<int>
     */
    private function anosLetivos(): array
    {
        $anos = DB::table('escola_turmas')->where('tenant_id', app(\App\Support\TenantContext::class)->id())->distinct()->pluck('ano_letivo')
            ->map(fn ($a): int => (int) $a)->push((int) now()->year)->unique()->sortDesc()->values();

        return $anos->all();
    }
}
