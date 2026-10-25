<?php

declare(strict_types=1);

namespace Modules\Educa\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Admin\Models\Module;
use Modules\Educa\Database\Seeders\EducaRbacSeeder;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCensusExport;
use Modules\Educa\Models\EducaCensusValidation;
use Modules\Educa\Models\EducaClassEnrollment;
use Modules\Educa\Models\EducaCourse;
use Modules\Educa\Models\EducaCurriculumMatrix;
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Models\EducaEmployeeAllocation;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaStudentProfile;
use Modules\Educa\Services\CensusExportService;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class EducacensoAuditAndExportTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private array $authHeaders;
    private EducaSchool $escola;
    private EducaAcademicYear $anoLetivo;
    private EducaSchoolClass $turma;
    private Pessoa $pessoaAluno;
    private Pessoa $pessoaDocente;
    private EducaEmployee $docente;
    private EducaEnrollment $matricula;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura de Teste Censo',
            'slug' => 'pref-teste-censo',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        // Habilita módulos do catálogo no tenant
        foreach (['educa', 'educa-secretaria', 'educa-servidores', 'educa-educacenso'] as $alias) {
            $modulo = Module::firstOrCreate(
                ['alias' => $alias],
                ['name' => "SYS-Educa: {$alias}", 'description' => 'Test', 'enabled' => true]
            );
            $modulo->tenants()->syncWithoutDetaching([
                $this->tenant->id => ['enabled' => true],
            ]);
        }

        $this->seed(EducaRbacSeeder::class);

        $this->adminUser = User::factory()->create([
            'is_platform_admin' => true,
        ]);
        $this->tenant->users()->attach($this->adminUser->id, [
            'status' => 'active',
            'is_primary' => true,
        ]);

        $this->authHeaders = [
            'X-Tenant-Slug' => $this->tenant->slug,
            'Accept' => 'application/json',
        ];

        // 1. Estrutura Escolar e Ano Letivo
        $orgUnit = OrgUnit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'EMEF-CENSO',
            'name' => 'EMEF Monteiro Lobato',
            'type' => 'secretaria',
        ]);

        $this->escola = EducaSchool::create([
            'tenant_id' => $this->tenant->id,
            'org_unit_id' => $orgUnit->id,
            'codigo_inep' => '12345678',
            'sigla' => 'EMEF-ML',
            'situacao_funcionamento' => 'em_atividade',
            'dependencia_administrativa' => 'municipal',
            'zona' => 'urbana',
            'regulamentada' => true,
        ]);

        $this->anoLetivo = EducaAcademicYear::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'ano' => 2026,
            'status' => 'aberto',
            'data_inicio' => '2026-02-02',
            'data_fim' => '2026-12-18',
        ]);

        $curso = EducaCourse::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'EF-REG',
            'nome' => 'Ensino Fundamental',
            'nivel' => 'fundamental',
            'modalidade' => 'regular',
        ]);

        $serie = EducaGrade::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'sequencial' => 5,
            'codigo' => '5ANO',
            'nome' => '5º Ano',
        ]);

        $matriz = EducaCurriculumMatrix::create([
            'tenant_id' => $this->tenant->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'nome' => 'Matriz BNCC 5º Ano',
            'ano_vigencia' => 2026,
            'total_horas' => 800,
            'total_semanal' => 25,
            'ativo' => true,
        ]);

        $this->turma = EducaSchoolClass::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'matrix_id' => $matriz->id,
            'codigo' => 'TURMA-5A',
            'nome' => '5º Ano A',
            'sigla' => '5A',
            'turno' => 'matutino',
            'sala' => 'Sala 01',
            'lotacao_maxima' => 30,
            'lotacao_efetiva' => 1,
            'tipo_atendimento' => 'regular',
            'status' => 'aberta',
        ]);

        // 2. Docente e Alocação
        $this->pessoaDocente = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'PF',
            'nome' => 'Professor Carlos Alberto',
            'documento' => '12345678901',
            'data_nascimento' => '1985-05-10',
            'sexo' => 'M',
            'status' => 'ativo',
        ]);

        $this->docente = EducaEmployee::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->pessoaDocente->id,
            'carga_horaria_semanal' => 40.0,
            'escolaridade' => 'Superior Completo',
            'ativo' => true,
        ]);

        EducaEmployeeAllocation::create([
            'tenant_id' => $this->tenant->id,
            'employee_id' => $this->docente->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'turno' => 'matutino',
            'horas_regencia' => 26.0,
            'horas_atividade' => 14.0,
            'status' => 'ativa',
        ]);

        // 3. Aluno, Perfil e Matrícula
        $this->pessoaAluno = Pessoa::create([
            'tenant_id' => $this->tenant->id,
            'tipo' => 'PF',
            'nome' => 'Estudante Gabriel Souza',
            'documento' => '98765432100',
            'data_nascimento' => '2015-08-20',
            'sexo' => 'M',
            'status' => 'ativo',
        ]);

        EducaStudentProfile::create([
            'tenant_id' => $this->tenant->id,
            'pessoa_id' => $this->pessoaAluno->id,
            'transporte_escolar_publico' => false,
            'necessidades_especiais' => false,
        ]);

        $this->matricula = EducaEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'aluno_pessoa_id' => $this->pessoaAluno->id,
            'school_id' => $this->escola->id,
            'course_id' => $curso->id,
            'grade_id' => $serie->id,
            'academic_year_id' => $this->anoLetivo->id,
            'codigo_matricula' => '2026-000001',
            'data_matricula' => '2026-02-02',
            'tipo_matricula' => 'inicial',
            'status' => 'ativa',
        ]);

        EducaClassEnrollment::create([
            'tenant_id' => $this->tenant->id,
            'enrollment_id' => $this->matricula->id,
            'school_class_id' => $this->turma->id,
            'data_entrada' => '2026-02-02',
            'numero_ordem' => 1,
            'status' => 'ativa',
        ]);
    }

    public function test_auditoria_rejeitada_quando_sem_data_referencia(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/educacenso/auditoria', [
                'school_id' => $this->escola->id,
                'academic_year_id' => $this->anoLetivo->id,
            ], $this->authHeaders);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['data_referencia']);
    }

    public function test_auditoria_identifica_inep_invalido_na_escola_e_bloqueia_exportacao(): void
    {
        // Torna o INEP da escola inválido
        $this->escola->update(['codigo_inep' => '123']);

        $auditResponse = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/educacenso/auditoria', [
                'school_id' => $this->escola->id,
                'academic_year_id' => $this->anoLetivo->id,
                'data_referencia' => '2026-05-27',
            ], $this->authHeaders);

        $auditResponse->assertStatus(200)
            ->assertJsonPath('data.total_erros', 1)
            ->assertJsonPath('data.aprovado_para_exportacao', false);

        $this->assertDatabaseHas('educa_census_validations', [
            'school_id' => $this->escola->id,
            'tipo_registro' => '00',
            'gravidade' => 'impeditivo',
            'codigo_regra' => 'REG00_INEP_INVALIDO',
        ]);

        // Tentativa de exportar deve ser bloqueada por inconsistência impeditiva
        $exportResponse = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/educacenso/exportacoes', [
                'school_id' => $this->escola->id,
                'academic_year_id' => $this->anoLetivo->id,
            ], $this->authHeaders);

        $exportResponse->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'A exportação foi bloqueada por inconsistências cadastrais impeditivas.',
            ]);
    }

    public function test_auditoria_identifica_docente_alocado_sem_cpf(): void
    {
        // Remove CPF do docente
        $this->pessoaDocente->update(['documento' => null]);

        $auditResponse = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/educacenso/auditoria', [
                'school_id' => $this->escola->id,
                'academic_year_id' => $this->anoLetivo->id,
                'data_referencia' => '2026-05-27',
            ], $this->authHeaders);

        $auditResponse->assertStatus(200)
            ->assertJsonPath('data.aprovado_para_exportacao', false);

        $this->assertDatabaseHas('educa_census_validations', [
            'school_id' => $this->escola->id,
            'tipo_registro' => '30',
            'gravidade' => 'impeditivo',
            'codigo_regra' => 'REG30_CPF_OBRIGATORIO_DOCENTE',
        ]);
    }

    public function test_exportacao_assincrona_gera_arquivo_posicional_com_leiaute_pipe_e_registro_99(): void
    {
        // Executa auditoria limpa
        $auditResponse = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/educacenso/auditoria', [
                'school_id' => $this->escola->id,
                'academic_year_id' => $this->anoLetivo->id,
                'data_referencia' => '2026-05-27',
            ], $this->authHeaders);

        $auditResponse->assertStatus(200)
            ->assertJsonPath('data.aprovado_para_exportacao', true);

        // Solicita exportação
        $exportResponse = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/educacenso/exportacoes', [
                'school_id' => $this->escola->id,
                'academic_year_id' => $this->anoLetivo->id,
                'etapa_censo' => 'matricula_inicial',
            ], $this->authHeaders);

        $exportResponse->assertStatus(202)
            ->assertJsonPath('data.status', 'solicitada');

        $exportId = $exportResponse->json('data.id');
        $export = EducaCensusExport::findOrFail($exportId);

        // Processa o motor de exportação
        $service = app(CensusExportService::class);
        $res = $service->exportar($export);

        $this->assertGreaterThan(0, $res['total_linhas']);
        $this->assertNotEmpty($res['checksum_sha256']);
        $this->assertTrue(Storage::disk('local')->exists($res['arquivo_path']));

        $conteudo = Storage::disk('local')->get($res['arquivo_path']);
        $this->assertStringContainsString('00|12345678|', $conteudo);
        $this->assertStringContainsString('10|12345678|', $conteudo);
        $this->assertStringContainsString('20|12345678|TURMA-5A|', $conteudo);
        $this->assertStringContainsString('30|12345678|', $conteudo);
        $this->assertStringContainsString('99|', $conteudo);

        // Download do arquivo gerado
        $downloadResponse = $this->actingAs($this->adminUser)
            ->get("/api/educa/educacenso/exportacoes/{$exportId}/download", $this->authHeaders);

        $downloadResponse->assertStatus(200)
            ->assertHeader('Content-Type', 'text/plain; charset=ISO-8859-1');
    }

    public function test_regras_de_anulacao_suprimem_registros_para_escola_inativa(): void
    {
        $this->escola->update(['situacao_funcionamento' => 'paralisada']);

        $export = EducaCensusExport::create([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->escola->id,
            'academic_year_id' => $this->anoLetivo->id,
            'ano' => 2026,
            'status' => 'solicitada',
        ]);

        $service = app(CensusExportService::class);
        $res = $service->exportar($export);

        $conteudo = Storage::disk('local')->get($res['arquivo_path']);
        $linhas = explode("\r\n", trim($conteudo));
        $tipos = array_map(fn (string $l) => explode('|', $l)[0], $linhas);

        // Registros 10, 20, 50, 60 devem estar suprimidos
        $this->assertNotContains('10', $tipos);
        $this->assertNotContains('20', $tipos);
        $this->assertNotContains('50', $tipos);
        $this->assertNotContains('60', $tipos);

        // Registros 00, 30, 40, 99 devem estar presentes
        $this->assertContains('00', $tipos);
        $this->assertContains('30', $tipos);
        $this->assertContains('40', $tipos);
        $this->assertContains('99', $tipos);
    }

    public function test_processamento_arquivo_retorno_inep_atualiza_codigos_e_gera_logs(): void
    {
        $arquivoConteudo = implode("\r\n", [
            '00|87654321|',
            "20|87654321|TURMA-5A|99988877|",
            "30|87654321|1|{$this->pessoaAluno->id}|111222333444|",
            '99|',
        ]);

        $file = UploadedFile::fake()->createWithContent('retorno_inep_2026.txt', $arquivoConteudo);

        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/educacenso/retorno', [
                'school_id' => $this->escola->id,
                'academic_year_id' => $this->anoLetivo->id,
                'arquivo' => $file,
            ], $this->authHeaders);

        $response->assertStatus(200)
            ->assertJsonPath('data.total_conciliados', 3)
            ->assertJsonPath('data.total_divergencias', 0);

        // Verifica atualização no banco
        $this->assertEquals('87654321', $this->escola->fresh()->codigo_inep);

        $this->assertDatabaseHas('educa_census_inep_logs', [
            'school_id' => $this->escola->id,
            'tipo_registro' => '00',
            'codigo_inep' => '87654321',
            'status' => 'conciliado',
        ]);
    }

    public function test_arquivo_retorno_invalido_rejeitado(): void
    {
        $arquivoInvalido = UploadedFile::fake()->createWithContent('invalido.txt', 'CABECALHO SEM DELIMITADOR');

        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/educa/educacenso/retorno', [
                'school_id' => $this->escola->id,
                'academic_year_id' => $this->anoLetivo->id,
                'arquivo' => $arquivoInvalido,
            ], $this->authHeaders);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['arquivo']);
    }
}
