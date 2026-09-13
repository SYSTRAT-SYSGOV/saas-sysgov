<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Models\ServidorAfastamento;
use Modules\Capd\Services\HierarquiaService;
use Modules\Capd\Services\ServidorService;

final class ServidorController extends Controller
{
    public function __construct(
        private readonly ServidorService $servidorService,
        private readonly HierarquiaService $hierarquia,
        private readonly TenantContext $tenantContext,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'situacao', 'estagio_probatorio', 'orgao_lotacao']);
        $perPage = (int) $request->input('per_page', 25);

        $servidores = $this->servidorService->list($filters, $perPage);

        return response()->json($servidores);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'matricula'             => ['required', 'string', 'max:30'],
            'cpf'                   => ['required', 'string', 'max:14'],
            'pis_pasep'             => ['nullable', 'string', 'max:20'],
            'nome_completo'         => ['required', 'string', 'max:150'],
            'nome_social'           => ['nullable', 'string', 'max:150'],
            'email'                 => ['nullable', 'email', 'max:100'],
            'telefone'              => ['nullable', 'string', 'max:25'],
            'data_nascimento'       => ['nullable', 'date'],
            'regime_juridico'       => ['required', 'string', 'in:estatutario,clt,comissionado,temporario,estagiario'],
            'regime_previdenciario' => ['nullable', 'string', 'in:rpps,rgps'],
            'cargo_efetivo'         => ['required', 'string', 'max:120'],
            'funcao_gratificada'    => ['nullable', 'string', 'max:120'],
            'nivel_padrao'          => ['nullable', 'string', 'max:30'],
            'orgao_lotacao'         => ['required', 'string', 'max:150'],
            'lotacao_fisica'        => ['nullable', 'string', 'max:150'],
            'org_unit_id'           => ['nullable', 'integer', 'exists:org_units,id'],
            'chefia_imediata_id'    => ['nullable', 'integer', 'exists:capd_servidores,id'],
            'situacao_funcional'    => ['nullable', 'string'],
            'estagio_probatorio'    => ['nullable', 'boolean'],
            'data_admissao'         => ['nullable', 'date'],
        ]);

        $servidor = $this->servidorService->create($validated);

        return response()->json($servidor, 201);
    }

    public function show(Servidor $servidor): JsonResponse
    {
        $servidor->load([
            'chefiaImediata:id,nome_completo,matricula,cargo_efetivo',
            'subordinados:id,nome_completo,matricula,cargo_efetivo',
            'afastamentos',
            'avaliacoes.ciclo',
        ]);

        return response()->json($servidor);
    }

    public function update(Request $request, Servidor $servidor): JsonResponse
    {
        $validated = $request->validate([
            'matricula'             => ['sometimes', 'string', 'max:30'],
            'cpf'                   => ['sometimes', 'string', 'max:14'],
            'nome_completo'         => ['sometimes', 'string', 'max:150'],
            'email'                 => ['nullable', 'email', 'max:100'],
            'telefone'              => ['nullable', 'string', 'max:25'],
            'cargo_efetivo'         => ['sometimes', 'string', 'max:120'],
            'funcao_gratificada'    => ['nullable', 'string', 'max:120'],
            'orgao_lotacao'         => ['sometimes', 'string', 'max:150'],
            'org_unit_id'           => ['nullable', 'integer', 'exists:org_units,id'],
            'chefia_imediata_id'    => ['nullable', 'integer', 'exists:capd_servidores,id'],
            'situacao_funcional'    => ['sometimes', 'string'],
            'estagio_probatorio'    => ['nullable', 'boolean'],
        ]);

        $servidor = $this->servidorService->update($servidor, $validated);

        return response()->json($servidor);
    }

    public function destroy(Servidor $servidor): JsonResponse
    {
        $servidor->delete();

        return response()->json(['message' => 'Servidor removido com sucesso.']);
    }

    // ── Afastamentos (RN de substituição/suspensão de avaliação) ──────

    public function storeAfastamento(Request $request, Servidor $servidor): JsonResponse
    {
        $validated = $request->validate([
            'tipo_afastamento'   => ['required', 'string', 'max:50'],
            'data_inicio'        => ['required', 'date'],
            'data_fim'           => ['nullable', 'date', 'after_or_equal:data_inicio'],
            'substituto_id'      => ['nullable', 'integer', 'exists:capd_servidores,id'],
            'suspende_avaliacao' => ['nullable', 'boolean'],
            'observacoes'        => ['nullable', 'string'],
        ]);

        $afastamento = ServidorAfastamento::query()->create([
            ...$validated,
            'tenant_id'   => $this->tenantContext->id(),
            'servidor_id' => $servidor->id,
        ]);

        $this->hierarquia->resolverSubstituicao($afastamento);

        return response()->json($afastamento, 201);
    }

    public function updateAfastamento(Request $request, Servidor $servidor, ServidorAfastamento $afastamento): JsonResponse
    {
        abort_if($afastamento->servidor_id !== $servidor->id, 404);

        $validated = $request->validate([
            'tipo_afastamento'   => ['sometimes', 'string', 'max:50'],
            'data_inicio'        => ['sometimes', 'date'],
            'data_fim'           => ['nullable', 'date', 'after_or_equal:data_inicio'],
            'substituto_id'      => ['nullable', 'integer', 'exists:capd_servidores,id'],
            'suspende_avaliacao' => ['nullable', 'boolean'],
            'observacoes'        => ['nullable', 'string'],
        ]);

        $afastamento->update($validated);

        $this->hierarquia->resolverSubstituicao($afastamento->fresh());

        return response()->json($afastamento->fresh());
    }

    public function importCsv(Request $request): JsonResponse
    {
        $request->validate([
            'csv_content' => ['required_without:arquivo', 'string'],
            'arquivo'     => ['required_without:csv_content', 'file', 'mimes:csv,txt'],
        ]);

        $content = $request->hasFile('arquivo')
            ? (string) file_get_contents($request->file('arquivo')->getRealPath())
            : (string) $request->input('csv_content');

        $resultado = $this->servidorService->importFromCsv($content);

        return response()->json($resultado);
    }
}
