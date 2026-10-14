<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use App\Models\UserModuleAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Database\Seeders\EscolaDadosDemonstracaoSeeder;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\AlunoContato;
use Modules\Escola\Models\CategoriaOcorrencia;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\MembroEquipe;
use Modules\Escola\Models\Trimestre;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\TurmaMateria;
use Modules\Escola\Models\Turno;
use Modules\Escola\Services\EscolaService;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;
use Modules\Pessoas\Models\Pessoa;

final class EscolaDadosDemonstracaoSeederTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    public function test_semeia_cenario_completo_de_demonstracao(): void
    {
        $tenant = $this->criarTenant('prefeitura-demo-escola');
        $this->usuario($tenant, ['escola_direcao'], 'Administradora de Demonstração');

        app(EscolaDadosDemonstracaoSeeder::class)->seedTenant($tenant->id);

        $this->noTenant($tenant, function (): void {
            self::assertSame(1, Escola::count());
            $escola = Escola::firstOrFail();
            self::assertNull($escola->org_unit_id);
            self::assertTrue($escola->ativa);
            self::assertSame('41123456', $escola->inep);

            self::assertSame(3, Turno::count());
            self::assertSame(4, MembroEquipe::count());
            self::assertSame(1, MembroEquipe::where('cargo', 'diretor')->count());
            self::assertSame(1, MembroEquipe::where('cargo', 'pedagoga')->count());

            self::assertSame(4, Turma::count());
            self::assertSame(2, Turma::whereNotNull('pedagoga_id')->count());

            self::assertSame(8, Materia::count());
            self::assertSame(4 * 8, TurmaMateria::count());
            self::assertSame(2 * 4, TurmaMateria::whereNull('professor_user_id')->count());
            self::assertSame(6 * 4, TurmaMateria::whereNotNull('professor_user_id')->count());

            self::assertSame(12, Aluno::count());
            self::assertSame(3, Aluno::where('turma_id', Turma::where('nome', '1º Ano A')->value('id'))->count());
            self::assertSame(12, AlunoContato::count());
            self::assertSame(12, Aluno::whereNotNull('cpf')->count());
            self::assertSame(12, Aluno::whereNotNull('cgm')->count());
            self::assertSame(12, Aluno::whereNotNull('pessoa_id')->count());
            self::assertSame(12, Pessoa::count());

            self::assertSame(4, Trimestre::count());

            self::assertSame(5, CategoriaOcorrencia::count());
        });
    }

    public function test_minhas_escolas_retorna_a_escola_de_demonstracao(): void
    {
        $tenant = $this->criarTenant('prefeitura-demo-escola-2');
        $usuario = $this->usuario($tenant, ['escola_direcao']);
        // Acesso irrestrito ao módulo (org_unit_ids = null) — sem isto, EscolaService::minhas()
        // nega acesso mesmo com a role de perfil (acesso à matriz módulo×secretaria é separado
        // das permissões do perfil, como em MultiEscolaTest::usuarioRestrito).
        UserModuleAccess::create([
            'user_id' => $usuario->id, 'tenant_id' => $tenant->id, 'module_alias' => 'escola',
            'role' => 'member', 'org_unit_ids' => null, 'can_manage_users' => false,
        ]);

        app(EscolaDadosDemonstracaoSeeder::class)->seedTenant($tenant->id);

        $escolas = $this->noTenant($tenant, fn () => app(EscolaService::class)->minhas($usuario->fresh(), 'escola'));

        self::assertGreaterThanOrEqual(1, $escolas->count());
        self::assertSame('Escola Municipal Prof. Antônio Carlos Ribeiro', $escolas->first()->nome);
    }

    public function test_nao_duplica_quando_tenant_ja_tem_escola(): void
    {
        $tenant = $this->criarTenant('prefeitura-demo-escola-3');
        $this->usuario($tenant, ['escola_direcao'], 'Administradora de Demonstração');

        $seeder = app(EscolaDadosDemonstracaoSeeder::class);
        $seeder->seedTenant($tenant->id);
        $seeder->seedTenant($tenant->id);

        $this->noTenant($tenant, function (): void {
            self::assertSame(1, Escola::count());
            self::assertSame(12, Aluno::count());
        });
    }
}
