<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\NotificacaoEnvio;
use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Notificacoes\Tratadores\CertificadoEmitidoTratador;
use Modules\Cursos\Services\CertificadoService;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 5.3 — tratador de `cursos.CertificadoEmitido` (design D12): código e link de validação
 * pública, a mesma URL do QR code do PDF.
 */
final class CertificadoEmitidoTratadorTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $instrutor;

    private Curso $curso;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Gestão de Contratos']);
    }

    private function emitirCertificado(string $nomeAluno = 'Ana Souza'): Certificado
    {
        $turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor);

        return $this->noTenant($this->tenant, function () use ($turma, $nomeAluno): Certificado {
            ModeloCertificado::create([
                'nome' => 'Padrão', 'titulo' => 'Certificado',
                'corpo' => "Certificamos que {{participante}} concluiu {{curso}}.",
                'padrao' => true,
            ]);
            $participante = Participante::create(['nome' => $nomeAluno, 'email' => 'aluna@teste.gov.br']);
            $inscricao = Inscricao::create(['turma_id' => $turma->id, 'participante_id' => $participante->id, 'status' => 'concluida']);

            return app(CertificadoService::class)->emitirParaInscricao($inscricao);
        });
    }

    public function test_cenario_certificado_emitido_envia_email_com_codigo_e_link(): void
    {
        $certificado = $this->emitirCertificado();

        $this->artisan('outbox:process')->assertSuccessful();

        $envio = NotificacaoEnvio::sole();
        $this->assertSame('enviado', $envio->situacao);
        $this->assertSame('aluna@teste.gov.br', $envio->destinatario);
        $this->assertSame(CertificadoEmitidoTratador::TIPO, $envio->tipo);

        $evento = OutboxEvent::where('event_type', 'cursos.CertificadoEmitido')->sole();
        $mensagens = app(CertificadoEmitidoTratador::class)->tratar($evento);
        $html = $mensagens[0]->mailable->render();

        $this->assertStringContainsString('Ana Souza', $html);
        $this->assertStringContainsString('Gestão de Contratos', $html);
        $this->assertStringContainsString($certificado->codigoFormatado(), $html);
        $this->assertStringContainsString(CertificadoService::urlValidacao($certificado->codigo), $html);
    }

    public function test_certificado_revogado_antes_do_envio_nao_gera_mensagem(): void
    {
        $certificado = $this->emitirCertificado();
        $this->noTenant($this->tenant, fn () => $certificado->update(['revogado_em' => now(), 'motivo_revogacao' => 'Emitido por engano']));

        $evento = OutboxEvent::where('event_type', 'cursos.CertificadoEmitido')->sole();
        $mensagens = app(CertificadoEmitidoTratador::class)->tratar($evento);

        $this->assertSame([], $mensagens);
    }

    public function test_certificado_removido_nao_gera_mensagem(): void
    {
        $evento = OutboxEvent::create([
            'event_type' => 'cursos.CertificadoEmitido', 'event_version' => 1,
            'payload' => ['id' => 999999, 'codigo' => 'XXXXXXXXXXXX'], 'status' => 'pending', 'available_at' => now(),
            'tenant_id' => $this->tenant->id,
        ]);

        $mensagens = app(CertificadoEmitidoTratador::class)->tratar($evento);

        $this->assertSame([], $mensagens);
    }
}
