<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Modules\Pessoas\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Pessoas\Http\Requests\EncerrarVinculoRequest;
use Modules\Pessoas\Http\Requests\StoreContatoRequest;
use Modules\Pessoas\Http\Requests\StoreDocumentoRequest;
use Modules\Pessoas\Http\Requests\StoreEnderecoRequest;
use Modules\Pessoas\Http\Requests\StorePessoaRequest;
use Modules\Pessoas\Http\Requests\StoreVinculoRequest;
use Modules\Pessoas\Http\Requests\UpdateContatoRequest;
use Modules\Pessoas\Http\Requests\UpdateDocumentoRequest;
use Modules\Pessoas\Http\Requests\UpdateEnderecoRequest;
use Modules\Pessoas\Http\Requests\UpdatePessoaRequest;
use Modules\Pessoas\Http\Resources\PessoaContatoResource;
use Modules\Pessoas\Http\Resources\PessoaDocumentoResource;
use Modules\Pessoas\Http\Resources\PessoaEnderecoResource;
use Modules\Pessoas\Http\Resources\PessoaResource;
use Modules\Pessoas\Http\Resources\PessoaVinculoResource;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaContato;
use Modules\Pessoas\Models\PessoaDocumento;
use Modules\Pessoas\Models\PessoaEndereco;
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
        $this->authorize('viewAny', Pessoa::class);

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
        $this->authorize('viewAny', Pessoa::class);

        $paginator = $this->pessoas->listar($request->only(['q', 'tipo_vinculo', 'status', 'per_page']));

        return response()->json([
            'data' => PessoaResource::collection($paginator->items()),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    public function show(Request $request, Pessoa $pessoa): JsonResponse
    {
        $this->authorize('view', $pessoa);

        if ($request->boolean('reveal_sensitive')) {
            $this->authorize('viewSensitive', $pessoa);
            $this->audit->record(
                'pessoas',
                'pessoa.sensivel_visualizado',
                "Dados sensíveis da Pessoa #{$pessoa->id} visualizados por " . ($request->user()->email ?? 'desconhecido'),
                null,
                [
                    'pessoa_id' => $pessoa->id,
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]
            );
        }

        $pessoa->load(['vinculos', 'documentos', 'enderecos', 'contatos', 'usuario']);

        return response()->json(new PessoaResource($pessoa));
    }

    public function store(StorePessoaRequest $request): JsonResponse
    {
        $this->authorize('create', Pessoa::class);

        $pessoa = $this->pessoas->criar($request->validated());
        $this->audit->record('pessoas', 'pessoa.created', "Pessoa #{$pessoa->id}", null, $pessoa->toArray());

        return response()->json(new PessoaResource($pessoa), 201);
    }

    public function update(UpdatePessoaRequest $request, Pessoa $pessoa): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $antes = $pessoa->toArray();
        $this->pessoas->atualizar($pessoa, $request->validated());
        $this->audit->record('pessoas', 'pessoa.updated', "Pessoa #{$pessoa->id}", $antes, $pessoa->toArray());

        return response()->json(new PessoaResource($pessoa));
    }

    public function destroy(Request $request, Pessoa $pessoa): JsonResponse
    {
        $this->authorize('delete', $pessoa);

        $antes = $pessoa->toArray();
        $pessoa->delete();
        $this->audit->record('pessoas', 'pessoa.deleted', "Pessoa #{$pessoa->id}", $antes, null);

        return response()->json(['deleted' => true]);
    }

    public function storeVinculo(StoreVinculoRequest $request, Pessoa $pessoa): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $vinculo = $this->vinculos->adicionar($pessoa, $request->validated());
        $this->audit->record('pessoas', 'pessoa.vinculo_adicionado', "Pessoa #{$pessoa->id}", null, $vinculo->toArray());

        return response()->json(new PessoaVinculoResource($vinculo), 201);
    }

    public function encerrarVinculo(EncerrarVinculoRequest $request, Pessoa $pessoa, PessoaVinculo $vinculo): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $dados = $request->validated();
        $antes = $vinculo->toArray();
        $this->vinculos->encerrar($vinculo, $dados['fim'] ?? null);
        $this->audit->record('pessoas', 'pessoa.vinculo_encerrado', "Pessoa #{$pessoa->id}", $antes, $vinculo->toArray());

        return response()->json(new PessoaVinculoResource($vinculo));
    }

    public function storeDocumento(StoreDocumentoRequest $request, Pessoa $pessoa): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $documento = $this->pessoas->adicionarDocumento($pessoa, $request->validated());
        $this->audit->record('pessoas', 'pessoa.documento_adicionado', "Pessoa #{$pessoa->id}", null, $documento->toArray());

        return response()->json(new PessoaDocumentoResource($documento), 201);
    }

    public function updateDocumento(UpdateDocumentoRequest $request, Pessoa $pessoa, PessoaDocumento $documento): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $antes = $documento->toArray();
        $documento = $this->pessoas->atualizarDocumento($documento, $request->validated());
        $this->audit->record('pessoas', 'pessoa.documento_atualizado', "Documento #{$documento->id}", $antes, $documento->toArray());

        return response()->json(new PessoaDocumentoResource($documento));
    }

    public function destroyDocumento(Request $request, Pessoa $pessoa, PessoaDocumento $documento): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $antes = $documento->toArray();
        $this->pessoas->removerDocumento($documento);
        $this->audit->record('pessoas', 'pessoa.documento_removido', "Documento #{$documento->id}", $antes, null);

        return response()->json(['deleted' => true]);
    }

    public function storeEndereco(StoreEnderecoRequest $request, Pessoa $pessoa): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $endereco = $this->pessoas->adicionarEndereco($pessoa, $request->validated());
        $this->audit->record('pessoas', 'pessoa.endereco_adicionado', "Pessoa #{$pessoa->id}", null, $endereco->toArray());

        return response()->json(new PessoaEnderecoResource($endereco), 201);
    }

    public function updateEndereco(UpdateEnderecoRequest $request, Pessoa $pessoa, PessoaEndereco $endereco): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $antes = $endereco->toArray();
        $endereco = $this->pessoas->atualizarEndereco($endereco, $request->validated());
        $this->audit->record('pessoas', 'pessoa.endereco_atualizado', "Endereco #{$endereco->id}", $antes, $endereco->toArray());

        return response()->json(new PessoaEnderecoResource($endereco));
    }

    public function destroyEndereco(Request $request, Pessoa $pessoa, PessoaEndereco $endereco): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $antes = $endereco->toArray();
        $this->pessoas->removerEndereco($endereco);
        $this->audit->record('pessoas', 'pessoa.endereco_removido', "Endereco #{$endereco->id}", $antes, null);

        return response()->json(['deleted' => true]);
    }

    public function storeContato(StoreContatoRequest $request, Pessoa $pessoa): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $dados = $request->validated();
        if (! array_key_exists('autoriza_notificacoes', $dados)) {
            $dados['autoriza_notificacoes'] = true;
        }

        $contato = $this->pessoas->adicionarContato($pessoa, $dados);
        $this->audit->record('pessoas', 'pessoa.contato_adicionado', "Pessoa #{$pessoa->id}", null, $contato->toArray());

        return response()->json(new PessoaContatoResource($contato), 201);
    }

    public function updateContato(UpdateContatoRequest $request, Pessoa $pessoa, PessoaContato $contato): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $antes = $contato->toArray();
        $contato = $this->pessoas->atualizarContato($contato, $request->validated());
        $this->audit->record('pessoas', 'pessoa.contato_atualizado', "Contato #{$contato->id}", $antes, $contato->toArray());

        return response()->json(new PessoaContatoResource($contato));
    }

    public function destroyContato(Request $request, Pessoa $pessoa, PessoaContato $contato): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $antes = $contato->toArray();
        $this->pessoas->removerContato($contato);
        $this->audit->record('pessoas', 'pessoa.contato_removido', "Contato #{$contato->id}", $antes, null);

        return response()->json(['deleted' => true]);
    }

    public function auditarAcessoSensivel(Request $request, Pessoa $pessoa): JsonResponse
    {
        $this->authorize('viewSensitive', $pessoa);

        $this->audit->record(
            'pessoas',
            'pessoa.sensivel_visualizado',
            "Dados sensíveis da Pessoa #{$pessoa->id} visualizados por " . ($request->user()->email ?? 'desconhecido'),
            null,
            [
                'pessoa_id' => $pessoa->id,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]
        );

        return response()->json([
            'status' => 'success',
            'cpf' => (string) $pessoa->cpf,
        ]);
    }
}
