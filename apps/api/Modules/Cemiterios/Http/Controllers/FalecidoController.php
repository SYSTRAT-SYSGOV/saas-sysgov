<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Falecido;

/**
 * Registro de falecidos (RF-06). Causa da morte e documentos médicos nunca
 * saem nas respostas padrão; só em dados-restritos, com leitura auditada (RN-06).
 */
final class FalecidoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json(
            Falecido::query()
                ->when($request->query('q'), fn ($q, $v) => $q->where('nome_normalizado', 'like', '%' . Falecido::normalizar((string) $v) . '%'))
                ->orderBy('nome')
                ->paginate(min((int) $request->query('per_page', 30), 100))
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json(Falecido::with('inumacoes.jazigo:id,codigo,park_id')->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.operacoes.create');

        $falecido = Falecido::create($this->validar($request, 'required'));
        $this->audit->record('cemiterios', 'falecido.created', "Falecido #{$falecido->id}", null, $falecido->toArray());

        return response()->json($falecido, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.operacoes.create');

        $falecido = Falecido::findOrFail($id);
        $antes = $falecido->toArray();
        $falecido->update($this->validar($request, 'sometimes'));
        $this->audit->record('cemiterios', 'falecido.updated', "Falecido #{$id}", $antes, $falecido->toArray());

        return response()->json($falecido);
    }

    public function dadosRestritos(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.dados-restritos.view');

        $falecido = Falecido::findOrFail($id);
        // A auditoria registra QUEM leu, nunca o conteúdo lido.
        $this->audit->record('cemiterios', 'falecido.dados_restritos.lidos', "Falecido #{$id}", null, ['falecido_id' => $id]);

        return response()->json([
            'id' => $falecido->id,
            'causa_morte' => $falecido->causa_morte,
            'docs_medicos' => $falecido->docs_medicos,
        ]);
    }

    /** @return array<string, mixed> */
    private function validar(Request $request, string $obrigatorio): array
    {
        return $request->validate([
            'nome' => [$obrigatorio, 'string', 'max:255'],
            'nascimento' => ['nullable', 'date', 'before_or_equal:falecimento'],
            'falecimento' => [$obrigatorio, 'date', 'before_or_equal:today'],
            'certidao_numero' => ['nullable', 'string', 'max:60'],
            'certidao_cartorio' => ['nullable', 'string', 'max:255'],
            'causa_morte' => ['nullable', 'string', 'max:2000'],
            'docs_medicos' => ['nullable', 'array'],
            'docs_medicos.*' => ['string', 'max:500'],
        ]);
    }
}
