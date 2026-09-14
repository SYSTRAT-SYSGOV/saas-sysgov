<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\ConsolidacaoTrienal;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\CicloService;
use Modules\Capd\Services\ConsolidacaoTrienalService;
use Modules\Capd\Services\NotaCalculoService;
use Modules\Capd\Services\PmdService;

/**
 * Consolidação NFC Trienal e Ranking de Progressão (RN-02, RN-04, RN-05, RF-12).
 *
 * Endpoints:
 *   GET /capd/consolidacao/{cicloId}/nfc          — calcula NFC de todos os servidores
 *   GET /capd/consolidacao/{cicloId}/ranking       — ranking com desempate (RN-05)
 *   GET /capd/consolidacao/{cicloId}/exportar-pdf  — PDF do Relatório de Classificação
 *   POST /capd/consolidacao/{cicloId}/processar    — persiste a Consolidação Trienal e cria PMDs
 *   GET /capd/consolidacao/{cicloId}/historico      — lista as consolidações persistidas do triênio
 */
final class ConsolidacaoController extends Controller
{
    public function __construct(
        private readonly CicloService              $cicloService,
        private readonly NotaCalculoService         $notaCalculo,
        private readonly PmdService                 $pmdService,
        private readonly ConsolidacaoTrienalService $consolidacaoTrienal,
    ) {}

    /**
     * Calcula e retorna a NFC de todos os servidores do ciclo.
     * Não persiste — apenas exibe para revisão prévia da Comissão.
     */
    public function nfc(int $cicloId): JsonResponse
    {
        $ciclo = CicloAvaliacao::findOrFail($cicloId);

        $servidores = Servidor::query()
            ->whereHas('avaliacoes', fn ($q) => $q->where('ciclo_id', $ciclo->id)->whereNotNull('nota_final'))
            ->with(['avaliacoes' => fn ($q) => $q->where('ciclo_id', $ciclo->id)->whereNotNull('nota_final')])
            ->get();

        $anoBase = $ciclo->ano_competencia - ($ciclo->etapa_cadencia - 1);

        $resultado = $servidores->map(function (Servidor $servidor) use ($ciclo, $anoBase): array {
            // Busca as notas de todos os ciclos da cadência
            $notasCiclos = [];
            $ciclosDaCadencia = CicloAvaliacao::query()
                ->where('tenant_id', $ciclo->tenant_id)
                ->whereBetween('ano_competencia', [$anoBase, $anoBase + 2])
                ->orderBy('ano_competencia')
                ->get();

            foreach ($ciclosDaCadencia as $c) {
                $av = Avaliacao::query()
                    ->where('ciclo_id', $c->id)
                    ->where('servidor_id', $servidor->user_id ?? $servidor->id)
                    ->whereNotNull('nota_final')
                    ->latest('data_conclusao')
                    ->first();

                if ($av) {
                    $notasCiclos[$c->ano_competencia] = (string) $av->nota_final;
                }
            }

            if (empty($notasCiclos)) {
                return [
                    'servidor_id'  => $servidor->id,
                    'nome'         => $servidor->nome_completo,
                    'matricula'    => $servidor->matricula,
                    'notas_ciclos' => [],
                    'nfc'          => null,
                    'conceito'     => null,
                    'elegivel'     => false,
                ];
            }

            try {
                $nfc     = $this->notaCalculo->calcularNfc(array_values($notasCiclos));
                $elegivel = $this->notaCalculo->isElegivelProgressao($nfc, $ciclo);
                $conceito = $this->notaCalculo->determinarConceito($nfc, $ciclo);
            } catch (\DomainException $e) {
                $nfc = null; $elegivel = false; $conceito = null;
            }

            return [
                'servidor_id'  => $servidor->id,
                'nome'         => $servidor->nome_completo,
                'matricula'    => $servidor->matricula,
                'notas_ciclos' => $notasCiclos,
                'nfc'          => $nfc,
                'conceito'     => $conceito,
                'elegivel'     => $elegivel,
            ];
        });

        return response()->json([
            'ciclo_id'    => $ciclo->id,
            'nota_corte'  => $ciclo->nota_corte_nfc ?? '70.00',
            'total'       => $resultado->count(),
                'aptos'   => $resultado->where('elegivel', true)->count(),
            'inaptos'     => $resultado->where('elegivel', false)->count(),
            'servidores'  => $resultado->values(),
        ]);
    }

    /**
     * RN-05 — Ranking de progressão com desempate (art. 39 da Lei 1.704/2006).
     *
     * Critérios: (1) NFC DESC, (2) Tempo de serviço DESC, (3) Idade DESC.
     */
    public function rankingProgressao(int $cicloId): JsonResponse
    {
        $ciclo = CicloAvaliacao::findOrFail($cicloId);

        // Monta candidatos elegíveis
        $nfcData   = json_decode($this->nfc($cicloId)->getContent(), true);
        $candidatos = collect($nfcData['servidores'])
            ->filter(fn ($s) => $s['elegivel'] && $s['nfc'] !== null)
            ->map(function (array $s): array {
                $s['servidor'] = Servidor::findOrFail($s['servidor_id']);
                return $s;
            });

        $ranking = $this->notaCalculo->rankingComDesempate($candidatos);

        return response()->json([
            'ciclo_id'   => $ciclo->id,
            'nota_corte' => $ciclo->nota_corte_nfc ?? '70.00',
            'total'      => $ranking->count(),
            'ranking'    => $ranking->map(fn ($item) => [
                'posicao'      => $item['posicao'],
                'servidor_id'  => $item['servidor_id'],
                'nome'         => $item['nome'],
                'matricula'    => $item['matricula'],
                'notas_ciclos' => $item['notas_ciclos'],
                'nfc'          => $item['nfc'],
                'conceito'     => $item['conceito'],
                'data_admissao'   => $item['servidor']->data_admissao,
                'data_nascimento' => $item['servidor']->data_nascimento,
            ]),
        ]);
    }

    /**
     * RF-12 — Exporta o Relatório de Classificação para Progressão em PDF.
     *
     * Usa LaravelDompdf (barryvdh/laravel-dompdf) via view Blade inline.
     */
    public function exportarPdf(int $cicloId): Response
    {
        $ciclo = CicloAvaliacao::findOrFail($cicloId);

        // Gera dados do ranking
        $rankingData = json_decode($this->rankingProgressao($cicloId)->getContent(), true);

        $html = $this->gerarHtmlRelatorio($ciclo, $rankingData['ranking']);

        // Usa Dompdf se disponível, fallback para download HTML
        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html)->setPaper('a4', 'portrait');
            return $pdf->download("classificacao-progressao-ciclo-{$cicloId}.pdf");
        }

        // Fallback: retorna HTML renderizável
        return response($html, 200, [
            'Content-Type'        => 'text/html; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"classificacao-progressao-ciclo-{$cicloId}.html\"",
        ]);
    }

    /**
     * Consolida NFC de todos os servidores, persiste a Consolidação Trienal
     * (RN-02, nova versão a cada execução — imutável) e cria PMDs para os inaptos.
     * Operação idempotente do ponto de vista de negócio — pode ser re-executada,
     * mas cada execução grava uma nova versão do histórico (nunca sobrescreve).
     */
    public function processar(Request $request, int $cicloId): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.admin.parametrizar'), 403);

        $ciclo = CicloAvaliacao::findOrFail($cicloId);

        $nfcData     = json_decode($this->nfc($cicloId)->getContent(), true);
        $servidores  = collect($nfcData['servidores'])->filter(fn ($s) => $s['nfc'] !== null);

        $pmdsGerados = 0;
        $erros       = [];

        foreach ($servidores as $dado) {
            try {
                $servidor = Servidor::findOrFail($dado['servidor_id']);

                $this->consolidacaoTrienal->persistir($servidor, $ciclo, [
                    'notas_ciclos' => $dado['notas_ciclos'],
                    'nfc'          => $dado['nfc'],
                    'conceito'     => $dado['conceito'],
                    'elegivel'     => $dado['elegivel'],
                ]);

                if (! $dado['elegivel']) {
                    $this->pmdService->criarParaServidor($servidor, $ciclo, $dado['nfc']);
                    $pmdsGerados++;
                }
            } catch (\Throwable $e) {
                $erros[] = "Servidor #{$dado['servidor_id']}: {$e->getMessage()}";
            }
        }

        return response()->json([
            'message'       => "Consolidação concluída. {$pmdsGerados} PMD(s) gerado(s).",
            'total'         => $servidores->count(),
            'aptos'         => $servidores->where('elegivel', true)->count(),
            'inaptos'       => $servidores->where('elegivel', false)->count(),
            'pmds_gerados'  => $pmdsGerados,
            'erros'         => $erros,
        ]);
    }

    /**
     * Lista as Consolidações Trienais persistidas (todas as versões) do triênio
     * correspondente ao ciclo informado.
     */
    public function historico(int $cicloId): JsonResponse
    {
        $ciclo   = CicloAvaliacao::findOrFail($cicloId);
        $trienio = $ciclo->ano_competencia - ($ciclo->etapa_cadencia - 1);

        $consolidacoes = ConsolidacaoTrienal::query()
            ->where('trienio', $trienio)
            ->orderBy('servidor_id')
            ->orderByDesc('versao')
            ->get();

        return response()->json([
            'trienio'        => $trienio,
            'total'          => $consolidacoes->count(),
            'consolidacoes'  => $consolidacoes,
        ]);
    }

    // ── Helpers privados ──────────────────────────────────────────────

    /**
     * Gera HTML do relatório de classificação para renderização em PDF.
     */
    private function gerarHtmlRelatorio(CicloAvaliacao $ciclo, array $ranking): string
    {
        $dataGeracao = now()->format('d/m/Y H:i');
        $notaCorte   = $ciclo->nota_corte_nfc ?? '70.00';
        $linhas      = '';

        foreach ($ranking as $item) {
            $notasCiclos = implode(' | ', array_map(
                fn ($ano, $nota) => "{$ano}: {$nota}",
                array_keys($item['notas_ciclos']),
                array_values($item['notas_ciclos'])
            ));

            $linhas .= "<tr>
                <td style='text-align:center'>{$item['posicao']}</td>
                <td style='font-family:monospace'>{$item['matricula']}</td>
                <td>{$item['nome']}</td>
                <td style='text-align:center;font-family:monospace'>{$notasCiclos}</td>
                <td style='text-align:center;font-weight:bold;font-family:monospace'>{$item['nfc']}</td>
                <td style='text-align:center'>{$item['conceito']}</td>
            </tr>";
        }

        return "<!DOCTYPE html>
<html lang='pt-BR'>
<head>
<meta charset='UTF-8'>
<style>
  body { font-family: Arial, sans-serif; font-size: 10pt; }
  h1 { font-size: 13pt; text-align: center; }
  h2 { font-size: 10pt; text-align: center; font-weight: normal; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #1a2a52; color: white; padding: 6px 4px; font-size: 9pt; }
  td { border: 1px solid #ccc; padding: 4px; font-size: 9pt; }
  tr:nth-child(even) { background: #f5f5f5; }
  .rodape { margin-top: 24px; font-size: 8pt; color: #555; text-align: center; }
</style>
</head>
<body>
<h1>PREFEITURA MUNICIPAL DE ARAUCÁRIA — SYSGOV / CAPD</h1>
<h2>Relatório de Classificação para Progressão Funcional por Mérito/Desempenho</h2>
<h2>{$ciclo->nome} — Nota de Corte: {$notaCorte} pontos</h2>
<table>
  <thead>
    <tr>
      <th>Posição</th>
      <th>Matrícula</th>
      <th>Servidor</th>
      <th>Notas por Ciclo</th>
      <th>NFC</th>
      <th>Conceito</th>
    </tr>
  </thead>
  <tbody>{$linhas}</tbody>
</table>
<p class='rodape'>
  Critérios de desempate (art. 39, Lei Municipal nº 1.704/2006): (1) Maior NFC |
  (2) Maior tempo de serviço público municipal | (3) Maior idade civil.<br>
  Gerado em: {$dataGeracao} | SYSGOV — Módulo CAPD
</p>
</body>
</html>";
    }
}
