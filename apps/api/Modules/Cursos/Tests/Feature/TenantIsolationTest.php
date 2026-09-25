<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Modules\Cursos\Models\Aula;
use Modules\Cursos\Models\AulaAgendamento;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Formacao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\Presenca;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Teste de isolamento obrigatório (contrato de módulo SYSGOV): o mesmo
 * cenário montado nos tenants A e B nunca cruza dados, para TODOS os models
 * do módulo.
 */
final class TenantIsolationTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    /** @var list<class-string<Model>> */
    private const MODELS = [
        ModeloCertificado::class, Curso::class, Formacao::class, Turma::class, Aula::class,
        AulaAgendamento::class, Participante::class, Inscricao::class, Presenca::class, Certificado::class,
    ];

    public function test_todos_os_models_do_modulo_sao_isolados_entre_tenants(): void
    {
        $tenantA = $this->criarTenant('prefeitura-a', comModulo: false);
        $tenantB = $this->criarTenant('prefeitura-b', comModulo: false);

        $idsA = $this->noTenant($tenantA, fn () => $this->montarCenario('A'));
        $this->noTenant($tenantB, fn () => $this->montarCenario('B'));

        foreach (self::MODELS as $model) {
            $this->noTenant($tenantB, function () use ($model, $idsA, $tenantB): void {
                $this->assertSame(1, $model::count(), "{$model}: o tenant B deveria ver só o próprio registro.");
                $this->assertNull($model::find($idsA[$model]), "{$model}: o tenant B não pode encontrar o registro do tenant A pelo id.");
                $this->assertSame($tenantB->id, $model::firstOrFail()->tenant_id);
            });
        }

        $this->noTenant($tenantA, fn () => $this->assertSame('Curso A', Curso::firstOrFail()->titulo));
    }

    public function test_nao_cria_registro_sem_tenant(): void
    {
        app(TenantContext::class)->clear();
        $this->expectException(LogicException::class);

        Curso::create(['titulo' => 'Órfão', 'carga_horaria_minutos' => 60]);
    }

    public function test_codigo_de_certificado_e_unico_entre_tenants(): void
    {
        $tenantA = $this->criarTenant('prefeitura-a', comModulo: false);
        $tenantB = $this->criarTenant('prefeitura-b', comModulo: false);
        $this->noTenant($tenantA, fn () => $this->montarCenario('A', codigo: 'ABCD1234EFGH'));

        $this->expectException(QueryException::class);
        $this->noTenant($tenantB, fn () => $this->montarCenario('B', codigo: 'ABCD1234EFGH'));
    }

    /**
     * @return array<class-string<Model>, int> id de cada registro criado
     */
    private function montarCenario(string $sufixo, ?string $codigo = null): array
    {
        $user = \App\Models\User::create(['name' => "Servidor {$sufixo}", 'email' => "servidor-{$sufixo}@teste.gov.br", 'password' => bcrypt('x')]);

        $modelo = ModeloCertificado::create(['nome' => "Modelo {$sufixo}", 'titulo' => 'Certificado', 'corpo' => 'Certificamos que {{participante}} concluiu {{curso}}.', 'padrao' => true]);
        $curso = Curso::create(['titulo' => "Curso {$sufixo}", 'carga_horaria_minutos' => 240, 'modelo_certificado_id' => $modelo->id]);
        $formacao = Formacao::create(['titulo' => "Formação {$sufixo}"]);
        $formacao->cursos()->attach($curso->id, ['tenant_id' => $curso->tenant_id, 'ordem' => 1, 'obrigatorio' => true]);
        $turma = Turma::create([
            'curso_id' => $curso->id, 'nome' => "Turma {$sufixo}", 'data_inicio' => '2026-10-01', 'data_fim' => '2026-10-31',
            'inscricoes_inicio' => '2026-09-01 00:00:00', 'inscricoes_fim' => '2026-09-30 23:59:59', 'vagas' => 20, 'modalidade' => 'online', 'link' => 'https://meet.example/abc',
        ]);
        $turma->instrutores()->attach($user->id, ['tenant_id' => $turma->tenant_id]);
        $aula = Aula::create(['curso_id' => $curso->id, 'titulo' => 'Aula 1', 'duracao_minutos' => 120]);
        $agendamento = AulaAgendamento::create(['turma_id' => $turma->id, 'aula_id' => $aula->id, 'inicio' => '2026-10-05 09:00:00', 'fim' => '2026-10-05 11:00:00']);
        $participante = Participante::create(['user_id' => $user->id, 'nome' => $user->name, 'email' => $user->email]);
        $inscricao = Inscricao::create(['turma_id' => $turma->id, 'participante_id' => $participante->id, 'status' => 'confirmada']);
        $presenca = Presenca::create(['agendamento_id' => $agendamento->id, 'inscricao_id' => $inscricao->id, 'presente' => true, 'origem' => 'manual']);
        $certificado = Certificado::create([
            'codigo' => $codigo ?? strtoupper(substr(md5($sufixo), 0, 12)), 'tipo' => 'curso', 'participante_id' => $participante->id,
            'inscricao_id' => $inscricao->id, 'modelo_id' => $modelo->id, 'dados' => ['participante' => $user->name], 'emitido_em' => now(),
        ]);

        return [
            ModeloCertificado::class => $modelo->id, Curso::class => $curso->id, Formacao::class => $formacao->id,
            Turma::class => $turma->id, Aula::class => $aula->id, AulaAgendamento::class => $agendamento->id,
            Participante::class => $participante->id, Inscricao::class => $inscricao->id, Presenca::class => $presenca->id,
            Certificado::class => $certificado->id,
        ];
    }
}
