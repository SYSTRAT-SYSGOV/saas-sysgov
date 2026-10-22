<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Empresa;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Services\CertificadoService;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/** Variáveis do texto no formato do sistema de referência e biblioteca de empresas (D10). */
final class VariaveisCertificadoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private const CNPJ = '11.222.333/0001-81';

    private Tenant $tenant;

    private User $admin;

    private Curso $curso;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->tenant->update(['city' => 'Araucária']);
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Seminário de Gestão', 'carga_horaria_minutos' => 1200, 'responsavel' => 'Joana Prado', 'conteudo_programatico' => "Módulo 1\nMódulo 2"]);
    }

    private function modeloPadrao(string $corpo): void
    {
        $this->noTenant($this->tenant, fn () => ModeloCertificado::create(['nome' => 'Padrão', 'titulo' => 'Certificado', 'corpo' => $corpo, 'padrao' => true]));
    }

    /**
     * @param list<array<string, mixed>> $pessoas
     * @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function emitir(array $pessoas): \Illuminate\Testing\TestResponse
    {
        return $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$this->curso->id}/certificados-avulsos", ['pessoas' => $pessoas]);
    }

    public function test_cadastra_empresa_com_cnpj_mascarado_e_recusa_invalido_e_repetido(): void
    {
        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/empresas', [
            'razao_social' => 'Construtora Pinheiro Ltda.', 'nome_fantasia' => 'Pinheiro', 'cnpj' => self::CNPJ,
        ])->assertCreated()->assertJsonPath('cnpj', '11222333000181')->assertJsonPath('ativa', true);

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson('/api/cursos/empresas', ['razao_social' => 'X', 'cnpj' => '11.222.333/0001-82']), 'CNPJ inválido');
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson('/api/cursos/empresas', ['razao_social' => 'Y', 'cnpj' => '11222333000181']), 'Já existe');
        $this->como($this->admin, $this->tenant)->getJson('/api/cursos/empresas')->assertOk()->assertJsonCount(1, 'empresas');
        $this->assertDatabaseHas('audit_logs', ['action' => 'empresa.criada']);
    }

    public function test_empresas_sao_do_proprio_orgao_e_participante_nao_acessa(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $deFora = $this->noTenant($outro, fn () => Empresa::create(['razao_social' => 'De fora', 'cnpj' => '11222333000181']));

        // O mesmo CNPJ pode existir em outro órgão.
        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/empresas', ['razao_social' => 'Daqui', 'cnpj' => self::CNPJ])->assertCreated();
        $this->como($this->admin, $this->tenant)->getJson('/api/cursos/empresas')->assertOk()->assertJsonCount(1, 'empresas')->assertJsonPath('empresas.0.razao_social', 'Daqui');
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/empresas/{$deFora->id}", ['razao_social' => 'Invadida'])->assertNotFound();
        $this->como($this->usuario($this->tenant, ['participante_cursos']), $this->tenant)->getJson('/api/cursos/empresas')->assertForbidden();
    }

    public function test_texto_aceita_as_variaveis_e_o_formato_antigo_e_recusa_variavel_desconhecida(): void
    {
        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/textos', [
            'nome' => 'Padrão Conclusão', 'texto_principal' => 'Certificamos que {NOME}, CPF {CPF}, concluiu {CURSO} ({CARGA_HORARIA} horas). {{orgao}}',
        ])->assertCreated();

        $resposta = $this->como($this->admin, $this->tenant)->postJson('/api/cursos/textos', ['nome' => 'Errado', 'texto_principal' => 'RG {RG_DO_ALUNO}']);
        $this->assertErroDeNegocio($resposta, '{RG_DO_ALUNO}');
        $this->assertStringContainsString('{DATA_CONCLUSAO}', (string) $resposta->json('error'));

        $this->como($this->admin, $this->tenant)->getJson('/api/cursos/textos')->assertOk()
            ->assertJsonPath('campos', ['NOME', 'CPF', 'EMPRESA', 'CNPJ', 'CURSO', 'CARGA_HORARIA', 'DATA', 'DATA_CONCLUSAO', 'CODIGO_CERTIFICADO', 'RESPONSAVEL', 'CONTEUDO_PROGRAMATICO']);
    }

    public function test_emissao_preenche_todas_as_variaveis_e_liga_a_empresa_ao_participante(): void
    {
        $this->modeloPadrao('{NOME} | {CPF} | {EMPRESA} | {CNPJ} | {CURSO} | {CARGA_HORARIA} | {DATA} | {DATA_CONCLUSAO} | {RESPONSAVEL} | {CONTEUDO_PROGRAMATICO} | {CODIGO_CERTIFICADO}');
        $empresa = $this->como($this->admin, $this->tenant)->postJson('/api/cursos/empresas', ['razao_social' => 'Construtora Pinheiro Ltda.', 'nome_fantasia' => 'Pinheiro', 'cnpj' => self::CNPJ])->json('id');

        $this->emitir([['nome' => 'Ana Lima', 'documento' => '529.982.247-25', 'concluido_em' => '2026-09-20', 'empresa_id' => $empresa]])
            ->assertOk()->assertJsonCount(1, 'emitidos');

        $this->noTenant($this->tenant, function () use ($empresa): void {
            $certificado = Certificado::query()->firstOrFail();
            $hoje = now();
            $meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            $this->assertSame(
                "Ana Lima | 529.982.247-25 | Pinheiro | 11.222.333/0001-81 | Seminário de Gestão | 20 | Araucária, {$hoje->format('d')} de {$meses[$hoje->month - 1]} de {$hoje->format('Y')} | 20/09/2026 | Joana Prado | Módulo 1\nMódulo 2 | {CODIGO_CERTIFICADO}",
                $certificado->dados['corpo'],
            );
            // O código entra ao desenhar o PDF.
            $this->assertStringContainsString($certificado->codigoFormatado(), app(CertificadoService::class)->html($certificado));
            $this->assertSame($empresa, Participante::query()->firstOrFail()->empresa_id);
        });
    }

    public function test_sem_empresa_imprime_autonomo_e_formato_antigo_continua_valendo(): void
    {
        $this->modeloPadrao('{{participante}} — {EMPRESA}{CNPJ} — {{carga_horaria}}');

        $this->emitir([['nome' => 'Bruno Dias', 'concluido_em' => '2026-09-20']])->assertOk()->assertJsonCount(1, 'emitidos');

        $this->noTenant($this->tenant, fn () => $this->assertSame('Bruno Dias — Autônomo — 20 horas', Certificado::query()->firstOrFail()->dados['corpo']));
    }

    public function test_csv_com_cnpj_da_empresa_liga_a_cadastrada_e_recusa_a_desconhecida(): void
    {
        $this->modeloPadrao('{NOME} — {EMPRESA}');
        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/empresas', ['razao_social' => 'Construtora Pinheiro Ltda.', 'cnpj' => self::CNPJ])->assertCreated();
        $csv = "NOME;CONCLUSAO;EMPRESA_CNPJ\nAna Lima;2026-09-20;" . self::CNPJ . "\nCarla Souza;2026-09-20;99.999.999/0001-99\n";

        $this->como($this->admin, $this->tenant)->post("/api/cursos/cursos/{$this->curso->id}/certificados-avulsos/importar", [
            'arquivo' => UploadedFile::fake()->createWithContent('lista.csv', $csv),
        ], ['Accept' => 'application/json'])->assertOk()
            ->assertJsonCount(1, 'emitidos')
            ->assertJsonPath('recusadas.0.linha', 3);

        $this->noTenant($this->tenant, fn () => $this->assertSame('Ana Lima — Construtora Pinheiro Ltda.', Certificado::query()->firstOrFail()->dados['corpo']));
    }

    public function test_empresa_ligada_a_participante_nao_e_excluida(): void
    {
        $this->modeloPadrao('{NOME}');
        $empresa = $this->como($this->admin, $this->tenant)->postJson('/api/cursos/empresas', ['razao_social' => 'Pinheiro', 'cnpj' => self::CNPJ])->json('id');
        $livre = $this->como($this->admin, $this->tenant)->postJson('/api/cursos/empresas', ['razao_social' => 'Sem ninguém'])->json('id');
        $this->emitir([['nome' => 'Ana Lima', 'concluido_em' => '2026-09-20', 'empresa_id' => $empresa]])->assertOk();

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/empresas/{$empresa}"), 'Desative-a');
        $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/empresas/{$livre}")->assertOk();
    }

    public function test_responsavel_do_curso_e_horas_fracionadas(): void
    {
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}", ['responsavel' => 'Carlos Mendes'])
            ->assertOk()->assertJsonPath('responsavel', 'Carlos Mendes');

        $this->assertSame('1,5', CertificadoService::formatarHoras(90));
        $this->assertSame('8', CertificadoService::formatarHoras(480));
        $this->assertSame('02 de outubro de 2026', CertificadoService::dataPorExtenso(\Illuminate\Support\Carbon::parse('2026-10-02'), null));
    }
}
