<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Comissao;
use Modules\Capd\Models\Sessao;
use Tests\TestCase;

/**
 * Middleware ValidateIcpCertificate (spec: digital-signature — tarefa 1.2).
 * Sessões de ciclo `sha256` (padrão, gratuito) não usam certificado; só
 * ciclos `icp_brasil` exigem e validam de fato via PSC.
 */
final class ValidateIcpCertificateTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private Comissao $comissao;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura Certificado Teste', 'slug' => 'pref-cert-teste',
            'type' => 'prefeitura', 'status' => 'active',
            'settings' => ['icp_brasil_api_url' => 'https://api.psc-mock.com/v1', 'icp_brasil_api_key' => 'test_key'],
        ]);
        app(TenantContext::class)->set($this->tenant);

        $this->user = User::create(['name' => 'Servidor Teste', 'email' => 'servidor@cert.pr.gov.br', 'password' => bcrypt('secret')]);
        $this->user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $this->tenant->id, 'ano_referencia' => 2026, 'nome' => 'Ciclo Certificado',
            'data_inicio_avaliacao' => '2026-01-01', 'data_fim_avaliacao' => '2026-06-30', 'data_limite_recurso' => '2026-07-31',
            'status' => CicloAvaliacao::STATUS_DELIBERACAO, 'tipo_assinatura_ata' => 'sha256',
        ]);
        $this->comissao = Comissao::create([
            'tenant_id' => $this->tenant->id, 'ciclo_id' => $ciclo->id, 'numero_portaria' => 'Portaria 1/2026',
            'data_publicacao_portaria' => '2026-01-02', 'ativa' => true,
        ]);
    }

    /** @return array<string, string> */
    private function headers(): array
    {
        return ['X-Tenant-ID' => (string) $this->tenant->id];
    }

    private function criarSessao(): Sessao
    {
        return Sessao::create([
            'tenant_id' => $this->tenant->id, 'comissao_id' => $this->comissao->id, 'tipo_sessao' => 'ordinaria',
            'data_sessao' => now(), 'quorum_presente' => 5, 'quorum_minimo' => 4, 'finalizada' => false,
        ]);
    }

    public function test_ciclo_sha256_nao_exige_certificado(): void
    {
        $sessao = $this->criarSessao();

        $response = $this->actingAs($this->user)->withHeaders($this->headers())
            ->postJson("/api/capd/sessoes/{$sessao->id}/selar-ata", [
                'ata_texto' => str_repeat('Ata lavrada em sessão colegiada da CAPD. ', 5),
            ]);

        $response->assertOk();
    }

    public function test_ciclo_icp_brasil_rejeita_sem_certificado(): void
    {
        $this->comissao->ciclo->update(['tipo_assinatura_ata' => 'icp_brasil']);
        $sessao = $this->criarSessao();

        $response = $this->actingAs($this->user)->withHeaders($this->headers())
            ->postJson("/api/capd/sessoes/{$sessao->id}/selar-ata", [
                'ata_texto' => str_repeat('Ata lavrada em sessão colegiada da CAPD. ', 5),
            ]);

        $response->assertStatus(422);
    }

    public function test_ciclo_icp_brasil_rejeita_certificado_expirado_ou_revogado(): void
    {
        Http::fake(['*/validate-certificate' => Http::response(['valid' => false])]);
        $this->comissao->ciclo->update(['tipo_assinatura_ata' => 'icp_brasil']);
        $sessao = $this->criarSessao();

        $response = $this->actingAs($this->user)->withHeaders($this->headers())
            ->postJson("/api/capd/sessoes/{$sessao->id}/selar-ata", [
                'ata_texto' => str_repeat('Ata lavrada em sessão colegiada da CAPD. ', 5),
                'certificado' => 'certificado_expirado',
            ]);

        $response->assertStatus(423);
    }

    public function test_ciclo_icp_brasil_aceita_certificado_valido_e_sela_via_psc(): void
    {
        Http::fake([
            '*/validate-certificate' => Http::response(['valid' => true]),
            '*/sign' => Http::response(['hash' => 'hash_psc', 'urlDocumentoAssinado' => 'https://psc-mock.com/d/1', 'certificadoSerial' => 'S-1', 'assinadoEm' => now()->toIso8601String()]),
        ]);
        $this->comissao->ciclo->update(['tipo_assinatura_ata' => 'icp_brasil']);
        $sessao = $this->criarSessao();

        $response = $this->actingAs($this->user)->withHeaders($this->headers())
            ->postJson("/api/capd/sessoes/{$sessao->id}/selar-ata", [
                'ata_texto' => str_repeat('Ata lavrada em sessão colegiada da CAPD. ', 5),
                'certificado' => 'certificado_valido',
            ]);

        $response->assertOk()->assertJsonPath('hash_ata_sha256', 'hash_psc');
    }
}
