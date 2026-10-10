<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Campanha\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Campanha\Models\CaboEleitoral;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Coordenador;
use Modules\Campanha\Models\PrefeitoRelacao;
use Modules\Campanha\Models\Vereador;
use Modules\Campanha\Services\EquipeService;
use Modules\Campanha\Services\MunicipioService;
use Modules\Campanha\Support\CampanhaContext;

/** Coordenadores, cabos eleitorais, prefeitos, vereadores e configuração da campanha de trabalho. */
final class EquipeController extends Controller
{
    use RespondeErroDeNegocio;

    private const CONTATOS = [
        'telefone' => ['sometimes', 'nullable', 'string', 'max:20'],
        'whatsapp' => ['sometimes', 'nullable', 'string', 'max:20'],
        'email' => ['sometimes', 'nullable', 'email', 'max:150'],
        'observacoes' => ['sometimes', 'nullable', 'string', 'max:5000'],
    ];

    public function __construct(
        private readonly EquipeService $equipe,
        private readonly MunicipioService $municipios,
        private readonly CampanhaContext $campanha,
    ) {}

    // ---------------------------------------------------------------- coordenadores

    public function coordenadores(): JsonResponse
    {
        $this->authorize('viewAny', Coordenador::class);

        return response()->json(['coordenadores' => Coordenador::query()->with('pessoa')->orderBy('tipo')->orderBy('nome')->get()]);
    }

    public function salvarCoordenador(Request $request, ?Coordenador $coordenador = null): JsonResponse
    {
        $coordenador === null ? $this->authorize('create', Coordenador::class) : $this->authorize('update', $coordenador);
        $obrigatorio = $coordenador === null ? 'required' : 'sometimes';
        $dados = $request->validate([
            'nome' => [$obrigatorio, 'string', 'max:200'],
            'tipo' => [$obrigatorio, Rule::in(['estadual', 'regional', 'municipal'])],
            'cpf' => ['sometimes', 'nullable', 'string', 'max:14'],
            'codigo_ibge' => ['sometimes', 'nullable', 'integer'],
            'regiao' => ['sometimes', 'nullable', 'string', 'max:150'],
            'meta_votos' => ['sometimes', 'integer', 'min:0'],
            ...self::CONTATOS,
        ]);

        return $this->executar(fn () => response()->json($this->equipe->salvarPessoaDeEquipe(Coordenador::class, $coordenador, $dados)->load('pessoa'), $coordenador === null ? 201 : 200));
    }

    public function excluirCoordenador(Coordenador $coordenador): JsonResponse
    {
        $this->authorize('delete', $coordenador);

        return $this->executar(function () use ($coordenador): JsonResponse {
            $this->equipe->excluirCoordenador($coordenador);

            return response()->json(['deleted' => true]);
        });
    }

    // ---------------------------------------------------------------- cabos eleitorais

    public function cabos(Request $request): JsonResponse
    {
        $this->authorize('viewAny', CaboEleitoral::class);
        $filtros = $request->validate(['codigo_ibge' => ['sometimes', 'integer'], 'coordenador_id' => ['sometimes', 'integer'], 'busca' => ['sometimes', 'nullable', 'string', 'max:100']]);

        return response()->json(['cabos' => CaboEleitoral::query()->with('pessoa')
            ->when($filtros['codigo_ibge'] ?? null, fn ($q, $v) => $q->where('codigo_ibge', $v))
            ->when($filtros['coordenador_id'] ?? null, fn ($q, $v) => $q->where('coordenador_id', $v))
            ->when($filtros['busca'] ?? null, fn ($q, $v) => $q->where('nome', 'like', '%' . $v . '%'))
            ->orderBy('nome')->get()]);
    }

    public function salvarCabo(Request $request, ?CaboEleitoral $cabo = null): JsonResponse
    {
        $cabo === null ? $this->authorize('create', CaboEleitoral::class) : $this->authorize('update', $cabo);
        $obrigatorio = $cabo === null ? 'required' : 'sometimes';
        $dados = $request->validate([
            'nome' => [$obrigatorio, 'string', 'max:200'],
            'codigo_ibge' => [$obrigatorio, 'integer'],
            'cpf' => ['sometimes', 'nullable', 'string', 'max:14'],
            'bairro' => ['sometimes', 'nullable', 'string', 'max:150'],
            'endereco' => ['sometimes', 'nullable', 'string', 'max:255'],
            'coordenador_id' => ['sometimes', 'nullable', 'integer'],
            'votos_estimados' => ['sometimes', 'integer', 'min:0'],
            'area_atuacao' => ['sometimes', 'nullable', 'string', 'max:255'],
            'disponibilidade' => ['sometimes', 'nullable', 'string', 'max:255'],
            'veiculo_proprio' => ['sometimes', 'boolean'],
            'ajuda_custo' => ['sometimes', 'boolean'],
            'valor_ajuda_centavos' => ['sometimes', 'integer', 'min:0'],
            'pix' => ['sometimes', 'nullable', 'string', 'max:150'],
            'banco' => ['sometimes', 'nullable', 'string', 'max:100'],
            'instagram' => ['sometimes', 'nullable', 'string', 'max:100'],
            'facebook' => ['sometimes', 'nullable', 'string', 'max:100'],
            ...self::CONTATOS,
        ]);

        return $this->executar(fn () => response()->json($this->equipe->salvarPessoaDeEquipe(CaboEleitoral::class, $cabo, $dados)->load('pessoa'), $cabo === null ? 201 : 200));
    }

    public function excluirCabo(CaboEleitoral $cabo): JsonResponse
    {
        $this->authorize('delete', $cabo);
        $this->equipe->excluir($cabo, 'cabo');

        return response()->json(['deleted' => true]);
    }

    // ---------------------------------------------------------------- prefeitos

    /** Prefeitos eleitos da UF (base pública) com a relação registrada pela campanha. */
    public function prefeitos(): JsonResponse
    {
        $this->authorize('viewAny', PrefeitoRelacao::class);

        return response()->json(['prefeitos' => $this->municipios->linhas()->map(fn (array $l): array => [
            'codigo_ibge' => $l['codigo_ibge'], 'municipio' => $l['nome'], 'regiao' => $l['regiao_intermediaria'], ...$l['prefeito'],
        ])->values()]);
    }

    public function salvarPrefeito(Request $request, int $codigoIbge): JsonResponse
    {
        $this->authorize('create', PrefeitoRelacao::class);
        $dados = $request->validate([
            'relacao' => ['required', Rule::in(['aliado', 'neutro', 'oposicao'])],
            'influencia' => ['sometimes', Rule::in(['alta', 'media', 'baixa'])],
            ...self::CONTATOS,
        ]);

        return $this->executar(fn () => response()->json($this->equipe->salvarPrefeito($codigoIbge, $dados)));
    }

    public function excluirPrefeito(int $codigoIbge): JsonResponse
    {
        $this->authorize('create', PrefeitoRelacao::class);
        $registro = PrefeitoRelacao::query()->where('codigo_ibge', $codigoIbge)->firstOrFail();
        $this->equipe->excluir($registro, 'prefeito');

        return response()->json(['deleted' => true]);
    }

    // ---------------------------------------------------------------- vereadores

    public function vereadores(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Vereador::class);
        $filtros = $request->validate(['codigo_ibge' => ['sometimes', 'integer'], 'aliado' => ['sometimes', 'boolean']]);

        return response()->json(['vereadores' => Vereador::query()
            ->when(isset($filtros['codigo_ibge']), fn ($q) => $q->where('codigo_ibge', $filtros['codigo_ibge']))
            ->when(isset($filtros['aliado']), fn ($q) => $q->where('aliado', (bool) $filtros['aliado']))
            ->orderBy('nome')->get()]);
    }

    public function salvarVereador(Request $request, ?Vereador $vereador = null): JsonResponse
    {
        $vereador === null ? $this->authorize('create', Vereador::class) : $this->authorize('update', $vereador);
        $dados = $request->validate([
            'codigo_ibge' => [$vereador === null ? 'required' : 'sometimes', 'integer'],
            'ref_mandatario_id' => ['sometimes', 'nullable', 'integer'],
            'nome' => ['sometimes', 'nullable', 'string', 'max:200'],
            'partido' => ['sometimes', 'nullable', 'string', 'max:30'],
            'numero' => ['sometimes', 'nullable', 'string', 'max:10'],
            'mandato' => ['sometimes', 'nullable', 'string', 'max:100'],
            'instagram' => ['sometimes', 'nullable', 'string', 'max:100'],
            'facebook' => ['sometimes', 'nullable', 'string', 'max:100'],
            'aliado' => ['sometimes', 'boolean'],
            'votos_estimados' => ['sometimes', 'integer', 'min:0'],
            'dobradinha' => ['sometimes', 'nullable', 'string', 'max:255'],
            'apoio_presidente' => ['sometimes', 'nullable', 'string', 'max:200'],
            'apoio_governador' => ['sometimes', 'nullable', 'string', 'max:200'],
            'apoio_senador' => ['sometimes', 'nullable', 'string', 'max:200'],
            'apoio_dep_federal' => ['sometimes', 'nullable', 'string', 'max:200'],
            'apoio_dep_estadual' => ['sometimes', 'nullable', 'string', 'max:200'],
            ...self::CONTATOS,
        ]);

        return $this->executar(fn () => response()->json($this->equipe->salvarVereador($vereador, $dados), $vereador === null ? 201 : 200));
    }

    public function excluirVereador(Vereador $vereador): JsonResponse
    {
        $this->authorize('delete', $vereador);
        $this->equipe->excluir($vereador, 'vereador');

        return response()->json(['deleted' => true]);
    }

    // ---------------------------------------------------------------- configuração

    public function configurar(Request $request): JsonResponse
    {
        $this->authorize('update', $this->campanha->get());
        $cor = ['string', 'regex:/^#[0-9a-fA-F]{6}$/'];
        $dados = $request->validate([
            'cores_situacao' => ['sometimes', 'array'],
            ...array_combine(array_map(fn (string $s): string => "cores_situacao.{$s}", Campanha::SITUACOES), array_fill(0, count(Campanha::SITUACOES), ['sometimes', ...$cor])),
            'faixas_meta' => ['sometimes', 'array'],
            'faixas_meta.faixas' => ['required_with:faixas_meta', 'array', 'min:1', 'max:9'],
            'faixas_meta.faixas.*.limite' => ['required', 'integer', 'min:1'],
            'faixas_meta.faixas.*.cor' => ['required', ...$cor],
            'faixas_meta.cor_acima' => ['required_with:faixas_meta', ...$cor],
        ]);
        /** @var array{cores_situacao?: array<string, string>, faixas_meta?: array{faixas: list<array{limite: int, cor: string}>, cor_acima: string}} $dados */

        return $this->executar(function () use ($dados): JsonResponse {
            $campanha = $this->equipe->configurar($dados);

            return response()->json(['cores' => $campanha->cores(), 'faixas' => $campanha->faixas()]);
        });
    }
}
