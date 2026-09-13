<?php

namespace Modules\Capd\Contracts;

/**
 * Interface para integração com sistemas de Gestão de RH.
 *
 * Implementações:
 *   - ManualHrAdapter   : dados lançados manualmente pelo DRH/chefia
 *   - IpmApiAdapter     : integração com sistema IPM municipal
 *   - TotvsHrAdapter    : integração com TOTVS RH (futuro)
 *   - SapHrAdapter      : integração com SAP HCM (futuro)
 *
 * Seleção do adapter: configuração por tenant no ciclo (modo_f1, modo_f2).
 */
interface HrAdapterInterface
{
    /**
     * Obtém dados de assiduidade (F1) para cálculo do grau.
     *
     * @param  int     $servidorId   ID interno do servidor
     * @param  int     $cicloId      ID do ciclo de avaliação
     * @param  string  $cpf          CPF do servidor (para integração externa)
     * @param  string  $dataInicio   Período de apuração (Y-m-d)
     * @param  string  $dataFim      Período de apuração (Y-m-d)
     *
     * @return AssiduacaoDados
     */
    public function obterAssiduidade(
        int    $servidorId,
        int    $cicloId,
        string $cpf,
        string $dataInicio,
        string $dataFim,
    ): AssiduacaoDados;

    /**
     * Obtém dados disciplinares (F2) para cálculo do grau.
     *
     * @return DisciplinaDados
     */
    public function obterDisciplina(
        int    $servidorId,
        int    $cicloId,
        string $cpf,
        string $dataInicio,
        string $dataFim,
    ): DisciplinaDados;

    /** Identificador do adapter (ex: 'manual', 'ipm', 'totvs'). */
    public function identificador(): string;
}
