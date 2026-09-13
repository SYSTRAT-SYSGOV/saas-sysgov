<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\CicloService;

/**
 * Controller de Ciclos de Avaliação de 12 Meses (Cadência Anual de 3 Anos).
 */
final class CicloController extends Controller
{
    public function __construct(
        private readonly CicloService $cicloService,
    ) {}

    public function index(): JsonResponse
    {
        $ciclos = $this->cicloService->listarCiclos();

        return response()->json($ciclos);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome'                      => ['required', 'string', 'max:150'],
            'ano_competencia'           => ['required', 'integer', 'min:2020', 'max:2100'],
            'data_inicio'               => ['required', 'date'],
            'data_fim'                  => ['required', 'date', 'after:data_inicio'],
            'data_limite_preenchimento' => ['nullable', 'date'],
            'data_limite_recurso'       => ['nullable', 'date'],
            'status'                    => ['nullable', 'string'],
            'cadencia_automatica'       => ['nullable', 'boolean'],
            'etapa_cadencia'            => ['nullable', 'integer', 'min:1', 'max:3'],
            'regras_config'             => ['nullable', 'array'],
        ]);

        $ciclo = $this->cicloService->criarCiclo($validated);

        return response()->json($ciclo, 201);
    }

    public function show(int $id): JsonResponse
    {
        $ciclo = CicloAvaliacao::with(['comissao.membros'])->findOrFail($id);

        return response()->json($ciclo);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $ciclo = CicloAvaliacao::findOrFail($id);

        $validated = $request->validate([
            'nome'                      => ['sometimes', 'string', 'max:150'],
            'ano_competencia'           => ['sometimes', 'integer'],
            'data_inicio'               => ['sometimes', 'date'],
            'data_fim'                  => ['sometimes', 'date'],
            'data_limite_preenchimento' => ['nullable', 'date'],
            'data_limite_recurso'       => ['nullable', 'date'],
            'status'                    => ['sometimes', 'string'],
            'cadencia_automatica'       => ['sometimes', 'boolean'],
            'etapa_cadencia'            => ['sometimes', 'integer'],
            'regras_config'             => ['nullable', 'array'],
        ]);

        try {
            $atualizado = $this->cicloService->atualizarCiclo($ciclo, $validated);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($atualizado);
    }

    public function encerrar(Request $request, int $id): JsonResponse
    {
        $ciclo = CicloAvaliacao::findOrFail($id);
        $abrirProximo = (bool) $request->input('abrir_proximo', false);

        try {
            $encerrado = $this->cicloService->encerrarCiclo($ciclo, $abrirProximo);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Ciclo encerrado com sucesso.',
            'ciclo'   => $encerrado,
        ]);
    }

    public function proximoCiclo(int $id): JsonResponse
    {
        $ciclo = CicloAvaliacao::findOrFail($id);
        $proximo = $this->cicloService->abrirProximoCiclo($ciclo);

        return response()->json([
            'message' => "Próximo ciclo anual aberto com sucesso ({$proximo->ano_competencia}).",
            'ciclo'   => $proximo,
        ], 201);
    }

    public function elegibilidade(Request $request, int $id): JsonResponse
    {
        $ciclo = CicloAvaliacao::findOrFail($id);

        if ($servidorId = $request->query('servidor_id')) {
            $servidor = Servidor::findOrFail((int) $servidorId);
            $resultado = $this->cicloService->validarElegibilidadeServidor($servidor, $ciclo);

            return response()->json([
                'servidor' => [
                    'id'            => $servidor->id,
                    'nome_completo' => $servidor->nome_completo,
                    'matricula'     => $servidor->matricula,
                ],
                'resultado' => $resultado,
            ]);
        }

        $servidores = Servidor::all();
        $analise = [];
        $totalElegiveis = 0;
        $totalBloqueados = 0;

        foreach ($servidores as $s) {
            $check = $this->cicloService->validarElegibilidadeServidor($s, $ciclo);
            if ($check['elegivel']) {
                $totalElegiveis++;
            } else {
                $totalBloqueados++;
            }

            $analise[] = [
                'servidor_id'   => $s->id,
                'nome_completo' => $s->nome_completo,
                'matricula'     => $s->matricula,
                'cargo_efetivo' => $s->cargo_efetivo,
                'elegivel'      => $check['elegivel'],
                'bloqueios'     => $check['bloqueios'],
                'avisos'        => $check['avisos'],
            ];
        }

        return response()->json([
            'ciclo_id'         => $ciclo->id,
            'ano_competencia'  => $ciclo->ano_competencia,
            'total_analisados' => count($analise),
            'total_elegiveis'  => $totalElegiveis,
            'total_bloqueados' => $totalBloqueados,
            'servidores'       => $analise,
        ]);
    }
}
