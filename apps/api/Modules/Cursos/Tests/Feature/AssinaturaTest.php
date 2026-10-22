<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Cursos\Models\Assinatura;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/** Biblioteca de assinaturas do órgão (change cursos-construtor-visual-certificado, D4). */
final class AssinaturaTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
    }

    /** @param array<string, mixed> $dados */
    private function criar(array $dados = []): int
    {
        return (int) $this->como($this->admin, $this->tenant)
            ->postJson('/api/cursos/assinaturas', ['nome' => 'Maria Souza', 'cargo' => 'Instrutora', 'registro_profissional' => 'CREA 12345', ...$dados])
            ->assertCreated()
            ->json('id');
    }

    public function test_cadastra_lista_atualiza_e_desativa(): void
    {
        $id = $this->criar();

        $this->como($this->admin, $this->tenant)->getJson('/api/cursos/assinaturas')
            ->assertOk()
            ->assertJsonPath('assinaturas.0.nome', 'Maria Souza')
            ->assertJsonPath('assinaturas.0.ativa', true);

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/assinaturas/{$id}", ['cargo' => 'Coordenadora', 'ativa' => false])
            ->assertOk()
            ->assertJsonPath('cargo', 'Coordenadora')
            ->assertJsonPath('ativa', false);

        $this->assertDatabaseHas('audit_logs', ['action' => 'assinatura.atualizada']);
    }

    public function test_envia_imagem_e_selo_e_mantem_o_arquivo_anterior(): void
    {
        $id = $this->criar();

        $primeira = $this->como($this->admin, $this->tenant)
            ->post("/api/cursos/assinaturas/{$id}/imagem", ['imagem' => UploadedFile::fake()->image('assinatura.png', 300, 100)])
            ->assertOk()->json('imagem_path');
        $segunda = $this->como($this->admin, $this->tenant)
            ->post("/api/cursos/assinaturas/{$id}/imagem", ['imagem' => UploadedFile::fake()->image('assinatura.jpg', 300, 100)])
            ->assertOk()->json('imagem_path');
        $selo = $this->como($this->admin, $this->tenant)
            ->post("/api/cursos/assinaturas/{$id}/selo", ['imagem' => UploadedFile::fake()->image('selo.png', 120, 120)])
            ->assertOk()
            ->assertJsonStructure(['selo_url'])
            ->json('selo_path');

        $this->assertNotSame($primeira, $segunda);
        Storage::disk('public')->assertExists([$primeira, $segunda, $selo]);
    }

    public function test_recusa_arquivo_que_nao_e_imagem_mesmo_com_extensao_png(): void
    {
        $id = $this->criar();

        $this->como($this->admin, $this->tenant)
            ->postJson("/api/cursos/assinaturas/{$id}/imagem", ['imagem' => UploadedFile::fake()->createWithContent('falsa.png', '<?php echo "não sou imagem";')])
            ->assertStatus(422)
            ->assertJsonValidationErrors('imagem');
    }

    public function test_nao_exclui_assinatura_em_uso_mas_exclui_a_livre(): void
    {
        $emUso = $this->criar();
        $livre = $this->criar(['nome' => 'João Lima']);
        $this->noTenant($this->tenant, fn () => ModeloCertificado::create([
            'nome' => 'Visual', 'tipo' => 'visual', 'titulo' => 'Certificado', 'corpo' => 'Texto',
            'elementos' => [['id' => 'a1', 'tipo' => 'assinatura', 'assinatura_id' => $emUso, 'x' => 100, 'y' => 400, 'largura' => 150]],
        ]));

        $resposta = $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/assinaturas/{$emUso}");
        $this->assertErroDeNegocio($resposta, 'Desative-a');

        $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/assinaturas/{$livre}")->assertOk();
        $this->noTenant($this->tenant, fn () => $this->assertNull(Assinatura::find($livre)));
    }

    public function test_assinatura_de_outro_orgao_responde_404(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $alheia = $this->noTenant($outro, fn () => Assinatura::create(['nome' => 'De outro órgão']));

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/assinaturas/{$alheia->id}", ['nome' => 'Invadida'])->assertNotFound();
        $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/assinaturas/{$alheia->id}")->assertNotFound();
        $this->como($this->admin, $this->tenant)->getJson('/api/cursos/assinaturas')->assertJsonCount(0, 'assinaturas');
    }

    public function test_participante_nao_gerencia_assinaturas(): void
    {
        $aluno = $this->usuario($this->tenant, ['participante_cursos'], 'Aluno');

        $this->como($aluno, $this->tenant)->getJson('/api/cursos/assinaturas')->assertForbidden();
        $this->como($aluno, $this->tenant)->postJson('/api/cursos/assinaturas', ['nome' => 'X'])->assertForbidden();
    }
}
