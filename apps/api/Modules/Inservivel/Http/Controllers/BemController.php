<?php

declare(strict_types=1);

namespace Modules\Inservivel\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\BemFoto;
use Modules\Inservivel\Services\ArquivoService;
use Modules\Inservivel\Services\BemService;
use Modules\Inservivel\Services\ParametrosService;
use Modules\Inservivel\Support\FormataBem;
use Symfony\Component\HttpFoundation\Response;

/** Bens inservíveis e fotos (spec: Cadastro de bens). Não há rota de exclusão: o bem só muda de situação. */
final class BemController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly BemService $bens,
        private readonly ArquivoService $arquivos,
        private readonly ParametrosService $parametros,
        private readonly TenantContext $tenant,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Bem::class);
        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'situacao_id' => ['nullable', 'integer'],
            'papel' => ['nullable', Rule::enum(PapelSituacao::class)],
            'estado_conservacao_id' => ['nullable', 'integer'],
            'secretaria_unit_id' => ['nullable', 'integer'],
            'setor_unit_id' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $pagina = $this->consulta($filtros)->latest('id')->paginate((int) ($filtros['per_page'] ?? 15));

        return response()->json([
            'data' => array_map(fn (Bem $b): array => FormataBem::resumo($b), $pagina->items()),
            'meta' => ['current_page' => $pagina->currentPage(), 'last_page' => $pagina->lastPage(), 'per_page' => $pagina->perPage(), 'total' => $pagina->total()],
        ]);
    }

    public function show(Bem $bem): JsonResponse
    {
        $this->authorize('view', $bem);

        return response()->json(FormataBem::completo($bem));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Bem::class);
        $dados = $request->validate($this->regras(null));

        return $this->executar(fn (): JsonResponse => response()->json(FormataBem::completo($this->bens->salvar(null, $dados, $this->autor($request))), 201));
    }

    public function update(Request $request, Bem $bem): JsonResponse
    {
        $this->authorize('update', $bem);
        $dados = $request->validate($this->regras($bem));

        return $this->executar(fn (): JsonResponse => response()->json(FormataBem::completo($this->bens->salvar($bem, $dados, $this->autor($request)))));
    }

    public function adicionarFoto(Request $request, Bem $bem): JsonResponse
    {
        $this->authorize('update', $bem);
        $request->validate(['arquivo' => ArquivoService::REGRA_FOTO, 'principal' => ['sometimes', 'boolean']]);

        return $this->executar(fn (): JsonResponse => response()->json(
            FormataBem::foto($this->bens->adicionarFoto($bem, $request->file('arquivo'), $request->boolean('principal'))),
            201
        ));
    }

    public function definirPrincipal(Bem $bem, BemFoto $foto): JsonResponse
    {
        $this->authorize('update', $bem);
        abort_unless($foto->bem_id === $bem->id, 404);
        $this->bens->definirPrincipal($foto);

        return response()->json(['ok' => true]);
    }

    public function removerFoto(Bem $bem, BemFoto $foto): JsonResponse
    {
        $this->authorize('update', $bem);
        abort_unless($foto->bem_id === $bem->id, 404);
        $this->bens->removerFoto($foto);

        return response()->json(['deleted' => true]);
    }

    public function foto(Bem $bem, BemFoto $foto): Response
    {
        $this->authorize('view', $bem);
        abort_unless($foto->bem_id === $bem->id, 404);

        return $this->arquivos->resposta($foto->caminho, $foto->mime, "bem-{$bem->numero_patrimonial}-{$foto->id}")
            ?? response()->json(['error' => 'Arquivo não encontrado.'], 404);
    }

    /**
     * @param array<string, mixed> $filtros
     * @return Builder<Bem>
     */
    private function consulta(array $filtros): Builder
    {
        $q = Bem::query()->with(['situacao', 'estadoConservacao', 'categoria', 'secretaria', 'setor', 'fotoPrincipal']);
        if (!empty($filtros['q'])) {
            $termo = '%' . str_replace(['%', '_'], ['\%', '\_'], (string) $filtros['q']) . '%';
            $q->where(fn (Builder $w) => $w->where('numero_patrimonial', 'like', $termo)->orWhere('plaqueta_antiga', 'like', $termo)
                ->orWhere('descricao', 'like', $termo)->orWhere('marca', 'like', $termo)->orWhere('modelo', 'like', $termo));
        }
        foreach (['situacao_id', 'estado_conservacao_id', 'secretaria_unit_id', 'setor_unit_id'] as $campo) {
            if (!empty($filtros[$campo])) {
                $q->where($campo, (int) $filtros[$campo]);
            }
        }
        if (!empty($filtros['papel'])) {
            $q->where('situacao_id', $this->parametros->idDoPapel(PapelSituacao::from($filtros['papel'])));
        }

        return $q;
    }

    /** @return array<string, mixed> */
    private function regras(?Bem $bem): array
    {
        $obrig = $bem === null ? 'required' : 'sometimes';

        return [
            'numero_patrimonial' => [$obrig, 'string', 'max:50', Rule::unique('inservivel_bens', 'numero_patrimonial')->where('tenant_id', $this->tenant->id())->ignore($bem?->id)],
            'plaqueta_antiga' => ['nullable', 'string', 'max:50'],
            'descricao' => [$obrig, 'string', 'max:5000'],
            'categoria_id' => ['nullable', 'integer', Rule::exists('inservivel_categorias', 'id')->where('tenant_id', $this->tenant->id())],
            'marca' => ['nullable', 'string', 'max:100'],
            'modelo' => ['nullable', 'string', 'max:100'],
            'numero_serie' => ['nullable', 'string', 'max:100'],
            'situacao_id' => [$obrig, 'integer'],
            'estado_conservacao_id' => ['nullable', 'integer'],
            'valor_contabil_cents' => ['sometimes', 'integer', 'min:0'],
            'valor_avaliado_cents' => ['sometimes', 'integer', 'min:0'],
            'data_aquisicao' => ['nullable', 'date'],
            'data_incorporacao' => ['nullable', 'date'],
            'secretaria_unit_id' => [$obrig, 'integer'],
            'setor_unit_id' => ['nullable', 'integer'],
            'observacoes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    private function autor(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
