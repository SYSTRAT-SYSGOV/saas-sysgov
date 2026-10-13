<?php

declare(strict_types=1);

namespace Modules\Protocolo\Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Modules\Protocolo\Models\Atributo;
use Modules\Protocolo\Models\Documento;
use Modules\Protocolo\Models\Processo;
use Tests\TestCase;

final class DocumentosAtributosTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private OrgUnit $secA;
    private OrgUnit $secB;
    private User $userA;
    private User $userB;
    private Processo $procA;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'pref-a', 'type' => 'prefeitura', 'status' => 'active']);
        $this->tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'pref-b', 'type' => 'prefeitura', 'status' => 'active']);

        $permView = Permission::firstOrCreate(['slug' => 'protocolo.processos.view'], ['name' => 'Visualizar', 'guard_name' => 'web']);
        $permUpdate = Permission::firstOrCreate(['slug' => 'protocolo.processos.update'], ['name' => 'Atualizar', 'guard_name' => 'web']);

        $roleA = Role::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Operador',
            'slug' => 'operador',
            'scope' => 'tenant',
            'guard_name' => 'web',
        ]);
        $roleA->permissions()->sync([$permView->id, $permUpdate->id]);

        $this->userA = User::create(['name' => 'User A', 'email' => 'user.a@gov.br', 'password' => bcrypt('secret')]);
        $this->tenantA->users()->attach($this->userA->id, ['status' => 'active', 'is_primary' => true]);
        $this->userA->roles()->attach($roleA->id, ['tenant_id' => $this->tenantA->id]);
        $this->userA->clearPermissionCache();

        $this->userB = User::create(['name' => 'User B', 'email' => 'user.b@gov.br', 'password' => bcrypt('secret')]);
        $this->tenantB->users()->attach($this->userB->id, ['status' => 'active', 'is_primary' => true]);

        app(TenantContext::class)->set($this->tenantA);
        $this->secA = OrgUnit::create(['name' => 'Secretaria Geral A', 'code' => 'SGA', 'tenant_id' => $this->tenantA->id]);
        OrgUnitUser::create(['user_id' => $this->userA->id, 'org_unit_id' => $this->secA->id, 'role' => 'membro', 'is_primary' => true]);

        $this->procA = Processo::create([
            'numero' => 10,
            'ano' => 2026,
            'assunto' => 'Processo de Compras',
            'origem' => 'interna',
            'orgao_origem_id' => $this->secA->id,
            'orgao_atual_id' => $this->secA->id,
            'status' => 'aberto',
            'data_abertura' => now(),
        ]);

        app(TenantContext::class)->set($this->tenantB);
        $this->secB = OrgUnit::create(['name' => 'Secretaria B', 'code' => 'SGB', 'tenant_id' => $this->tenantB->id]);

        app(TenantContext::class)->clear();
    }

    private function como(User $user, Tenant $tenant): static
    {
        return $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $tenant->id);
    }

    // ── DOCUMENTOS ────────────────────────────────────────────────────────

    public function test_anexar_documento_com_sucesso(): void
    {
        $conteudo = '%PDF-1.5 fake pdf content';
        $arquivo = UploadedFile::fake()->createWithContent('termo_referencia.pdf', $conteudo);

        $response = $this->como($this->userA, $this->tenantA)
            ->postJson("/api/protocolo/processos/{$this->procA->id}/documentos", [
                'tipo_documento' => 'termo_referencia',
                'arquivo' => $arquivo,
                'nome_arquivo' => 'Termo de Referencia Final.pdf',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('nome_arquivo', 'Termo de Referencia Final.pdf')
            ->assertJsonPath('tipo_documento', 'termo_referencia');

        $docId = $response->json('id');
        $doc = Documento::find($docId);
        self::assertNotNull($doc);
        self::assertSame(hash('sha256', $conteudo), $doc->hash_arquivo);
        self::assertStringContainsString("tenants/{$this->tenantA->id}/protocolo/2026", $doc->caminho_arquivo);
        Storage::disk('local')->assertExists($doc->caminho_arquivo);
    }

    public function test_anexar_documento_rejeita_mime_invalido(): void
    {
        $arquivoInvalido = UploadedFile::fake()->create('executavel.exe', 50, 'application/x-msdownload');

        $response = $this->como($this->userA, $this->tenantA)
            ->postJson("/api/protocolo/processos/{$this->procA->id}/documentos", [
                'tipo_documento' => 'anexo',
                'arquivo' => $arquivoInvalido,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['arquivo']);
    }

    public function test_anexar_documento_rejeita_tamanho_excedido(): void
    {
        $arquivoGrande = UploadedFile::fake()->create('documento_gigante.pdf', 25000, 'application/pdf');

        $response = $this->como($this->userA, $this->tenantA)
            ->postJson("/api/protocolo/processos/{$this->procA->id}/documentos", [
                'tipo_documento' => 'anexo',
                'arquivo' => $arquivoGrande,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['arquivo']);
    }

    public function test_download_documento_com_hash_header(): void
    {
        $conteudo = 'conteudo para download e hash';
        $arquivo = UploadedFile::fake()->createWithContent('oficio.pdf', $conteudo);

        $uploadResp = $this->como($this->userA, $this->tenantA)
            ->postJson("/api/protocolo/processos/{$this->procA->id}/documentos", [
                'tipo_documento' => 'oficio',
                'arquivo' => $arquivo,
            ]);

        $docId = $uploadResp->json('id');
        $hashEsperado = hash('sha256', $conteudo);

        $downloadResp = $this->como($this->userA, $this->tenantA)
            ->get("/api/protocolo/documentos/{$docId}/download");

        $downloadResp->assertStatus(200)
            ->assertHeader('X-SHA256', $hashEsperado);
    }

    public function test_download_documento_cross_tenant_retorna_404(): void
    {
        $conteudo = 'documento secreto A';
        $arquivo = UploadedFile::fake()->createWithContent('secreto.pdf', $conteudo);

        $uploadResp = $this->como($this->userA, $this->tenantA)
            ->postJson("/api/protocolo/processos/{$this->procA->id}/documentos", [
                'tipo_documento' => 'secreto',
                'arquivo' => $arquivo,
            ]);

        $docId = $uploadResp->json('id');

        // userB do Tenant B tenta baixar o documento do Tenant A -> 404
        $downloadResp = $this->como($this->userB, $this->tenantB)
            ->get("/api/protocolo/documentos/{$docId}/download");

        $downloadResp->assertStatus(404);
    }

    public function test_remover_documento_soft_delete(): void
    {
        $arquivo = UploadedFile::fake()->create('oficio_cancelado.pdf', 100, 'application/pdf');

        $uploadResp = $this->como($this->userA, $this->tenantA)
            ->postJson("/api/protocolo/processos/{$this->procA->id}/documentos", [
                'tipo_documento' => 'oficio',
                'arquivo' => $arquivo,
            ]);

        $docId = $uploadResp->json('id');

        $deleteResp = $this->como($this->userA, $this->tenantA)
            ->deleteJson("/api/protocolo/processos/{$this->procA->id}/documentos/{$docId}");

        $deleteResp->assertStatus(200);

        self::assertNotNull(Documento::withTrashed()->find($docId)->deleted_at);
        self::assertFalse(Documento::where('id', $docId)->exists());
    }

    // ── ATRIBUTOS DINÂMICOS ───────────────────────────────────────────────

    public function test_adicionar_atributos_dos_7_tipos(): void
    {
        $cenarios = [
            ['chave' => 'attr_numerico', 'tipo_atributo' => 'numerico', 'valor' => 12345],
            ['chave' => 'attr_texto', 'tipo_atributo' => 'texto', 'valor' => 'Texto curto de teste'],
            ['chave' => 'attr_lista', 'tipo_atributo' => 'lista', 'valor' => 'opcao_homologada'],
            ['chave' => 'attr_lista_multipla', 'tipo_atributo' => 'lista_multipla', 'valor' => ['opcao_1', 'opcao_2', 'opcao_3']],
            ['chave' => 'attr_data', 'tipo_atributo' => 'data', 'valor' => '2026-10-15'],
            ['chave' => 'attr_decimal', 'tipo_atributo' => 'decimal', 'valor' => '1520.75'],
            ['chave' => 'attr_texto_longo', 'tipo_atributo' => 'texto_longo', 'valor' => str_repeat('Texto longo detalhado. ', 50)],
        ];

        foreach ($cenarios as $c) {
            $response = $this->como($this->userA, $this->tenantA)
                ->postJson("/api/protocolo/processos/{$this->procA->id}/atributos", $c);

            $response->assertStatus(201)
                ->assertJsonPath('chave', $c['chave'])
                ->assertJsonPath('tipo_atributo', $c['tipo_atributo']);
        }

        self::assertSame(7, $this->procA->atributos()->count());
    }

    public function test_rejeita_chave_duplicada_no_mesmo_processo(): void
    {
        $this->como($this->userA, $this->tenantA)
            ->postJson("/api/protocolo/processos/{$this->procA->id}/atributos", [
                'chave' => 'prioridade',
                'tipo_atributo' => 'texto',
                'valor' => 'alta',
            ]);

        $segundaTentativa = $this->como($this->userA, $this->tenantA)
            ->postJson("/api/protocolo/processos/{$this->procA->id}/atributos", [
                'chave' => 'prioridade',
                'tipo_atributo' => 'texto',
                'valor' => 'media',
            ]);

        $segundaTentativa->assertStatus(422)
            ->assertJsonValidationErrors(['chave']);
    }

    public function test_rejeita_valores_incompativeis_com_o_tipo(): void
    {
        $casosInvalidos = [
            ['chave' => 'v1', 'tipo_atributo' => 'decimal', 'valor' => 'abc_nao_decimal'],
            ['chave' => 'v2', 'tipo_atributo' => 'data', 'valor' => '31/02/2026'],
            ['chave' => 'v3', 'tipo_atributo' => 'lista', 'valor' => ['array_invalido_para_lista']],
            ['chave' => 'v4', 'tipo_atributo' => 'lista_multipla', 'valor' => 'string_invalida_para_lista_multipla'],
            ['chave' => 'v5', 'tipo_atributo' => 'numerico', 'valor' => 'cento_e_vinte'],
        ];

        foreach ($casosInvalidos as $caso) {
            $response = $this->como($this->userA, $this->tenantA)
                ->postJson("/api/protocolo/processos/{$this->procA->id}/atributos", $caso);

            $response->assertStatus(422)
                ->assertJsonValidationErrors(['valor']);
        }
    }

    public function test_remover_atributo_por_chave(): void
    {
        $this->como($this->userA, $this->tenantA)
            ->postJson("/api/protocolo/processos/{$this->procA->id}/atributos", [
                'chave' => 'campo_temporario',
                'tipo_atributo' => 'texto',
                'valor' => 'valor',
            ]);

        self::assertTrue($this->procA->atributos()->where('chave', 'campo_temporario')->exists());

        $deleteResp = $this->como($this->userA, $this->tenantA)
            ->deleteJson("/api/protocolo/processos/{$this->procA->id}/atributos/campo_temporario");

        $deleteResp->assertStatus(200);

        self::assertFalse($this->procA->atributos()->where('chave', 'campo_temporario')->exists());
    }
}
