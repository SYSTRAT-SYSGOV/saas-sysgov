<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\TurmaMateria;
use Modules\Escola\Support\LeitorCsv;
use Modules\Escola\Support\NomeNormalizado;
use Modules\Pedagogico\Models\Nota;
use Modules\Pedagogico\Services\Concerns\RegistraMutacao;

final class NotaService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /**
     * Média por aluno: cada nota vale o maior entre nota e recuperação; a média é truncada em uma casa
     * (a mesma regra da tela de lançamento).
     *
     * @param Builder<Nota> $consulta notas já restritas ao escopo do usuário
     * @return list<array{aluno_id: int, media: float}>
     */
    public function medias(Builder $consulta, int $anoLetivo): array
    {
        return $consulta
            ->where('ano_letivo', $anoLetivo)
            ->whereHas('aluno')
            ->selectRaw('aluno_id, AVG(CASE WHEN nota_recuperacao IS NOT NULL AND nota_recuperacao > nota THEN nota_recuperacao ELSE nota END) as media')
            ->groupBy('aluno_id')
            ->orderBy('aluno_id')
            ->get()
            ->map(fn (Nota $linha): array => [
                'aluno_id' => (int) $linha->aluno_id,
                'media' => floor(round((float) $linha->getAttribute('media'), 6) * 10) / 10,
            ])
            ->values()
            ->all();
    }

    /**
     * Lança (ou substitui) as notas de alunos de uma turma numa matéria e trimestre.
     *
     * @param list<array{aluno_id: int, nota: float|int|string, nota_recuperacao?: float|int|string|null}> $notas
     * @return list<Nota>
     */
    public function lancar(int $turmaId, int $materiaId, int $anoLetivo, int $trimestre, array $notas, User $user): array
    {
        $idsDaTurma = Aluno::query()->where('turma_id', $turmaId)->pluck('id')->all();
        foreach ($notas as $i => $item) {
            if (!in_array((int) $item['aluno_id'], $idsDaTurma, true)) {
                throw ValidationException::withMessages(["notas.{$i}.aluno_id" => 'O aluno não pertence à turma informada.']);
            }
        }

        return DB::transaction(function () use ($materiaId, $anoLetivo, $trimestre, $notas, $user): array {
            $salvas = [];
            foreach ($notas as $item) {
                $salvas[] = $this->gravar((int) $item['aluno_id'], $materiaId, $anoLetivo, $trimestre, $item['nota'], $item['nota_recuperacao'] ?? null, $user);
            }

            return $salvas;
        });
    }

    /**
     * CSV TURMA;NUMERO;MATERIA;TRIMESTRE;NOTA (nota com vírgula ou ponto). Linha com NOTA em branco é ignorada
     * (não apaga nota); a matéria precisa estar vinculada à turma. Linhas inválidas voltam com o motivo.
     *
     * @return array{importadas: int, rejeitadas: list<array{linha: int, motivo: string}>}
     */
    public function importar(LeitorCsv $csv, int $anoLetivo, User $user): array
    {
        foreach (['TURMA', 'NUMERO', 'MATERIA', 'TRIMESTRE', 'NOTA'] as $coluna) {
            if (!$csv->temColuna($coluna)) {
                throw new DomainException("Cabeçalho obrigatório ausente: {$coluna}.");
            }
        }

        $turmas = Turma::query()->where('ano_letivo', $anoLetivo)->get()->keyBy(fn (Turma $t): string => NomeNormalizado::de($t->nome));
        $materias = Materia::query()->get()->keyBy('nome_normalizado');
        $vinculos = TurmaMateria::query()->whereIn('turma_id', $turmas->pluck('id'))->get()
            ->map(fn (TurmaMateria $v): string => "{$v->turma_id}:{$v->materia_id}");
        $resultado = ['importadas' => 0, 'rejeitadas' => []];

        DB::transaction(function () use ($csv, $anoLetivo, $user, $turmas, $materias, $vinculos, &$resultado): void {
            foreach ($csv->linhas() as $numeroLinha => $linha) {
                if ($linha['NOTA'] === '') {
                    continue;
                }
                $rejeitar = function (string $motivo) use (&$resultado, $numeroLinha): void {
                    $resultado['rejeitadas'][] = ['linha' => $numeroLinha, 'motivo' => $motivo];
                };
                $turma = $turmas->get(NomeNormalizado::de($linha['TURMA']));
                if ($turma === null) {
                    $rejeitar("Turma \"{$linha['TURMA']}\" não encontrada em {$anoLetivo}.");
                    continue;
                }
                $materia = $materias->get(NomeNormalizado::de($linha['MATERIA']));
                if ($materia === null) {
                    $rejeitar("Matéria \"{$linha['MATERIA']}\" não encontrada.");
                    continue;
                }
                if (!$vinculos->contains("{$turma->id}:{$materia->id}")) {
                    $rejeitar("A matéria \"{$materia->nome}\" não está vinculada à turma {$turma->nome}.");
                    continue;
                }
                $aluno = ctype_digit($linha['NUMERO'])
                    ? Aluno::query()->where('turma_id', $turma->id)->where('numero', (int) $linha['NUMERO'])->first()
                    : null;
                if ($aluno === null) {
                    $rejeitar("Aluno nº {$linha['NUMERO']} não encontrado em {$turma->nome}.");
                    continue;
                }
                $trimestre = ctype_digit($linha['TRIMESTRE']) ? (int) $linha['TRIMESTRE'] : 0;
                if ($trimestre < 1 || $trimestre > 3) {
                    $rejeitar("Trimestre inválido: {$linha['TRIMESTRE']}.");
                    continue;
                }
                $nota = str_replace(',', '.', $linha['NOTA']);
                if (!self::notaValida($nota)) {
                    $rejeitar("Nota inválida: {$linha['NOTA']} (use 0 a 10 com uma casa decimal).");
                    continue;
                }
                $this->gravar($aluno->id, $materia->id, $anoLetivo, $trimestre, $nota, null, $user);
                $resultado['importadas']++;
            }
        });

        return $resultado;
    }

    public static function notaValida(string $nota): bool
    {
        return preg_match('/^\d{1,2}(\.\d)?$/', $nota) === 1 && (float) $nota >= 0 && (float) $nota <= 10;
    }

    private function gravar(int $alunoId, int $materiaId, int $ano, int $trimestre, float|int|string $nota, float|int|string|null $recuperacao, User $user): Nota
    {
        $existente = Nota::query()
            ->where(['aluno_id' => $alunoId, 'materia_id' => $materiaId, 'ano_letivo' => $ano, 'trimestre' => $trimestre])
            ->lockForUpdate()
            ->first();
        $antes = $existente?->only(['nota', 'nota_recuperacao']);
        $dados = ['nota' => $nota, 'nota_recuperacao' => $recuperacao, 'lancado_por' => $user->id];

        $registro = $existente ?? new Nota(['aluno_id' => $alunoId, 'materia_id' => $materiaId, 'ano_letivo' => $ano, 'trimestre' => $trimestre]);
        $registro->fill($dados)->save();
        $this->auditar('nota', 'lancada', $registro->id, $antes, $registro->only(['aluno_id', 'materia_id', 'ano_letivo', 'trimestre', 'nota', 'nota_recuperacao']), [
            'aluno_id' => $alunoId, 'materia_id' => $materiaId, 'trimestre' => $trimestre,
        ]);

        return $registro;
    }
}
