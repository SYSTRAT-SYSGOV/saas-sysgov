<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Tenant;
use App\Notificacoes\ResolvedorIdentidade;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Layout base e identidade visual das mensagens (tarefa 1.5, design D4). */
final class ResolvedorIdentidadeTest extends TestCase
{
    use RefreshDatabase;

    public function test_mensagem_com_a_identidade_do_orgao(): void
    {
        $tenant = Tenant::create([
            'name' => 'Prefeitura X', 'slug' => 'pref-x-identidade', 'type' => 'prefeitura', 'status' => 'active',
            'settings' => ['portalTitle' => 'Portal da Prefeitura X', 'customPrimaryColor' => '#112233', 'customLogoUrl' => 'https://x.example/logo.png', 'hideProviderSignature' => true],
        ]);

        $identidade = app(ResolvedorIdentidade::class)->resolver($tenant);
        $html = view('components.email-layout', ['identidade' => $identidade, 'slot' => 'Conteúdo de teste'])->render();

        $this->assertSame('Portal da Prefeitura X', $identidade->titulo);
        $this->assertStringContainsString('Portal da Prefeitura X', $html);
        $this->assertStringContainsString('#112233', $html);
        $this->assertStringContainsString('https://x.example/logo.png', $html);
        $this->assertStringContainsString('Conteúdo de teste', $html);
        $this->assertStringNotContainsString('Não responda este e-mail', $html, 'hideProviderSignature deveria ocultar o rodapé.');
    }

    public function test_mensagem_sem_orgao(): void
    {
        $identidade = app(ResolvedorIdentidade::class)->resolver(null);
        $html = view('components.email-layout', ['identidade' => $identidade, 'slot' => 'Conteúdo de teste'])->render();

        $this->assertSame('SYSGOV', $identidade->titulo);
        $this->assertNull($identidade->corPrimaria);
        $this->assertNull($identidade->logoUrl);
        $this->assertFalse($identidade->assinaturaOculta);
        $this->assertStringContainsString('SYSGOV', $html);
        $this->assertStringContainsString('Não responda este e-mail', $html);
    }

    public function test_orgao_sem_customizacao_usa_o_nome_e_a_cor_padrao(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Sem Customização', 'slug' => 'pref-sem-custom', 'type' => 'prefeitura', 'status' => 'active']);

        $identidade = app(ResolvedorIdentidade::class)->resolver($tenant);

        $this->assertSame('Prefeitura Sem Customização', $identidade->titulo);
        $this->assertNull($identidade->corPrimaria);
        $this->assertFalse($identidade->assinaturaOculta);
    }
}
