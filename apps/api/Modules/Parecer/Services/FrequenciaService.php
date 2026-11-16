<?php

declare(strict_types=1);

namespace Modules\Parecer\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Trimestre;
use Modules\Escola\Models\Turma;
use Modules\Parecer\Models\Frequencia;
use Modules\Parecer\Services\Concerns\RegistraMutacao;
use Modules\Parecer\Support\Catalogo;

/** Frequência diária (frequencia.php): C/F por aluno ativo; cada falta conta as aulas do dia. */
final class FrequenciaService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /**
     * Períodos [tri => [início, fim]] do ano: os do cadastro Escola ou, sem cadastro, o padrão do PHP.
     *
     * @return array<int, array{0: string, 1: string}>
     */
    public function periodos(int $ano): array
    {
        $p = Catalogo::periodosPadrao($ano);
        foreach (Trimestre::query()->where('ano_letivo', $ano)->get() as $t) {
            if (isset($p[(int) $t->numero])) {
                $p[(int) $t->numero] = [substr((string) $t->getRawOriginal('data_inicio'), 0, 10), substr((string) $t->getRawOriginal('data_fim'), 0, 10)];
            }
        }

        return $p;
    }

    /**
     * Grava a chamada do dia: alunos ativos não listados em $faltaram ficam com C.
     *
     * @param list<int> $faltaram
     */
    public function registrar(Turma $turma, int $serie, string $data, int $aulas, array $faltaram, User $user): int
    {
        $aulas = max(1, min(10, $aulas));

        return DB::transaction(function () use ($turma, $serie, $data, $aulas, $faltaram, $user): int {
            $ativos = Aluno::query()->where('turma_id', $turma->id)->where('situacao', 'ativo')->pluck('id')->map(fn ($id): int => (int) $id)->all();
            $faltas = [];
            foreach ($ativos as $alunoId) {
                $s = in_array($alunoId, $faltaram, true) ? 'F' : 'C';
                $registro = Frequencia::query()->where('aluno_id', $alunoId)->whereDate('data', $data)->lockForUpdate()->first();
                $valores = ['turma_id' => $turma->id, 'status' => $s, 'aulas' => $aulas, 'faltas' => $s === 'F' ? $aulas : 0, 'lancado_por' => $user->id];
                $registro !== null ? $registro->update($valores) : Frequencia::create(['aluno_id' => $alunoId, 'data' => $data, ...$valores]);
                if ($s === 'F') {
                    $faltas[] = $alunoId;
                }
            }
            $this->auditar('frequencia', 'registrada', $turma->id, sprintf('Chamada de %s · %s %s: %d falta(s), %d aula(s)', $this->br($data), Catalogo::SERIES[$serie], $turma->nome, count($faltas), $aulas), null, ['data' => $data, 'faltaram' => $faltas]);

            return count($faltas);
        });
    }

    public function apagar(Turma $turma, int $serie, string $data): int
    {
        return DB::transaction(function () use ($turma, $serie, $data): int {
            $n = Frequencia::query()->where('turma_id', $turma->id)->whereDate('data', $data)->delete();
            $this->auditar('frequencia', 'apagada', $turma->id, sprintf('Chamada de %s apagada · %s %s', $this->br($data), Catalogo::SERIES[$serie], $turma->nome), null, ['data' => $data, 'registros' => $n]);

            return $n;
        });
    }

    private function br(string $data): string
    {
        return implode('/', array_reverse(explode('-', $data)));
    }
}
