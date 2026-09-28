<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Modules\Admin\Models\Module;
use Modules\Cursos\Database\Seeders\CursosDadosDemonstracaoSeeder;
use Modules\Cursos\Models\AulaAgendamento;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\AvaliacaoQuestao;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Formacao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Material;
use Modules\Cursos\Models\Questao;
use Modules\Cursos\Models\Resposta;
use Modules\Cursos\Models\Tentativa;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Database\Seeders\CursosConteudoDemonstracaoSeeder;
use Modules\Cursos\Services\CorrecaoService;
use Modules\Cursos\Services\LiberacaoService;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;
use RuntimeException;

/**
 * O seeder de demonstração passa pelos Services reais: se uma regra mudar,
 * ele quebra aqui, e não só quando alguém for semear o ambiente local.
 */
final class CursosDadosDemonstracaoSeederTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Prefeitura Demo', 'slug' => 'pref-demo', 'type' => 'prefeitura', 'status' => 'active']);
        $admin = User::create(['name' => 'Administrador', 'email' => 'admin@demo.gov.br', 'password' => bcrypt('x')]);
        $this->tenant->users()->attach($admin->id, ['status' => 'active', 'is_primary' => true]);
        Module::create(['name' => 'Cursos e Formações', 'alias' => 'cursos', 'enabled' => true, 'monthly_fee_cents' => 0]);
        Storage::fake('local');
    }

    public function test_cria_um_cenario_para_cada_situacao_do_fluxo(): void
    {
        (new CursosDadosDemonstracaoSeeder())->run($this->tenant->id);

        $this->noTenant($this->tenant, function (): void {
            $this->assertSame(['publicado' => 3, 'rascunho' => 1], Curso::query()->pluck('status')->countBy()->sortKeys()->all());
            $this->assertSame(1, Formacao::count());
            $this->assertSame(['aberta' => 3, 'encerrada' => 1], Turma::query()->pluck('status')->countBy()->sortKeys()->all());

            $porStatus = Inscricao::query()->pluck('status')->countBy()->all();
            $this->assertSame(4, $porStatus['concluida']);
            $this->assertSame(1, $porStatus['nao_concluida']);
            $this->assertSame(2, $porStatus['lista_espera']);
            $this->assertSame(3, $porStatus['pendente']);

            $this->assertSame(4, Certificado::count());
            $this->assertTrue(AulaAgendamento::query()->where('inicio', '<=', now())->where('fim', '>=', now())->exists(), 'Deveria haver uma aula acontecendo agora para testar o QR.');
        });

        $this->assertTrue($this->tenant->users()->where('email', 'helena.duarte@demo.sysgov.local')->exists());
        $this->assertFalse(AuditLog::where('module', 'cursos')->whereNull('user_id')->exists(), 'Toda ação do seeder deveria ter autor na auditoria.');
    }

    public function test_cria_o_conteudo_da_fase_2_no_curso_de_contratos(): void
    {
        (new CursosDadosDemonstracaoSeeder())->run($this->tenant->id);

        $this->noTenant($this->tenant, function (): void {
            $curso = Curso::query()->where('titulo', CursosConteudoDemonstracaoSeeder::TITULO_CURSO)->firstOrFail();
            $this->assertSame('7.00', $curso->nota_minima);

            // Os quatro tipos de material, com um rascunho.
            $materiais = Material::query()->where('curso_id', $curso->id)->get();
            $this->assertSame(['arquivo' => 1, 'link' => 1, 'texto' => 4, 'video' => 1], $materiais->pluck('tipo')->countBy()->sortKeys()->all());
            $this->assertSame(6, $materiais->where('publicado', true)->count());
            $pdf = $materiais->firstWhere('tipo', 'arquivo');
            Storage::disk('local')->assertExists((string) $pdf->arquivo_path);
            $this->assertStringStartsWith('%PDF', (string) Storage::disk('local')->get((string) $pdf->arquivo_path));

            // Três avaliações publicadas: a de conhecimentos, o estudo de caso e a de recuperação (ainda não liberada).
            $avaliacoes = Avaliacao::query()->where('curso_id', $curso->id)->get();
            $this->assertSame(3, $avaliacoes->count());
            $this->assertSame(3, $avaliacoes->where('publicada', true)->count());
            $this->assertSame(5, Questao::query()->count());

            // Tentativas de exemplo: uma em cada estado.
            $this->assertSame(['aguardando_correcao' => 1, 'corrigida' => 1, 'em_andamento' => 1], Tentativa::query()->pluck('status')->countBy()->sortKeys()->all());
            $turma = Turma::query()->where('curso_id', $curso->id)->firstOrFail();
            $fila = app(CorrecaoService::class)->fila($turma);
            $this->assertCount(1, $fila);
            $this->assertSame('Carlos Menezes', $fila->first()->inscricao->participante->nome);

            // Fernanda: 2 de 3 nas objetivas + 1,5 de 2 na dissertativa = 3,5 de 5 → 7,00.
            $fernanda = Tentativa::query()->where('status', 'corrigida')->firstOrFail();
            $this->assertSame('7.00', $fernanda->nota);

            // Liberação: o material dos 30 dias e a prova de recuperação ainda estão bloqueados; o guia está liberado.
            $liberacao = app(LiberacaoService::class);
            $this->assertFalse($liberacao->liberado($materiais->firstWhere('titulo', 'Módulo avançado: aditivos e reequilíbrio'), $turma));
            $this->assertFalse($liberacao->liberado($materiais->firstWhere('titulo', 'Roteiro da aula 3'), $turma));
            $this->assertTrue($liberacao->liberado($materiais->firstWhere('titulo', 'Guia rápido do gestor e do fiscal'), $turma));
            $this->assertFalse($liberacao->liberado($avaliacoes->firstWhere('titulo', 'Prova de recuperação'), $turma));
            $this->assertTrue($liberacao->liberado($avaliacoes->firstWhere('titulo', 'Avaliação de conhecimentos'), $turma));
        });

        $this->assertFalse(AuditLog::where('module', 'cursos')->whereNull('user_id')->exists(), 'Toda ação do seeder deveria ter autor na auditoria.');
    }

    public function test_acrescenta_o_conteudo_a_um_ambiente_semeado_antes_da_fase_2_sem_duplicar(): void
    {
        (new CursosDadosDemonstracaoSeeder())->run($this->tenant->id);

        // Simula o ambiente da Fase 1: cursos, turmas e inscrições, mas sem materiais nem avaliações.
        $this->noTenant($this->tenant, function (): void {
            Resposta::query()->delete();
            Tentativa::query()->delete();
            AvaliacaoQuestao::query()->delete();
            Avaliacao::query()->delete();
            Questao::query()->delete();
            Material::query()->delete();
            Curso::query()->update(['nota_minima' => null]);
        });

        (new CursosDadosDemonstracaoSeeder())->run($this->tenant->id);
        (new CursosDadosDemonstracaoSeeder())->run($this->tenant->id);

        $this->noTenant($this->tenant, function (): void {
            $this->assertSame(7, Material::count());
            $this->assertSame(3, Avaliacao::count());
            $this->assertSame(3, Tentativa::count());
            $this->assertSame(4, Curso::count());
            $this->assertSame('7.00', Curso::query()->where('titulo', CursosConteudoDemonstracaoSeeder::TITULO_CURSO)->firstOrFail()->nota_minima);
        });
    }

    public function test_o_conteudo_da_fase_2_recusa_rodar_em_producao(): void
    {
        $this->app['env'] = 'production';
        $this->expectException(RuntimeException::class);

        (new CursosConteudoDemonstracaoSeeder())->run($this->tenant->id);
    }

    public function test_nao_duplica_se_o_tenant_ja_tem_cursos(): void
    {
        (new CursosDadosDemonstracaoSeeder())->run($this->tenant->id);
        (new CursosDadosDemonstracaoSeeder())->run($this->tenant->id);

        $this->assertSame(4, $this->noTenant($this->tenant, fn () => Curso::count()));
    }

    public function test_recusa_rodar_em_producao(): void
    {
        $this->app['env'] = 'production';
        $this->expectException(RuntimeException::class);

        (new CursosDadosDemonstracaoSeeder())->run($this->tenant->id);
    }
}
