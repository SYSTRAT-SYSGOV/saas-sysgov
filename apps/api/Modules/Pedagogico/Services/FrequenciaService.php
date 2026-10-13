<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Escola\Models\Aluno;
use Modules\Pedagogico\Enums\Presenca;
use Modules\Pedagogico\Models\Frequencia;
use Modules\Pedagogico\Services\Concerns\RegistraMutacao;

final class FrequenciaService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /**
     * Registra a chamada da turma na data, substituindo o registro anterior de cada aluno nessa data.
     *
     * @param list<array{aluno_id: int, presenca: string, observacao?: string|null}> $registros
     * @param int $aulas quantidade de aulas do dia (cada falta vale essa quantidade)
     * @return int quantidade de registros gravados
     */
    public function registrar(int $turmaId, string $data, array $registros, User $user, int $aulas = 1): int
    {
        $idsDaTurma = Aluno::query()->where('turma_id', $turmaId)->pluck('id')->all();
        foreach ($registros as $i => $registro) {
            if (!in_array((int) $registro['aluno_id'], $idsDaTurma, true)) {
                throw ValidationException::withMessages(["registros.{$i}.aluno_id" => 'O aluno não pertence à turma informada.']);
            }
        }

        return DB::transaction(function () use ($turmaId, $data, $registros, $user, $aulas): int {
            $antes = Frequencia::query()->where('turma_id', $turmaId)->whereDate('data', $data)->get(['aluno_id', 'presenca', 'aulas'])->toArray();
            foreach ($registros as $registro) {
                // whereDate: a coluna date é gravada com horário (00:00:00) e não casaria com "aaaa-mm-dd".
                $existente = Frequencia::query()->where('aluno_id', $registro['aluno_id'])->whereDate('data', $data)->lockForUpdate()->first();
                $valores = ['turma_id' => $turmaId, 'presenca' => $registro['presenca'], 'aulas' => $aulas, 'observacao' => $registro['observacao'] ?? null, 'registrado_por' => $user->id];
                $existente !== null
                    ? $existente->update($valores)
                    : Frequencia::create(['aluno_id' => $registro['aluno_id'], 'data' => $data, ...$valores]);
            }
            $depois = Frequencia::query()->where('turma_id', $turmaId)->whereDate('data', $data)->get(['aluno_id', 'presenca', 'aulas'])->toArray();
            $this->auditar('frequencia', 'registrada', $turmaId, ['data' => $data, 'registros' => $antes], ['data' => $data, 'registros' => $depois], ['turma_id' => $turmaId, 'data' => $data]);

            return count($registros);
        });
    }

    /**
     * Faltas por aluno no período: soma das aulas dos dias com falta; faltas justificadas contadas à parte (em dias).
     *
     * @param Builder<Frequencia> $consulta frequências já restritas ao escopo do usuário
     * @return list<array{aluno_id: int, faltas: int, justificadas: int}>
     */
    public function totais(Builder $consulta, string $inicio, string $fim): array
    {
        return $consulta
            ->whereDate('data', '>=', $inicio)
            ->whereDate('data', '<=', $fim)
            ->whereIn('presenca', [Presenca::Falta->value, Presenca::FaltaJustificada->value])
            ->selectRaw('aluno_id, SUM(CASE WHEN presenca = ? THEN aulas ELSE 0 END) as faltas, SUM(CASE WHEN presenca = ? THEN 1 ELSE 0 END) as justificadas', [Presenca::Falta->value, Presenca::FaltaJustificada->value])
            ->groupBy('aluno_id')
            ->orderBy('aluno_id')
            ->get()
            ->map(fn (Frequencia $linha): array => [
                'aluno_id' => (int) $linha->aluno_id,
                'faltas' => (int) $linha->getAttribute('faltas'),
                'justificadas' => (int) $linha->getAttribute('justificadas'),
            ])
            ->values()
            ->all();
    }
}
