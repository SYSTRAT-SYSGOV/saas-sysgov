<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Str;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\MeioAmbienteIntegracao;

final class IntegracaoMeioAmbienteService
{
    /** Tipo do evento de Outbox consumido por `EnviarParaOrgaoControleListener`. */
    public const EVENTO_ENVIO_AUTO_INFRACAO = 'meio_ambiente.integracao.enviar_auto_infracao';

    public function __construct(
        private AuditLogger $audit,
        private OutboxPublisher $outbox,
    ) {}

    /**
     * Cria a credencial. A chave em texto puro só existe neste retorno — no banco fica só
     * o hash; perdeu a chave, gera outra.
     *
     * @param array{nome: string, orgao: string, envio_url?: string|null, envio_token?: string|null} $dados
     *
     * @return array{integracao: MeioAmbienteIntegracao, api_key: string}
     */
    public function criar(array $dados): array
    {
        $apiKey = MeioAmbienteIntegracao::PREFIXO_CHAVE . Str::random(40);

        $integracao = MeioAmbienteIntegracao::create([
            'nome' => $dados['nome'],
            'orgao' => $dados['orgao'],
            'api_key_hash' => MeioAmbienteIntegracao::hashDaChave($apiKey),
            'api_key_prefixo' => substr($apiKey, 0, 12),
            'is_active' => true,
            'envio_url' => $dados['envio_url'] ?? null,
            'envio_token' => $dados['envio_token'] ?? null,
        ]);
        $this->audit->record('meio_ambiente', 'integracao.criada', "MeioAmbienteIntegracao #{$integracao->id}", null, $integracao->toArray());

        return ['integracao' => $integracao, 'api_key' => $apiKey];
    }

    /** Revoga a credencial (soft — mantém o histórico, só desativa acesso e envio). */
    public function revogar(MeioAmbienteIntegracao $integracao): MeioAmbienteIntegracao
    {
        $antes = $integracao->toArray();
        $integracao->update(['is_active' => false]);
        $this->audit->record('meio_ambiente', 'integracao.revogada', "MeioAmbienteIntegracao #{$integracao->id}", $antes, $integracao->toArray());

        return $integracao;
    }

    /**
     * Credencial ativa correspondente à chave apresentada, em qualquer tenant — é a
     * própria credencial que define o tenant da requisição M2M.
     */
    public function resolverPorChave(string $apiKey): ?MeioAmbienteIntegracao
    {
        return MeioAmbienteIntegracao::withoutGlobalScopes()
            ->where('api_key_hash', MeioAmbienteIntegracao::hashDaChave($apiKey))
            ->where('is_active', true)
            ->first();
    }

    public function registrarUso(MeioAmbienteIntegracao $integracao): void
    {
        $integracao->update(['ultimo_uso_em' => now()]);
    }

    /**
     * Agenda o envio ativo do auto de infração a cada órgão do tenant que exige push.
     * Nunca chama o órgão aqui: só grava na Outbox (`outbox:process` entrega, e reagenda
     * com backoff se o órgão estiver fora do ar) — a emissão do auto pelo fiscal não
     * espera nem falha por causa do órgão destinatário.
     */
    public function agendarEnvioAutoInfracao(AutoInfracaoAmbiental $auto): void
    {
        MeioAmbienteIntegracao::query()
            ->where('is_active', true)
            ->whereNotNull('envio_url')
            ->pluck('id')
            ->each(fn (int $integracaoId) => $this->outbox->publish(self::EVENTO_ENVIO_AUTO_INFRACAO, [
                'integracao_id' => $integracaoId,
                'auto_infracao_id' => $auto->id,
            ], $auto->tenant_id));
    }
}
