<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Licita\Enums\AlocacaoRisco;
use Modules\Licita\Enums\FaseRisco;
use Modules\Licita\Models\MapaRisco;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\MapaRiscoService;

final class MapaRiscoController extends Controller
{
    public function __construct(
        private readonly MapaRiscoService $mapasRiscos,
    ) {}

    public function store(Request $request, int $processoId): JsonResponse
    {
        $this->authorize('create', MapaRisco::class);

        $processo = Processo::findOrFail($processoId);
        $data = $this->validatedData($request);

        try {
            $mapaRisco = $this->mapasRiscos->criar($processo, $data, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($mapaRisco, 201);
    }

    public function show(int $id): JsonResponse
    {
        $mapaRisco = MapaRisco::with(['elaborador', 'aprovador', 'versoes.usuario', 'processo'])->findOrFail($id);
        $this->authorize('view', $mapaRisco);

        return response()->json($mapaRisco);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $mapaRisco = MapaRisco::findOrFail($id);
        $this->authorize('update', $mapaRisco);

        $data = $this->validatedData($request, partial: true);

        try {
            $mapaRisco = $this->mapasRiscos->atualizar($mapaRisco, $data, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($mapaRisco);
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
            // min:1 — diferente da equipe do DFD/ETP, aqui não há um mínimo
            // "de negócio" imposto pela Lei; só impede enviar uma matriz
            // vazia, que não teria utilidade nenhuma.
            'riscos' => [...$required, 'array', 'min:1'],
            'riscos.*.descricao' => ['required_with:riscos', 'string', 'max:1000'],
            'riscos.*.fase' => ['required_with:riscos', 'in:' . implode(',', array_column(FaseRisco::cases(), 'value'))],
            'riscos.*.probabilidade' => ['required_with:riscos', 'integer', 'between:1,5'],
            'riscos.*.impacto' => ['required_with:riscos', 'integer', 'between:1,5'],
            'riscos.*.causa' => ['nullable', 'string', 'max:2000'],
            'riscos.*.dano' => ['nullable', 'string', 'max:2000'],
            'riscos.*.alocacao' => ['required_with:riscos', 'in:' . implode(',', array_column(AlocacaoRisco::cases(), 'value'))],
            'riscos.*.acao_preventiva' => ['nullable', 'string', 'max:2000'],
            'riscos.*.responsavel_prevencao' => ['nullable', 'string', 'max:255'],
            'riscos.*.acao_contingencia' => ['nullable', 'string', 'max:2000'],
            'riscos.*.responsavel_contingencia' => ['nullable', 'string', 'max:255'],
            'equipe_planejamento' => ['sometimes', 'nullable', 'array'],
            'equipe_planejamento.*.nome' => ['required_with:equipe_planejamento', 'string', 'max:255'],
            'equipe_planejamento.*.cargo' => ['required_with:equipe_planejamento', 'string', 'max:255'],
            'equipe_planejamento.*.matricula' => ['required_with:equipe_planejamento', 'string', 'max:50'],
            'campos_extras' => ['sometimes', 'array'],
        ]);
    }
}
