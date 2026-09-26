<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\AulaAgendamento;
use Modules\Cursos\Services\CheckInService;
use Modules\Cursos\Services\PresencaService;

final class PresencaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly PresencaService $presencas,
        private readonly CheckInService $checkIn,
    ) {}

    public function chamada(AulaAgendamento $agendamento): JsonResponse
    {
        $this->authorize('operar', $agendamento->turma);

        return response()->json([
            'agendamento' => $agendamento->load('aula:id,titulo'),
            'chamada' => $this->presencas->chamada($agendamento),
        ]);
    }

    public function registrarChamada(Request $request, AulaAgendamento $agendamento): JsonResponse
    {
        $this->authorize('operar', $agendamento->turma);
        $dados = $request->validate([
            'presencas' => ['required', 'array', 'min:1'],
            'presencas.*.inscricao_id' => ['required', 'integer'],
            'presencas.*.presente' => ['required', 'boolean'],
        ]);
        $mapa = [];
        foreach ($dados['presencas'] as $p) {
            $mapa[(int) $p['inscricao_id']] = (bool) $p['presente'];
        }

        return $this->executar(function () use ($agendamento, $mapa, $request): JsonResponse {
            $this->presencas->registrarChamada($agendamento, $mapa, $request->user());

            return response()->json(['chamada' => $this->presencas->chamada($agendamento)]);
        });
    }

    public function qrToken(AulaAgendamento $agendamento): JsonResponse
    {
        $this->authorize('operar', $agendamento->turma);

        return $this->executar(fn () => response()->json($this->checkIn->emitirToken($agendamento)));
    }

    public function checkIn(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('cursos.participar', app(TenantContext::class)->id()), 403);
        $dados = $request->validate(['token' => ['required', 'string', 'max:200']]);

        return $this->executar(function () use ($dados, $request): JsonResponse {
            $resultado = $this->checkIn->registrar($dados['token'], $request->user());

            return response()->json([
                'presenca' => $resultado['presenca']->load('agendamento.aula:id,titulo'),
                'ja_registrada' => $resultado['ja_registrada'],
            ], $resultado['ja_registrada'] ? 200 : 201);
        });
    }
}
