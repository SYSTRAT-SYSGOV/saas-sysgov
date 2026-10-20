<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Modules\Pessoas\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Pessoas\Http\Requests\EncerrarSocioRequest;
use Modules\Pessoas\Http\Requests\EncerrarVinculoRequest;
use Modules\Pessoas\Http\Requests\StoreContatoRequest;
use Modules\Pessoas\Http\Requests\StoreDocumentoRequest;
use Modules\Pessoas\Http\Requests\StoreEnderecoRequest;
use Modules\Pessoas\Http\Requests\MesclarPessoaRequest;
use Modules\Pessoas\Http\Requests\RegularizarDocumentoRequest;
use Modules\Pessoas\Http\Requests\StorePessoaRequest;
use Modules\Pessoas\Http\Requests\StoreSocioRequest;
use Modules\Pessoas\Http\Requests\StoreVinculoRequest;
use Modules\Pessoas\Http\Requests\UpdateContatoRequest;
use Modules\Pessoas\Http\Requests\UpdateDocumentoRequest;
use Modules\Pessoas\Http\Requests\UpdateEnderecoRequest;
use Modules\Pessoas\Http\Requests\UpdatePessoaRequest;
use Modules\Pessoas\Http\Requests\UpdateSocioRequest;
use Modules\Pessoas\Http\Resources\PessoaContatoResource;
use Modules\Pessoas\Http\Resources\PessoaDocumentoResource;
use Modules\Pessoas\Http\Resources\PessoaEnderecoResource;
use Modules\Pessoas\Http\Resources\PessoaResource;
use Modules\Pessoas\Http\Resources\PessoaSocioResource;
use Modules\Pessoas\Http\Resources\PessoaVinculoResource;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaContato;
use Modules\Pessoas\Models\PessoaDocumento;
use Modules\Pessoas\Models\PessoaEndereco;
use Modules\Pessoas\Models\PessoaSocio;
use Modules\Pessoas\Models\PessoaVinculo;
use Modules\Pessoas\Services\MesclagemPessoaService;
use Modules\Pessoas\Services\PessoaExportService;
use Modules\Pessoas\Services\PessoaService;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Modules\Pessoas\Services\SocioService;
use Modules\Pessoas\Services\VinculoService;

final class PessoaController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly PessoaService $pessoas,
        private readonly VinculoService $vinculos,
        private readonly SocioService $socios,
        private readonly PessoaExportService $export,
        private readonly AuditLogger $audit,
        private readonly MesclagemPessoaService $mesclagem,
        private readonly ResolucaoPessoaService $resolucao,
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

        $request->attributes->set('pessoas.listagem', true);
        $paginator = $this->pessoas->listar($request->only([
            'q', 'tipo', 'tipo_vinculo', 'status', 'falecido', 'data_nascimento_de', 'data_nascimento_ate', 'sexo', 'documento_pendente', 'per_page',
        ]));

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

        $pessoa->load(['vinculos', 'documentos', 'enderecos', 'contatos', 'socios.socio', 'usuario']);

        return response()->json(new PessoaResource($pessoa));
    }

    public function store(StorePessoaRequest $request): JsonResponse
    {
        $this->authorize('create', Pessoa::class);

        $dados = $request->validated();
        $confirmarNovo = (bool) ($dados['confirmar_novo'] ?? false);
        unset($dados['confirmar_novo']);

        // Sem CPF: antes de criar, avisa se já existe alguém com o mesmo nome e nascimento (cadastro rápido dos módulos).
        if (($dados['tipo'] ?? 'fisica') === 'fisica' && empty($dados['cpf']) && ! $confirmarNovo) {
            $this->resolucao->exigirSemSemelhantes((string) ($dados['nome'] ?? ''), (string) ($dados['data_nascimento'] ?? ''));
        }

        $pessoa = $this->pessoas->criar($dados);
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

    /** Informa o CPF de uma pessoa com documento pendente. POST /api/pessoas/{pessoa}/regularizar-documento */
    public function regularizarDocumento(RegularizarDocumentoRequest $request, Pessoa $pessoa): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $antes = $pessoa->toArray();
        $this->pessoas->regularizarDocumento($pessoa, (string) $request->validated('cpf'));
        // O CPF não vai para a auditoria em claro: o `toArray()` já omite documento e hash (hidden).
        $this->audit->record('pessoas', 'pessoa.documento_regularizado', "Pessoa #{$pessoa->id}", $antes, $pessoa->toArray());

        return response()->json(new PessoaResource($pessoa));
    }

    /** Absorve esta pessoa (documento pendente) pela pessoa informada. POST /api/pessoas/{pessoa}/mesclar */
    public function mesclar(MesclarPessoaRequest $request, Pessoa $pessoa): JsonResponse
    {
        $this->authorize('merge', $pessoa);

        $destino = Pessoa::query()->findOrFail((int) $request->validated('destino_id'));
        $this->mesclagem->mesclar($pessoa, $destino);

        return response()->json(new PessoaResource($destino->refresh()));
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

    public function storeSocio(StoreSocioRequest $request, Pessoa $pessoa): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $socio = $this->socios->adicionar($pessoa, $request->validated());

        return response()->json(new PessoaSocioResource($socio->load('socio')), 201);
    }

    public function updateSocio(UpdateSocioRequest $request, Pessoa $pessoa, PessoaSocio $socio): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $socio = $this->socios->atualizar($socio, $request->validated());

        return response()->json(new PessoaSocioResource($socio->load('socio')));
    }

    public function encerrarSocio(EncerrarSocioRequest $request, Pessoa $pessoa, PessoaSocio $socio): JsonResponse
    {
        $this->authorize('update', $pessoa);

        $dados = $request->validated();
        $this->socios->encerrar($socio, $dados['fim'] ?? null);

        return response()->json(new PessoaSocioResource($socio->load('socio')));
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
            'documento' => (string) $pessoa->documento,
            'cpf' => (string) $pessoa->documento,
        ]);
    }
}
