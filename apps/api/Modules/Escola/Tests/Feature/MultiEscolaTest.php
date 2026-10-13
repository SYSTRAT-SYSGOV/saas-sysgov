<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use App\Models\Tenant;
use App\Models\UserModuleAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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
use Modules\Escola\Support\MigracaoEscolaId;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Várias escolas por prefeitura (change educacao-multiescola-e-cadastro-pessoas, fase A):
 * isolamento entre escolas do mesmo tenant, acesso por unidade do organograma e cadastro.
 */
final class MultiEscolaTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    /** @var list<class-string<\Illuminate\Database\Eloquent\Model>> */
    private const MODELS = [
        Turno::class, Turma::class, Aluno::class, AlunoContato::class, Materia::class,
        TurmaMateria::class, Trimestre::class, CategoriaOcorrencia::class, MembroEquipe::class,
    ];

    private Tenant $tenant;

    private OrgUnit $secretaria;

    private OrgUnit $unidadeA;

    private OrgUnit $unidadeB;

    private Escola $escolaA;

    private Escola $escolaB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        [$this->secretaria, $this->unidadeA, $this->unidadeB] = $this->noTenant($this->tenant, function (): array {
            $raiz = OrgUnit::create(['name' => 'Prefeitura', 'code' => 'PRE', 'type' => 'raiz', 'level' => 1, 'path' => '1']);
            $sec = OrgUnit::create(['name' => 'Secretaria de Educação', 'code' => 'SME', 'type' => 'secretaria', 'level' => 2, 'path' => '1.1', 'parent_id' => $raiz->id]);
            $a = OrgUnit::create(['name' => 'Escola A', 'code' => 'EMA', 'type' => 'escola', 'level' => 3, 'path' => '1.1.1', 'parent_id' => $sec->id]);
            $b = OrgUnit::create(['name' => 'Escola B', 'code' => 'EMB', 'type' => 'escola', 'level' => 3, 'path' => '1.1.2', 'parent_id' => $sec->id]);

            return [$sec, $a, $b];
        });
        $this->escolaA = $this->escola($this->tenant, 'Escola Municipal A', $this->unidadeA->id);
        $this->escolaB = $this->escola($this->tenant, 'Escola Municipal B', $this->unidadeB->id);
    }

    /**
     * Usuário com acesso ao módulo restrito às unidades informadas.
     *
     * @param list<int> $orgUnitIds
     */
    private function usuarioRestrito(array $orgUnitIds, string $modulo = 'escola'): \App\Models\User
    {
        $user = $this->usuario($this->tenant);
        UserModuleAccess::create([
            'user_id' => $user->id, 'tenant_id' => $this->tenant->id, 'module_alias' => $modulo,
            'role' => 'member', 'org_unit_ids' => $orgUnitIds, 'can_manage_users' => false,
        ]);

        return $user;
    }

    /** @return array<class-string, int> */
    private function montarCenario(string $sufixo): array
    {
        $turno = Turno::create(['nome' => "Manhã {$sufixo}", 'ordem' => 1]);
        $turma = Turma::create(['nome' => "6º {$sufixo}", 'turno_id' => $turno->id, 'ano_letivo' => 2026]);
        $aluno = Aluno::create(['nome' => "Aluno {$sufixo}", 'turma_id' => $turma->id, 'situacao' => 'ativo']);
        $contato = AlunoContato::create(['aluno_id' => $aluno->id, 'telefone' => '41999990000']);
        $materia = Materia::create(['nome' => "Matemática {$sufixo}"]);
        $vinculo = TurmaMateria::create(['turma_id' => $turma->id, 'materia_id' => $materia->id]);
        $trimestre = Trimestre::create(['ano_letivo' => 2026, 'numero' => 1, 'data_inicio' => '2026-02-01', 'data_fim' => '2026-05-01']);
        $categoria = CategoriaOcorrencia::create(['nome' => "Falta {$sufixo}", 'cor' => '#ffffff']);
        $membro = MembroEquipe::create(['nome' => "Diretor {$sufixo}", 'cargo' => 'diretor']);

        return [
            Turno::class => $turno->id, Turma::class => $turma->id, Aluno::class => $aluno->id,
            AlunoContato::class => $contato->id, Materia::class => $materia->id, TurmaMateria::class => $vinculo->id,
            Trimestre::class => $trimestre->id, CategoriaOcorrencia::class => $categoria->id, MembroEquipe::class => $membro->id,
        ];
    }

    public function test_todos_os_models_sao_isolados_entre_escolas_do_mesmo_tenant(): void
    {
        $idsA = $this->naEscola($this->tenant, $this->escolaA, fn (): array => $this->montarCenario('A'));
        $this->naEscola($this->tenant, $this->escolaB, fn (): array => $this->montarCenario('B'));

        foreach (self::MODELS as $model) {
            $this->naEscola($this->tenant, $this->escolaB, function () use ($model, $idsA): void {
                $this->assertSame(1, $model::count(), "{$model}: a escola B deveria ver só o próprio registro.");
                $this->assertNull($model::find($idsA[$model]), "{$model}: a escola B não pode encontrar o registro da escola A.");
                $this->assertSame($this->escolaB->id, $model::firstOrFail()->escola_id);
            });
        }
    }

    public function test_aluno_de_outra_escola_responde_404(): void
    {
        $alunoB = $this->naEscola($this->tenant, $this->escolaB, function (): Aluno {
            $turma = Turma::create(['nome' => '6º B', 'turno_id' => Turno::create(['nome' => 'Manhã', 'ordem' => 1])->id, 'ano_letivo' => 2026]);

            return Aluno::create(['nome' => 'ALUNO B', 'turma_id' => $turma->id, 'situacao' => 'ativo']);
        });
        $admin = $this->usuario($this->tenant);

        $this->como($admin, $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaA->id)
            ->getJson("/api/escola/alunos/{$alunoB->id}")->assertNotFound();
        $this->como($admin, $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaB->id)
            ->getJson("/api/escola/alunos/{$alunoB->id}")->assertOk();
    }

    public function test_escola_id_no_corpo_e_ignorado(): void
    {
        $turno = $this->naEscola($this->tenant, $this->escolaA, fn (): Turno => Turno::create(['nome' => 'Manhã', 'ordem' => 1]));

        $id = $this->como($this->usuario($this->tenant), $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaA->id)
            ->postJson('/api/escola/turmas', ['nome' => '7º A', 'turno_id' => $turno->id, 'ano_letivo' => 2026, 'escola_id' => $this->escolaB->id])
            ->assertCreated()->json('id');

        $this->assertSame($this->escolaA->id, (int) DB::table('escola_turmas')->where('id', $id)->value('escola_id'));
    }

    public function test_sem_escola_informada_com_varias_escolas_pede_a_escolha(): void
    {
        $this->como($this->usuario($this->tenant), $this->tenant)->getJson('/api/escola/turmas')->assertStatus(422);
    }

    public function test_usuario_restrito_a_escola_a_nao_acessa_a_escola_b(): void
    {
        $diretorA = $this->usuarioRestrito([$this->unidadeA->id]);

        $this->como($diretorA, $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaA->id)->getJson('/api/escola/turmas')->assertOk();
        $this->como($diretorA, $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaB->id)->getJson('/api/escola/turmas')->assertForbidden();
        $this->como($diretorA, $this->tenant)->getJson('/api/escola/escolas/minhas?modulo=escola')
            ->assertOk()->assertJsonCount(1, 'escolas')->assertJsonPath('escolas.0.id', $this->escolaA->id);
    }

    public function test_secretaria_de_educacao_ve_todas_as_escolas_descendentes(): void
    {
        $secretario = $this->usuarioRestrito([$this->secretaria->id]);

        $this->como($secretario, $this->tenant)->getJson('/api/escola/escolas/minhas?modulo=escola')
            ->assertOk()->assertJsonCount(2, 'escolas');
        $this->como($secretario, $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaB->id)->getJson('/api/escola/turmas')->assertOk();
    }

    public function test_escola_de_outro_tenant_e_recusada(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $alheia = $this->escola($outro, 'Escola de fora');

        $this->como($this->usuario($this->tenant), $this->tenant)->withHeader('X-Escola-ID', (string) $alheia->id)
            ->getJson('/api/escola/turmas')->assertForbidden();
    }

    public function test_escola_inativa_consulta_mas_nao_aceita_cadastro(): void
    {
        $this->escolaB->update(['ativa' => false]);
        $admin = $this->usuario($this->tenant);
        $turno = $this->naEscola($this->tenant, $this->escolaB, fn (): Turno => Turno::create(['nome' => 'Manhã', 'ordem' => 1]));

        $this->como($admin, $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaB->id)->getJson('/api/escola/turmas')->assertOk();
        $this->como($admin, $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaB->id)
            ->postJson('/api/escola/turmas', ['nome' => '8º A', 'turno_id' => $turno->id, 'ano_letivo' => 2026])
            ->assertStatus(422)->assertJsonPath('message', 'Esta escola está inativa: não aceita novos cadastros ou lançamentos.');
    }

    public function test_cadastro_de_escolas_exige_permissao_e_unidade_do_orgao(): void
    {
        $direcao = $this->usuario($this->tenant, ['escola_direcao']);
        $this->como($direcao, $this->tenant)->postJson('/api/escola/escolas', ['nome' => 'Nova', 'org_unit_id' => $this->secretaria->id])->assertForbidden();

        $admin = $this->usuarioAdminGeral();
        $nova = $this->noTenant($this->tenant, fn () => OrgUnit::create(['name' => 'Escola C', 'code' => 'EMC', 'type' => 'escola', 'level' => 3, 'path' => '1.1.3', 'parent_id' => $this->secretaria->id]));

        $this->como($admin, $this->tenant)->postJson('/api/escola/escolas', ['nome' => 'Escola Municipal C', 'inep' => '41000001', 'org_unit_id' => $nova->id])
            ->assertCreated()->assertJsonPath('nome', 'Escola Municipal C');
        // Unidade já ligada a outra escola
        $this->como($admin, $this->tenant)->postJson('/api/escola/escolas', ['nome' => 'Duplicada', 'org_unit_id' => $this->unidadeA->id])
            ->assertStatus(422)->assertJsonPath('error', 'Esta unidade do organograma já está ligada a outra escola.');
        // INEP repetido
        $this->como($admin, $this->tenant)->putJson("/api/escola/escolas/{$this->escolaA->id}", ['inep' => '41000001'])->assertStatus(422);
        $this->como($admin, $this->tenant)->getJson('/api/escola/escolas')->assertOk()->assertJsonCount(3, 'escolas');
    }

    public function test_relatorios_usam_nome_da_escola_de_trabalho(): void
    {
        $admin = $this->usuario($this->tenant);

        $this->como($admin, $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaB->id)
            ->getJson('/api/escola/unidade')->assertOk()->assertJsonPath('nome', 'Escola Municipal B');
    }

    public function test_migracao_cria_escola_a_partir_da_unidade_antiga(): void
    {
        $antigo = $this->criarTenant('prefeitura-antiga');
        DB::table('escola_unidades')->insert(['tenant_id' => $antigo->id, 'nome' => 'Colégio Antigo', 'logo_path' => 'escola/x/logo.png', 'created_at' => now(), 'updated_at' => now()]);

        MigracaoEscolaId::garantirEscolas(['escola_unidades']);
        MigracaoEscolaId::garantirEscolas(['escola_unidades']); // idempotente

        $escolas = DB::table('escola_escolas')->where('tenant_id', $antigo->id)->get();
        $this->assertCount(1, $escolas);
        $this->assertSame('Colégio Antigo', $escolas[0]->nome);
        $this->assertSame('escola/x/logo.png', $escolas[0]->logo_path);
    }

    private function usuarioAdminGeral(): \App\Models\User
    {
        $user = $this->usuario($this->tenant, []);
        $role = \App\Models\Role::firstOrCreate(
            ['slug' => 'admin_tenant', 'tenant_id' => $this->tenant->id],
            ['name' => 'Administrador do Tenant', 'scope' => 'tenant', 'guard_name' => 'web', 'is_system' => true],
        );
        $user->roles()->attach($role->id, ['tenant_id' => $this->tenant->id]);
        $user->clearPermissionCache();

        return $user;
    }
}
