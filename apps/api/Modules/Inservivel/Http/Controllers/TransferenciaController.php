<?php

declare(strict_types=1);

namespace Modules\Inservivel\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Enums\StatusTransferencia;
use Modules\Inservivel\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Transferencia;
use Modules\Inservivel\Services\ParametrosService;
use Modules\Inservivel\Services\TermoService;
use Modules\Inservivel\Services\TransferenciaService;
use Modules\Inservivel\Support\FormataBem;
use Symfony\Component\HttpFoundation\Response;

/** Transferência interna (vitrine, minhas, solicitações) e o termo em PDF (spec: Transferência interna; D11). */
final class TransferenciaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly TransferenciaService $transferencias,
        private readonly ParametrosService $parametros,
        private readonly TermoService $termos,
    ) {}

    /** escopo: vitrine (anunciados) | minhas (da minha secretaria ou pedidas por mim) | solicitacoes | historico. */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Transferencia::class);
        $dados = $request->validate(['escopo' => ['nullable', Rule::in(['vitrine', 'minhas', 'solicitacoes', 'historico'])]]);
        $escopo = $dados['escopo'] ?? 'vitrine';
        $usuario = $this->usuario($request);
        $gestor = Gate::allows('aprovarQualquer', Transferencia::class);
        if (in_array($escopo, ['solicitacoes', 'historico'], true) && !$gestor) {
            abort(403, 'Apenas o Patrimônio acessa as solicitações de transferência.');
        }
        $minha = $this->transferencias->secretariaDe($usuario);

        $consulta = Transferencia::query()->with(['bem.situacao', 'bem.estadoConservacao', 'bem.categoria', 'bem.secretaria', 'bem.setor', 'bem.fotoPrincipal', 'origem', 'destino', 'anunciante', 'solicitante', 'aprovador'])
            ->latest('id');
        match ($escopo) {
            'vitrine' => $consulta->where('status', StatusTransferencia::Anunciado),
            'solicitacoes' => $consulta->where('status', StatusTransferencia::Solicitado),
            'minhas' => $consulta->where(fn ($q) => $q->where('anunciado_por', $usuario->id)->orWhere('solicitado_por', $usuario->id)
                ->when($minha !== null, fn ($w) => $w->orWhere('secretaria_origem_unit_id', $minha->id)->orWhere('secretaria_destino_unit_id', $minha->id))),
            default => $consulta,
        };

        return response()->json([
            'minha_secretaria' => $minha === null ? null : FormataBem::unidade($minha),
            'gestor' => $gestor,
            'transferencias' => $consulta->limit(200)->get()->map(fn (Transferencia $t): array => $this->formatar($t, $usuario, $minha?->id, $gestor)),
        ]);
    }

    /** Bens que o usuário pode anunciar: disponíveis ou inservíveis da sua secretaria (o Gestor vê todas). */
    public function anunciaveis(Request $request): JsonResponse
    {
        $this->authorize('create', Transferencia::class);
        $usuario = $this->usuario($request);
        $minha = $this->transferencias->secretariaDe($usuario);
        $gestor = $this->transferencias->ehGestor($usuario);
        $q = (string) $request->query('q', '');
        $bens = Bem::query()->with(['situacao', 'estadoConservacao', 'categoria', 'secretaria', 'setor', 'fotoPrincipal'])
            ->whereIn('situacao_id', [$this->parametros->idDoPapel(PapelSituacao::Disponivel), $this->parametros->idDoPapel(PapelSituacao::Inservivel)])
            ->when(!$gestor, fn ($w) => $w->where('secretaria_unit_id', $minha->id ?? 0))
            ->when($q !== '', fn ($w) => $w->where(fn ($x) => $x->where('numero_patrimonial', 'like', "%{$q}%")->orWhere('descricao', 'like', "%{$q}%")))
            ->orderBy('numero_patrimonial')->limit(50)->get();

        return response()->json(['minha_secretaria' => $minha === null ? null : FormataBem::unidade($minha), 'bens' => $bens->map(fn (Bem $b): array => FormataBem::resumo($b))]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Transferencia::class);
        $dados = $request->validate(['bem_id' => ['required', 'integer'], 'observacao' => ['nullable', 'string', 'max:2000']]);
        $bem = Bem::query()->findOrFail((int) $dados['bem_id']);

        return $this->executar(fn (): JsonResponse => response()->json(['id' => $this->transferencias->anunciar($bem, $this->usuario($request), $dados['observacao'] ?? null)->id], 201));
    }

    public function solicitar(Request $request, Transferencia $transferencia): JsonResponse
    {
        $this->authorize('solicitar', $transferencia);

        return $this->executar(fn (): JsonResponse => response()->json(['status' => $this->transferencias->solicitar($transferencia, $this->usuario($request))->status->value]));
    }

    public function aprovar(Request $request, Transferencia $transferencia): JsonResponse
    {
        $this->authorize('aprovar', $transferencia);

        return $this->executar(fn (): JsonResponse => response()->json(['status' => $this->transferencias->aprovar($transferencia, $this->usuario($request))->status->value]));
    }

    public function recusar(Request $request, Transferencia $transferencia): JsonResponse
    {
        $this->authorize('aprovar', $transferencia);
        $dados = $request->validate(['motivo' => ['required', 'string', 'max:2000']]);

        return $this->executar(fn (): JsonResponse => response()->json(['status' => $this->transferencias->recusar($transferencia, $this->usuario($request), $dados['motivo'])->status->value]));
    }

    public function cancelar(Request $request, Transferencia $transferencia): JsonResponse
    {
        $this->authorize('cancelar', $transferencia);

        return $this->executar(function () use ($transferencia, $request): JsonResponse {
            $this->transferencias->cancelar($transferencia, $this->usuario($request));

            return response()->json(['status' => 'cancelado']);
        });
    }

    public function termo(Transferencia $transferencia): Response
    {
        $this->authorize('view', $transferencia);
        if ($transferencia->status !== StatusTransferencia::Aceito) {
            return response()->json(['error' => 'O termo só fica disponível depois da aprovação.'], 422);
        }

        return response($this->termos->termoTransferencia($transferencia), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="termo-transferencia-' . $transferencia->id . '.pdf"',
        ]);
    }

    /** @return array<string, mixed> */
    private function formatar(Transferencia $t, User $usuario, ?int $minha, bool $gestor): array
    {
        return [
            'id' => $t->id,
            'status' => $t->status->value,
            'status_rotulo' => $t->status->rotulo(),
            'bem' => FormataBem::resumo($t->bem),
            'origem' => FormataBem::unidade($t->origem),
            'destino' => FormataBem::unidade($t->destino),
            'observacao' => $t->getAttribute('observacao'),
            'motivo_recusa' => $t->getAttribute('motivo_recusa'),
            'anunciado_por' => $t->anunciante?->name,
            'solicitado_por' => $t->solicitante?->name,
            'decidido_por' => $t->aprovador?->name,
            'data_anuncio' => $t->getAttribute('created_at')?->toIso8601String(),
            'data_solicitacao' => $t->getAttribute('data_solicitacao')?->toIso8601String(),
            'data_conclusao' => $t->data_conclusao?->toIso8601String(),
            'pode_solicitar' => $t->status === StatusTransferencia::Anunciado && $minha !== null && $minha !== $t->secretaria_origem_unit_id,
            'pode_cancelar' => $t->status === StatusTransferencia::Anunciado && ($t->anunciado_por === $usuario->id || $gestor),
            'pode_decidir' => $t->status === StatusTransferencia::Solicitado && $gestor,
        ];
    }

    private function usuario(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
