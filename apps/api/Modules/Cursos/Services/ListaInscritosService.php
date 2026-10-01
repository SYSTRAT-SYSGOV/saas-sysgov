<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Models\CampoInscricao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Participante;
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
     * @return list<array{id: int, participante_id: int, nome: string, email: string, origem: string, origem_label: string, status: string, status_label: string, inscrito_em: string, posicao_fila: int|null, frequencia: array{aulas: int, presencas: int, percentual: float}, nota: float|null, respostas: array<int, string>}>
     */
    public function linhas(Turma $turma): array
    {
        return $turma->inscricoes()
            ->with(['participante', 'turma', 'respostas'])
            ->orderBy('id')
            ->get()
            ->map(fn (Inscricao $i): array => [
                'id' => $i->id,
                'participante_id' => $i->participante_id,
                'nome' => $i->participante->nome,
                'email' => $i->participante->email,
                'origem' => $i->participante->origem,
                'origem_label' => $this->origemLabel($i->participante->origem),
                'status' => $i->status,
                'status_label' => $i->statusEnum()->label(),
                'inscrito_em' => $i->created_at?->format('d/m/Y H:i') ?? '',
                'posicao_fila' => $this->inscricoes->posicaoNaFila($i),
                'frequencia' => $this->frequencia->resumo($i, ateAgora: true),
                'nota' => $this->nota($i),
                'respostas' => $i->respostas->pluck('valor', 'campo_id')->all(),
            ])
            ->values()
            ->all();
    }

    /**
     * Colunas do formulário a exportar (tarefa 4.5, design D13): só os campos com pelo menos uma
     * resposta entre os inscritos DESTA turma, na ordem do campo, com o rótulo atual (não o
     * snapshot — o cabeçalho da coluna é do formulário de hoje, os valores embaixo são de cada
     * inscrito).
     *
     * @return list<array{campo_id: int, rotulo: string}>
     */
    public function colunasFormulario(Turma $turma): array
    {
        $inscricaoIds = $turma->inscricoes()->pluck('id');

        return CampoInscricao::query()
            ->whereHas('respostas', fn ($q) => $q->whereIn('inscricao_id', $inscricaoIds))
            ->orderBy('ordem')->orderBy('id')
            ->get(['id', 'rotulo'])
            ->map(fn (CampoInscricao $c): array => ['campo_id' => $c->id, 'rotulo' => $c->rotulo])
            ->all();
    }

    private function origemLabel(string $origem): string
    {
        return match ($origem) {
            Participante::ORIGEM_EXTERNO => 'Externo',
            default => 'Servidor',
        };
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
