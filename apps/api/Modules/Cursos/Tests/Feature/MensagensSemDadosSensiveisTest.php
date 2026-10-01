<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\CampoInscricao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Services\CertificadoService;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 5.4 — nenhuma mensagem do Cursos vaza senha, nota ou resposta de terceiros (design D3:
 * "conteúdo só com o necessário... sem senha, sem notas"). Um único cenário gera pelo menos um
 * evento de cada tipo registrado em `config('notificacoes.cursos.*')`, com uma senha, uma nota e
 * uma resposta de formulário "marcadas" (strings bem distintas, improváveis de aparecer à toa) —
 * o teste percorre TODOS os eventos publicados e renderiza a mensagem de cada um.
 */
final class MensagensSemDadosSensiveisTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private const string SENHA_SECRETA = 'SenhaSecretaXPTO987@';

    private const string NOTA_SECRETA = '9.73';

    private const string RESPOSTA_SECRETA = 'RESPOSTA-CONFIDENCIAL-DE-TERCEIRO-QWERTY';

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    private Curso $curso;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->tenant->update(['settings' => ['cursos' => ['publico_habilitado' => true]]]);
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Gestão de Contratos']);
    }

    public function test_cenario_nenhuma_mensagem_vaza_senha_nota_ou_resposta_de_terceiros(): void
    {
        // cursos.CadastroExternoCriado — a senha do formulário nunca pode ir pro e-mail.
        $this->postJson("/api/public/cursos/{$this->tenant->slug}/cadastro", [
            'nome' => 'Externo Sigiloso', 'email' => 'externo@fora.gov.br',
            'senha' => self::SENHA_SECRETA, 'senha_confirmation' => self::SENHA_SECRETA,
            'documento' => null, 'aceite' => true,
        ])->assertOk();

        // Campo de formulário com uma resposta "marcada", de um participante que não é o alvo de
        // nenhuma outra mensagem deste teste — se ela aparecer em QUALQUER mensagem, vazou.
        $campoId = $this->como($this->admin, $this->tenant)
            ->postJson("/api/cursos/cursos/{$this->curso->id}/campos-inscricao", ['rotulo' => 'Observação', 'tipo' => 'texto'])
            ->assertCreated()->json('id');

        $turmaComVaga = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, ['vagas' => 1]);
        $terceiro = $this->usuario($this->tenant, ['participante_cursos'], 'Terceiro Sigiloso');
        $this->como($terceiro, $this->tenant)->postJson("/api/cursos/turmas/{$turmaComVaga->id}/inscricoes", [
            'respostas' => [['campo_id' => $campoId, 'valor' => self::RESPOSTA_SECRETA]],
        ])->assertCreated(); // cursos.InscricaoCriada (confirmada)
        $this->noTenant($this->tenant, fn () => Inscricao::where('participante_id', Participante::where('user_id', $terceiro->id)->sole()->id)
            ->sole()->update(['nota_apurada' => self::NOTA_SECRETA]));

        // cursos.InscricaoCriada (pendente) + cursos.InscricaoAprovada
        $turmaAprovacaoManual = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, ['aprovacao_manual' => true]);
        $paraAprovar = $this->usuario($this->tenant, ['participante_cursos'], 'Vai Ser Aprovado');
        $inscricaoParaAprovar = $this->inscrever($this->tenant, $turmaAprovacaoManual, $paraAprovar);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricaoParaAprovar->id}/aprovar")->assertOk();

        // cursos.InscricaoRecusada, com motivo
        $paraRecusar = $this->usuario($this->tenant, ['participante_cursos'], 'Vai Ser Recusado');
        $inscricaoParaRecusar = $this->inscrever($this->tenant, $turmaAprovacaoManual, $paraRecusar);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricaoParaRecusar->id}/recusar", ['motivo' => 'Fora do público-alvo'])->assertOk();

        // cursos.InscricaoCancelada + cursos.InscricaoPromovida (vaga liberada pro segundo da fila)
        $turmaFila = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, ['vagas' => 1]);
        $primeiro = $this->usuario($this->tenant, ['participante_cursos'], 'Primeiro Da Fila');
        $inscricaoPrimeiro = $this->inscrever($this->tenant, $turmaFila, $primeiro);
        $segundo = $this->usuario($this->tenant, ['participante_cursos'], 'Segundo Da Fila');
        $this->inscrever($this->tenant, $turmaFila, $segundo);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricaoPrimeiro->id}/cancelar", ['motivo' => 'Desistência'])->assertOk();

        // cursos.CertificadoEmitido
        $turmaCertificado = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor);
        $this->noTenant($this->tenant, function () use ($turmaCertificado): void {
            ModeloCertificado::create(['nome' => 'Padrão', 'titulo' => 'Certificado', 'corpo' => 'Certificamos que {{participante}} concluiu {{curso}}.', 'padrao' => true]);
            $participante = Participante::create(['nome' => 'Formado', 'email' => 'formado@teste.gov.br']);
            $inscricao = Inscricao::create(['turma_id' => $turmaCertificado->id, 'participante_id' => $participante->id, 'status' => 'concluida']);
            app(CertificadoService::class)->emitirParaInscricao($inscricao);
        });

        $eventos = OutboxEvent::where('event_type', 'like', 'cursos.%')->get();
        $tipos = $eventos->pluck('event_type')->unique();

        // Confere que o cenário realmente cobriu todos os tipos com tratador registrado —
        // senão o teste "passaria" sem ter testado nada.
        $tiposEsperados = collect((array) config('notificacoes.cursos'))->keys()->map(fn (string $t): string => "cursos.{$t}");
        foreach ($tiposEsperados as $tipoEsperado) {
            $this->assertTrue($tipos->contains($tipoEsperado), "Nenhum evento {$tipoEsperado} foi gerado neste cenário — o teste não cobre esse tratador.");
        }

        $mensagensRenderizadas = 0;
        foreach ($eventos as $evento) {
            /** @var list<class-string<\App\Notificacoes\Tratador>> $tratadores */
            $tratadores = config("notificacoes.{$evento->event_type}", []);
            foreach ($tratadores as $tratadorClasse) {
                foreach (app($tratadorClasse)->tratar($evento) as $mensagem) {
                    $html = $mensagem->mailable->render();
                    $mensagensRenderizadas++;

                    $this->assertStringNotContainsString(self::SENHA_SECRETA, $html, "{$evento->event_type}: a senha vazou pro e-mail.");
                    $this->assertStringNotContainsString(self::NOTA_SECRETA, $html, "{$evento->event_type}: a nota vazou pro e-mail.");
                    $this->assertStringNotContainsString(self::RESPOSTA_SECRETA, $html, "{$evento->event_type}: a resposta de outro participante vazou pro e-mail.");
                }
            }
        }

        $this->assertGreaterThanOrEqual($tiposEsperados->count(), $mensagensRenderizadas);
    }
}
