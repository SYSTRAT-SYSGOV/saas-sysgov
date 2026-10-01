<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Jobs;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Modules\Requerimentos\Models\Notificacao;
use Modules\Requerimentos\Models\PreferenciaNotificacao;
use Modules\Requerimentos\Models\Proposicao;
use RuntimeException;

final class EnviarNotificacaoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly int $userId,
        public readonly string $evento,
        public readonly string $titulo,
        public readonly string $mensagem,
        public readonly string $canal = 'ambos',
        public readonly ?int $proposicaoId = null,
    ) {}

    public function handle(): void
    {
        // Job roda num worker de fila, fora de uma requisição HTTP — não há middleware
        // 'resolve.tenant' aqui, então o TenantContext precisa ser resolvido e definido à mão
        // (mesmo padrão do consumidor do Outbox: nunca assumir o contexto já presente num
        // worker, que pode ter sobrado de um job anterior no mesmo processo).
        $tenant = Tenant::findOrFail($this->resolverTenantId());

        $context = app(TenantContext::class);
        $contextoAnterior = $context->hasTenant() ? $context->get() : null;
        $context->set($tenant);

        try {
            // Respeita preferências de notificação do usuário
            $preferencias = PreferenciaNotificacao::where('user_id', $this->userId)->first();

            $canaisHabilitados = $preferencias
                ? $preferencias->getCanaisHabilitados()
                : [PreferenciaNotificacao::CANAL_EMAIL, PreferenciaNotificacao::CANAL_PORTAL];

            $canal = $this->canal === 'ambos' ? $canaisHabilitados : array_intersect($canaisHabilitados, [$this->canal]);

            foreach ((array) $canal as $c) {
                // Cria o registro de notificação (tenant_id vem do TenantContext acima, TenantAware).
                Notificacao::create([
                    'user_id'        => $this->userId,
                    'proposicao_id'  => $this->proposicaoId,
                    'evento'         => $this->evento,
                    'titulo'         => $this->titulo,
                    'mensagem'       => $this->mensagem,
                    'canal'          => $c,
                    'lida'           => false,
                    'enviada_em'     => now(),
                ]);

                // TODO: Enviar e-mail quando o canal for 'email'
                // Mail::to($user->email)->queue(new NotificacaoMail($this->titulo, $this->mensagem));
            }
        } finally {
            $contextoAnterior !== null ? $context->set($contextoAnterior) : $context->clear();
        }
    }

    /**
     * Toda notificação hoje nasce de um evento ligado a uma proposição, e é dela que vem o
     * tenant de verdade (nunca de um "tenant atual" do usuário — o usuário pode ter vínculo com
     * vários órgãos, não existe "o" tenant de uma pessoa fora de uma requisição). Se um disparo
     * futuro precisar notificar sem proposição associada, quem chama precisa passar o tenant
     * explicitamente — adivinhar (como o `?? 1` antigo fazia) grava a notificação no órgão
     * errado.
     */
    private function resolverTenantId(): int
    {
        if ($this->proposicaoId !== null) {
            $proposicao = Proposicao::find($this->proposicaoId);
            if ($proposicao !== null) {
                return $proposicao->tenant_id;
            }
        }

        throw new RuntimeException(
            "Não foi possível determinar o tenant da notificação (usuário #{$this->userId}, evento \"{$this->evento}\"): nenhuma proposição associada para resolver o órgão.",
        );
    }
}