<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Services;

use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Modules\Multiprofissional\Models\Atendimento;
use Modules\Multiprofissional\Support\Vinculos;

/** Registro de atendimento (D5). O relato nunca vai para a auditoria — só os vínculos e o indicador de sigilo. */
final class AtendimentoService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{data_hora: string, turno: string, escola_id: int, equipe_id?: int|null, relato?: string|null, sigiloso?: bool, alunos: list<int>, profissionais: list<int>, tipos: list<int>} $dados
     */
    public function salvar(?Atendimento $atendimento, array $dados, User $user): Atendimento
    {
        return DB::transaction(function () use ($atendimento, $dados, $user): Atendimento {
            $antes = $atendimento === null ? null : $this->retrato($atendimento);
            $campos = [
                'data_hora' => $dados['data_hora'],
                'turno' => $dados['turno'],
                'escola_id' => $dados['escola_id'],
                'equipe_id' => $dados['equipe_id'] ?? null,
                'relato' => $dados['relato'] ?? null,
                'sigiloso' => (bool) ($dados['sigiloso'] ?? false),
            ];
            if ($atendimento === null) {
                $atendimento = Atendimento::create([...$campos, 'criado_por' => $user->id]);
            } else {
                $atendimento->update($campos);
            }
            $atendimento->alunos()->sync(Vinculos::comTenant($dados['alunos']));
            $atendimento->profissionais()->sync(Vinculos::comTenant($dados['profissionais']));
            $atendimento->tipos()->sync(Vinculos::comTenant($dados['tipos']));

            $this->audit->record('multiprofissional', $antes === null ? 'atendimento.registrado' : 'atendimento.alterado', "atendimento:{$atendimento->id}", $antes, $this->retrato($atendimento));

            return $atendimento;
        });
    }

    public function excluir(Atendimento $atendimento): void
    {
        $atendimento->delete();
        $this->audit->record('multiprofissional', 'atendimento.excluido', "atendimento:{$atendimento->id}", $this->retrato($atendimento), null);
    }

    /** @return array<string, mixed> */
    private function retrato(Atendimento $atendimento): array
    {
        return [
            'data_hora' => $atendimento->data_hora?->toIso8601String(),
            ...$atendimento->only(['turno', 'escola_id', 'equipe_id', 'sigiloso']),
            'alunos' => $atendimento->alunos()->pluck('escola_alunos.id')->all(),
            'profissionais' => $atendimento->profissionais()->pluck('multi_profissionais.id')->all(),
            'tipos' => $atendimento->tipos()->pluck('multi_tipos_atendimento.id')->all(),
        ];
    }
}
