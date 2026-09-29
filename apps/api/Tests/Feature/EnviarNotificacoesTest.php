<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\NotificacaoEnvio;
use App\Models\OutboxEvent;
use App\Notificacoes\Mensagem;
use App\Notificacoes\Tratador;
use App\Support\OutboxPublisher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Config;
use RuntimeException;
use Tests\TestCase;

/**
 * Ouvinte único do Outbox que envia e-mail (tarefa 1.4, design D1/D2). Usa o driver `mail.array`
 * (guarda a mensagem renderizada em memória, sem tentar conectar em nada) para que um Mailable
 * que lança em `build()` simule uma falha de envio de verdade, sem precisar de rede.
 */
final class EnviarNotificacoesTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Config::set('notificacoes.teste.evento', []);
        parent::tearDown();
    }

    /** @param list<Mensagem>|\Closure $mensagens */
    private function registrarTratador(array|\Closure $mensagens): void
    {
        $tratador = new class($mensagens) implements Tratador {
            public function __construct(private readonly array|\Closure $mensagens) {}

            public function tratar(OutboxEvent $evento): array
            {
                return $this->mensagens instanceof \Closure ? ($this->mensagens)($evento) : $this->mensagens;
            }
        };
        app()->instance($tratador::class, $tratador);
        Config::set('notificacoes.teste.evento', [$tratador::class]);
    }

    private function mailableOk(string $texto = 'conteúdo'): Mailable
    {
        return new class($texto) extends Mailable {
            public function __construct(private readonly string $texto) {}

            public function build(): static
            {
                return $this->subject('Assunto de teste')->html('<p>' . $this->texto . '</p>');
            }
        };
    }

    private function mailableQuebrado(): Mailable
    {
        return new class extends Mailable {
            public function build(): static
            {
                throw new RuntimeException('SMTP indisponível');
            }
        };
    }

    private function publicar(?int $tenantId = null): OutboxEvent
    {
        return app(OutboxPublisher::class)->publish('teste.evento', ['x' => 1], $tenantId);
    }

    public function test_email_enviado_depois_do_evento(): void
    {
        $this->registrarTratador([new Mensagem('boas_vindas', 'ana@teste.gov.br', $this->mailableOk())]);
        $evento = $this->publicar();

        $this->artisan('outbox:process')->assertSuccessful();

        $envio = NotificacaoEnvio::query()->sole();
        $this->assertSame('enviado', $envio->situacao);
        $this->assertSame('ana@teste.gov.br', $envio->destinatario);
        $this->assertNotNull($envio->enviado_em);
        $this->assertSame('done', $evento->fresh()->status);
    }

    public function test_tipo_sem_tratador_e_ignorado_e_o_evento_fica_done(): void
    {
        $evento = app(OutboxPublisher::class)->publish('tipo.sem.tratador', []);

        $this->artisan('outbox:process')->assertSuccessful();

        $this->assertSame('done', $evento->fresh()->status);
        $this->assertSame(0, NotificacaoEnvio::query()->count());
    }

    public function test_falha_temporaria_marca_falhou_e_reagenda_o_evento(): void
    {
        $this->registrarTratador([new Mensagem('boas_vindas', 'ana@teste.gov.br', $this->mailableQuebrado())]);
        $evento = $this->publicar();

        $this->artisan('outbox:process')->assertSuccessful();

        $envio = NotificacaoEnvio::query()->sole();
        $this->assertSame('falhou', $envio->situacao);
        $this->assertStringContainsString('SMTP indisponível', (string) $envio->erro);
        $this->assertSame('pending', $evento->fresh()->status);
        $this->assertSame(1, $evento->fresh()->attempts);
    }

    public function test_tentativas_esgotadas_marca_o_evento_como_failed(): void
    {
        $this->registrarTratador([new Mensagem('boas_vindas', 'ana@teste.gov.br', $this->mailableQuebrado())]);
        $evento = $this->publicar();

        for ($i = 0; $i < 5; $i++) {
            $this->artisan('outbox:process')->assertSuccessful();
            OutboxEvent::query()->whereKey($evento->event_id)->update(['available_at' => now()->subMinute()]);
        }

        $this->assertSame('failed', $evento->fresh()->status);
        $this->assertSame(5, $evento->fresh()->attempts);
        // A idempotência não gera uma linha nova por tentativa — continua a mesma, só com o erro atualizado.
        $this->assertSame(1, NotificacaoEnvio::query()->count());
    }

    public function test_evento_reprocessado_nao_reenvia_quem_ja_recebeu(): void
    {
        $this->registrarTratador([new Mensagem('boas_vindas', 'ana@teste.gov.br', $this->mailableOk())]);
        $evento = $this->publicar();
        $this->artisan('outbox:process')->assertSuccessful();
        $this->assertSame('enviado', NotificacaoEnvio::query()->sole()->situacao);

        // Simula o evento voltando a pending por qualquer motivo (ex.: reprocessamento manual).
        $envioAntes = NotificacaoEnvio::query()->sole();
        $evento->update(['status' => 'pending', 'available_at' => now()->subMinute()]);
        $this->artisan('outbox:process')->assertSuccessful();

        // Nem uma segunda linha nem uma nova tentativa: o envio nem chega a ser reexecutado.
        $this->assertSame(1, NotificacaoEnvio::query()->count());
        $this->assertSame($envioAntes->tentativas, NotificacaoEnvio::query()->sole()->tentativas);
    }

    public function test_falha_parcial_em_varios_destinatarios(): void
    {
        $this->registrarTratador([
            new Mensagem('boas_vindas', 'ana@teste.gov.br', $this->mailableOk()),
            new Mensagem('boas_vindas', 'bruno@teste.gov.br', $this->mailableQuebrado()),
        ]);
        $evento = $this->publicar();

        $this->artisan('outbox:process')->assertSuccessful();

        $porDestinatario = NotificacaoEnvio::query()->get()->keyBy('destinatario');
        $this->assertSame('enviado', $porDestinatario['ana@teste.gov.br']->situacao);
        $this->assertSame('falhou', $porDestinatario['bruno@teste.gov.br']->situacao);
        // O evento inteiro fica pendente por causa do bruno, mas a ana não é reenviada na próxima tentativa.
        $this->assertSame('pending', $evento->fresh()->status);
    }

    public function test_destinatario_sem_email_fica_ignorado_sem_tentar_enviar(): void
    {
        $this->registrarTratador([new Mensagem('boas_vindas', null, $this->mailableOk())]);
        $evento = $this->publicar();

        $this->artisan('outbox:process')->assertSuccessful();

        $envio = NotificacaoEnvio::query()->sole();
        $this->assertSame('ignorado', $envio->situacao);
        $this->assertNull($envio->destinatario);
        $this->assertSame('done', $evento->fresh()->status);
    }
}
