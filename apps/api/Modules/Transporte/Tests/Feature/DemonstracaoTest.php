<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Database\Seeders\TransporteDadosDemonstracaoSeeder;
use Modules\Transporte\Models\Alocacao;
use Modules\Transporte\Models\Empresa;
use Modules\Transporte\Models\Motorista;
use Modules\Transporte\Models\Parada;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class DemonstracaoTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    /** Escola com alunos suficientes para lotar as quatro rotas (22 + 15 + 28 + 6 = 71). */
    private function cenario(): \App\Models\Tenant
    {
        $t = $this->criarTenant();
        $escola = $this->criarEscola($t);
        foreach (range(1, 75) as $n) {
            $this->criarAluno($t, $escola, "Aluno {$n}");
        }

        return $t;
    }

    public function test_primeira_execucao_cria_rotas_nas_tres_faixas_e_alertas(): void
    {
        $t = $this->cenario();
        $coord = $this->usuario($t, ['transporte_coordenacao']);

        (new TransporteDadosDemonstracaoSeeder())->run($t->id);

        $this->noTenant($t, function (): void {
            $this->assertSame(3, Empresa::query()->count());
            $this->assertSame(4, Motorista::query()->count());
            $this->assertSame(5, Veiculo::query()->count());
            $this->assertSame(12, Parada::query()->count());
            $this->assertSame(4, Rota::query()->count());
            $this->assertSame(71, Alocacao::query()->whereNull('data_fim')->count());
        });
        $painel = $this->como($coord, $t)->getJson('/api/transporte/painel')->assertOk();
        $faixas = array_column($painel->json('data.rotas'), 'ocupacao');
        $this->assertEqualsCanonicalizing(['vermelho', 'amarelo', 'verde', 'verde'], array_column($faixas, 'faixa'));
        $painel->assertJsonPath('data.indicadores.rotas_superlotadas', 1)->assertJsonPath('data.indicadores.alunos_transportados', 71);
        $gravidades = array_unique(array_column($painel->json('data.alertas.data'), 'gravidade'));
        sort($gravidades);
        $this->assertSame(['atencao', 'critico'], $gravidades);
        $this->assertTrue(AuditLog::query()->where('action', 'alocacao.excesso_autorizado')->exists());
    }

    public function test_as_rotas_do_seeder_estao_regulares_e_o_vermelho_foi_por_excecao_autorizada(): void
    {
        $t = $this->cenario();
        $coord = $this->usuario($t, ['transporte_coordenacao']);

        (new TransporteDadosDemonstracaoSeeder())->run($t->id);

        $rotas = $this->como($coord, $t)->getJson('/api/transporte/rotas')->assertOk();
        foreach ($rotas->json('data') as $rota) {
            $this->assertTrue($rota['regular'], $rota['nome']);
            $this->assertNotNull($rota['veiculo']);
        }
        $porNome = array_column($rotas->json('data'), null, 'nome');
        $this->assertSame(28, $porNome['Rota Colônia Leste']['ocupacao']['alocados']);
        $this->assertSame(25, $porNome['Rota Colônia Leste']['ocupacao']['capacidade']);
        $this->noTenant($t, fn () => $this->assertSame(3, Alocacao::query()->whereNotNull('justificativa_excesso')->count()));
    }

    public function test_segunda_execucao_nao_faz_nada(): void
    {
        $t = $this->cenario();

        (new TransporteDadosDemonstracaoSeeder())->run($t->id);
        $antes = $this->noTenant($t, fn (): array => [Rota::query()->count(), Veiculo::query()->count(), Alocacao::query()->count(), AuditLog::query()->count()]);
        (new TransporteDadosDemonstracaoSeeder())->run($t->id);

        $this->assertSame($antes, $this->noTenant($t, fn (): array => [Rota::query()->count(), Veiculo::query()->count(), Alocacao::query()->count(), AuditLog::query()->count()]));
    }

    public function test_nao_cria_usuario_nem_senha(): void
    {
        $t = $this->cenario();
        $usuarios = User::query()->count();

        (new TransporteDadosDemonstracaoSeeder())->run($t->id);

        $this->assertSame($usuarios, User::query()->count());
    }

    public function test_sem_escola_ou_sem_tenant_nao_semeia_nem_quebra(): void
    {
        $t = $this->criarTenant();

        (new TransporteDadosDemonstracaoSeeder())->run($t->id);
        (new TransporteDadosDemonstracaoSeeder())->run(999999);

        $this->noTenant($t, fn () => $this->assertSame(0, Rota::query()->count()));
    }

    public function test_com_poucos_alunos_aloca_so_os_que_existem(): void
    {
        $t = $this->criarTenant();
        $escola = $this->criarEscola($t);
        foreach (range(1, 10) as $n) {
            $this->criarAluno($t, $escola, "Aluno {$n}");
        }

        (new TransporteDadosDemonstracaoSeeder())->run($t->id);

        $this->noTenant($t, function (): void {
            $this->assertSame(4, Rota::query()->count());
            $this->assertSame(10, Alocacao::query()->count());
        });
    }
}
