<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCensusValidation;
use Modules\Educa\Models\EducaEmployeeAllocation;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaStudentProfile;

/**
 * Motor de Auditoria Cadastral Prévia do Censo Escolar (INEP/MEC).
 */
final class CensusAuditService
{
    /**
     * Executa a auditoria completa de consistência para a escola e ano letivo.
     *
     * @return array{
     *     school_id: string,
     *     academic_year_id: string,
     *     data_referencia: string,
     *     total_erros: int,
     *     total_avisos: int,
     *     aprovado_para_exportacao: bool,
     *     validacoes: Collection<int, EducaCensusValidation>
     * }
     */
    public function auditar(
        int $tenantId,
        string $schoolId,
        string $academicYearId,
        ?string $dataReferencia = null
    ): array {
        // Validação da Data de Referência Institucional (exigência normativa do Censo Escolar)
        if (empty($dataReferencia)) {
            throw ValidationException::withMessages([
                'data_referencia' => ['A data oficial de referência do Censo Escolar é obrigatória para executar a auditoria.'],
            ]);
        }

        $escola = EducaSchool::query()
            ->where('id', $schoolId)
            ->firstOrFail();

        $anoLetivo = EducaAcademicYear::query()
            ->where('id', $academicYearId)
            ->firstOrFail();

        $inconsistencias = [];

        // 1. Auditoria do Registro 00 (Identificação da Escola)
        $inconsistencias = array_merge(
            $inconsistencias,
            $this->auditarRegistro00($tenantId, $escola, $academicYearId)
        );

        // 2. Auditoria do Registro 10 (Infraestrutura Escolar)
        $inconsistencias = array_merge(
            $inconsistencias,
            $this->auditarRegistro10($tenantId, $escola, $academicYearId)
        );

        // 3. Auditoria do Registro 20 (Turmas)
        $turmas = EducaSchoolClass::query()
            ->where('school_id', $schoolId)
            ->where('academic_year_id', $academicYearId)
            ->get();

        $inconsistencias = array_merge(
            $inconsistencias,
            $this->auditarRegistro20($tenantId, $escola, $academicYearId, $turmas)
        );

        // 4. Auditoria do Registro 30 e 50 (Dados Pessoais e Docência)
        $inconsistencias = array_merge(
            $inconsistencias,
            $this->auditarRegistro30e50($tenantId, $escola, $academicYearId, $turmas)
        );

        // 5. Auditoria do Registro 60 (Matrículas e Transporte)
        $matriculas = EducaEnrollment::query()
            ->where('school_id', $schoolId)
            ->where('academic_year_id', $academicYearId)
            ->where('status', EducaEnrollment::STATUS_ATIVA)
            ->with(['alunoPessoa', 'turmas'])
            ->get();

        $inconsistencias = array_merge(
            $inconsistencias,
            $this->auditarRegistro60($tenantId, $escola, $academicYearId, $matriculas)
        );

        // Persistência transacional dos diagnósticos
        return DB::transaction(function () use (
            $tenantId,
            $schoolId,
            $academicYearId,
            $dataReferencia,
            $inconsistencias
        ) {
            // Remove auditorias anteriores para esta escola e ano letivo
            EducaCensusValidation::query()
                ->where('tenant_id', $tenantId)
                ->where('school_id', $schoolId)
                ->where('academic_year_id', $academicYearId)
                ->delete();

            $totalErros = 0;
            $totalAvisos = 0;

            foreach ($inconsistencias as $item) {
                if ($item['gravidade'] === EducaCensusValidation::GRAVIDADE_IMPEDITIVO) {
                    $totalErros++;
                } else {
                    $totalAvisos++;
                }

                EducaCensusValidation::create([
                    'tenant_id' => $tenantId,
                    'school_id' => $schoolId,
                    'academic_year_id' => $academicYearId,
                    'tipo_registro' => $item['tipo_registro'],
                    'gravidade' => $item['gravidade'],
                    'codigo_regra' => $item['codigo_regra'],
                    'mensagem' => $item['mensagem'],
                    'entidade_tipo' => $item['entidade_tipo'],
                    'entidade_id' => $item['entidade_id'],
                    'rota_correcao' => $item['rota_correcao'] ?? null,
                ]);
            }

            $validacoesSalvas = EducaCensusValidation::query()
                ->where('tenant_id', $tenantId)
                ->where('school_id', $schoolId)
                ->where('academic_year_id', $academicYearId)
                ->get();

            return [
                'school_id' => $schoolId,
                'academic_year_id' => $academicYearId,
                'data_referencia' => $dataReferencia,
                'total_erros' => $totalErros,
                'total_avisos' => $totalAvisos,
                'aprovado_para_exportacao' => $totalErros === 0,
                'validacoes' => $validacoesSalvas,
            ];
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function auditarRegistro00(int $tenantId, EducaSchool $escola, string $academicYearId): array
    {
        $falhas = [];

        // Validação do Código INEP da Escola (exatamente 8 dígitos numéricos)
        $codigoInep = (string) ($escola->codigo_inep ?? '');
        if (!preg_match('/^\d{8}$/', $codigoInep)) {
            $falhas[] = [
                'tipo_registro' => '00',
                'gravidade' => EducaCensusValidation::GRAVIDADE_IMPEDITIVO,
                'codigo_regra' => 'REG00_INEP_INVALIDO',
                'mensagem' => 'Código INEP da escola ausente ou inválido (deve possuir exatamente 8 dígitos numéricos).',
                'entidade_tipo' => EducaSchool::class,
                'entidade_id' => (string) $escola->id,
                'rota_correcao' => "/api/educa/core/escolas/{$escola->id}",
            ];
        }

        return $falhas;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function auditarRegistro10(int $tenantId, EducaSchool $escola, string $academicYearId): array
    {
        $falhas = [];

        // Escola em funcionamento sem caracterização predial
        if ($escola->situacao_funcionamento === 'em_atividade' && empty($escola->zona)) {
            $falhas[] = [
                'tipo_registro' => '10',
                'gravidade' => EducaCensusValidation::GRAVIDADE_AVISO,
                'codigo_regra' => 'REG10_INFRAESTRUTURA_PENDENTE',
                'mensagem' => 'Informações de infraestrutura e zona de localização pendentes de preenchimento.',
                'entidade_tipo' => EducaSchool::class,
                'entidade_id' => (string) $escola->id,
                'rota_correcao' => "/api/educa/core/escolas/{$escola->id}/infraestrutura",
            ];
        }

        return $falhas;
    }

    /**
     * @param Collection<int, EducaSchoolClass> $turmas
     * @return array<int, array<string, mixed>>
     */
    private function auditarRegistro20(
        int $tenantId,
        EducaSchool $escola,
        string $academicYearId,
        Collection $turmas
    ): array {
        $falhas = [];

        foreach ($turmas as $turma) {
            // Turma regular sem matriz curricular vinculada
            if (empty($turma->matrix_id) && $turma->tipo_atendimento !== 'aee') {
                $falhas[] = [
                    'tipo_registro' => '20',
                    'gravidade' => EducaCensusValidation::GRAVIDADE_IMPEDITIVO,
                    'codigo_regra' => 'REG20_TURMA_SEM_MATRIZ',
                    'mensagem' => "Turma '{$turma->nome}' sem matriz curricular da BNCC associada.",
                    'entidade_tipo' => EducaSchoolClass::class,
                    'entidade_id' => (string) $turma->id,
                    'rota_correcao' => "/api/educa/core/turmas/{$turma->id}",
                ];
            }
        }

        return $falhas;
    }

    /**
     * @param Collection<int, EducaSchoolClass> $turmas
     * @return array<int, array<string, mixed>>
     */
    private function auditarRegistro30e50(
        int $tenantId,
        EducaSchool $escola,
        string $academicYearId,
        Collection $turmas
    ): array {
        $falhas = [];

        // Lotações ativas na escola para o ano letivo
        $alocacoes = EducaEmployeeAllocation::query()
            ->where('school_id', $escola->id)
            ->where('academic_year_id', $academicYearId)
            ->where('status', 'ativa')
            ->with(['employee.pessoa'])
            ->get();

        foreach ($alocacoes as $alocacao) {
            $servidor = $alocacao->employee;
            $pessoa = $servidor?->pessoa;

            // Docente ou gestor brasileiro sem CPF cadastrado no módulo Pessoas
            if ($pessoa && empty($pessoa->documento)) {
                $falhas[] = [
                    'tipo_registro' => '30',
                    'gravidade' => EducaCensusValidation::GRAVIDADE_IMPEDITIVO,
                    'codigo_regra' => 'REG30_CPF_OBRIGATORIO_DOCENTE',
                    'mensagem' => "Profissional escolar '{$pessoa->nome}' sem CPF cadastrado no módulo Pessoas.",
                    'entidade_tipo' => 'Pessoa',
                    'entidade_id' => (string) $pessoa->id,
                    'rota_correcao' => "/api/pessoas/{$pessoa->id}",
                ];
            }
        }

        // Turmas regulares sem docente alocado
        $turmasRegulares = $turmas->filter(fn ($t) => $t->tipo_atendimento !== 'aee');
        if ($alocacoes->isEmpty() && $turmasRegulares->isNotEmpty()) {
            foreach ($turmasRegulares as $turma) {
                $falhas[] = [
                    'tipo_registro' => '50',
                    'gravidade' => EducaCensusValidation::GRAVIDADE_IMPEDITIVO,
                    'codigo_regra' => 'REG50_TURMA_SEM_DOCENTE',
                    'mensagem' => "Turma '{$turma->nome}' não possui docente alocado para os componentes curriculares.",
                    'entidade_tipo' => EducaSchoolClass::class,
                    'entidade_id' => (string) $turma->id,
                    'rota_correcao' => "/api/educa/core/turmas/{$turma->id}/docentes",
                ];
            }
        }

        return $falhas;
    }

    /**
     * @param Collection<int, EducaEnrollment> $matriculas
     * @return array<int, array<string, mixed>>
     */
    private function auditarRegistro60(
        int $tenantId,
        EducaSchool $escola,
        string $academicYearId,
        Collection $matriculas
    ): array {
        $falhas = [];

        foreach ($matriculas as $matricula) {
            $perfil = EducaStudentProfile::query()
                ->where('tenant_id', $tenantId)
                ->where('pessoa_id', $matricula->aluno_pessoa_id)
                ->first();

            // Aluno em turma de AEE sem deficiência/laudo informado
            $temTurmaAee = $matricula->turmas->contains(fn ($t) => ($t->tipo_atendimento ?? '') === 'aee');
            if ($temTurmaAee && (!$perfil || (empty($perfil->laudo_medico_aee) && !$perfil->necessidades_especiais))) {
                $falhas[] = [
                    'tipo_registro' => '30',
                    'gravidade' => EducaCensusValidation::GRAVIDADE_IMPEDITIVO,
                    'codigo_regra' => 'REG30_AEE_SEM_DEFICIENCIA',
                    'mensagem' => "Estudante da matrícula '{$matricula->codigo_matricula}' enturmado em AEE sem comprovação de deficiência ou laudo médico.",
                    'entidade_tipo' => EducaEnrollment::class,
                    'entidade_id' => (string) $matricula->id,
                    'rota_correcao' => "/api/educa/secretaria/alunos/{$matricula->aluno_pessoa_id}/perfil",
                ];
            }

            // Aluno com transporte público escolar sem tipologia especificada
            if ($perfil && $perfil->transporte_escolar_publico && empty($perfil->cartao_sus) && empty($perfil->codigo_nis) && empty($perfil->certidao_cartorio)) {
                // Registro 60: verificação de consistência do transporte escolar
                $falhas[] = [
                    'tipo_registro' => '60',
                    'gravidade' => EducaCensusValidation::GRAVIDADE_IMPEDITIVO,
                    'codigo_regra' => 'REG60_TRANSPORTE_SEM_ESPECIFICACAO',
                    'mensagem' => "Matrícula '{$matricula->codigo_matricula}' utiliza transporte escolar público mas possui pendências na especificação do veículo ou documentação.",
                    'entidade_tipo' => EducaEnrollment::class,
                    'entidade_id' => (string) $matricula->id,
                    'rota_correcao' => "/api/educa/secretaria/alunos/{$matricula->aluno_pessoa_id}/perfil",
                ];
            }
        }

        return $falhas;
    }
}
