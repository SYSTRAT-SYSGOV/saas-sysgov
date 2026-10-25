<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use LogicException;
use Modules\Educa\Models\EducaClassEnrollment;
use Modules\Educa\Models\EducaConselhoAta;
use Modules\Educa\Models\EducaConselhoCronograma;
use Modules\Educa\Models\EducaConselhoDeliberacaoAluno;
use Modules\Educa\Models\EducaConselhoMembro;
use Modules\Educa\Models\EducaEnrollment;

final class ConselhoAtaService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     school_id?: string|null,
     *     school_class_id?: string|null,
     *     status?: string|null
     * } $filtros
     * @return Collection<int, EducaConselhoAta>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaConselhoAta::query()
            ->with(['school', 'schoolClass', 'cronograma', 'membros.user', 'deliberacoesAlunos.enrollment.aluno'])
            ->orderBy('created_at', 'desc');

        if (! empty($filtros['school_id'])) {
            $query->where('school_id', $filtros['school_id']);
        }

        if (! empty($filtros['school_class_id'])) {
            $query->where('school_class_id', $filtros['school_class_id']);
        }

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        return $query->get();
    }

    public function obter(string $ataId): EducaConselhoAta
    {
        return EducaConselhoAta::with([
            'school',
            'schoolClass',
            'cronograma',
            'finalizadoPor',
            'homologadoPor',
            'membros.user',
            'deliberacoesAlunos.enrollment.aluno',
        ])->findOrFail($ataId);
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function criarAta(array $dados, int $userId): EducaConselhoAta
    {
        $cronograma = EducaConselhoCronograma::findOrFail($dados['cronograma_id']);

        $numeroAta = $dados['numero_ata'] ?? sprintf(
            'ATA-%s-%s',
            strtoupper(substr($dados['school_class_id'], 0, 8)),
            date('YmdHis')
        );

        $ata = EducaConselhoAta::create([
            'school_id' => $dados['school_id'],
            'school_class_id' => $dados['school_class_id'],
            'cronograma_id' => $cronograma->id,
            'numero_ata' => $numeroAta,
            'periodo' => $dados['periodo'] ?? $cronograma->periodo,
            'data_reuniao' => $dados['data_reuniao'],
            'horario_inicio' => $dados['horario_inicio'] ?? null,
            'horario_fim' => $dados['horario_fim'] ?? null,
            'resumo_geral' => $dados['resumo_geral'] ?? null,
            'deliberacoes_coletivas' => $dados['deliberacoes_coletivas'] ?? null,
            'status' => 'rascunho',
        ]);

        $this->audit->record(
            'educa',
            'educa.conselho.ata.created',
            "educa_conselho_ata:{$ata->id}",
            null,
            $ata->toArray()
        );

        return $ata;
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizarAta(string $ataId, array $dados, int $userId): EducaConselhoAta
    {
        $ata = $this->obter($ataId);

        if ($ata->isFinalizada()) {
            throw new LogicException('A ata já se encontra finalizada ou homologada e não pode mais ser alterada.');
        }

        $before = $ata->toArray();

        $ata->update(array_filter([
            'data_reuniao' => $dados['data_reuniao'] ?? null,
            'horario_inicio' => $dados['horario_inicio'] ?? null,
            'horario_fim' => $dados['horario_fim'] ?? null,
            'resumo_geral' => array_key_exists('resumo_geral', $dados) ? $dados['resumo_geral'] : null,
            'deliberacoes_coletivas' => array_key_exists('deliberacoes_coletivas', $dados) ? $dados['deliberacoes_coletivas'] : null,
            'status' => $dados['status'] ?? null,
        ], fn ($val) => $val !== null));

        $this->audit->record(
            'educa',
            'educa.conselho.ata.updated',
            "educa_conselho_ata:{$ata->id}",
            $before,
            $ata->toArray()
        );

        return $ata;
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function registrarDeliberacaoAluno(string $ataId, array $dados, int $userId): EducaConselhoDeliberacaoAluno
    {
        $ata = $this->obter($ataId);

        if ($ata->isFinalizada()) {
            throw new LogicException('A ata já se encontra finalizada e não aceita novas deliberações.');
        }

        $enrollment = EducaEnrollment::findOrFail($dados['enrollment_id']);

        $deliberacao = EducaConselhoDeliberacaoAluno::updateOrCreate(
            [
                'tenant_id' => $ata->tenant_id,
                'ata_id' => $ata->id,
                'enrollment_id' => $enrollment->id,
            ],
            [
                'resultado_deliberacao' => (string) $dados['resultado_deliberacao'],
                'parecer_descritivo' => $dados['parecer_descritivo'] ?? null,
                'disciplinas_dependencia' => $dados['disciplinas_dependencia'] ?? [],
                'encaminhamento_pedagogico' => $dados['encaminhamento_pedagogico'] ?? null,
            ]
        );

        $this->audit->record(
            'educa',
            'educa.conselho.ata.deliberacao_aluno',
            "educa_conselho_deliberacao_aluno:{$deliberacao->id}",
            null,
            $deliberacao->toArray()
        );

        return $deliberacao;
    }

    /**
     * @param array<int, array<string, mixed>> $membros
     */
    public function registrarMembros(string $ataId, array $membros, int $userId): void
    {
        $ata = $this->obter($ataId);

        if ($ata->isFinalizada()) {
            throw new LogicException('A ata já se encontra finalizada e sua composição de membros é imutável.');
        }

        foreach ($membros as $membro) {
            EducaConselhoMembro::updateOrCreate(
                [
                    'tenant_id' => $ata->tenant_id,
                    'ata_id' => $ata->id,
                    'user_id' => $membro['user_id'],
                ],
                [
                    'cargo_funcao' => (string) $membro['cargo_funcao'],
                    'presente' => (bool) ($membro['presente'] ?? true),
                    'assinou_em' => ! empty($membro['presente']) ? now() : null,
                ]
            );
        }

        $this->audit->record(
            'educa',
            'educa.conselho.ata.membros_registrados',
            "educa_conselho_ata:{$ata->id}",
            null,
            ['total_membros' => count($membros)]
        );
    }

    public function finalizarAta(string $ataId, int $userId): EducaConselhoAta
    {
        $ata = $this->obter($ataId);

        if ($ata->isFinalizada()) {
            return $ata;
        }

        // Validação se há alunos sem deliberação na turma
        $totalAlunosTurma = EducaClassEnrollment::query()
            ->where('school_class_id', $ata->school_class_id)
            ->where('status', EducaClassEnrollment::STATUS_ATIVA)
            ->count();
        $totalDeliberacoes = $ata->deliberacoesAlunos()->count();

        if ($totalAlunosTurma > 0 && $totalDeliberacoes < $totalAlunosTurma) {
            throw new LogicException("Existem {$totalAlunosTurma} alunos ativos na turma, mas apenas {$totalDeliberacoes} deliberações registradas. Todas as deliberações devem ser concluídas antes da finalização da ata.");
        }

        $before = $ata->toArray();

        $ata->update([
            'status' => 'finalizada',
            'finalizado_por_user_id' => $userId,
            'finalizado_em' => now(),
        ]);

        $this->audit->record(
            'educa',
            'educa.conselho.ata.finalizada',
            "educa_conselho_ata:{$ata->id}",
            $before,
            $ata->toArray()
        );

        return $ata;
    }

    public function homologarAta(string $ataId, int $userId): EducaConselhoAta
    {
        $ata = $this->obter($ataId);

        if ($ata->status !== 'finalizada') {
            throw new LogicException('Apenas atas previamente finalizadas pela equipe escolar podem ser homologadas.');
        }

        $before = $ata->toArray();

        $ata->update([
            'status' => 'homologada',
            'homologado_por_user_id' => $userId,
            'homologado_em' => now(),
        ]);

        $this->audit->record(
            'educa',
            'educa.conselho.ata.homologada',
            "educa_conselho_ata:{$ata->id}",
            $before,
            $ata->toArray()
        );

        return $ata;
    }
}
