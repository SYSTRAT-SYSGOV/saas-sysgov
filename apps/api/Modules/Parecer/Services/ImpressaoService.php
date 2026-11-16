<?php

declare(strict_types=1);

namespace Modules\Parecer\Services;

use App\Models\User;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Parecer\Models\FuncaoTurma;
use Modules\Parecer\Models\Habilidade;
use Modules\Parecer\Models\Observacao;
use Modules\Parecer\Models\TurmaSerie;
use Modules\Parecer\Support\Catalogo;

/**
 * Parecer em texto corrido (imprimir.php): para cada matéria escolhida,
 * "Matéria: habilidade, habilidade, ... . Observação do professor." — uma folha por aluno e trimestre.
 * Assinaturas: só as funções ligadas às matérias escolhidas; pedagogos e direção sempre; e o responsável.
 */
final class ImpressaoService
{
    /**
     * @param list<int> $alunoIds na ordem de impressão
     * @param list<int> $tris
     * @param list<string> $materias
     * @return list<array<string, mixed>>
     */
    public function folhas(array $alunoIds, array $tris, array $materias): array
    {
        $materias = array_values(array_intersect(array_keys(Catalogo::MATERIAS), $materias)) ?: array_keys(Catalogo::MATERIAS);
        $funcoes = array_filter(Catalogo::FUNCOES, fn (array $f): bool => $f[1] === [] || array_intersect($f[1], $materias) !== []);
        $alunos = Aluno::query()->with('turma.turno')->whereIn('id', $alunoIds)->get()->keyBy('id');
        $series = TurmaSerie::query()->whereIn('turma_id', $alunos->pluck('turma_id')->unique())->pluck('serie', 'turma_id');
        $nomesFuncao = [];
        $folhas = [];

        foreach ($alunoIds as $alunoId) {
            $a = $alunos[$alunoId] ?? null;
            $serie = $a !== null ? (int) ($series[$a->turma_id] ?? 0) : 0;
            if ($a === null || $serie === 0) {
                continue;
            }
            $nomesFuncao[$a->turma_id] ??= $this->nomesFuncoes((int) $a->turma_id);
            /** @var Turma $turma */
            $turma = $a->turma;
            foreach ($tris as $tri) {
                $porMat = [];
                foreach (Habilidade::query()->where('serie', $serie)->where('ativo', true)->where('trimestres', 'like', "%{$tri}%")->orderBy('ordem')->orderBy('id')->get() as $h) {
                    $porMat[$h->materia][] = Catalogo::trechoHabilidade($h->descricao);
                }
                $obs = Observacao::query()->where('aluno_id', $a->id)->where('trimestre', $tri)->pluck('texto', 'materia');
                $paragrafos = [];
                foreach ($materias as $m) {
                    $o = Catalogo::primeiraMaiuscula((string) ($obs[$m] ?? ''));
                    if (empty($porMat[$m]) && $o === '') {
                        continue;
                    }
                    $texto = implode(', ', $porMat[$m] ?? []) . (!empty($porMat[$m]) ? '.' : '') . ($o !== '' ? ' ' . $o : '');
                    $paragrafos[] = ['materia' => $m, 'rotulo' => Catalogo::MATERIAS[$m], 'texto' => trim($texto)];
                }
                $folhas[] = [
                    'aluno' => ['id' => $a->id, 'nome' => $a->nome, 'tem_foto' => $a->foto_path !== null],
                    'turma' => ['id' => $turma->id, 'nome' => $turma->nome, 'serie' => Catalogo::SERIES[$serie], 'turno' => $turma->turno?->nome, 'ano_letivo' => $turma->ano_letivo],
                    'trimestre' => $tri,
                    'paragrafos' => $paragrafos,
                    'observacoes_gerais' => trim((string) ($obs[''] ?? '')) !== '' ? Catalogo::primeiraMaiuscula((string) $obs['']) : null,
                    'assinaturas' => [
                        ...array_map(fn (string $funcao): array => ['rotulo' => Catalogo::FUNCOES[$funcao][0], 'nome' => $nomesFuncao[$a->turma_id][$funcao] ?? null], array_keys($funcoes)),
                        ['rotulo' => 'Responsável', 'nome' => null],
                    ],
                ];
            }
        }

        return $folhas;
    }

    /** @return array<string, string> funcao => nome */
    private function nomesFuncoes(int $turmaId): array
    {
        $ids = FuncaoTurma::query()->where('turma_id', $turmaId)->pluck('user_id', 'funcao');
        $nomes = User::query()->whereIn('id', $ids->values())->pluck('name', 'id');

        return $ids->map(fn ($uid): string => (string) ($nomes[$uid] ?? ''))->all();
    }
}
