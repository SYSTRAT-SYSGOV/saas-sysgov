<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Formacao;
use Modules\Cursos\Models\Material;
use Modules\Cursos\Models\Questao;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Requisito "Dados do módulo são isolados por tenant": toda rota com
 * {model} responde 404 para registro de outro órgão — inclusive para o
 * Administrador, que tem acesso total no próprio órgão.
 *
 * Regressão: com o grupo de middleware 'api' antes de 'tenant', o binding
 * carregava o registro sem o filtro do TenantAware e a rota respondia 200.
 */
final class IsolamentoRotasTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    public function test_toda_rota_com_model_responde_404_para_registro_de_outro_tenant(): void
    {
        $tenantA = $this->criarTenant('prefeitura-a');
        $adminA = $this->usuario($tenantA, ['admin_cursos']);

        $tenantB = $this->criarTenant('prefeitura-b');
        $adminB = $this->usuario($tenantB, ['admin_cursos']);
        $instrutorB = $this->usuario($tenantB, ['instrutor_cursos']);
        $participanteB = $this->usuario($tenantB, ['participante_cursos']);
        $cursoB = $this->cursoPublicado($tenantB);
        $turmaB = $this->turmaAberta($tenantB, $cursoB, $instrutorB);
        $aulaB = $this->aula($tenantB, $cursoB);
        $agendamentoB = $this->agendamento($tenantB, $turmaB, $aulaB, now()->addDays(12));
        $inscricaoB = $this->inscrever($tenantB, $turmaB, $participanteB);
        $formacaoB = $this->noTenant($tenantB, fn () => Formacao::create(['titulo' => 'Trilha B']));
        $materialB = $this->noTenant($tenantB, fn () => Material::create(['curso_id' => $cursoB->id, 'tipo' => 'texto', 'titulo' => 'Material B', 'conteudo' => '<p>x</p>', 'publicado' => true]));
        unset($adminB);

        $questaoB = $this->noTenant($tenantB, fn () => Questao::create(['curso_id' => $cursoB->id, 'tipo' => 'dissertativa', 'enunciado' => '<p>x</p>']));
        $avaliacaoB = $this->noTenant($tenantB, fn () => Avaliacao::create(['curso_id' => $cursoB->id, 'titulo' => 'Prova B']));

        $rotas = [
            ['get', "/api/cursos/cursos/{$cursoB->id}"],
            ['put', "/api/cursos/cursos/{$cursoB->id}"],
            ['delete', "/api/cursos/cursos/{$cursoB->id}"],
            ['post', "/api/cursos/cursos/{$cursoB->id}/status"],
            ['get', "/api/cursos/cursos/{$cursoB->id}/aulas"],
            ['get', "/api/cursos/cursos/{$cursoB->id}/turmas"],
            ['get', "/api/cursos/cursos/{$cursoB->id}/materiais"],
            ['post', "/api/cursos/cursos/{$cursoB->id}/materiais"],
            ['post', "/api/cursos/cursos/{$cursoB->id}/materiais/reordenar"],
            ['get', "/api/cursos/materiais/{$materialB->id}"],
            ['put', "/api/cursos/materiais/{$materialB->id}"],
            ['delete', "/api/cursos/materiais/{$materialB->id}"],
            ['post', "/api/cursos/materiais/{$materialB->id}/arquivo"],
            ['get', "/api/cursos/materiais/{$materialB->id}/arquivo"],
            ['get', "/api/cursos/cursos/{$cursoB->id}/questoes"],
            ['post', "/api/cursos/cursos/{$cursoB->id}/questoes"],
            ['get', "/api/cursos/questoes/{$questaoB->id}"],
            ['put', "/api/cursos/questoes/{$questaoB->id}"],
            ['delete', "/api/cursos/questoes/{$questaoB->id}"],
            ['post', "/api/cursos/questoes/{$questaoB->id}/desativar"],
            ['post', "/api/cursos/questoes/{$questaoB->id}/ativar"],
            ['get', "/api/cursos/cursos/{$cursoB->id}/avaliacoes"],
            ['post', "/api/cursos/cursos/{$cursoB->id}/avaliacoes"],
            ['get', "/api/cursos/avaliacoes/{$avaliacaoB->id}"],
            ['put', "/api/cursos/avaliacoes/{$avaliacaoB->id}"],
            ['delete', "/api/cursos/avaliacoes/{$avaliacaoB->id}"],
            ['post', "/api/cursos/avaliacoes/{$avaliacaoB->id}/publicar"],
            ['post', "/api/cursos/avaliacoes/{$avaliacaoB->id}/despublicar"],
            ['put', "/api/cursos/aulas/{$aulaB->id}"],
            ['delete', "/api/cursos/aulas/{$aulaB->id}"],
            ['get', "/api/cursos/formacoes/{$formacaoB->id}"],
            ['delete', "/api/cursos/formacoes/{$formacaoB->id}"],
            ['get', "/api/cursos/turmas/{$turmaB->id}"],
            ['post', "/api/cursos/turmas/{$turmaB->id}/cancelar"],
            ['get', "/api/cursos/turmas/{$turmaB->id}/inscricoes"],
            ['get', "/api/cursos/turmas/{$turmaB->id}/inscricoes/exportar"],
            ['post', "/api/cursos/turmas/{$turmaB->id}/inscricoes"],
            ['delete', "/api/cursos/agendamentos/{$agendamentoB->id}"],
            ['get', "/api/cursos/inscricoes/{$inscricaoB->id}"],
            ['post', "/api/cursos/inscricoes/{$inscricaoB->id}/cancelar"],
        ];

        foreach ($rotas as [$metodo, $url]) {
            $this->como($adminA, $tenantA)->json(strtoupper($metodo), $url)
                ->assertNotFound();
        }

        $this->assertSame('confirmada', $this->noTenant($tenantB, fn () => $inscricaoB->refresh()->status));
    }

    public function test_policy_nega_objeto_de_outro_tenant_mesmo_se_carregado_sem_filtro(): void
    {
        $tenantA = $this->criarTenant('prefeitura-a');
        $adminA = $this->usuario($tenantA, ['admin_cursos']);
        $tenantB = $this->criarTenant('prefeitura-b');
        $this->usuario($tenantB, ['admin_cursos']);
        $cursoB = $this->cursoPublicado($tenantB);

        $this->noTenant($tenantA, function () use ($adminA, $cursoB): void {
            $this->assertFalse(Gate::forUser($adminA)->allows('view', $cursoB));
            $this->assertFalse(Gate::forUser($adminA)->allows('update', $cursoB));
        });
    }
}
