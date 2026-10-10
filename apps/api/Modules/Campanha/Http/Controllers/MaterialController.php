<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Campanha\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Campanha\Models\Material;
use Modules\Campanha\Models\Remessa;
use Modules\Campanha\Services\AnexoService;
use Modules\Campanha\Services\MaterialService;
use Symfony\Component\HttpFoundation\Response;

/** Materiais com estoque, remessas, imagem do material e foto da entrega. */
final class MaterialController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly MaterialService $materiais,
        private readonly AnexoService $anexos,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Material::class);
        $lista = Material::query()->withSum('remessas as enviado', 'quantidade')->orderBy('tipo')->orderBy('nome')->get()
            ->map(fn (Material $m): array => $this->formatar($m));

        return response()->json(['materiais' => $lista]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Material::class);
        $dados = $request->validate($this->regras());
        $lancar = (bool) ($dados['lancar_despesa'] ?? false);
        unset($dados['lancar_despesa']);

        return $this->executar(fn () => response()->json($this->formatar($this->materiais->salvar(null, $dados, $lancar, $this->autor($request))), 201));
    }

    public function update(Request $request, Material $material): JsonResponse
    {
        $this->authorize('update', $material);
        $dados = $request->validate($this->regras(parcial: true));
        unset($dados['lancar_despesa']);

        return $this->executar(fn () => response()->json($this->formatar($this->materiais->salvar($material, $dados, false, $this->autor($request)))));
    }

    public function destroy(Material $material): JsonResponse
    {
        $this->authorize('delete', $material);
        $this->materiais->excluir($material);

        return response()->json(['deleted' => true]);
    }

    public function enviarImagem(Request $request, Material $material): JsonResponse
    {
        $this->authorize('update', $material);
        $request->validate(['arquivo' => AnexoService::REGRA]);

        return $this->executar(fn () => response()->json($this->formatar($this->anexos->guardar($material, 'imagem', 'material', $request->file('arquivo')))));
    }

    public function imagem(Material $material): Response
    {
        $this->authorize('arquivo', $material);

        return $this->anexos->resposta($material, 'imagem', "material-{$material->id}") ?? response()->json(['error' => 'Este material não tem imagem.'], 404);
    }

    // ---------------------------------------------------------------- remessas

    public function remessas(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Material::class);
        $filtros = $request->validate(['material_id' => ['nullable', 'integer'], 'codigo_ibge' => ['nullable', 'integer'], 'pendentes' => ['nullable', 'boolean']]);
        $lista = Remessa::query()->with('material:id,nome,tipo,unidade')
            ->when(!empty($filtros['material_id']), fn ($q) => $q->where('material_id', (int) $filtros['material_id']))
            ->when(!empty($filtros['codigo_ibge']), fn ($q) => $q->where('codigo_ibge', (int) $filtros['codigo_ibge']))
            ->when(!empty($filtros['pendentes']), fn ($q) => $q->whereNull('entregue_em'))
            ->orderByDesc('enviada_em')->orderByDesc('id')->get();

        return response()->json(['remessas' => $lista]);
    }

    public function salvarRemessa(Request $request, ?Remessa $remessa = null): JsonResponse
    {
        $remessa === null ? $this->authorize('create', Material::class) : $this->authorize('update', $remessa);
        $obrigatorio = $remessa === null ? 'required' : 'sometimes';
        $dados = $request->validate([
            'material_id' => [$obrigatorio, 'integer'],
            'codigo_ibge' => [$obrigatorio, 'integer'],
            'coordenador_id' => ['sometimes', 'nullable', 'integer'],
            'cabo_id' => ['sometimes', 'nullable', 'integer'],
            'quantidade' => [$obrigatorio, 'integer', 'min:1'],
            'enviada_em' => [$obrigatorio, 'date_format:Y-m-d'],
            'transportadora' => ['sometimes', 'nullable', 'string', 'max:200'],
            'motorista' => ['sometimes', 'nullable', 'string', 'max:200'],
            'veiculo' => ['sometimes', 'nullable', 'string', 'max:100'],
            'previsao_entrega' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'entregue_em' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'recebido_por' => ['sometimes', 'nullable', 'string', 'max:200'],
            'observacoes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        return $this->executar(fn () => response()->json($this->materiais->salvarRemessa($remessa, $dados)->load('material:id,nome,tipo,unidade'), $remessa === null ? 201 : 200));
    }

    public function excluirRemessa(Remessa $remessa): JsonResponse
    {
        $this->authorize('delete', $remessa);
        $this->materiais->excluirRemessa($remessa);

        return response()->json(['deleted' => true]);
    }

    public function enviarFoto(Request $request, Remessa $remessa): JsonResponse
    {
        $this->authorize('update', $remessa);
        $request->validate(['arquivo' => AnexoService::REGRA]);

        return $this->executar(fn () => response()->json($this->anexos->guardar($remessa, 'foto', 'remessa', $request->file('arquivo'))));
    }

    public function foto(Remessa $remessa): Response
    {
        $this->authorize('arquivo', $remessa);

        return $this->anexos->resposta($remessa, 'foto', "entrega-remessa-{$remessa->id}") ?? response()->json(['error' => 'Esta remessa não tem foto da entrega.'], 404);
    }

    /** @return array<string, mixed> */
    private function regras(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'tipo' => [$obrigatorio, Rule::in(array_keys(Material::TIPOS))],
            'nome' => [$obrigatorio, 'string', 'max:200'],
            'fornecedor' => ['sometimes', 'nullable', 'string', 'max:200'],
            'unidade' => ['sometimes', Rule::in(Material::UNIDADES)],
            'quantidade_produzida' => [$obrigatorio, 'integer', 'min:0'],
            'valor_total_centavos' => ['sometimes', 'integer', 'min:0'],
            'peso_kg' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'volume_m3' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'observacoes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'lancar_despesa' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, mixed> */
    private function formatar(Material $m): array
    {
        $enviado = array_key_exists('enviado', $m->getAttributes()) ? (int) $m->getAttributes()['enviado'] : $m->totalEnviado();

        return [...$m->toArray(), 'enviado' => $enviado, 'estoque' => $m->quantidade_produzida - $enviado];
    }

    private function autor(Request $request): ?User
    {
        $user = $request->user();

        return $user instanceof User ? $user : null;
    }
}
