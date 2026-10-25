<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use Illuminate\Support\Facades\Storage;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCensusExport;
use Modules\Educa\Models\EducaEmployeeAllocation;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;

/**
 * Motor de Exportação em Lote do Arquivo Posicional Oficial do Censo Escolar (INEP/MEC).
 */
final class CensusExportService
{
    /**
     * Gera o arquivo oficial do Censo Escolar para a exportação solicitada.
     *
     * @return array{
     *     export_id: string,
     *     total_linhas: int,
     *     checksum_sha256: string,
     *     arquivo_path: string
     * }
     */
    public function exportar(EducaCensusExport $export): array
    {
        $export->update(['status' => EducaCensusExport::STATUS_PROCESSANDO]);

        $escola = EducaSchool::query()
            ->where('id', $export->school_id)
            ->with(['orgUnit'])
            ->firstOrFail();

        $anoLetivo = EducaAcademicYear::query()
            ->where('id', $export->academic_year_id)
            ->firstOrFail();

        $isEscolaInativa = in_array(
            $escola->situacao_funcionamento,
            ['paralisada', 'extinta'],
            true
        );

        $linhas = [];

        // Registro 00: Identificação da Escola
        $linhas[] = $this->gerarRegistro00($escola, $anoLetivo);

        // Registro 10: Infraestrutura (apenas se a escola estiver ativa)
        if (!$isEscolaInativa) {
            $linhas[] = $this->gerarRegistro10($escola);
        }

        // Registro 20: Turmas (apenas se a escola estiver ativa)
        $turmas = EducaSchoolClass::query()
            ->where('school_id', $escola->id)
            ->where('academic_year_id', $anoLetivo->id)
            ->get();

        if (!$isEscolaInativa) {
            foreach ($turmas as $turma) {
                $linhas[] = $this->gerarRegistro20($escola, $turma);
            }
        }

        // Registro 30: Dados Pessoais (Gestores, Docentes e Alunos)
        $matriculas = EducaEnrollment::query()
            ->where('school_id', $escola->id)
            ->where('academic_year_id', $anoLetivo->id)
            ->where('status', EducaEnrollment::STATUS_ATIVA)
            ->with(['alunoPessoa', 'studentProfile', 'turmas'])
            ->get();

        $alocacoes = EducaEmployeeAllocation::query()
            ->where('school_id', $escola->id)
            ->where('academic_year_id', $anoLetivo->id)
            ->where('status', 'ativa')
            ->with(['employee.pessoa'])
            ->get();

        // 30 - Docentes e Gestores
        foreach ($alocacoes as $alocacao) {
            $pessoa = $alocacao->employee?->pessoa;
            if ($pessoa) {
                $linhas[] = $this->gerarRegistro30($escola, $pessoa, 'profissional');
            }
        }

        // 30 - Alunos (apenas se a escola estiver ativa ou matrículas presentes)
        if (!$isEscolaInativa) {
            foreach ($matriculas as $matricula) {
                $pessoa = $matricula->alunoPessoa;
                if ($pessoa) {
                    $linhas[] = $this->gerarRegistro30($escola, $pessoa, 'aluno');
                }
            }
        }

        // Registro 40: Gestão Escolar
        $linhas[] = $this->gerarRegistro40($escola);

        // Registro 50: Vínculos de Docência e Matriz (apenas se escola ativa)
        if (!$isEscolaInativa) {
            foreach ($alocacoes as $alocacao) {
                $servidor = $alocacao->employee;
                if ($servidor) {
                    foreach ($turmas as $turma) {
                        $linhas[] = $this->gerarRegistro50($escola, $turma, $servidor);
                    }
                }
            }
        }

        // Registro 60: Matrícula, AEE e Transporte Escolar (apenas se escola ativa)
        if (!$isEscolaInativa) {
            foreach ($matriculas as $matricula) {
                foreach ($matricula->turmas as $turma) {
                    $linhas[] = $this->gerarRegistro60($escola, $turma, $matricula);
                }
            }
        }

        // Registro 99: Fechamento Oficial do Arquivo
        $linhas[] = '99|';

        // Junção com quebra de linha CRLF padrão do validador do INEP
        $conteudoUtf8 = implode("\r\n", $linhas) . "\r\n";
        $conteudoIso = mb_convert_encoding($conteudoUtf8, 'ISO-8859-1', 'UTF-8');

        $checksumSha256 = hash('sha256', $conteudoIso);
        $relativeDir = "educa/census/{$export->tenant_id}";
        $filename = "censo_{$export->ano}_{$escola->codigo_inep}_{$export->id}.txt";
        $filePath = "{$relativeDir}/{$filename}";

        Storage::disk('local')->put($filePath, $conteudoIso);

        $totalLinhas = count($linhas);

        $export->update([
            'status' => EducaCensusExport::STATUS_CONCLUIDA,
            'total_linhas' => $totalLinhas,
            'checksum_sha256' => $checksumSha256,
            'arquivo_path' => $filePath,
        ]);

        return [
            'export_id' => (string) $export->id,
            'total_linhas' => $totalLinhas,
            'checksum_sha256' => $checksumSha256,
            'arquivo_path' => $filePath,
        ];
    }

    private function gerarRegistro00(EducaSchool $escola, EducaAcademicYear $anoLetivo): string
    {
        $campos = [
            '00',
            $escola->codigo_inep ?? '',
            $escola->situacao_funcionamento ?? '1',
            $escola->nome ?? '',
            $escola->dependencia_administrativa ?? '3', // 3=Municipal
            $escola->zona ?? '1', // 1=Urbana, 2=Rural
            // Campos privados de mantenedora suprimidos (nulos) para dependência municipal/estadual
            '', // categoria_escola_privada
            '', // cnpj_mantenedora_privada
            $anoLetivo->ano,
        ];

        return implode('|', $campos);
    }

    private function gerarRegistro10(EducaSchool $escola): string
    {
        $campos = [
            '10',
            $escola->codigo_inep ?? '',
            '1', // Agua tratada (1=Sim, 0=Nao)
            '1', // Energia publica
            '1', // Esgoto saneado
            '1', // Coleta periodica de lixo
            '1', // Acesso a internet banda larga
            '1', // Sala de diretoria
            '1', // Sala de professores
            '1', // Laboratorio de informatica
        ];

        return implode('|', $campos);
    }

    private function gerarRegistro20(EducaSchool $escola, EducaSchoolClass $turma): string
    {
        $campos = [
            '20',
            $escola->codigo_inep ?? '',
            $turma->codigo ?? (string) $turma->id,
            $turma->nome ?? '',
            $turma->turno ?? 'matutino',
            $turma->tipo_atendimento ?? 'regular',
            $turma->lotacao_maxima ?? 30,
            $turma->lotacao_efetiva ?? 0,
        ];

        return implode('|', $campos);
    }

    private function gerarRegistro30(EducaSchool $escola, mixed $pessoa, string $categoria): string
    {
        $campos = [
            '30',
            $escola->codigo_inep ?? '',
            $categoria === 'aluno' ? '1' : '2', // 1=Aluno, 2=Profissional
            (string) $pessoa->id,
            $pessoa->nome ?? '',
            $pessoa->documento ?? '', // CPF
            $pessoa->data_nascimento?->format('Ymd') ?? '',
            $pessoa->sexo ?? 'M',
            $pessoa->cor_raca ?? '0',
            $pessoa->nacionalidade ?? '1',
        ];

        return implode('|', $campos);
    }

    private function gerarRegistro40(EducaSchool $escola): string
    {
        $campos = [
            '40',
            $escola->codigo_inep ?? '',
            '1', // Cargo: Diretor escolar
            '1', // Provimento: Concurso público
        ];

        return implode('|', $campos);
    }

    private function gerarRegistro50(
        EducaSchool $escola,
        EducaSchoolClass $turma,
        mixed $servidor
    ): string {
        $campos = [
            '50',
            $escola->codigo_inep ?? '',
            $turma->codigo ?? (string) $turma->id,
            (string) $servidor->id,
            '1', // Docente titular
            '1', // Escolaridade superior completa
        ];

        return implode('|', $campos);
    }

    private function gerarRegistro60(
        EducaSchool $escola,
        EducaSchoolClass $turma,
        EducaEnrollment $matricula
    ): string {
        $perfil = $matricula->studentProfile;
        $usaTransporte = $perfil?->transporte_escolar_publico ? '1' : '0';

        $campos = [
            '60',
            $escola->codigo_inep ?? '',
            $turma->codigo ?? (string) $turma->id,
            (string) $matricula->aluno_pessoa_id,
            $matricula->codigo_matricula ?? '',
            $usaTransporte,
            $perfil?->necessidades_especiais ? '1' : '0',
        ];

        return implode('|', $campos);
    }
}
