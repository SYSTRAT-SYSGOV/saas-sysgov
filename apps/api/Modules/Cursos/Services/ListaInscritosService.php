<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Turma;

/**
 * Lista de inscritos de uma turma, com frequência e nota (Relatórios do Cursos, tarefa 1.3):
 * extraída de `InscricaoController` para que a listagem, a exportação em CSV e o relatório da
 * turma usem sempre o mesmo cálculo, sem risco de os números discordarem entre si.
 */
final class ListaInscritosService
{
    public function __construct(
        private readonly InscricaoService $inscricoes,
        private readonly FrequenciaService $frequencia,
        private readonly NotaService $notas,
    ) {}

    /**
     * @return list<array{id: int, participante_id: int, nome: string, email: string, status: string, status_label: string, inscrito_em: string, posicao_fila: int|null, frequencia: array{aulas: int, presencas: int, percentual: float}, nota: float|null}>
     */
    public function linhas(Turma $turma): array
    {
        return $turma->inscricoes()
            ->with(['participante', 'turma'])
            ->orderBy('id')
            ->get()
            ->map(fn (Inscricao $i): array => [
                'id' => $i->id,
                'participante_id' => $i->participante_id,
                'nome' => $i->participante->nome,
                'email' => $i->participante->email,
                'status' => $i->status,
                'status_label' => $i->statusEnum()->label(),
                'inscrito_em' => $i->created_at?->format('d/m/Y H:i') ?? '',
                'posicao_fila' => $this->inscricoes->posicaoNaFila($i),
                'frequencia' => $this->frequencia->resumo($i, ateAgora: true),
                'nota' => $this->nota($i),
            ])
            ->values()
            ->all();
    }

    /** Nota parcial (turma aberta) ou apurada (encerrada); só quem tem acesso ao conteúdo tem nota. */
    public function nota(Inscricao $inscricao): ?float
    {
        if (!$inscricao->statusEnum()->is(StatusInscricao::Confirmada, StatusInscricao::Concluida, StatusInscricao::NaoConcluida)) {
            return null;
        }

        return $this->notas->exibida($inscricao);
    }
}
