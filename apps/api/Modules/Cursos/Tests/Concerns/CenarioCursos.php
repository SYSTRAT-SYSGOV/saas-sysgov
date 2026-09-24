<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Concerns;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Modules\Admin\Models\Module;
use Modules\Cursos\Database\Seeders\CursosRbacSeeder;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Models\Aula;
use Modules\Cursos\Models\AulaAgendamento;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\AulaService;
use Modules\Cursos\Services\CursoService;
use Modules\Cursos\Services\InscricaoService;
use Modules\Cursos\Services\TurmaService;

/**
 * Monta cenários do módulo pelo caminho real: perfis-template do
 * CursosRbacSeeder clonados pelo ModuleRoleProvisioner e atribuídos ao
 * usuário no tenant (role_user.tenant_id), como acontece em produção.
 */
trait CenarioCursos
{
    private bool $perfisSemeados = false;

    protected function criarTenant(string $slug = 'prefeitura-a', bool $comModulo = true): Tenant
    {
        $tenant = Tenant::create(['name' => 'Prefeitura ' . Str::title(str_replace('-', ' ', $slug)), 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);

        if ($comModulo) {
            $this->habilitarModulo($tenant);
        }

        return $tenant;
    }

    protected function habilitarModulo(Tenant $tenant, bool $habilitado = true): void
    {
        if (!$this->perfisSemeados) {
            (new CursosRbacSeeder())->run();
            $this->perfisSemeados = true;
        }

        $modulo = Module::firstOrCreate(['alias' => 'cursos'], ['name' => 'Cursos e Formações', 'enabled' => true, 'monthly_fee_cents' => 0]);
        $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => $habilitado, 'settings' => json_encode([])]]);

        if ($habilitado) {
            app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, 'cursos');
        }
    }

    /**
     * @param list<string> $perfis slugs: admin_cursos, instrutor_cursos, participante_cursos
     */
    protected function usuario(Tenant $tenant, array $perfis = ['participante_cursos'], ?string $nome = null): User
    {
        $nome ??= 'Usuário ' . Str::random(6);
        $user = User::create(['name' => $nome, 'email' => Str::slug($nome) . '-' . Str::random(5) . '@teste.gov.br', 'password' => bcrypt('secret')]);
        $tenant->users()->attach($user->id, ['status' => 'active', 'is_primary' => true]);

        foreach ($perfis as $slug) {
            $role = Role::where('slug', $slug)->where('tenant_id', $tenant->id)->firstOrFail();
            $user->roles()->attach($role->id, ['tenant_id' => $tenant->id]);
        }
        $user->clearPermissionCache();

        return $user;
    }

    /** Requisição HTTP autenticada no tenant, como o web-client faz (header X-Tenant-ID). */
    protected function como(User $user, Tenant $tenant): static
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $tenant->id);
    }

    /** Executa $acao com o TenantContext de $tenant (para montar dados via Services/models). */
    protected function noTenant(Tenant $tenant, callable $acao): mixed
    {
        $context = app(TenantContext::class);
        $context->set($tenant);

        try {
            return $acao();
        } finally {
            $context->clear();
        }
    }

    /**
     * @param array<string, mixed> $atributos
     */
    protected function cursoPublicado(Tenant $tenant, array $atributos = []): Curso
    {
        return $this->noTenant($tenant, function () use ($atributos): Curso {
            $servico = app(CursoService::class);
            $autor = User::query()->firstOrFail();
            $curso = $servico->criar(['titulo' => 'Gestão de Contratos', 'carga_horaria_minutos' => 480, ...$atributos], $autor);

            return $servico->alterarStatus($curso, StatusCurso::Publicado);
        });
    }

    /**
     * Turma aberta com inscrições abertas agora e aulas no futuro.
     *
     * @param array<string, mixed> $atributos
     */
    protected function turmaAberta(Tenant $tenant, Curso $curso, User $instrutor, array $atributos = []): Turma
    {
        return $this->noTenant($tenant, fn (): Turma => app(TurmaService::class)->criar($curso, [
            'nome' => 'Turma 1',
            'data_inicio' => now()->addDays(10)->toDateString(),
            'data_fim' => now()->addDays(40)->toDateString(),
            'inscricoes_inicio' => now()->subDay()->toDateTimeString(),
            'inscricoes_fim' => now()->addDays(5)->toDateTimeString(),
            'vagas' => 10,
            'modalidade' => 'presencial',
            'local' => 'Auditório da Prefeitura',
            ...$atributos,
        ], [$instrutor->id]));
    }

    protected function aula(Tenant $tenant, Curso $curso, string $titulo = 'Aula', int $duracao = 120): Aula
    {
        return $this->noTenant($tenant, fn (): Aula => app(AulaService::class)->criar($curso, ['titulo' => $titulo, 'duracao_minutos' => $duracao]));
    }

    /** Agenda direto no banco — permite datas no passado para testar chamada e encerramento. */
    protected function agendamento(Tenant $tenant, Turma $turma, Aula $aula, \DateTimeInterface $inicio, ?\DateTimeInterface $fim = null): AulaAgendamento
    {
        return $this->noTenant($tenant, fn (): AulaAgendamento => AulaAgendamento::create([
            'turma_id' => $turma->id, 'aula_id' => $aula->id,
            'inicio' => $inicio, 'fim' => $fim ?? \Carbon\CarbonImmutable::instance($inicio)->addHours(2),
        ]));
    }

    protected function inscrever(Tenant $tenant, Turma $turma, User $user, bool $peloAdministrador = false): Inscricao
    {
        return $this->noTenant($tenant, function () use ($turma, $user, $peloAdministrador): Inscricao {
            $servico = app(InscricaoService::class);

            return $servico->inscrever($turma, $servico->participanteDoUsuario($user), $user, $peloAdministrador);
        });
    }

    /** @param TestResponse<\Symfony\Component\HttpFoundation\Response> $response */
    protected function assertErroDeNegocio(TestResponse $response, string $trecho): void
    {
        $response->assertStatus(422);
        $this->assertStringContainsString($trecho, (string) $response->json('error'));
    }
}
