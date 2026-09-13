<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Comissao;
use Modules\Capd\Models\Sessao;
use Modules\Capd\Services\HashAtaService;
use Tests\TestCase;

/**
 * TC-05: Integridade e Imutabilidade Criptográfica de Atas da CAPD (RN-C06).
 */
final class ImutabilidadeAtaTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private Comissao $comissao;
    private HashAtaService $hashAta;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Prefeitura Ata Teste',
            'slug'   => 'pref-ata-teste',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $ciclo = CicloAvaliacao::create([
            'tenant_id'             => $this->tenant->id,
            'ano_referencia'        => 2026,
            'nome'                  => 'Ciclo 2026',
            'data_inicio_avaliacao' => '2026-01-01',
            'data_fim_avaliacao'    => '2026-06-30',
            'data_limite_recurso'   => '2026-07-31',
            'status'                => CicloAvaliacao::STATUS_DELIBERACAO,
        ]);

        $this->comissao = Comissao::create([
            'tenant_id'                => $this->tenant->id,
            'ciclo_id'                 => $ciclo->id,
            'numero_portaria'          => 'Portaria 555/2026',
            'data_publicacao_portaria' => '2026-01-02',
            'ativa'                    => true,
        ]);

        $this->hashAta = app(HashAtaService::class);
    }

    public function test_tc05_sela_ata_com_hash_sha256_e_garante_integridade(): void
    {
        $sessao = Sessao::create([
            'tenant_id'       => $this->tenant->id,
            'comissao_id'     => $this->comissao->id,
            'tipo_sessao'     => 'ordinaria',
            'data_sessao'     => now(),
            'quorum_presente' => 5,
            'quorum_minimo'   => 4,
            'finalizada'      => false,
        ]);

        $textoOficial = "Aos 12 dias do mês de setembro de 2026, reuniu-se a CAPD da Prefeitura Municipal sob a Portaria 555/2026. Deliberados os recursos 1, 2 e 3 com votação unânime.";

        $hashGerado = $this->hashAta->selarAta($sessao, $textoOficial);

        self::assertSame(64, strlen($hashGerado), 'O hash gerado deve ser SHA-256 de 64 caracteres hexadecimais.');
        self::assertSame(hash('sha256', $textoOficial), $hashGerado);

        $sessaoAtualizada = $sessao->fresh();
        self::assertTrue($sessaoAtualizada->finalizada);
        self::assertTrue($this->hashAta->verificarIntegridade($sessaoAtualizada));
    }

    public function test_tc05_adulteracao_no_texto_da_ata_rompe_integridade(): void
    {
        $sessao = Sessao::create([
            'tenant_id'       => $this->tenant->id,
            'comissao_id'     => $this->comissao->id,
            'tipo_sessao'     => 'ordinaria',
            'data_sessao'     => now(),
            'quorum_presente' => 5,
            'quorum_minimo'   => 4,
            'finalizada'      => false,
        ]);

        $textoOriginal = "Texto autêntico lavrado em sessão colegiada da CAPD.";
        $this->hashAta->selarAta($sessao, $textoOriginal);

        // Simula tentativa de adulteração de um único caractere no texto persistido
        $sessaoAdulterada = $sessao->fresh();
        $sessaoAdulterada->ata_texto = "Texto autêntico lavrado em sessão colegiada da CAPD!"; // Ponto de exclamação no final

        self::assertFalse(
            $this->hashAta->verificarIntegridade($sessaoAdulterada),
            'Qualquer adulteração no texto da ata deve falhar imediatamente na checagem criptográfica SHA-256.'
        );
    }

    public function test_bloqueia_selagem_de_ata_sem_atingir_quorum_minimo(): void
    {
        $sessao = Sessao::create([
            'tenant_id'       => $this->tenant->id,
            'comissao_id'     => $this->comissao->id,
            'tipo_sessao'     => 'extraordinaria',
            'data_sessao'     => now(),
            'quorum_presente' => 2, // Quórum insuficiente
            'quorum_minimo'   => 4,
            'finalizada'      => false,
        ]);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Quórum insuficiente');

        $this->hashAta->selarAta($sessao, "Tentativa de lavrar ata sem quórum legal.");
    }
}
