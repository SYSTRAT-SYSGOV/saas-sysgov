<?php

declare(strict_types=1);

namespace Modules\Protocolo\Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Modules\Protocolo\Contracts\EntidadeVinculavel;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Models\TipoTramitacao;
use Modules\Protocolo\Models\Vinculo;
use Modules\Protocolo\Services\VinculoRegistry;
use RuntimeException;
use Tests\TestCase;

final class VinculosPromocaoTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private OrgUnit $secGeral;
    private User $userGestor;
    private Processo $proc;
    private VinculoRegistry $registry;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['name' => 'Prefeitura Exemplo', 'slug' => 'pref-exemplo', 'type' => 'prefeitura', 'status' => 'active']);

        $permView = Permission::firstOrCreate(['slug' => 'protocolo.processos.view'], ['name' => 'Visualizar', 'guard_name' => 'web']);
        $permUpdate = Permission::firstOrCreate(['slug' => 'protocolo.processos.update'], ['name' => 'Atualizar', 'guard_name' => 'web']);
        $permVincular = Permission::firstOrCreate(['slug' => 'protocolo.processos.vincular'], ['name' => 'Vincular', 'guard_name' => 'web']);
        $permPromover = Permission::firstOrCreate(['slug' => 'protocolo.processos.promover_requerimento'], ['name' => 'Promover Requerimento', 'guard_name' => 'web']);

        $role = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Gestor Processos',
            'slug' => 'gestor_proc',
            'scope' => 'tenant',
            'guard_name' => 'web',
        ]);
        $role->permissions()->sync([$permView->id, $permUpdate->id, $permVincular->id, $permPromover->id]);

        $this->userGestor = User::create(['name' => 'Gestor', 'email' => 'gestor@gov.br', 'password' => bcrypt('secret')]);
        $this->tenant->users()->attach($this->userGestor->id, ['status' => 'active', 'is_primary' => true]);
        $this->userGestor->roles()->attach($role->id, ['tenant_id' => $this->tenant->id]);
        $this->userGestor->clearPermissionCache();

        app(TenantContext::class)->set($this->tenant);
        $this->secGeral = OrgUnit::create(['name' => 'Secretaria Geral', 'code' => 'SG', 'tenant_id' => $this->tenant->id]);
        OrgUnitUser::create(['user_id' => $this->userGestor->id, 'org_unit_id' => $this->secGeral->id, 'role' => 'membro', 'is_primary' => true]);

        TipoTramitacao::firstOrCreate(['slug' => 'entrada'], ['nome' => 'Entrada', 'ativo' => true]);

        $this->proc = Processo::create([
            'numero' => 999,
            'ano' => 2026,
            'assunto' => 'Processo de Exemplo',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secGeral->id,
            'orgao_atual_id' => $this->secGeral->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        $this->registry = app(VinculoRegistry::class);
        $this->registry->limpar();

        app(TenantContext::class)->clear();
    }

    private function como(User $user): static
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $this->tenant->id);
    }

    // ── VÍNCULOS ──────────────────────────────────────────────────────────

    public function test_cria_vinculo_para_entidade_sem_handler_registrado(): void
    {
        $response = $this->como($this->userGestor)
            ->postJson("/api/protocolo/processos/{$this->proc->id}/vinculos", [
                'entidade_tipo' => 'contrato',
                'entidade_id' => 456,
                'papel_vinculo' => 'referencia',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('entidade_tipo', 'contrato')
            ->assertJsonPath('entidade_id', 456)
            ->assertJsonPath('papel_vinculo', 'referencia')
            ->assertJsonPath('resumo', null);

        self::assertTrue(Vinculo::where('processo_id', $this->proc->id)->where('entidade_id', 456)->exists());
    }

    public function test_cria_vinculo_para_entidade_com_handler_e_enriquece_resumo(): void
    {
        $handler = new class implements EntidadeVinculavel {
            public function tipo(): string { return 'licitacao'; }
            public function existe(int $entidadeId): bool { return $entidadeId === 789; }
            public function jaPromovida(int $entidadeId): bool { return false; }
            public function aoPromover(int $entidadeId, int $processoId): void {}
            public function resumo(int $entidadeId): array {
                return ['titulo' => 'Pregão Eletrônico 05/2026', 'status' => 'em_andamento'];
            }
        };

        $this->registry->registrar($handler);

        // 1. Tentar vincular entidade inexistente no handler -> 404
        $respInexistente = $this->como($this->userGestor)
            ->postJson("/api/protocolo/processos/{$this->proc->id}/vinculos", [
                'entidade_tipo' => 'licitacao',
                'entidade_id' => 999,
                'papel_vinculo' => 'anexo',
            ]);
        $respInexistente->assertStatus(404);

        // 2. Vincular com sucesso
        $respSucesso = $this->como($this->userGestor)
            ->postJson("/api/protocolo/processos/{$this->proc->id}/vinculos", [
                'entidade_tipo' => 'licitacao',
                'entidade_id' => 789,
                'papel_vinculo' => 'anexo',
            ]);

        $respSucesso->assertStatus(201)
            ->assertJsonPath('resumo.titulo', 'Pregão Eletrônico 05/2026');

        // 3. Listagem também deve retornar o resumo
        $respListagem = $this->como($this->userGestor)
            ->getJson("/api/protocolo/processos/{$this->proc->id}/vinculos");
        $respListagem->assertStatus(200);
        self::assertSame('Pregão Eletrônico 05/2026', $respListagem->json('0.resumo.titulo'));
    }

    public function test_rejeita_vinculo_duplicado(): void
    {
        $this->como($this->userGestor)
            ->postJson("/api/protocolo/processos/{$this->proc->id}/vinculos", [
                'entidade_tipo' => 'contrato',
                'entidade_id' => 100,
                'papel_vinculo' => 'referencia',
            ]);

        $segundaTentativa = $this->como($this->userGestor)
            ->postJson("/api/protocolo/processos/{$this->proc->id}/vinculos", [
                'entidade_tipo' => 'contrato',
                'entidade_id' => 100,
                'papel_vinculo' => 'referencia',
            ]);

        $segundaTentativa->assertStatus(409)
            ->assertJsonPath('message', 'Este vínculo já existe no processo.');
    }

    public function test_bloqueia_remocao_de_vinculo_de_origem(): void
    {
        app(TenantContext::class)->set($this->tenant);
        $vinculoOrigem = Vinculo::create([
            'processo_id' => $this->proc->id,
            'entidade_tipo' => 'requerimento',
            'entidade_id' => 50,
            'papel_vinculo' => 'origem',
        ]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userGestor)
            ->deleteJson("/api/protocolo/processos/{$this->proc->id}/vinculos/{$vinculoOrigem->id}");

        $response->assertStatus(409)
            ->assertJsonPath('message', 'Não é permitido remover o vínculo de origem do processo.');

        self::assertTrue(Vinculo::where('id', $vinculoOrigem->id)->exists());
    }

    public function test_consulta_reversa_por_entidade(): void
    {
        app(TenantContext::class)->set($this->tenant);
        Vinculo::create([
            'processo_id' => $this->proc->id,
            'entidade_tipo' => 'requerimento',
            'entidade_id' => 888,
            'papel_vinculo' => 'anexo',
        ]);
        app(TenantContext::class)->clear();

        $response = $this->como($this->userGestor)
            ->getJson('/api/protocolo/vinculos?entidade_tipo=requerimento&entidade_id=888');

        $response->assertStatus(200);
        $dados = $response->json();
        self::assertCount(1, $dados);
        self::assertSame($this->proc->id, $dados[0]['processo_id']);
    }

    // ── PROMOÇÃO DE REQUERIMENTO ──────────────────────────────────────────

    public function test_promover_requerimento_com_sucesso(): void
    {
        $executouAoPromover = false;

        $handler = new class($executouAoPromover) implements EntidadeVinculavel {
            public function __construct(public bool &$executou) {}
            public function tipo(): string { return 'requerimento'; }
            public function existe(int $entidadeId): bool { return $entidadeId === 55; }
            public function jaPromovida(int $entidadeId): bool { return false; }
            public function aoPromover(int $entidadeId, int $processoId): void {
                $this->executou = true;
            }
            public function resumo(int $entidadeId): array {
                return ['titulo' => 'Solicitação de Iluminação Pública'];
            }
        };

        $this->registry->registrar($handler);

        $response = $this->como($this->userGestor)
            ->postJson('/api/protocolo/processos/promover-requerimento', [
                'requerimento_id' => 55,
                'orgao_destino_id' => $this->secGeral->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('origem', 'externa')
            ->assertJsonPath('assunto', 'Solicitação de Iluminação Pública');

        self::assertTrue($executouAoPromover, 'Efeito colateral aoPromover() deve ter sido executado.');

        $processoId = $response->json('id');
        $this->assertDatabaseHas('protocolo_vinculos', [
            'processo_id' => $processoId,
            'entidade_tipo' => 'requerimento',
            'entidade_id' => 55,
            'papel_vinculo' => 'origem',
        ]);
    }

    public function test_promover_rejeita_sem_handler(): void
    {
        // Registro sem handler para requerimento
        $response = $this->como($this->userGestor)
            ->postJson('/api/protocolo/processos/promover-requerimento', [
                'requerimento_id' => 99,
                'orgao_destino_id' => $this->secGeral->id,
            ]);

        $response->assertStatus(422);
    }

    public function test_promover_rejeita_requerimento_inexistente(): void
    {
        $handler = new class implements EntidadeVinculavel {
            public function tipo(): string { return 'requerimento'; }
            public function existe(int $entidadeId): bool { return false; }
            public function jaPromovida(int $entidadeId): bool { return false; }
            public function aoPromover(int $entidadeId, int $processoId): void {}
            public function resumo(int $entidadeId): array { return ['titulo' => '']; }
        };
        $this->registry->registrar($handler);

        $response = $this->como($this->userGestor)
            ->postJson('/api/protocolo/processos/promover-requerimento', [
                'requerimento_id' => 123,
                'orgao_destino_id' => $this->secGeral->id,
            ]);

        $response->assertStatus(404);
    }

    public function test_promover_rejeita_requerimento_ja_promovido(): void
    {
        $handler = new class implements EntidadeVinculavel {
            public function tipo(): string { return 'requerimento'; }
            public function existe(int $entidadeId): bool { return true; }
            public function jaPromovida(int $entidadeId): bool { return true; }
            public function aoPromover(int $entidadeId, int $processoId): void {}
            public function resumo(int $entidadeId): array { return ['titulo' => 'Já promovido']; }
        };
        $this->registry->registrar($handler);

        $response = $this->como($this->userGestor)
            ->postJson('/api/protocolo/processos/promover-requerimento', [
                'requerimento_id' => 123,
                'orgao_destino_id' => $this->secGeral->id,
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('message', 'Requerimento #123 já foi promovido a processo.');
    }

    public function test_promover_executa_rollback_quando_ao_promover_falha(): void
    {
        $handler = new class implements EntidadeVinculavel {
            public function tipo(): string { return 'requerimento'; }
            public function existe(int $entidadeId): bool { return true; }
            public function jaPromovida(int $entidadeId): bool { return false; }
            public function aoPromover(int $entidadeId, int $processoId): void {
                throw new RuntimeException('Falha intencional de integração externa.');
            }
            public function resumo(int $entidadeId): array { return ['titulo' => 'Teste Falha']; }
        };
        $this->registry->registrar($handler);

        $totalAntes = Processo::query()->count();

        try {
            $this->como($this->userGestor)
                ->postJson('/api/protocolo/processos/promover-requerimento', [
                    'requerimento_id' => 77,
                    'orgao_destino_id' => $this->secGeral->id,
                ]);
        } catch (\Throwable) {
            // Esperado falha interna
        }

        // Garante que nenhum processo ou vínculo foi mantido no banco após o erro
        self::assertSame($totalAntes, Processo::query()->count());
        self::assertFalse(Vinculo::where('entidade_id', 77)->exists());
    }
}
