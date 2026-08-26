<?php

declare(strict_types=1);

namespace Modules\Procurement\Services;

use DomainException;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoArtefato;
use Modules\Procurement\Models\LicitacaoParecer;
use Modules\Procurement\Models\LicitacaoPreco;

final class ProcurementFlowService
{
    /**
     * Valida os pré-requisitos sequenciais para criação ou aprovação de artefatos (RN-002)
     */
    public function validateArtifactPrerequisites(Licitacao $licitacao, string $targetArtifactType): void
    {
        switch ($targetArtifactType) {
            case 'etp':
                // RN-002: ETP exige DFD aprovado
                $hasApprovedDfd = LicitacaoArtefato::query()
                    ->where('licitacao_id', $licitacao->id)
                    ->where('tipo', 'dfd')
                    ->where('status', 'aprovado')
                    ->exists();

                if (!$hasApprovedDfd) {
                    throw new DomainException('RN-002: A elaboração do Estudo Técnico Preliminar (ETP) exige um Documento de Formalização de Demanda (DFD) previamente aprovado.');
                }
                break;

            case 'pesquisa_mercado':
                // Pesquisa de mercado exige ETP em elaboração ou aprovado
                $hasEtp = LicitacaoArtefato::query()
                    ->where('licitacao_id', $licitacao->id)
                    ->where('tipo', 'etp')
                    ->exists();

                if (!$hasEtp) {
                    throw new DomainException('A pesquisa de mercado requer a existência de um ETP vinculado ao processo.');
                }
                break;

            case 'tr':
                // RN-002: TR/PB exige Mapa de Preços homologado com fontes válidas
                $validPricesCount = LicitacaoPreco::query()
                    ->where('licitacao_id', $licitacao->id)
                    ->where('status', 'valida')
                    ->count();

                if ($validPricesCount < (int) config('procurement.market_research.min_sources', 3)) {
                    throw new DomainException("RN-002: A elaboração do Termo de Referência (TR) exige um Mapa de Preços consolidado com no mínimo " . config('procurement.market_research.min_sources', 3) . " fontes válidas.");
                }
                break;

            case 'parecer':
                // Parecer jurídico exige TR aprovado
                $hasApprovedTr = LicitacaoArtefato::query()
                    ->where('licitacao_id', $licitacao->id)
                    ->where('tipo', 'tr')
                    ->where('status', 'aprovado')
                    ->exists();

                if (!$hasApprovedTr) {
                    throw new DomainException('A emissão do Parecer Jurídico exige o Termo de Referência (TR) previamente aprovado.');
                }
                break;
        }
    }

    /**
     * Valida se a licitação pode ser publicada (Fase Interna Concluída)
     */
    public function validateCanPublish(Licitacao $licitacao): void
    {
        // 1. Deve possuir DFD, ETP e TR aprovados
        $requiredTypes = ['dfd', 'etp', 'tr'];
        foreach ($requiredTypes as $type) {
            $approved = LicitacaoArtefato::query()
                ->where('licitacao_id', $licitacao->id)
                ->where('tipo', $type)
                ->where('status', 'aprovado')
                ->exists();

            if (!$approved) {
                throw new DomainException("O processo licitatório não pode ser publicado sem a aprovação formal do artefato: " . strtoupper($type));
            }
        }

        // 2. Deve possuir no mínimo 3 fontes de preços válidas
        $validPrices = LicitacaoPreco::query()
            ->where('licitacao_id', $licitacao->id)
            ->where('status', 'valida')
            ->count();

        if ($validPrices < 3) {
            throw new DomainException('O processo licitatório exige no mínimo 3 fontes de preços válidas para publicação do edital.');
        }

        // 3. Deve possuir Parecer Jurídico favorável ou com ressalvas aprovado
        $hasApprovedLegalOpinion = LicitacaoParecer::query()
            ->where('licitacao_id', $licitacao->id)
            ->where('tipo', 'juridico')
            ->whereIn('conclusao', ['favoravel', 'com_ressalvas'])
            ->where('status', 'aprovado')
            ->exists();

        if (!$hasApprovedLegalOpinion) {
            throw new DomainException('A publicação do edital exige a emissão e aprovação prévia do Parecer Jurídico (Art. 53 da Lei 14.133/2021).');
        }

        // 4. Deve possuir data de abertura definida
        if (empty($licitacao->data_abertura)) {
            throw new DomainException('A licitação deve possuir data e horário de abertura definidos para publicação.');
        }
    }
}
