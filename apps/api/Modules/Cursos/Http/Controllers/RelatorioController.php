<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cursos\Enums\TipoCurso;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\Relatorios\RelatorioCursosService;
use Modules\Cursos\Services\Relatorios\RelatorioTurmaService;

/**
 * Relatórios do módulo Cursos (design D1/D7): consultas somente leitura, sem escrita nem
 * eventos.
 */
final class RelatorioController extends Controller
{
    public function __construct(
        private readonly RelatorioTurmaService $relatorioTurma,
        private readonly RelatorioCursosService $relatorioCursos,
    ) {}

    /** Resumo e tabela de inscritos da turma; mesma autorização do CSV de inscritos. */
    public function turma(Turma $turma): JsonResponse
    {
        $this->authorize('operar', $turma);

        return response()->json($this->relatorioTurma->relatorio($turma));
    }

    /** Cursos de um período, com o detalhe por turma; só quem administra o módulo. */
    public function cursos(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Curso::class);
        $filtros = $request->validate([
            'inicio' => ['required', 'date'],
            'fim' => ['required', 'date', 'after_or_equal:inicio'],
            'tipo' => ['sometimes', 'nullable', Rule::enum(TipoCurso::class)],
            'curso_id' => ['sometimes', 'nullable', 'integer', Rule::exists('cursos_cursos', 'id')->where('tenant_id', app(TenantContext::class)->id())],
        ]);

        return response()->json($this->relatorioCursos->relatorio($filtros));
    }
}
