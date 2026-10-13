<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Modules\Pedagogico\Http\Requests\RegistrarFrequenciaRequest;
use Modules\Pedagogico\Models\Frequencia;
use Modules\Pedagogico\Services\EscopoProfessor;
use Modules\Pedagogico\Services\FrequenciaService;

final class FrequenciaController extends Controller
{
    public function __construct(
        private readonly FrequenciaService $frequencias,
        private readonly EscopoProfessor $escopo,
    ) {}

    /** Chamada de uma data (`data`) ou de um período (`data_inicio` e `data_fim`, até um ano) da turma. */
    public function index(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'turma_id' => ['required', 'integer'],
            'data' => ['required_without_all:data_inicio,data_fim', 'date_format:Y-m-d'],
            'data_inicio' => ['required_without:data', 'required_with:data_fim', 'date_format:Y-m-d'],
            'data_fim' => ['required_with:data_inicio', 'date_format:Y-m-d', 'after_or_equal:data_inicio', 'before_or_equal:' . $this->umAnoDepois($request->query('data_inicio'))],
        ]);
        abort_unless(Gate::forUser($request->user())->allows('pedagogico.ver-turma', [(int) $dados['turma_id']]), 403);

        $consulta = Frequencia::query()->where('turma_id', (int) $dados['turma_id']);
        isset($dados['data'])
            ? $consulta->whereDate('data', $dados['data'])
            : $consulta->whereDate('data', '>=', $dados['data_inicio'])->whereDate('data', '<=', $dados['data_fim']);

        return response()->json($consulta->orderBy('data')->orderBy('aluno_id')->get());
    }

    /** Total de faltas por aluno visível no período (opcionalmente de uma turma). */
    public function totais(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'turma_id' => ['sometimes', 'integer'],
            'data_inicio' => ['required', 'date_format:Y-m-d'],
            'data_fim' => ['required', 'date_format:Y-m-d', 'after_or_equal:data_inicio'],
        ]);
        abort_unless($this->escopo->pode($request->user(), 'pedagogico.view'), 403);

        $consulta = $this->escopo->aplicar(Frequencia::query(), $request->user())
            ->when(isset($dados['turma_id']), fn ($q) => $q->where('turma_id', (int) $dados['turma_id']));

        return response()->json($this->frequencias->totais($consulta, $dados['data_inicio'], $dados['data_fim']));
    }

    public function registrar(RegistrarFrequenciaRequest $request): JsonResponse
    {
        $dados = $request->validated();
        /** @var list<array{aluno_id: int, presenca: string, observacao?: string|null}> $registros */
        $registros = $dados['registros'];

        return response()->json(['registrados' => $this->frequencias->registrar((int) $dados['turma_id'], $dados['data'], $registros, $request->user(), (int) ($dados['aulas'] ?? 1))]);
    }

    /** Limite do período consultado: um ano a partir do início (ou uma data neutra se o início for inválido). */
    private function umAnoDepois(mixed $inicio): string
    {
        $data = is_string($inicio) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $inicio) : false;

        return $data !== false ? $data->modify('+1 year')->format('Y-m-d') : '2100-12-31';
    }
}
