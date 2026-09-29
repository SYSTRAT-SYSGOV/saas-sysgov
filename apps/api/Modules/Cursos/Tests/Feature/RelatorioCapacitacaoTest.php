<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;

/**
 * Relatórios do Cursos, tarefa 2.3 — relatório de capacitação por servidor.
 */
final class RelatorioCapacitacaoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
    }

    /**
     * Conclui $participante no $curso via uma turma nova, com certificado (revogado ou não).
     *
     * @param array<string, mixed> $atributosTurma
     */
    private function concluir(User $participante, Curso $curso, string $concluidaEm, bool $certificadoRevogado = false, ?array $atributosTurma = null): void
    {
        $turma = $this->turmaAberta($this->tenant, $curso, $this->instrutor, $atributosTurma ?? ['nome' => "Turma {$concluidaEm}"]);
        $inscricao = $this->inscrever($this->tenant, $turma, $participante);

        $this->noTenant($this->tenant, function () use ($inscricao, $concluidaEm, $certificadoRevogado): void {
            Inscricao::query()->whereKey($inscricao->id)->update(['status' => 'concluida', 'concluida_em' => $concluidaEm, 'frequencia_apurada' => 100]);
            Certificado::create([
                'tenant_id' => $this->tenant->id,
                'codigo' => 'CERT-' . $inscricao->id,
                'tipo' => 'curso',
                'participante_id' => $inscricao->participante_id,
                'inscricao_id' => $inscricao->id,
                'dados' => ['nota' => '—'],
                'emitido_em' => $concluidaEm,
                'revogado_em' => $certificadoRevogado ? now() : null,
            ]);
        });
    }

    private function unidade(string $path, string $nome, ?int $parentId = null): OrgUnit
    {
        return $this->noTenant($this->tenant, fn (): OrgUnit => OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'parent_id' => $parentId,
            'name' => $nome,
            'code' => 'UN-' . Str::random(8),
            'type' => 'departamento',
            'level' => substr_count($path, '.') + 1,
            'path' => $path,
        ]));
    }

    private function vincularUnidade(User $user, OrgUnit $unidade): void
    {
        $this->noTenant($this->tenant, fn (): OrgUnitUser => OrgUnitUser::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $unidade->id,
            'user_id' => $user->id,
            'role' => 'membro',
        ]));
    }

    /**
     * @param array<string, mixed> $filtros
     * @return array<string, mixed>
     */
    private function relatorio(array $filtros = []): array
    {
        return $this->como($this->admin, $this->tenant)
            ->getJson('/api/cursos/relatorios/capacitacao?' . http_build_query($filtros))
            ->assertOk()
            ->json();
    }

    /**
     * @param array<string, mixed> $relatorio
     * @return array<string, mixed>|null
     */
    private function linhaPorNome(array $relatorio, string $nome): ?array
    {
        /** @var array<int, array<string, mixed>> $dados */
        $dados = $relatorio['data'];

        return collect($dados)->firstWhere('nome', $nome);
    }

    public function test_horas_de_capacitacao(): void
    {
        $servidor = $this->usuario($this->tenant, ['participante_cursos'], 'Servidor');
        $cursoA = $this->cursoPublicado($this->tenant, ['titulo' => 'A', 'carga_horaria_minutos' => 480]);
        $cursoB = $this->cursoPublicado($this->tenant, ['titulo' => 'B', 'carga_horaria_minutos' => 960]);
        $this->concluir($servidor, $cursoA, '2025-03-01 10:00:00');
        $this->concluir($servidor, $cursoB, '2025-04-01 10:00:00');

        $relatorio = $this->relatorio();
        $linha = $this->linhaPorNome($relatorio, 'Servidor');

        $this->assertSame(2, $linha['cursos_concluidos']);
        $this->assertSame(1440, $linha['horas_capacitacao_minutos']);
    }

    public function test_certificado_revogado_nao_conta(): void
    {
        $servidor = $this->usuario($this->tenant, ['participante_cursos'], 'Servidor');
        $cursoA = $this->cursoPublicado($this->tenant, ['titulo' => 'A', 'carga_horaria_minutos' => 480]);
        $cursoB = $this->cursoPublicado($this->tenant, ['titulo' => 'B', 'carga_horaria_minutos' => 960]);
        $this->concluir($servidor, $cursoA, '2025-03-01 10:00:00');
        $this->concluir($servidor, $cursoB, '2025-04-01 10:00:00', certificadoRevogado: true);

        $relatorio = $this->relatorio();
        $linha = $this->linhaPorNome($relatorio, 'Servidor');

        // Continua "concluído" (não some o curso), mas as horas só contam o certificado válido.
        $this->assertSame(2, $linha['cursos_concluidos']);
        $this->assertSame(480, $linha['horas_capacitacao_minutos']);
    }

    public function test_filtro_por_periodo_de_conclusao(): void
    {
        $servidor = $this->usuario($this->tenant, ['participante_cursos'], 'Servidor');
        $curso = $this->cursoPublicado($this->tenant, ['carga_horaria_minutos' => 480]);
        $this->concluir($servidor, $curso, '2024-12-31 23:59:00', atributosTurma: ['nome' => 'Fora do período']);
        $this->concluir($servidor, $curso, '2025-06-15 10:00:00', atributosTurma: ['nome' => 'Dentro do período']);

        $relatorio = $this->relatorio(['inicio' => '2025-01-01', 'fim' => '2025-12-31']);
        $linha = $this->linhaPorNome($relatorio, 'Servidor');

        $this->assertSame(1, $linha['cursos_concluidos']);
        $this->assertSame(480, $linha['horas_capacitacao_minutos']);
    }

    public function test_servidor_sem_conclusao(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        $turma = $this->turmaAberta($this->tenant, $curso, $this->instrutor);
        $this->inscrever($this->tenant, $turma, $this->usuario($this->tenant, ['participante_cursos'], 'Confirmado'));

        $relatorio = $this->relatorio(['inicio' => '2020-01-01', 'fim' => '2020-12-31']);
        $linha = $this->linhaPorNome($relatorio, 'Confirmado');

        $this->assertNotNull($linha, 'o servidor com inscrição confirmada deve aparecer mesmo sem conclusão');
        $this->assertSame(0, $linha['cursos_concluidos']);
        $this->assertSame(0, $linha['horas_capacitacao_minutos']);
        $this->assertSame(1, $linha['cursos_em_andamento']);
    }

    public function test_filtro_por_unidade(): void
    {
        $raiz = $this->unidade('1', 'Prefeitura');
        $secretaria1 = $this->unidade('1.1', 'Secretaria 1', $raiz->id);
        $secretaria10 = $this->unidade('1.10', 'Secretaria 10', $raiz->id);
        $departamento = $this->unidade('1.1.1', 'Departamento da Secretaria 1', $secretaria1->id);

        $daSecretaria1 = $this->usuario($this->tenant, ['participante_cursos'], 'Da Secretaria 1');
        $daSecretaria10 = $this->usuario($this->tenant, ['participante_cursos'], 'Da Secretaria 10');
        $doDepartamento = $this->usuario($this->tenant, ['participante_cursos'], 'Do Departamento');

        $this->vincularUnidade($daSecretaria1, $secretaria1);
        $this->vincularUnidade($daSecretaria10, $secretaria10);
        $this->vincularUnidade($doDepartamento, $departamento);

        $curso = $this->cursoPublicado($this->tenant);
        $this->concluir($daSecretaria1, $curso, '2025-03-01 10:00:00');
        $this->concluir($daSecretaria10, $curso, '2025-03-01 10:00:00');
        $this->concluir($doDepartamento, $curso, '2025-03-01 10:00:00');

        $relatorio = $this->relatorio(['unidade_id' => $secretaria1->id]);
        /** @var array<int, array<string, mixed>> $dados */
        $dados = $relatorio['data'];
        $nomes = collect($dados)->pluck('nome')->all();

        $this->assertContains('Da Secretaria 1', $nomes, 'a própria unidade filtrada deve aparecer');
        $this->assertContains('Do Departamento', $nomes, 'subunidade por path deve aparecer');
        $this->assertNotContains('Da Secretaria 10', $nomes, '"1.1" não deve casar com "1.10" (prefixo de path)');
    }

    public function test_coluna_de_unidades_vinculadas(): void
    {
        $secretaria = $this->unidade('1', 'Secretaria de Educação');
        $servidor = $this->usuario($this->tenant, ['participante_cursos'], 'Servidor Vinculado');
        $this->vincularUnidade($servidor, $secretaria);

        $curso = $this->cursoPublicado($this->tenant);
        $this->concluir($servidor, $curso, '2025-03-01 10:00:00');

        $relatorio = $this->relatorio();
        $linha = $this->linhaPorNome($relatorio, 'Servidor Vinculado');

        $this->assertSame(['Secretaria de Educação'], $linha['unidades']);
    }

    public function test_endpoint_de_unidades_traz_id_nome_e_path(): void
    {
        $raiz = $this->unidade('1', 'Prefeitura');
        $this->unidade('1.1', 'Secretaria de Educação', $raiz->id);

        $unidades = $this->como($this->admin, $this->tenant)
            ->getJson('/api/cursos/relatorios/unidades')
            ->assertOk()
            ->json('data');

        $this->assertCount(2, $unidades);
        $this->assertSame(['id' => $raiz->id, 'nome' => 'Prefeitura', 'path' => '1'], $unidades[0]);
    }

    public function test_instrutor_nao_acessa_o_endpoint_de_unidades(): void
    {
        $this->como($this->instrutor, $this->tenant)->getJson('/api/cursos/relatorios/unidades')->assertForbidden();
    }

    public function test_instrutor_nao_acessa_o_relatorio_de_capacitacao(): void
    {
        $this->como($this->instrutor, $this->tenant)->getJson('/api/cursos/relatorios/capacitacao')->assertForbidden();
    }

    public function test_detalhe_do_servidor_traz_os_cursos_concluidos(): void
    {
        $servidor = $this->usuario($this->tenant, ['participante_cursos'], 'Servidor');
        $curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso X', 'carga_horaria_minutos' => 240]);
        $this->concluir($servidor, $curso, '2025-05-01 10:00:00');

        $participanteId = $this->noTenant($this->tenant, fn () => \Modules\Cursos\Models\Participante::query()->where('user_id', $servidor->id)->firstOrFail()->id);

        $detalhe = $this->como($this->admin, $this->tenant)
            ->getJson("/api/cursos/relatorios/capacitacao/{$participanteId}")
            ->assertOk()
            ->json();

        $this->assertCount(1, $detalhe['cursos']);
        $this->assertSame('Curso X', $detalhe['cursos'][0]['curso_titulo']);
        $this->assertTrue($detalhe['cursos'][0]['certificado_valido']);
    }
}
