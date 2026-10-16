<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;
use Modules\Pessoas\Models\Pessoa;

/** Emissão avulsa de certificados (change cursos-construtor-visual-certificado, bloco 5). */
final class EmissaoAvulsaTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private Curso $curso;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Seminário de Gestão', 'carga_horaria_minutos' => 480]);
        $this->noTenant($this->tenant, fn () => ModeloCertificado::create(['nome' => 'Padrão', 'titulo' => 'Certificado', 'corpo' => '{{participante}} participou de {{curso}}.', 'padrao' => true]));
    }

    /**
     * @param list<array<string, mixed>> $pessoas
     * @param array<string, mixed> $extra
     * @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function emitir(array $pessoas, array $extra = []): \Illuminate\Testing\TestResponse
    {
        return $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$this->curso->id}/certificados-avulsos", ['pessoas' => $pessoas, ...$extra]);
    }

    public function test_lista_emite_as_validas_e_informa_a_linha_recusada(): void
    {
        $this->emitir([
            ['nome' => 'Ana Lima', 'documento' => '529.982.247-25', 'concluido_em' => '2026-09-20'],
            ['nome' => '', 'concluido_em' => '2026-09-20'],
            ['nome' => 'Bruno Dias', 'email' => 'bruno@x.gov', 'concluido_em' => '20/09/2026'],
            ['nome' => 'Carla Souza', 'concluido_em' => '2026-09-20'],
        ])->assertOk()
            ->assertJsonCount(3, 'emitidos')
            ->assertJsonPath('recusadas.0.linha', 2)
            ->assertJsonPath('recusadas.0.motivo', 'Nome em branco.');

        $this->noTenant($this->tenant, function (): void {
            $this->assertSame(3, Certificado::query()->where('tipo', 'avulso')->count());
            $this->assertSame(1, Pessoa::count()); // só quem informou CPF virou pessoa
        });
    }

    public function test_emissao_repetida_devolve_o_existente(): void
    {
        $pessoa = ['nome' => 'Ana Lima', 'documento' => '52998224725', 'concluido_em' => '2026-09-20'];
        $codigo = $this->emitir([$pessoa])->assertOk()->json('emitidos.0.codigo');

        $this->emitir([$pessoa])->assertOk()->assertJsonCount(0, 'emitidos')->assertJsonPath('existentes.0.codigo', $codigo);
        $this->noTenant($this->tenant, fn () => $this->assertSame(1, Certificado::count()));
    }

    public function test_certificado_para_empresa_e_validacao_publica_so_com_dados_minimos(): void
    {
        $codigo = $this->emitir([['nome' => 'Construtora Exemplo Ltda', 'documento' => '12.345.678/0001-95', 'concluido_em' => '2026-09-20']])
            ->assertOk()->json('emitidos.0.codigo');

        $this->noTenant($this->tenant, function (): void {
            $this->assertNull(Participante::query()->sole()->pessoa_id);
            $certificado = Certificado::query()->sole();
            $this->assertSame('avulso', $certificado->tipo);
            $this->assertSame($this->curso->id, $certificado->curso_id);
            $this->assertSame('20/09/2026', $certificado->dados['periodo']);
        });

        $publico = $this->getJson('/api/public/cursos/certificados/' . $codigo)->assertOk();
        $this->assertStringContainsString('Construtora Exemplo Ltda', (string) $publico->getContent());
        $this->assertStringNotContainsString('12345678000195', (string) $publico->getContent());
        $this->assertStringNotContainsString('12.345.678', (string) $publico->getContent());
    }

    public function test_curso_de_outro_orgao_responde_404(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $cursoB = $this->cursoPublicado($outro);

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$cursoB->id}/certificados-avulsos", ['pessoas' => [['nome' => 'X', 'concluido_em' => '2026-09-20']]])
            ->assertNotFound();
    }

    public function test_csv_com_bom_e_ponto_e_virgula(): void
    {
        $csv = "\xEF\xBB\xBFNOME;EMAIL;DOCUMENTO;CONCLUSAO\nAna Lima;;529.982.247-25;20/09/2026\nSem Data;;;\nBruno Dias;bruno@x.gov;;2026-09-21\n";

        $this->como($this->admin, $this->tenant)
            ->post("/api/cursos/cursos/{$this->curso->id}/certificados-avulsos/importar", ['arquivo' => UploadedFile::fake()->createWithContent('lista.csv', $csv)])
            ->assertOk()
            ->assertJsonCount(2, 'emitidos')
            ->assertJsonPath('recusadas.0.linha', 3)
            ->assertJsonPath('recusadas.0.motivo', 'Data de conclusão inválida ou futura (Sem Data).');
    }

    public function test_participante_nao_emite(): void
    {
        $aluno = $this->usuario($this->tenant, ['participante_cursos'], 'Aluno');

        $this->como($aluno, $this->tenant)->postJson("/api/cursos/cursos/{$this->curso->id}/certificados-avulsos", ['pessoas' => [['nome' => 'X', 'concluido_em' => '2026-09-20']]])
            ->assertForbidden();
    }
}
