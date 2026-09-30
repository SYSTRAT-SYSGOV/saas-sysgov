<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\CampoInscricao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 4.5 — CSV de inscritos com origem e colunas do formulário, fórmula neutralizada em toda
 * célula de texto (design D13).
 */
final class ExportacaoFormularioInscricaoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    private Curso $curso;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->curso = $this->cursoPublicado($this->tenant);
        $this->turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor);
    }

    /** @param array<string, mixed> $sobrescrever */
    private function criarCampo(array $sobrescrever = []): CampoInscricao
    {
        $id = $this->como($this->admin, $this->tenant)
            ->postJson("/api/cursos/cursos/{$this->curso->id}/campos-inscricao", ['rotulo' => 'Alergia', 'tipo' => 'texto', ...$sobrescrever])
            ->assertCreated()->json('id');

        return $this->noTenant($this->tenant, fn () => CampoInscricao::findOrFail($id));
    }

    private function inscrever(string $nome, mixed $valorCampo, ?CampoInscricao $campo): void
    {
        $user = $this->usuario($this->tenant, ['participante_cursos'], $nome);
        $respostas = $campo !== null && $valorCampo !== null ? [['campo_id' => $campo->id, 'valor' => $valorCampo]] : [];

        $this->como($user, $this->tenant)
            ->postJson("/api/cursos/turmas/{$this->turma->id}/inscricoes", ['respostas' => $respostas])
            ->assertCreated();
    }

    /** @return list<string> */
    private function linhasCsv(): array
    {
        $csv = $this->como($this->instrutor, $this->tenant)->get("/api/cursos/turmas/{$this->turma->id}/inscricoes/exportar")->streamedContent();

        return array_values(array_filter(explode("\n", trim(substr($csv, 3)))));
    }

    public function test_cenario_exportacao_da_turma_com_origem_e_coluna_do_formulario(): void
    {
        $campo = $this->criarCampo(['rotulo' => 'Restrição alimentar']);
        $this->inscrever('Ana Servidora', 'Sem restrição', $campo);

        $linhas = $this->linhasCsv();

        $this->assertSame('Nome;E-mail;Origem;Status;"Data da inscrição";"Frequência até o momento (%)";"Restrição alimentar"', $linhas[0]);
        $this->assertStringContainsString('Ana Servidora', $linhas[1]);
        $this->assertStringContainsString('Servidor', $linhas[1]);
        $this->assertStringContainsString('Sem restrição', $linhas[1]);
    }

    /** Coluna só aparece se ALGUÉM da turma respondeu; quem deixou em branco sai com célula vazia. */
    public function test_inscrito_sem_resposta_ao_campo_opcional_sai_com_celula_vazia(): void
    {
        $campo = $this->criarCampo(['rotulo' => 'Restrição alimentar', 'obrigatorio' => false]);
        $this->inscrever('Ana Respondeu', 'Vegana', $campo);
        $this->inscrever('Bruno Em Branco', null, $campo);

        $linhas = array_slice($this->linhasCsv(), 1);
        $porNome = collect($linhas)->keyBy(fn (string $l): string => str_contains($l, 'Ana') ? 'ana' : 'bruno');

        $this->assertStringContainsString('Vegana', $porNome['ana']);
        $this->assertStringEndsWith(';', $porNome['bruno']);
    }

    public function test_sem_nenhum_campo_configurado_nao_aparece_coluna_extra(): void
    {
        $this->inscrever('Ana Servidora', null, null);

        $linhas = $this->linhasCsv();

        $this->assertSame('Nome;E-mail;Origem;Status;"Data da inscrição";"Frequência até o momento (%)"', $linhas[0]);
    }

    public function test_campo_desativado_depois_da_resposta_continua_saindo_na_exportacao(): void
    {
        $campo = $this->criarCampo(['rotulo' => 'Restrição alimentar']);
        $this->inscrever('Ana Servidora', 'Vegana', $campo);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/campos-inscricao/{$campo->id}/desativar")->assertOk();

        $linhas = $this->linhasCsv();

        $this->assertStringContainsString('Restrição alimentar', $linhas[0]);
        $this->assertStringContainsString('Vegana', $linhas[1]);
    }

    /** Cenário "Resposta que começa com fórmula" (design D13). */
    public function test_cenario_resposta_que_comeca_com_formula(): void
    {
        $campo = $this->criarCampo(['rotulo' => 'Observação']);
        $this->inscrever('Ana Servidora', '=cmd|calc', $campo);

        $csv = $this->como($this->instrutor, $this->tenant)->get("/api/cursos/turmas/{$this->turma->id}/inscricoes/exportar")->streamedContent();

        $this->assertStringContainsString("'=cmd|calc", $csv);
        $this->assertStringNotContainsString(';=cmd|calc', $csv);
    }

    public function test_participante_externo_aparece_com_origem_externo(): void
    {
        $this->tenant->update(['settings' => ['cursos' => ['publico_habilitado' => true]]]);
        $this->postJson("/api/public/cursos/{$this->tenant->slug}/cadastro", [
            'nome' => 'Beto Externo', 'email' => 'beto@fora.gov.br',
            'senha' => 'Senha@123', 'senha_confirmation' => 'Senha@123', 'aceite' => true,
        ])->assertOk();

        $externo = User::where('email', 'beto@fora.gov.br')->sole();
        // Ativa o vínculo direto no banco pra não depender do fluxo de verificação de e-mail (fora do escopo desta tarefa).
        $this->noTenant($this->tenant, function () use ($externo): void {
            \Illuminate\Support\Facades\DB::table('tenant_user')->where('user_id', $externo->id)->where('tenant_id', $this->tenant->id)->update(['status' => 'active']);
        });
        $this->turma->update(['aceita_externos' => true]);

        $this->como($externo, $this->tenant)->postJson("/api/cursos/turmas/{$this->turma->id}/inscricoes", [])->assertCreated();

        $linhas = $this->linhasCsv();
        $this->assertStringContainsString('Beto Externo', $linhas[1]);
        $this->assertStringContainsString('Externo', $linhas[1]);
    }
}
