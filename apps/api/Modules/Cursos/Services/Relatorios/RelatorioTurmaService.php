<?php

declare(strict_types=1);

namespace Modules\Cursos\Services\Relatorios;

use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\ListaInscritosService;

/**
 * Relatório da turma (Relatórios do Cursos, tarefa 2.1): resumo e tabela de inscritos.
 *
 * A tabela reaproveita `ListaInscritosService::linhas()` — a mesma que alimenta a listagem e o
 * CSV de inscritos — e o resumo é calculado sobre essas mesmas linhas (design D1/D2), para que
 * o total do resumo nunca possa discordar da tabela.
 */
final class RelatorioTurmaService
{
    public function __construct(
        private readonly ListaInscritosService $listaInscritos,
        private readonly IndicadoresRelatorio $indicadores,
    ) {}

    /**
     * @return array{
     *     resumo: array{
     *         por_situacao: array<string, int>,
     *         vagas_ocupadas: int,
     *         vagas: int,
     *         frequencia_media: float|null,
     *         nota_media: float|null,
     *         taxa_conclusao: float|null,
     *         certificados_emitidos: int,
     *     },
     *     inscritos: list<array{id: int, participante_id: int, nome: string, email: string, status: string, status_label: string, inscrito_em: string, posicao_fila: int|null, frequencia: array{aulas: int, presencas: int, percentual: float}, nota: float|null, resultado: string}>,
     * }
     */
    public function relatorio(Turma $turma): array
    {
        $linhas = $this->listaInscritos->linhas($turma);

        $porSituacao = [];
        foreach (StatusInscricao::cases() as $status) {
            $porSituacao[$status->value] = 0;
        }
        foreach ($linhas as $linha) {
            $porSituacao[$linha['status']]++;
        }

        $base = array_values(array_filter($linhas, fn (array $l): bool => in_array($l['status'], IndicadoresRelatorio::STATUS_BASE, true)));

        $notasDaBase = array_values(array_filter(array_column($base, 'nota'), fn (?float $n): bool => $n !== null));

        $resumo = [
            'por_situacao' => $porSituacao,
            'vagas_ocupadas' => $porSituacao[StatusInscricao::Pendente->value] + $porSituacao[StatusInscricao::Confirmada->value],
            'vagas' => $turma->vagas,
            'frequencia_media' => $this->indicadores->media(
                array_sum(array_column(array_column($base, 'frequencia'), 'percentual')),
                count($base),
            ),
            'nota_media' => $this->indicadores->media(array_sum($notasDaBase), count($notasDaBase)),
            'taxa_conclusao' => $this->indicadores->taxaConclusao(
                $porSituacao[StatusInscricao::Concluida->value],
                $porSituacao[StatusInscricao::NaoConcluida->value],
            ),
            'certificados_emitidos' => Certificado::query()->whereHas('inscricao', fn ($q) => $q->where('turma_id', $turma->id))->count(),
        ];

        $inscritos = array_map(fn (array $l): array => [...$l, 'resultado' => $this->resultado($l['status'])], $linhas);

        return ['resumo' => $resumo, 'inscritos' => $inscritos];
    }

    private function resultado(string $status): string
    {
        return match ($status) {
            StatusInscricao::Concluida->value => 'concluída',
            StatusInscricao::NaoConcluida->value => 'não concluída',
            default => 'em andamento',
        };
    }
}
