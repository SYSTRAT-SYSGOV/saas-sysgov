<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Tests\PessoasTestCase;

final class ContatoPrincipalRegraTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_novo_contato_principal_desmarca_anterior_do_mesmo_tipo(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Lucas Silva', 'cpf' => $this->cpfValido()]);
        $admin = $this->como($this->admin($this->tenant), $this->tenant);

        // 1º celular (principal)
        $admin->postJson("/api/pessoas/{$pessoa->id}/contatos", [
            'tipo' => 'celular',
            'valor' => '(41) 99999-1111',
            'principal' => true,
        ])->assertCreated();

        $c1 = $pessoa->contatos()->first();
        self::assertTrue($c1->principal);

        // 2º celular (principal = true)
        $admin->postJson("/api/pessoas/{$pessoa->id}/contatos", [
            'tipo' => 'celular',
            'valor' => '(41) 99999-2222',
            'principal' => true,
        ])->assertCreated();

        self::assertFalse($c1->refresh()->principal);
        self::assertTrue($pessoa->contatos()->where('valor', '(41) 99999-2222')->first()->principal);
    }

    public function test_atualizar_contato_secundario_para_principal_desmarca_o_outro(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Lucas Silva', 'cpf' => $this->cpfValido()]);
        $c1 = $pessoa->contatos()->create(['tipo' => 'email', 'valor' => 'um@teste.gov.br', 'principal' => true]);
        $c2 = $pessoa->contatos()->create(['tipo' => 'email', 'valor' => 'dois@teste.gov.br', 'principal' => false]);

        $admin = $this->como($this->admin($this->tenant), $this->tenant);

        $admin->putJson("/api/pessoas/{$pessoa->id}/contatos/{$c2->id}", [
            'principal' => true,
        ])->assertOk();

        self::assertFalse($c1->refresh()->principal);
        self::assertTrue($c2->refresh()->principal);
    }

    public function test_excluir_contato_principal_promove_automaticamente_outro_do_mesmo_tipo(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Lucas Silva', 'cpf' => $this->cpfValido()]);
        $c1 = $pessoa->contatos()->create(['tipo' => 'celular', 'valor' => '(41) 98888-1111', 'principal' => true]);
        $c2 = $pessoa->contatos()->create(['tipo' => 'celular', 'valor' => '(41) 98888-2222', 'principal' => false]);

        $admin = $this->como($this->admin($this->tenant), $this->tenant);

        // Exclui c1 (que é o principal)
        $admin->deleteJson("/api/pessoas/{$pessoa->id}/contatos/{$c1->id}")
            ->assertOk();

        self::assertSame(1, $pessoa->contatos()->count());
        // c2 deve ter sido promovido a principal automaticamente
        self::assertTrue($c2->refresh()->principal);
    }
}
