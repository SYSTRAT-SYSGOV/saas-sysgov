<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaContato;
use Modules\Pessoas\Models\PessoaDocumento;
use Modules\Pessoas\Models\PessoaVinculo;
use Modules\Pessoas\Services\PessoaExportService;
use Modules\Pessoas\Services\PessoaService;
use Modules\Pessoas\Services\VinculoService;

final class PessoaController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly PessoaService $pessoas,
        private readonly VinculoService $vinculos,
        private readonly PessoaExportService $export,
        private readonly AuditLogger $audit,
    ) {}

    /** Exportação self-service do cadastro (JSON com manifest ou CSV). GET /api/pessoas/export?format=json|csv */
    public function export(Request $request): JsonResponse|Response
    {
        $this->autorizar($request, 'cadastros.pessoas.view');

        if (strtolower((string) $request->query('format', 'json')) === 'csv') {
            return response($this->export->exportCsv(), 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="pessoas.csv"',
            ]);
        }

        return response()->json($this->export->exportJson());
    }

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.view');

        return response()->json($this->pessoas->listar($request->only(['q', 'tipo_vinculo', 'status', 'per_page'])));
    }

    public function show(Request $request, Pessoa $pessoa): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.view');

        return response()->json($pessoa->load(['vinculos', 'documentos', 'enderecos', 'contatos', 'usuario']));
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.create');

        $pessoa = $this->pessoas->criar($this->validar($request));
        $this->audit->record('pessoas', 'pessoa.created', "Pessoa #{$pessoa->id}", null, $pessoa->toArray());

        return response()->json($pessoa, 201);
    }

    public function update(Request $request, Pessoa $pessoa): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.update');

        $antes = $pessoa->toArray();
        $this->pessoas->atualizar($pessoa, $this->validar($request, $pessoa));
        $this->audit->record('pessoas', 'pessoa.updated', "Pessoa #{$pessoa->id}", $antes, $pessoa->toArray());

        return response()->json($pessoa);
    }

    public function destroy(Request $request, Pessoa $pessoa): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.delete');

        $antes = $pessoa->toArray();
        $pessoa->delete();
        $this->audit->record('pessoas', 'pessoa.deleted', "Pessoa #{$pessoa->id}", $antes, null);

        return response()->json(['deleted' => true]);
    }

    public function storeVinculo(Request $request, Pessoa $pessoa): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.update');

        $dados = $request->validate([
            'tipo_vinculo' => ['required', Rule::in(PessoaVinculo::TIPOS)],
            'matricula' => ['nullable', 'string', 'max:50'],
            'dados' => ['nullable', 'array'],
            'inicio' => ['nullable', 'date'],
        ]);

        $vinculo = $this->vinculos->adicionar($pessoa, $dados);
        $this->audit->record('pessoas', 'pessoa.vinculo_adicionado', "Pessoa #{$pessoa->id}", null, $vinculo->toArray());

        return response()->json($vinculo, 201);
    }

    public function encerrarVinculo(Request $request, Pessoa $pessoa, PessoaVinculo $vinculo): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.update');

        $dados = $request->validate(['fim' => ['nullable', 'date']]);
        $antes = $vinculo->toArray();
        $this->vinculos->encerrar($vinculo, $dados['fim'] ?? null);
        $this->audit->record('pessoas', 'pessoa.vinculo_encerrado', "Pessoa #{$pessoa->id}", $antes, $vinculo->toArray());

        return response()->json($vinculo);
    }

    public function storeDocumento(Request $request, Pessoa $pessoa): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.update');

        $dados = $request->validate([
            'tipo' => ['required', Rule::in(PessoaDocumento::TIPOS)],
            'numero' => ['required', 'string', 'max:50'],
            'orgao_emissor' => ['nullable', 'string', 'max:100'],
            'uf_emissao' => ['nullable', 'string', 'size:2'],
            'data_emissao' => ['nullable', 'date'],
        ]);

        $documento = $pessoa->documentos()->create($dados);
        $this->audit->record('pessoas', 'pessoa.documento_adicionado', "Pessoa #{$pessoa->id}", null, $documento->toArray());

        return response()->json($documento, 201);
    }

    public function storeEndereco(Request $request, Pessoa $pessoa): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.update');

        $dados = $request->validate([
            'cep' => ['nullable', 'string', 'max:9'],
            'logradouro' => ['nullable', 'string', 'max:255'],
            'numero' => ['nullable', 'string', 'max:20'],
            'complemento' => ['nullable', 'string', 'max:100'],
            'bairro' => ['nullable', 'string', 'max:100'],
            'cidade' => ['nullable', 'string', 'max:100'],
            'uf' => ['nullable', 'string', 'size:2'],
            'tipo_endereco' => ['sometimes', 'string', 'max:20'],
        ]);

        $endereco = $pessoa->enderecos()->create($dados);
        $this->audit->record('pessoas', 'pessoa.endereco_adicionado', "Pessoa #{$pessoa->id}", null, $endereco->toArray());

        return response()->json($endereco, 201);
    }

    public function storeContato(Request $request, Pessoa $pessoa): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.update');

        $dados = $request->validate([
            'tipo' => ['required', Rule::in(PessoaContato::TIPOS)],
            'valor' => ['required', 'string', 'max:255'],
            'principal' => ['sometimes', 'boolean'],
            'autoriza_notificacoes' => ['sometimes', 'boolean'],
        ]);

        $contato = $pessoa->contatos()->create($dados);
        $this->audit->record('pessoas', 'pessoa.contato_adicionado', "Pessoa #{$pessoa->id}", null, $contato->toArray());

        return response()->json($contato, 201);
    }

    /** @return array<string, mixed> */
    private function validar(Request $request, ?Pessoa $atual = null): array
    {
        $obrigatorio = $atual ? 'sometimes' : 'required';

        return $request->validate([
            'nome' => [$obrigatorio, 'string', 'max:255'],
            'cpf' => [$obrigatorio, 'string'],
            'nome_social' => ['nullable', 'string', 'max:255'],
            'data_nascimento' => ['nullable', 'date'],
            'sexo' => ['nullable', 'string', 'max:20'],
            'nome_mae' => ['nullable', 'string', 'max:255'],
            'nome_pai' => ['nullable', 'string', 'max:255'],
            'estado_civil' => ['nullable', 'string', 'max:30'],
            'nacionalidade' => ['nullable', 'string', 'max:60'],
            'naturalidade' => ['nullable', 'string', 'max:100'],
            'nis' => ['nullable', 'string', 'max:20'],
            'status' => ['sometimes', Rule::in(['ativo', 'inativo'])],
        ]);
    }
}
