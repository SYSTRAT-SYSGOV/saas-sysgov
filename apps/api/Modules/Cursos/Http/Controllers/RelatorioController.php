<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\CsvSeguro;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cursos\Enums\TipoCurso;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\Relatorios\RelatorioCapacitacaoService;
use Modules\Cursos\Services\Relatorios\RelatorioCursosService;
use Modules\Cursos\Services\Relatorios\RelatorioTurmaService;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Relatórios do módulo Cursos (design D1/D7): consultas somente leitura, sem escrita nem
 * eventos.
 */
final class RelatorioController extends Controller
{
    /** Acima disso a exportação recusa (D6): não é razoável nem seguro gerar um CSV desse tamanho na requisição. */
    private const int LIMITE_EXPORTACAO = 50_000;

    public function __construct(
        private readonly RelatorioTurmaService $relatorioTurma,
        private readonly RelatorioCursosService $relatorioCursos,
        private readonly RelatorioCapacitacaoService $relatorioCapacitacao,
        private readonly AuditLogger $audit,
        private readonly CsvSeguro $csv,
    ) {}

    /** Resumo e tabela de inscritos da turma; mesma autorização do CSV de inscritos. */
    public function turma(Turma $turma): JsonResponse
    {
        $this->authorize('operar', $turma);

        return response()->json($this->relatorioTurma->relatorio($turma));
    }

    /** CSV do relatório da turma (mesmas linhas da tela, com resultado e nota); mesma autorização. */
    public function turmaExportar(Turma $turma): StreamedResponse|JsonResponse
    {
        $this->authorize('operar', $turma);
        $inscritos = $this->relatorioTurma->relatorio($turma)['inscritos'];

        $recusa = $this->recusarSeAcimaDoLimite(count($inscritos));
        if ($recusa !== null) {
            return $recusa;
        }

        $this->audit->record('cursos', 'relatorios.turma.exportado', "Turma #{$turma->id}", null, ['formato' => 'csv', 'linhas' => count($inscritos)]);

        return response()->streamDownload(function () use ($inscritos): void {
            $saida = fopen('php://output', 'wb');
            $this->csv->escreverCabecalho($saida, ['Nome', 'E-mail', 'Status', 'Resultado', 'Data da inscrição', 'Frequência (%)', 'Nota']);
            foreach ($inscritos as $i) {
                $this->csv->escreverLinha($saida, [
                    $i['nome'], $i['email'], $i['status_label'], $i['resultado'], $i['inscrito_em'],
                    number_format($i['frequencia']['percentual'], 2, ',', ''),
                    $i['nota'] !== null ? number_format($i['nota'], 2, ',', '') : '—',
                ]);
            }
            fclose($saida);
        }, 'relatorio-turma-' . $turma->id . '-' . now()->format('Ymd-His') . '.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Cursos de um período, com o detalhe por turma; só quem administra o módulo. */
    public function cursos(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Curso::class);

        return response()->json($this->relatorioCursos->relatorio($this->filtrosCursos($request)));
    }

    /** CSV do relatório de cursos, uma linha por turma do período (mesmas linhas da tela). */
    public function cursosExportar(Request $request): StreamedResponse|JsonResponse
    {
        $this->authorize('viewAny', Curso::class);
        $filtros = $this->filtrosCursos($request);
        $relatorio = $this->relatorioCursos->relatorio($filtros);

        $linhas = [];
        foreach ($relatorio['cursos'] as $curso) {
            foreach ($curso['turmas_detalhe'] as $turma) {
                $linhas[] = [
                    $curso['titulo'], $curso['tipo'], $turma['turma_nome'], $turma['turma_status'],
                    $turma['inscricoes'], $turma['concluidos'], $turma['nao_concluidos'],
                    $turma['taxa_conclusao'], $turma['frequencia_media'], $turma['nota_media'], $turma['certificados_emitidos'],
                ];
            }
        }

        $recusa = $this->recusarSeAcimaDoLimite(count($linhas));
        if ($recusa !== null) {
            return $recusa;
        }

        $this->audit->record('cursos', 'relatorios.cursos.exportado', 'Relatório de cursos por período', null, ['formato' => 'csv', 'linhas' => count($linhas), 'filtros' => $filtros]);

        return response()->streamDownload(function () use ($linhas): void {
            $saida = fopen('php://output', 'wb');
            $this->csv->escreverCabecalho($saida, ['Curso', 'Tipo', 'Turma', 'Status', 'Inscrições', 'Concluídos', 'Não concluídos', 'Taxa de conclusão (%)', 'Frequência média (%)', 'Nota média', 'Certificados emitidos']);
            foreach ($linhas as $l) {
                $this->csv->escreverLinha($saida, [
                    $l[0], $l[1], $l[2], $l[3], $l[4], $l[5], $l[6],
                    $l[7] !== null ? number_format($l[7], 2, ',', '') : '—',
                    $l[8] !== null ? number_format($l[8], 2, ',', '') : '—',
                    $l[9] !== null ? number_format($l[9], 2, ',', '') : '—',
                    $l[10],
                ]);
            }
            fclose($saida);
        }, 'relatorio-cursos-' . now()->format('Ymd-His') . '.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @return array{inicio: string, fim: string, tipo?: string|null, curso_id?: int|null} */
    private function filtrosCursos(Request $request): array
    {
        return $request->validate([
            'inicio' => ['required', 'date'],
            'fim' => ['required', 'date', 'after_or_equal:inicio'],
            'tipo' => ['sometimes', 'nullable', Rule::enum(TipoCurso::class)],
            'curso_id' => ['sometimes', 'nullable', 'integer', Rule::exists('cursos_cursos', 'id')->where('tenant_id', app(TenantContext::class)->id())],
        ]);
    }

    /** Unidades do tenant (id, nome, path) para o seletor do filtro; só quem administra o módulo. */
    public function unidades(): JsonResponse
    {
        $this->authorize('viewAny', Curso::class);

        return response()->json(['data' => $this->relatorioCapacitacao->unidades()]);
    }

    /** Capacitação por servidor, paginado; só quem administra o módulo. */
    public function capacitacao(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Curso::class);
        $filtros = [
            ...$this->filtrosCapacitacao($request),
            ...$request->validate([
                'ordenar_por' => ['sometimes', 'nullable', Rule::in(['nome', 'horas', 'ultima_conclusao'])],
                'direcao' => ['sometimes', 'nullable', Rule::in(['asc', 'desc'])],
                'por_pagina' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
                'pagina' => ['sometimes', 'nullable', 'integer', 'min:1'],
            ]),
        ];

        return response()->json($this->relatorioCapacitacao->relatorio($filtros));
    }

    /** CSV do relatório de capacitação, uma linha por servidor (mesmos filtros e mesma consulta da tela). */
    public function capacitacaoExportar(Request $request): StreamedResponse|JsonResponse
    {
        $this->authorize('viewAny', Curso::class);
        $filtros = $this->filtrosCapacitacao($request);
        $total = $this->relatorioCapacitacao->total($filtros);

        $recusa = $this->recusarSeAcimaDoLimite($total);
        if ($recusa !== null) {
            return $recusa;
        }

        $this->audit->record('cursos', 'relatorios.capacitacao.exportado', 'Relatório de capacitação por servidor', null, ['formato' => 'csv', 'linhas' => $total, 'filtros' => $filtros]);

        // Resolvida agora, com o TenantContext ainda disponível — o streamDownload só executa
        // essa função depois que o ResolveTenant já limpou o contexto (ver prepararExportacao).
        $transmitir = $this->relatorioCapacitacao->prepararExportacao($filtros);

        return response()->streamDownload(function () use ($transmitir): void {
            $saida = fopen('php://output', 'wb');
            $this->csv->escreverCabecalho($saida, ['Nome', 'E-mail', 'Unidades', 'Cursos concluídos', 'Horas de capacitação', 'Cursos em andamento', 'Última conclusão']);
            $transmitir(function (array $l) use ($saida): void {
                $this->csv->escreverLinha($saida, [
                    $l['nome'], $l['email'], implode('; ', $l['unidades']),
                    $l['cursos_concluidos'], number_format($l['horas_capacitacao_minutos'] / 60, 2, ',', ''),
                    $l['cursos_em_andamento'], $l['ultima_conclusao'] ?? '—',
                ]);
            });
            fclose($saida);
        }, 'relatorio-capacitacao-' . now()->format('Ymd-His') . '.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @return array{inicio?: string|null, fim?: string|null, curso_id?: int|null, unidade_id?: int|null} */
    private function filtrosCapacitacao(Request $request): array
    {
        return $request->validate([
            'inicio' => ['sometimes', 'nullable', 'date'],
            'fim' => ['sometimes', 'nullable', 'date', 'after_or_equal:inicio'],
            'curso_id' => ['sometimes', 'nullable', 'integer', Rule::exists('cursos_cursos', 'id')->where('tenant_id', app(TenantContext::class)->id())],
            'unidade_id' => ['sometimes', 'nullable', 'integer', Rule::exists('org_units', 'id')->where('tenant_id', app(TenantContext::class)->id())],
        ]);
    }

    /** Acima do limite (D6): 422 com orientação, sem começar a transmitir. */
    private function recusarSeAcimaDoLimite(int $total): ?JsonResponse
    {
        if ($total <= self::LIMITE_EXPORTACAO) {
            return null;
        }

        return response()->json([
            'error' => "A exportação tem {$total} linhas, acima do limite de " . self::LIMITE_EXPORTACAO . ". Refine os filtros de período ou de unidade.",
        ], 422);
    }

    /** Detalhe da capacitação de um servidor: cursos concluídos e certificados. */
    public function capacitacaoDetalhe(Participante $participante): JsonResponse
    {
        $this->authorize('viewAny', Curso::class);
        $detalhe = $this->relatorioCapacitacao->detalhe($participante);

        if ($detalhe === null) {
            abort(404);
        }

        return response()->json($detalhe);
    }
}
