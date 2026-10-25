<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Validation\ValidationException;
use Modules\Educa\Models\EducaStudentGuardian;
use Modules\Educa\Models\EducaStudentProfile;
use Modules\Pessoas\Models\Pessoa;

/**
 * Serviço de Negócio para Ficha Cadastral e Complementar do Estudante (Extensão de Pessoas).
 */
final class StudentProfileService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Obtém ou inicializa a ficha complementar do aluno a partir do MDM de Pessoas.
     */
    public function obterOuCriarPerfil(int $pessoaId, int $tenantId): EducaStudentProfile
    {
        $pessoa = Pessoa::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $pessoaId)
            ->first();

        if ($pessoa === null) {
            throw ValidationException::withMessages([
                'pessoa_id' => ['Pessoa não encontrada no cadastro único municipal.'],
            ]);
        }

        /** @var EducaStudentProfile $perfil */
        $perfil = EducaStudentProfile::firstOrCreate(
            [
                'tenant_id' => $tenantId,
                'pessoa_id' => $pessoaId,
            ],
            [
                'bolsa_familia' => false,
                'necessidades_especiais' => false,
                'transporte_escolar_publico' => false,
            ]
        );

        return $perfil;
    }

    /**
     * Atualiza dados complementares (NIS, SUS, Certidão de Nascimento, laudo AEE).
     *
     * @param array<string, mixed> $dados
     */
    public function atualizarPerfil(int $pessoaId, int $tenantId, array $dados): EducaStudentProfile
    {
        $perfil = $this->obterOuCriarPerfil($pessoaId, $tenantId);
        $antes = $perfil->toArray();

        $perfil->fill($dados);
        $perfil->save();

        $this->audit->record('educa', 'student_profile.updated', "EducaStudentProfile #{$perfil->id}", $antes, $perfil->toArray());

        return $perfil;
    }

    /**
     * Vincula um responsável legal ao estudante.
     */
    public function vincularResponsavel(
        int $tenantId,
        int $alunoPessoaId,
        int $responsavelPessoaId,
        string $tipoParentesco,
        bool $isFinanceiro = true,
        bool $isPedagogico = true
    ): EducaStudentGuardian {
        if ($alunoPessoaId === $responsavelPessoaId) {
            throw ValidationException::withMessages([
                'responsavel_pessoa_id' => ['O aluno não pode ser o seu próprio responsável legal.'],
            ]);
        }

        $responsavel = Pessoa::query()
            ->where('tenant_id', $tenantId)
            ->where('id', $responsavelPessoaId)
            ->first();

        if ($responsavel === null) {
            throw ValidationException::withMessages([
                'responsavel_pessoa_id' => ['Responsável não encontrado no cadastro único municipal.'],
            ]);
        }

        /** @var EducaStudentGuardian $guardian */
        $guardian = EducaStudentGuardian::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'aluno_pessoa_id' => $alunoPessoaId,
                'responsavel_pessoa_id' => $responsavelPessoaId,
            ],
            [
                'tipo_parentesco' => $tipoParentesco,
                'is_responsavel_financeiro' => $isFinanceiro,
                'is_responsavel_pedagogico' => $isPedagogico,
            ]
        );

        $this->audit->record('educa', 'student_guardian.linked', "EducaStudentGuardian #{$guardian->id}", null, $guardian->toArray());

        return $guardian;
    }

    /**
     * Remove o vínculo de responsabilidade legal.
     */
    public function removerResponsavel(string $guardianId): void
    {
        $guardian = EducaStudentGuardian::query()->where('id', $guardianId)->firstOrFail();
        $antes = $guardian->toArray();
        $guardian->delete();

        $this->audit->record('educa', 'student_guardian.unlinked', "EducaStudentGuardian #{$guardianId}", $antes, null);
    }
}
