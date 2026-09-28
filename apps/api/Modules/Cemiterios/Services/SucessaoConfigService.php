<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Illuminate\Support\Facades\Config;
use Modules\Cemiterios\Support\Parentesco;
use Modules\Cemiterios\Support\TipoDocumentoSucessao;
use Modules\Cemiterios\Support\ViaSucessao;

/**
 * Serviço para carregamento de configuração de sucessão por tenant.
 */
final class SucessaoConfigService
{
    private const DEFAULTS = [
        'ordem_prioridade' => [
            Parentesco::Companheiro->value,
            Parentesco::Filho->value,
            Parentesco::Pai->value,
            Parentesco::Mae->value,
            Parentesco::Irmao->value,
            Parentesco::Neto->value,
            Parentesco::Avo->value,
            Parentesco::Tio->value,
            Parentesco::Sobrinho->value,
            Parentesco::Outro->value,
        ],
        'prazo_regularizacao_dias' => 120,
        'documentos_por_via' => [
            ViaSucessao::InventarioJudicial->value => [
                TipoDocumentoSucessao::CertidaoObito->value,
                TipoDocumentoSucessao::Inventario->value,
                TipoDocumentoSucessao::FormalPartilha->value,
                TipoDocumentoSucessao::Alvará->value,
            ],
            ViaSucessao::InventarioExtrajudicial->value => [
                TipoDocumentoSucessao::CertidaoObito->value,
                TipoDocumentoSucessao::Escritura->value,
            ],
            ViaSucessao::AlvaráJudicial->value => [
                TipoDocumentoSucessao::CertidaoObito->value,
                TipoDocumentoSucessao::Alvará->value,
            ],
            ViaSucessao::Arrolamento->value => [
                TipoDocumentoSucessao::CertidaoObito->value,
                TipoDocumentoSucessao::Outro->value, // termo_arrolamento
                TipoDocumentoSucessao::Alvará->value,
            ],
        ],
        'direito_representacao_habilitado' => true,
        'base_legal' => '[LEI/DECRETO MUNICIPAL DE SUCESSÃO DE JAZIGOS — CONFIRMAR]',
        'retencao_documentos_dias' => 3650, // 10 anos
        'notificacao_antecedencia_dias' => [30, 7, 1],
    ];

    /**
     * Obtém a configuração de sucessão para o tenant atual.
     *
     * @return array{
     *     ordem_prioridade: list<string>,
     *     prazo_regularizacao_dias: int,
     *     documentos_por_via: array<string, list<string>>,
     *     direito_representacao_habilitado: bool,
     *     base_legal: string,
     *     retencao_documentos_dias: int,
     *     notificacao_antecedencia_dias: list<int>
     * }
     */
    public function getConfig(): array
    {
        $tenantConfig = Config::get('cemiterios.sucessao', []);

        return array_merge(self::DEFAULTS, $tenantConfig);
    }

    /**
     * Obtém a ordem de prioridade dos parentescos.
     *
     * @return list<Parentesco>
     */
    public function getOrdemPrioridade(): array
    {
        $config = $this->getConfig();
        return array_map(fn (string $p) => Parentesco::tryFrom($p) ?? Parentesco::Outro, $config['ordem_prioridade']);
    }

    /**
     * Obtém o prazo de regularização em dias.
     */
    public function getPrazoRegularizacaoDias(): int
    {
        return (int) ($this->getConfig()['prazo_regularizacao_dias'] ?? 120);
    }

    /**
     * Obtém os documentos obrigatórios por via.
     *
     * @return array<string, list<TipoDocumentoSucessao>>
     */
    public function getDocumentosPorVia(): array
    {
        $config = $this->getConfig();
        $resultado = [];

        foreach ($config['documentos_por_via'] as $via => $docs) {
            $resultado[$via] = array_map(
                fn (string $d) => TipoDocumentoSucessao::tryFrom($d) ?? TipoDocumentoSucessao::Outro,
                $docs
            );
        }

        return $resultado;
    }

    /**
     * Verifica se o direito de representação está habilitado.
     */
    public function isDireitoRepresentacaoHabilitado(): bool
    {
        return (bool) ($this->getConfig()['direito_representacao_habilitado'] ?? true);
    }

    /**
     * Obtém a base legal.
     */
    public function getBaseLegal(): string
    {
        return (string) ($this->getConfig()['base_legal'] ?? '[LEI/DECRETO MUNICIPAL DE SUCESSÃO DE JAZIGOS — CONFIRMAR]');
    }

    /**
     * Obtém o período de retenção de documentos em dias.
     */
    public function getRetencaoDocumentosDias(): int
    {
        return (int) ($this->getConfig()['retencao_documentos_dias'] ?? 3650);
    }

    /**
     * Obtém os dias de antecedência para notificações.
     *
     * @return list<int>
     */
    public function getNotificacaoAntecedenciaDias(): array
    {
        return (array) ($this->getConfig()['notificacao_antecedencia_dias'] ?? [30, 7, 1]);
    }
}