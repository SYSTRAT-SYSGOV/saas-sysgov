<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\OrgScope;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * Tarefa 2.5 — isolamento do papel `participante_externo_cursos` (design D6): sem outros papéis
 * e sem nenhum módulo além de Cursos habilitado pro tenant de teste, uma rota autenticada de
 * cada outro módulo tem que recusar com 403 — nunca "cair" pra acesso liberado por falta de
 * verificação. Cenário "Externo não acessa outros módulos".
 */
final class IsolamentoExternoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $externo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->externo = $this->usuario($this->tenant, ['participante_externo_cursos'], 'Externo Ativo');
    }

    /**
     * Uma rota autenticada e protegida de cada módulo de negócio além do Cursos — o tenant de
     * teste só tem o Cursos habilitado (`criarTenant` não liga os outros), então module-access
     * já barra sozinho. Cobre 8 dos 9 outros módulos do monorepo (`ls Modules/`).
     *
     * Capd fica de fora de propósito: o módulo não tem `module-access:` nas rotas nem devolve
     * 403 pra usuário sem papel — cada controller filtra a query pelo próprio id (padrão
     * diferente, não é bug em si). MAS ao testar isso encontrei um bug real e sério nesse
     * caminho: `AvaliacaoController::index()` (Modules/Capd/Http/Controllers/AvaliacaoController.php,
     * ~linha 91-97) só filtra por `avaliador_id` quando o usuário JÁ TEM alguma avaliação
     * atribuída; se não tem nenhuma (como este externo, ou qualquer usuário sem papel de
     * avaliador), a query fica SEM filtro nenhum e devolve todas as avaliações de desempenho do
     * tenant — nota final, devolutiva etc. de todos os servidores. Reportado ao usuário no chat;
     * não corrigido aqui (módulo/domínio diferentes desta mudança, e é código sensível de RH que
     * merece revisão própria).
     *
     * @return iterable<string, array{string, string}>
     */
    public static function rotasDeOutrosModulos(): iterable
    {
        yield 'Admin (platform-admin)' => ['GET', '/api/admin/tenants'];
        yield 'Cemiterios' => ['GET', '/api/cemiterios/auditoria'];
        yield 'Client (admin-tenant)' => ['GET', '/api/client/menus'];
        yield 'Contracts' => ['GET', '/api/contracts'];
        yield 'Finance' => ['GET', '/api/finance/summary'];
        yield 'Licita' => ['GET', '/api/licita/processos'];
        yield 'OrgChart' => ['GET', '/api/org-units'];
        yield 'Procurement' => ['GET', '/api/licitacoes'];
    }

    #[DataProvider('rotasDeOutrosModulos')]
    public function test_externo_nao_acessa_outros_modulos(string $metodo, string $uri): void
    {
        $resposta = $this->actingAs($this->externo)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->json($metodo, $uri);

        $resposta->assertForbidden();
    }

    public function test_org_scope_sem_unidade_nunca_vira_acesso_irrestrito(): void
    {
        $escopo = app(OrgScope::class)->unitIdsFor($this->externo, $this->tenant->id);

        // null significaria "todas as unidades" (design D6): o externo sem vínculo nenhum em
        // org_unit_user tem que cair no caminho de lista vazia (bloqueia tudo), nunca em null.
        $this->assertNotNull($escopo, 'primary_org_unit_id ausente não pode virar acesso irrestrito no OrgScope.');
        $this->assertSame([], $escopo);
    }
}
