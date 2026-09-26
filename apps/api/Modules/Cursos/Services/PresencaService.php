<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Models\User;
use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\OrigemPresenca;
use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Models\AulaAgendamento;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Presenca;

/** Chamada manual pelo instrutor ou Administrador. */
final class PresencaService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Lista de chamada: inscrições confirmadas da turma com a presença atual na aula.
     *
     * @return list<array{inscricao_id: int, participante: string, email: string, presente: bool|null, origem: string|null}>
     */
    public function chamada(AulaAgendamento $agendamento): array
    {
        $presencas = Presenca::query()->where('agendamento_id', $agendamento->id)->get()->keyBy('inscricao_id');

        return Inscricao::query()
            ->where('turma_id', $agendamento->turma_id)
            ->where('status', StatusInscricao::Confirmada->value)
            ->with('participante:id,nome,email')
            ->get()
            ->sortBy(fn (Inscricao $i): string => mb_strtolower($i->participante->nome))
            ->map(fn (Inscricao $i): array => [
                'inscricao_id' => $i->id,
                'participante' => $i->participante->nome,
                'email' => $i->participante->email,
                'presente' => $presencas->get($i->id)?->presente,
                'origem' => $presencas->get($i->id)?->origem,
            ])
            ->values()
            ->all();
    }

    /**
     * @param array<int, bool> $presencas inscricao_id => presente
     */
    public function registrarChamada(AulaAgendamento $agendamento, array $presencas, User $autor): void
    {
        $turma = $agendamento->turma;
        if (!$turma->statusEnum()->is(StatusTurma::Aberta)) {
            throw new DomainException('A turma não está aberta: as presenças não podem mais ser alteradas.');
        }
        if (!$agendamento->jaComecou()) {
            throw new DomainException('A aula ainda não começou: a chamada só pode ser feita a partir de ' . $agendamento->inicio->format('d/m/Y H:i') . '.');
        }

        $confirmadas = Inscricao::query()
            ->where('turma_id', $turma->id)
            ->where('status', StatusInscricao::Confirmada->value)
            ->whereIn('id', array_keys($presencas))
            ->pluck('id')
            ->all();
        $invalidas = array_diff(array_keys($presencas), $confirmadas);
        if ($invalidas !== []) {
            throw new DomainException('Só inscrições confirmadas desta turma entram na chamada (inválidas: ' . implode(', ', $invalidas) . ').');
        }

        DB::transaction(function () use ($agendamento, $presencas, $autor): void {
            foreach ($presencas as $inscricaoId => $presente) {
                $atual = Presenca::query()->where('agendamento_id', $agendamento->id)->where('inscricao_id', $inscricaoId)->first();
                if ($atual !== null && $atual->presente === (bool) $presente) {
                    continue;
                }

                $antes = $atual?->only(['presente', 'origem']);
                $registro = Presenca::updateOrCreate(
                    ['agendamento_id' => $agendamento->id, 'inscricao_id' => $inscricaoId],
                    ['presente' => (bool) $presente, 'origem' => OrigemPresenca::Manual->value, 'registrado_por' => $autor->id],
                );

                $this->audit->record('cursos', $atual === null ? 'presenca.registrada' : 'presenca.corrigida', "Presenca #{$registro->id}", $antes, $registro->only(['agendamento_id', 'inscricao_id', 'presente', 'origem']));
            }
        });
    }
}
