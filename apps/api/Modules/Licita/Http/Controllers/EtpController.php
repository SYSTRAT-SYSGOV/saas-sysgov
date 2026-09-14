<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Licita\Models\Etp;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\EtpService;

final class EtpController extends Controller
{
    public function __construct(
        private readonly EtpService $etps,
    ) {}

    public function store(Request $request, int $processoId): JsonResponse
    {
        $this->authorize('create', Etp::class);

        $processo = Processo::findOrFail($processoId);
        $data = $this->validatedData($request);

        try {
            $etp = $this->etps->criar($processo, $data, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($etp, 201);
    }

    public function show(int $id): JsonResponse
    {
        $etp = Etp::with(['elaborador', 'aprovador', 'versoes.usuario', 'processo'])->findOrFail($id);
        $this->authorize('view', $etp);

        return response()->json($etp);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $etp = Etp::findOrFail($id);
        $this->authorize('update', $etp);

        $data = $this->validatedData($request, partial: true);

        try {
            $etp = $this->etps->atualizar($etp, $data, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($etp);
    }

    public function enviarRevisao(Request $request, int $id): JsonResponse
    {
        $etp = Etp::findOrFail($id);
        $this->authorize('update', $etp);

        $mensagem = $request->validate(['mensagem' => ['nullable', 'string', 'max:1000']])['mensagem'] ?? null;

        try {
            $etp = $this->etps->enviarParaRevisao($etp, $request->user(), $mensagem);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($etp);
    }

    public function reabrir(Request $request, int $id): JsonResponse
    {
        $etp = Etp::findOrFail($id);
        $this->authorize('reabrir', $etp);

        try {
            $etp = $this->etps->reabrir($etp, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($etp);
    }

    public function aprovar(Request $request, int $id): JsonResponse
    {
        $etp = Etp::findOrFail($id);
        $this->authorize('aprovar', $etp);

        $parecer = $request->validate(['parecer' => ['nullable', 'string', 'max:1000']])['parecer'] ?? null;

        try {
            $etp = $this->etps->aprovar($etp, $request->user(), $parecer);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($etp);
    }

    public function rejeitar(Request $request, int $id): JsonResponse
    {
        $etp = Etp::findOrFail($id);
        $this->authorize('rejeitar', $etp);

        $motivo = $request->validate(['motivo' => ['required', 'string', 'max:1000']])['motivo'];

        try {
            $etp = $this->etps->rejeitar($etp, $request->user(), $motivo);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($etp);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request, bool $partial = false): array
    {
        // Ver comentário equivalente em DfdController::validatedData — mesma
        // razão para "sometimes required" em vez de só "sometimes" no update.
        $required = $partial ? ['sometimes', 'required'] : ['required'];

        return $request->validate([
            // 8000: campo de texto rico (TinyMCE), não texto puro — mesmo
            // raciocínio da Justificativa do DFD.
            'conteudo' => [...$required, 'string', 'max:20000'],
            'equipe_planejamento' => ['sometimes', 'nullable', 'array'],
            'equipe_planejamento.*.nome' => ['required_with:equipe_planejamento', 'string', 'max:255'],
            'equipe_planejamento.*.cargo' => ['required_with:equipe_planejamento', 'string', 'max:255'],
            'equipe_planejamento.*.matricula' => ['required_with:equipe_planejamento', 'string', 'max:50'],
            'campos_extras' => ['sometimes', 'array'],
            // Marcado pelo front quando o conteúdo veio de uma sugestão de
            // IA aceita sem edição — ver LicitaIaController (sugestão
            // genérica, usada aqui por não haver prompt dedicado ao ETP).
            'gerado_por_ia' => ['sometimes', 'boolean'],
        ]);
    }
}
