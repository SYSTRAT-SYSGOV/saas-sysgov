<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Campanha\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Campanha\Models\Demanda;
use Modules\Campanha\Models\Evento;
use Modules\Campanha\Models\Reuniao;
use Modules\Campanha\Models\Visita;
use Modules\Campanha\Services\AgendaService;

/** Agenda da campanha: eventos, reuniões, visitas, lista unificada e próximos compromissos. */
final class AgendaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly AgendaService $agenda,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Evento::class);
        $filtros = $request->validate([
            'de' => ['nullable', 'date_format:Y-m-d'], 'ate' => ['nullable', 'date_format:Y-m-d'],
            'codigo_ibge' => ['nullable', 'integer'], 'tipo' => ['nullable', Rule::in(array_keys(AgendaService::TIPOS))],
        ]);

        return response()->json(['itens' => $this->agenda->agenda($filtros)]);
    }

    public function proximos(): JsonResponse
    {
        $this->authorize('viewAny', Evento::class);

        return response()->json(['itens' => $this->agenda->proximos()]);
    }

    public function salvarEvento(Request $request, ?Evento $evento = null): JsonResponse
    {
        $evento === null ? $this->authorize('create', Evento::class) : $this->authorize('update', $evento);
        $o = $evento === null ? 'required' : 'sometimes';
        $dados = $request->validate([
            'nome' => [$o, 'string', 'max:200'], 'codigo_ibge' => [$o, 'integer'], 'local' => [$o, 'string', 'max:255'],
            'inicio' => [$o, 'date'], 'responsavel_id' => ['sometimes', 'nullable', 'integer'],
            'publico_estimado' => ['sometimes', 'integer', 'min:0'], 'publico_presente' => ['sometimes', 'integer', 'min:0'],
            'observacoes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        return $this->executar(fn () => response()->json($this->agenda->salvar(Evento::class, $evento, $dados), $evento === null ? 201 : 200));
    }

    public function salvarReuniao(Request $request, ?Reuniao $reuniao = null): JsonResponse
    {
        $reuniao === null ? $this->authorize('create', Reuniao::class) : $this->authorize('update', $reuniao);
        $o = $reuniao === null ? 'required' : 'sometimes';
        $dados = $request->validate([
            'titulo' => [$o, 'string', 'max:200'], 'codigo_ibge' => [$o, 'integer'], 'local' => ['sometimes', 'nullable', 'string', 'max:255'],
            'inicio' => [$o, 'date'], 'participantes' => ['sometimes', 'nullable', 'string', 'max:5000'], 'ata' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'pendencias' => ['sometimes', 'nullable', 'string', 'max:5000'], 'responsavel_id' => ['sometimes', 'nullable', 'integer'],
            'prazo_pendencias' => ['sometimes', 'nullable', 'date_format:Y-m-d'], 'pendencias_resolvidas' => ['sometimes', 'boolean'],
        ]);

        return $this->executar(fn () => response()->json($this->agenda->salvar(Reuniao::class, $reuniao, $dados), $reuniao === null ? 201 : 200));
    }

    public function salvarVisita(Request $request, ?Visita $visita = null): JsonResponse
    {
        $visita === null ? $this->authorize('create', Visita::class) : $this->authorize('update', $visita);
        $o = $visita === null ? 'required' : 'sometimes';
        $dados = $request->validate([
            'lideranca' => [$o, 'string', 'max:200'], 'codigo_ibge' => [$o, 'integer'], 'bairro' => ['sometimes', 'nullable', 'string', 'max:150'],
            'data' => [$o, 'date_format:Y-m-d'], 'assunto' => [$o, 'string', 'max:5000'], 'resultado' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'encaminhamento' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        return $this->executar(fn () => response()->json($this->agenda->salvar(Visita::class, $visita, $dados), $visita === null ? 201 : 200));
    }

    public function excluirEvento(Evento $evento): JsonResponse
    {
        return $this->excluir($evento);
    }

    public function excluirReuniao(Reuniao $reuniao): JsonResponse
    {
        return $this->excluir($reuniao);
    }

    public function excluirVisita(Visita $visita): JsonResponse
    {
        return $this->excluir($visita);
    }

    public function demandaDaVisita(Request $request, Visita $visita): JsonResponse
    {
        $this->authorize('update', $visita);
        $this->authorize('create', Demanda::class);
        $user = $request->user();

        return $this->executar(fn () => response()->json($this->agenda->demandaDaVisita($visita, $user instanceof User ? $user : null), 201));
    }

    private function excluir(Evento|Reuniao|Visita $registro): JsonResponse
    {
        $this->authorize('delete', $registro);
        $this->agenda->excluir($registro);

        return response()->json(['deleted' => true]);
    }
}
