<?php

declare(strict_types=1);

namespace Modules\Portfolio\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Modules\Escola\Models\Aluno;
use Modules\Portfolio\Services\DesempenhoService;
use Modules\Portfolio\Services\RelatorioService;

final class RelatorioController extends Controller
{
    public function __construct(
        private readonly ConsultaController $consulta,
        private readonly DesempenhoService $desempenho,
        private readonly RelatorioService $relatorio,
    ) {}

    public function show(Request $request, Aluno $aluno): Response
    {
        $trabalhos = $this->consulta->trabalhosDoAluno($request, $aluno);
        $ano = $request->integer('ano') ?: (int) now()->year;
        $trimestre = $request->integer('trimestre') ?: null;
        $dados = $this->relatorio->dados($aluno->loadMissing('turma'), $trabalhos, $this->desempenho->calcular($trabalhos, $trimestre === null), $ano, $trimestre, $request->user());

        return response($this->relatorio->pdf($dados, $aluno), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename=' . $this->relatorio->nomeArquivo($aluno, $ano, $trimestre),
        ]);
    }
}
