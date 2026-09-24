<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Cursos\Database\Seeders\CursosDadosDemonstracaoSeeder;
use Modules\Cursos\Models\AulaAgendamento;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Formacao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Turma;
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
