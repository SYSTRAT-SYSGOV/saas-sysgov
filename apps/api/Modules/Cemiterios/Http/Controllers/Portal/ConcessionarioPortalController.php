<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Guia;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\SolicitacaoPortal;
use Modules\Cemiterios\Services\GuiaService;
use Modules\Cemiterios\Support\Pdf;

/**
 * Painel do concessionário (RF-28, RF-23; RN-05). Toda consulta parte do
 * titular autenticado: recurso de outro titular responde 404.
 */
final class ConcessionarioPortalController extends Controller
{
    public function __construct(
        private readonly GuiaService $guiasService,
        private readonly AuditLogger $audit,
    ) {}

    /** Consulta dos próprios dados (LGPD: acesso do titular). */
    public function me(Request $request): JsonResponse
    {
        $titular = $this->titular($request);

        return response()->json($titular->only(['id', 'nome', 'tipo_doc', 'email', 'telefone', 'endereco', 'base_legal']) + ['documento' => $titular->documento]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->titular($request)->currentAccessToken()->delete();

        return response()->json(['ok' => true]);
    }

    public function concessoes(Request $request): JsonResponse
    {
        return response()->json(
            $this->titular($request)->concessoes()->with(['jazigo:id,codigo,park_id,sector_id', 'jazigo.cemiterio:id,nome', 'jazigo.setor:id,codigo'])
                ->orderByDesc('inicio')->get(['id', 'numero', 'plot_id', 'modalidade', 'inicio', 'termino', 'situacao'])
        );
    }

    public function concessao(Request $request, int $id): JsonResponse
    {
        return response()->json(
            $this->titular($request)->concessoes()->with(['jazigo:id,codigo,park_id,sector_id', 'jazigo.cemiterio:id,nome'])->findOrFail($id)
        );
    }

    public function guias(Request $request): JsonResponse
    {
        return response()->json(
            Guia::where('holder_id', $this->titular($request)->id)
                ->when($request->query('situacao'), fn ($q, $v) => $q->where('situacao', $v))
                ->orderByDesc('vencimento')
                ->get(['id', 'numero', 'servico', 'exercicio', 'valor_centavos', 'vencimento', 'situacao', 'pago_em', 'original_id'])
        );
    }

    public function guiaPdf(Request $request, int $id): Response
    {
        $guia = Guia::where('holder_id', $this->titular($request)->id)->findOrFail($id);

        return Pdf::download('guia-' . str_replace('/', '-', $guia->numero) . '.pdf', 'GUIA DE RECOLHIMENTO — CEMITÉRIOS MUNICIPAIS', $this->guiasService->linhasPdf($guia));
    }

    public function segundaVia(Request $request, int $id): JsonResponse
    {
        $titular = $this->titular($request);
        $original = Guia::where('holder_id', $titular->id)->findOrFail($id);
        $nova = $this->guiasService->segundaVia($original);
        $this->auditar('portal.guia.segunda_via', "Guia #{$nova->id}", ['guia_id' => $original->id], ['guia_id' => $nova->id, 'concessionario_id' => $titular->id]);

        return response()->json($nova, 201);
    }

    /** Sepultados nos jazigos do titular — sem causa da morte (RN-06). */
    public function sepultados(Request $request): JsonResponse
    {
        $jazigos = $this->titular($request)->concessoes()->pluck('plot_id');

        return response()->json(
            Inumacao::with(['falecido:id,nome,nascimento,falecimento', 'jazigo:id,codigo'])
                ->whereIn('plot_id', $jazigos)->where('situacao', 'confirmada')
                ->orderByDesc('sepultado_em')
                ->get(['id', 'deceased_id', 'plot_id', 'sepultado_em'])
        );
    }

    public function solicitacoes(Request $request): JsonResponse
    {
        return response()->json(SolicitacaoPortal::where('holder_id', $this->titular($request)->id)->orderByDesc('id')->get());
    }

    /** Renovação ou correção dos próprios dados (RN-05). */
    public function solicitar(Request $request): JsonResponse
    {
        $titular = $this->titular($request);
        $dados = $request->validate([
            'tipo' => ['required', Rule::in(['renovacao', 'correcao_dados'])],
            'concession_id' => ['required_if:tipo,renovacao', 'nullable', 'integer'],
            'mensagem' => ['required', 'string', 'max:2000'],
        ]);
        if (!empty($dados['concession_id'])) {
            $titular->concessoes()->findOrFail($dados['concession_id']);
        }

        $solicitacao = SolicitacaoPortal::create($dados + ['holder_id' => $titular->id]);
        $this->auditar("portal.solicitacao.{$dados['tipo']}", "SolicitacaoPortal #{$solicitacao->id}", null, $solicitacao->toArray());

        return response()->json($solicitacao, 201);
    }

    /**
     * audit_logs.user_id referencia usuários do painel; no portal o autor é o
     * concessionário, identificado no payload (concessionario_id / holder_id).
     *
     * @param array<string, mixed>|null $antes
     * @param array<string, mixed>|null $depois
     */
    private function auditar(string $acao, string $recurso, ?array $antes, ?array $depois): void
    {
        $guarda = auth()->getDefaultDriver();
        auth()->shouldUse('web');
        try {
            $this->audit->record('cemiterios', $acao, $recurso, $antes, $depois);
        } finally {
            auth()->shouldUse($guarda);
        }
    }

    private function titular(Request $request): Concessionario
    {
        /** @var Concessionario $titular */
        $titular = $request->user('concessionario');

        return $titular;
    }
}
