<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Models\SucessaoDocumento;
use Modules\Cemiterios\Policies\SucessaoPolicy;
use Modules\Cemiterios\Support\TipoDocumentoSucessao;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

final class SucessaoPolicyTest extends CemiteriosTestCase
{
    private Tenant $tenant;
    private SucessaoPolicy $policy;
    private Sucessao $sucessao;
    private SucessaoDocumento $documento;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->policy = new SucessaoPolicy();

        $jazigo = $this->novoJazigo(concedido: false);
        $titular = Concessionario::create([
            'nome' => 'Titular Policy',
            'tipo_doc' => 'cpf',
            'documento' => $this->cpfValido(),
            'documento_hash' => hash('sha256', 'policy-' . uniqid()),
        ]);
        $concessao = Concessao::create([
            'numero' => 'CON-POL-' . uniqid(),
            'plot_id' => $jazigo->id,
            'holder_id' => $titular->id,
            'tipo' => 'perpetua',
            'data_inicio' => '2000-01-01',
            'estado' => 'Ativa',
        ]);
        $this->sucessao = Sucessao::create([
            'concession_id' => $concessao->id,
            'park_id' => $jazigo->park_id,
            'plot_id' => $jazigo->id,
            'via' => 'inventario_extrajudicial',
            'estado' => 'solicitada',
            'lock_version' => 1,
        ]);
        $this->documento = SucessaoDocumento::create([
            'sucessao_id' => $this->sucessao->id,
            'tipo' => TipoDocumentoSucessao::CertidaoObito,
            'arquivo' => 'doc.pdf',
            'hash' => hash('sha256', 'x'),
        ]);
    }

    public function test_usuario_com_view_pode_visualizar(): void
    {
        $usuario = $this->usuario($this->tenant, ['cemiterios.sucessao.view']);
        app(TenantContext::class)->set($this->tenant);

        self::assertTrue($this->policy->viewAny($usuario));
        self::assertTrue($this->policy->view($usuario, $this->sucessao));
        self::assertTrue($this->policy->viewDocument($usuario, $this->sucessao, $this->documento));
        self::assertTrue($this->policy->downloadDocument($usuario, $this->sucessao, $this->documento));
    }

    public function test_usuario_apenas_com_view_nao_pode_gerenciar(): void
    {
        $usuario = $this->usuario($this->tenant, ['cemiterios.sucessao.view']);
        app(TenantContext::class)->set($this->tenant);

        self::assertFalse($this->policy->create($usuario));
        self::assertFalse($this->policy->update($usuario, $this->sucessao));
        self::assertFalse($this->policy->delete($usuario, $this->sucessao));
        self::assertFalse($this->policy->transition($usuario, $this->sucessao));
        self::assertFalse($this->policy->restore($usuario, $this->sucessao));
        self::assertFalse($this->policy->forceDelete($usuario, $this->sucessao));
    }

    public function test_usuario_com_manage_pode_criar_atualizar_e_excluir(): void
    {
        $usuario = $this->usuario($this->tenant, ['cemiterios.sucessao.manage']);
        app(TenantContext::class)->set($this->tenant);

        self::assertTrue($this->policy->create($usuario));
        self::assertTrue($this->policy->update($usuario, $this->sucessao));
        self::assertTrue($this->policy->delete($usuario, $this->sucessao));
        self::assertTrue($this->policy->restore($usuario, $this->sucessao));
        self::assertTrue($this->policy->forceDelete($usuario, $this->sucessao));
    }

    public function test_usuario_com_manage_nao_pode_transicionar_sem_permissao_especifica(): void
    {
        $usuario = $this->usuario($this->tenant, ['cemiterios.sucessao.manage']);
        app(TenantContext::class)->set($this->tenant);

        self::assertFalse($this->policy->transition($usuario, $this->sucessao));
    }

    public function test_usuario_com_transition_pode_transicionar(): void
    {
        $usuario = $this->usuario($this->tenant, ['cemiterios.sucessao.transition']);
        app(TenantContext::class)->set($this->tenant);

        self::assertTrue($this->policy->transition($usuario, $this->sucessao));
    }

    public function test_usuario_sem_nenhuma_permissao_de_sucessao_nao_pode_nada(): void
    {
        $usuario = $this->usuario($this->tenant, []);
        app(TenantContext::class)->set($this->tenant);

        self::assertFalse($this->policy->viewAny($usuario));
        self::assertFalse($this->policy->view($usuario, $this->sucessao));
        self::assertFalse($this->policy->create($usuario));
        self::assertFalse($this->policy->update($usuario, $this->sucessao));
        self::assertFalse($this->policy->delete($usuario, $this->sucessao));
        self::assertFalse($this->policy->transition($usuario, $this->sucessao));
    }

    public function test_permissao_de_um_tenant_nao_vale_em_outro(): void
    {
        $usuarioTenantA = $this->usuario($this->tenant, ['cemiterios.sucessao.manage']);
        $tenantB = $this->criarTenant('policy-b');

        app(TenantContext::class)->set($tenantB);

        self::assertFalse($this->policy->create($usuarioTenantA));
    }
}
