<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Isolamento por tenant de todas as tabelas do módulo (spec: Requirement "Isolamento por tenant"). */
final class TenantIsolationTest extends PessoasTestCase
{
    public function test_tenant_b_nao_le_nenhuma_tabela_do_tenant_a(): void
    {
        [$a, $b] = [$this->criarTenant('tenant-a'), $this->criarTenant('tenant-b')];
        $this->popular($a);

        foreach ($this->modelos() as $modelo) {
            $this->noTenant($a);
            self::assertGreaterThan(0, $modelo::count(), "O cenário deveria popular {$modelo} no tenant A.");
            $idA = $modelo::query()->value('id');

            $this->noTenant($b);
            self::assertSame(0, $modelo::count(), "{$modelo} vazou para o tenant B.");
            self::assertNull($modelo::find($idA), "{$modelo} #{$idA} de A é encontrado em B.");
        }
    }

    public function test_nao_cria_registro_sem_tenant(): void
    {
        app(TenantContext::class)->clear();
        $this->expectException(\LogicException::class);
        Pessoa::create(['nome' => 'Órfã', 'cpf' => $this->cpfValido()]);
    }

    private function popular(Tenant $tenant): void
    {
        $this->noTenant($tenant);

        $pessoa = Pessoa::create(['nome' => 'Pessoa A', 'cpf' => $this->cpfValido()]);
        $pessoa->vinculos()->create(['tipo_vinculo' => 'municipe', 'inicio' => today()->toDateString()]);
        $pessoa->documentos()->create(['tipo' => 'rg', 'numero' => '1111111']);
        $pessoa->enderecos()->create(['cep' => '80000-000', 'cidade' => 'Curitiba', 'uf' => 'PR']);
        $pessoa->contatos()->create(['tipo' => 'email', 'valor' => 'a@teste.gov.br', 'principal' => true]);

        $usuario = User::create(['name' => 'Usuário A', 'email' => 'usuario-a-' . $tenant->id . '@teste.gov.br', 'password' => bcrypt('secret')]);
        $pessoa->usuario()->create(['user_id' => $usuario->id, 'promovido_em' => now()]);

        $integracao = \Modules\Pessoas\Models\PessoaIntegracao::create(['nome' => 'Cadastro Único Municipal', 'driver' => 'generic_rest']);
        \Modules\Pessoas\Models\PessoaSyncLog::create(['integracao_id' => $integracao->id, 'status' => 'sucesso']);
    }

    /** @return list<class-string<Model>> */
    private function modelos(): array
    {
        return array_map(
            fn (string $arquivo) => 'Modules\\Pessoas\\Models\\' . basename($arquivo, '.php'),
            glob(__DIR__ . '/../../Models/*.php') ?: [],
        );
    }
}
