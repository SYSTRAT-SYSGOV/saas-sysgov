<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Recurso;
use Modules\Capd\Models\RecursoDocumento;
use Modules\Capd\Services\SorteioRelatorService;

/**
 * Gestão de Recursos Administrativos da Avaliação Periódica de Desempenho.
 */
final class RecursoController extends Controller
{
    public function __construct(
        private readonly SorteioRelatorService $sorteio,
        private readonly AuditLogger          $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = Recurso::with(['avaliacao.ciclo', 'recorrente:id,name,email', 'fatorContestado', 'relator.servidor:id,name']);

        // Se não for membro da comissão, enxerga apenas seus próprios recursos
        if (! $request->user()->hasRole(['admin_tenant', 'gestor_rh'])) {
            $isMembro = \DB::table('capd_comissao_membros')
                ->where('servidor_id', $user->id)
                ->where('ativo', true)
                ->exists();

            if (! $isMembro) {
                $query->where('recorrente_id', $user->id);
            }
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->latest()->paginate((int) $request->query('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $user     = $request->user();

        $validated = $request->validate([
            'avaliacao_id'           => ['required', 'integer', 'exists:capd_avaliacoes,id'],
            'fator_contestado_id'    => ['required', 'integer', 'exists:capd_fatores_avaliacao,id'],
            'justificativa_servidor' => ['required', 'string', 'min:50', 'max:5000'],
        ]);

        $avaliacao = Avaliacao::with('ciclo')->findOrFail($validated['avaliacao_id']);

        // Apenas o servidor avaliado pode interpor recurso
        abort_if(
            $avaliacao->servidor_id !== $user->id,
            403,
            'Apenas o próprio servidor avaliado pode interpor recurso administrativo contra sua avaliação.'
        );

        // Não pode recorrer de avaliação ainda não concluída
        abort_if(
            $avaliacao->data_conclusao === null,
            422,
            'A avaliação ainda não foi submetida pelo avaliador.'
        );

        // Prazo recursal do ciclo
        if ($avaliacao->ciclo->data_limite_recurso) {
            abort_if(
                now()->isAfter($avaliacao->ciclo->data_limite_recurso->endOfDay()),
                422,
                'O prazo regulamentar para interposição de recurso expirou em ' . $avaliacao->ciclo->data_limite_recurso->format('d/m/Y') . '.'
            );
        }

        // Não pode interpor recurso duplicado contra o mesmo fator na mesma avaliação
        $jaRecorreu = Recurso::where('avaliacao_id', $avaliacao->id)
            ->where('fator_contestado_id', $validated['fator_contestado_id'])
            ->whereNotIn('status', ['cancelado'])
            ->exists();

        abort_if($jaRecorreu, 422, 'Já existe recurso ativo interposto contra este fator para esta avaliação.');

        $recurso = Recurso::create([
            ...$validated,
            'tenant_id'     => $tenantId,
            'recorrente_id' => $user->id,
            'status'        => 'interposto',
        ]);

        $this->audit->record('capd', 'recurso.interposto', "Recurso #{$recurso->id} interposto pelo Servidor #{$user->id}", null, $recurso->toArray());

        return response()->json($recurso->load(['fatorContestado', 'avaliacao']), 201);
    }

    public function show(int $id): JsonResponse
    {
        $recurso = Recurso::with([
            'avaliacao.ciclo',
            'recorrente:id,name,email',
            'fatorContestado',
            'relator.servidor:id,name',
            'documentos',
            'deliberacoes.membro.servidor:id,name',
        ])->findOrFail($id);

        $this->authorize('view', $recurso);

        return response()->json($recurso);
    }

    public function uploadDocumento(Request $request, int $id): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $recurso  = Recurso::findOrFail($id);

        abort_if(
            $request->user()->id !== $recurso->recorrente_id,
            403,
            'Apenas o recorrente pode anexar contraprovas ao recurso.'
        );

        abort_if(
            in_array($recurso->status, ['julgado_provido', 'julgado_desprovido', 'cancelado'], true),
            422,
            'Não é permitido juntar documentos a recursos já julgados ou cancelados.'
        );

        $request->validate([
            'arquivo' => ['required', 'file', 'mimes:pdf,png,jpg,jpeg', 'max:10240'],
        ]);

        $arquivo  = $request->file('arquivo');
        $conteudo = file_get_contents($arquivo->getRealPath());
        $hash     = hash('sha256', $conteudo);

        $jaExiste = RecursoDocumento::where('recurso_id', $recurso->id)
            ->where('hash_sha256', $hash)
            ->exists();

        if ($jaExiste) {
            return response()->json(['message' => 'Este documento já foi anexado ao recurso.', 'hash' => $hash], 422);
        }

        $caminho = "capd/recursos/t{$tenantId}/{$recurso->id}/{$hash}.{$arquivo->extension()}";
        Storage::disk('evidencias')->put($caminho, $conteudo);
        $url = Storage::disk('evidencias')->url($caminho);

        $documento = RecursoDocumento::create([
            'tenant_id'         => $tenantId,
            'recurso_id'        => $recurso->id,
            'enviado_por'       => $request->user()->id,
            'nome_arquivo'      => $arquivo->getClientOriginalName(),
            'url_armazenamento' => $url,
            'hash_sha256'       => $hash,
            'mime_type'         => $arquivo->getMimeType(),
            'tamanho_bytes'     => $arquivo->getSize(),
        ]);

        $this->audit->record('capd', 'recurso.documento_anexado', "Documento #{$documento->id} anexado ao Recurso #{$recurso->id}", null, ['hash' => $hash]);

        return response()->json($documento, 201);
    }

    public function sortearRelator(int $id): JsonResponse
    {
        $recurso = Recurso::findOrFail($id);

        abort_if(
            $recurso->status !== 'interposto',
            422,
            'Apenas recursos no status interposto podem receber sorteio de relator.'
        );

        $relator = $this->sorteio->sortear($recurso);

        return response()->json([
            'message' => 'Relator sorteado com sucesso via CSPRNG.',
            'recurso' => $recurso->fresh()->load('relator.servidor:id,name'),
        ]);
    }

    public function contestarChefia(Request $request, int $id): JsonResponse
    {
        $recurso = Recurso::with('avaliacao')->findOrFail($id);

        abort_if(
            $request->user()->id !== $recurso->avaliacao->avaliador_id,
            403,
            'Apenas a chefia imediata avaliadora pode prestar manifestação técnica sobre o recurso.'
        );

        $request->validate([
            'contestacao_chefia' => ['required', 'string', 'min:30', 'max:5000'],
        ]);

        $recurso->update([
            'contestacao_chefia' => $request->contestacao_chefia,
            'contestacao_em'     => now(),
        ]);

        $this->audit->record('capd', 'recurso.contestacao_chefia', "Manifestação da chefia anexada ao Recurso #{$id}", null, []);

        return response()->json($recurso);
    }
}
