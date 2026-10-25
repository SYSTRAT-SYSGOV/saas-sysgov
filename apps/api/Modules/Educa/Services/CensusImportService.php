<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Educa\Models\EducaCensusInepLog;
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaStudentProfile;

/**
 * Serviço de Importação e Conciliação do Arquivo de Retorno do Educacenso (INEP/MEC).
 */
final class CensusImportService
{
    /**
     * Processa o arquivo de retorno oficial do INEP para atualização de códigos.
     *
     * @return array{
     *     total_processados: int,
     *     total_conciliados: int,
     *     total_divergencias: int,
     *     detalhes: array<int, EducaCensusInepLog>
     * }
     */
    public function importar(
        int $tenantId,
        string $schoolId,
        string $academicYearId,
        UploadedFile|string $arquivo
    ): array {
        $conteudo = is_string($arquivo)
            ? (file_exists($arquivo) ? file_get_contents($arquivo) : $arquivo)
            : $arquivo->get();

        if (empty($conteudo)) {
            throw ValidationException::withMessages([
                'arquivo' => ['O arquivo de retorno do INEP está vazio ou não pôde ser lido.'],
            ]);
        }

        // Converte codificação ISO-8859-1 para UTF-8 caso necessário
        if (!mb_check_encoding($conteudo, 'UTF-8')) {
            $conteudo = mb_convert_encoding($conteudo, 'UTF-8', 'ISO-8859-1');
        }

        $linhas = preg_split("/\r\n|\n|\r/", trim($conteudo));
        if (empty($linhas) || !str_contains($linhas[0], '|')) {
            throw ValidationException::withMessages([
                'arquivo' => ['O formato do arquivo de retorno do INEP não é reconhecido (delimitador esperado: pipe).'],
            ]);
        }

        return DB::transaction(function () use ($tenantId, $schoolId, $academicYearId, $linhas) {
            $totalProcessados = 0;
            $totalConciliados = 0;
            $totalDivergencias = 0;
            $logs = [];

            foreach ($linhas as $linha) {
                $linha = trim($linha);
                if ($linha === '' || $linha === '99|') {
                    continue;
                }

                $campos = explode('|', $linha);
                $tipoRegistro = $campos[0] ?? '';
                $totalProcessados++;

                switch ($tipoRegistro) {
                    case '00': // Escola
                        $codigoInepEscola = $campos[1] ?? '';
                        if (preg_match('/^\d{8}$/', $codigoInepEscola)) {
                            EducaSchool::query()
                                ->where('tenant_id', $tenantId)
                                ->where('id', $schoolId)
                                ->update(['codigo_inep' => $codigoInepEscola]);

                            $totalConciliados++;
                            $logs[] = EducaCensusInepLog::create([
                                'tenant_id' => $tenantId,
                                'school_id' => $schoolId,
                                'academic_year_id' => $academicYearId,
                                'tipo_registro' => '00',
                                'entidade_tipo' => EducaSchool::class,
                                'entidade_id' => $schoolId,
                                'codigo_inep' => $codigoInepEscola,
                                'status' => EducaCensusInepLog::STATUS_CONCILIADO,
                                'mensagem' => 'Código INEP da escola conciliado com sucesso.',
                            ]);
                        } else {
                            $totalDivergencias++;
                            $logs[] = EducaCensusInepLog::create([
                                'tenant_id' => $tenantId,
                                'school_id' => $schoolId,
                                'academic_year_id' => $academicYearId,
                                'tipo_registro' => '00',
                                'entidade_tipo' => EducaSchool::class,
                                'entidade_id' => $schoolId,
                                'codigo_inep' => $codigoInepEscola,
                                'status' => EducaCensusInepLog::STATUS_DIVERGENTE,
                                'mensagem' => 'Código INEP da escola com formato inválido no arquivo de retorno.',
                            ]);
                        }
                        break;

                    case '20': // Turma
                        $codigoLocalTurma = $campos[2] ?? '';
                        $codigoInepTurma = $campos[3] ?? '';

                        $turma = EducaSchoolClass::query()
                            ->where('tenant_id', $tenantId)
                            ->where('school_id', $schoolId)
                            ->where('academic_year_id', $academicYearId)
                            ->where(function ($q) use ($codigoLocalTurma) {
                                $q->where('codigo', $codigoLocalTurma)
                                  ->orWhere('id', $codigoLocalTurma);
                            })
                            ->first();

                        if ($turma && !empty($codigoInepTurma)) {
                            $totalConciliados++;
                            $logs[] = EducaCensusInepLog::create([
                                'tenant_id' => $tenantId,
                                'school_id' => $schoolId,
                                'academic_year_id' => $academicYearId,
                                'tipo_registro' => '20',
                                'entidade_tipo' => EducaSchoolClass::class,
                                'entidade_id' => (string) $turma->id,
                                'codigo_inep' => $codigoInepTurma,
                                'status' => EducaCensusInepLog::STATUS_CONCILIADO,
                                'mensagem' => "Turma '{$turma->nome}' conciliada com código INEP {$codigoInepTurma}.",
                            ]);
                        } else {
                            $totalDivergencias++;
                            $logs[] = EducaCensusInepLog::create([
                                'tenant_id' => $tenantId,
                                'school_id' => $schoolId,
                                'academic_year_id' => $academicYearId,
                                'tipo_registro' => '20',
                                'entidade_tipo' => EducaSchoolClass::class,
                                'entidade_id' => $codigoLocalTurma,
                                'codigo_inep' => $codigoInepTurma,
                                'status' => EducaCensusInepLog::STATUS_DIVERGENTE,
                                'mensagem' => 'Turma não localizada na base de dados para o ano letivo correspondente.',
                            ]);
                        }
                        break;

                    case '30': // Docente ou Aluno
                    case '60': // Matrícula / Aluno
                        $pessoaId = (int) ($campos[3] ?? 0);
                        $codigoInepPessoa = $campos[4] ?? ($campos[3] ?? '');

                        // Tenta conciliar como aluno
                        $perfil = EducaStudentProfile::query()
                            ->where('tenant_id', $tenantId)
                            ->where('pessoa_id', $pessoaId)
                            ->first();

                        if ($perfil && !empty($codigoInepPessoa)) {
                            $totalConciliados++;
                            $logs[] = EducaCensusInepLog::create([
                                'tenant_id' => $tenantId,
                                'school_id' => $schoolId,
                                'academic_year_id' => $academicYearId,
                                'tipo_registro' => $tipoRegistro,
                                'entidade_tipo' => EducaStudentProfile::class,
                                'entidade_id' => (string) $perfil->id,
                                'codigo_inep' => $codigoInepPessoa,
                                'status' => EducaCensusInepLog::STATUS_CONCILIADO,
                                'mensagem' => "Perfil do aluno conciliado com código INEP {$codigoInepPessoa}.",
                            ]);
                            break;
                        }

                        // Tenta conciliar como docente
                        $servidor = EducaEmployee::query()
                            ->where('tenant_id', $tenantId)
                            ->where('pessoa_id', $pessoaId)
                            ->first();

                        if ($servidor && !empty($codigoInepPessoa)) {
                            $servidor->update(['codigo_inep_docente' => $codigoInepPessoa]);
                            $totalConciliados++;
                            $logs[] = EducaCensusInepLog::create([
                                'tenant_id' => $tenantId,
                                'school_id' => $schoolId,
                                'academic_year_id' => $academicYearId,
                                'tipo_registro' => $tipoRegistro,
                                'entidade_tipo' => EducaEmployee::class,
                                'entidade_id' => (string) $servidor->id,
                                'codigo_inep' => $codigoInepPessoa,
                                'status' => EducaCensusInepLog::STATUS_CONCILIADO,
                                'mensagem' => "Docente conciliado com código INEP {$codigoInepPessoa}.",
                            ]);
                            break;
                        }

                        // Se não encontrou nenhuma correspondência inequívoca
                        $totalDivergencias++;
                        $logs[] = EducaCensusInepLog::create([
                            'tenant_id' => $tenantId,
                            'school_id' => $schoolId,
                            'academic_year_id' => $academicYearId,
                            'tipo_registro' => $tipoRegistro,
                            'entidade_tipo' => 'Pessoa',
                            'entidade_id' => (string) $pessoaId,
                            'codigo_inep' => $codigoInepPessoa,
                            'status' => EducaCensusInepLog::STATUS_DIVERGENTE,
                            'mensagem' => 'Registro de pessoa não localizado para vinculação do código INEP.',
                        ]);
                        break;

                    default:
                        // Demais registros ignorados sem erro fatal
                        break;
                }
            }

            return [
                'total_processados' => $totalProcessados,
                'total_conciliados' => $totalConciliados,
                'total_divergencias' => $totalDivergencias,
                'detalhes' => $logs,
            ];
        });
    }
}
