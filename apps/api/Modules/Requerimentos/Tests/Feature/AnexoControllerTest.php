<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Modules\Requerimentos\Tests\Concerns\CenarioRequerimentos;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

/**
 * Upload/download/exclusão de anexos (tarefa 2.4 da Fase de criação do módulo).
 * Mesmo padrão de teste de `Modules\Cursos\Tests\Feature\MaterialTest`: disco fake
 * `local` e `UploadedFile` real (não `UploadedFile::fake()->create()`, cujo MIME é
 * deduzido pela extensão) para que a validação `mimetypes:` inspecione o conteúdo de
 * verdade.
 */
final class AnexoControllerTest extends TestCase
{
    use CenarioRequerimentos;
    use RefreshDatabase;

    private const PDF = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n";

    private Tenant $tenant;

    private User $autor;

    private User $tramitador;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->autor = $this->usuario($this->tenant, ['autor_requerimentos'], 'Autor');
        $this->tramitador = $this->usuario($this->tenant, ['tramitador_requerimentos'], 'Tramitador');
    }

    private function pdf(string $nome = 'comprovante.pdf', string $conteudo = self::PDF): UploadedFile
    {
        $caminho = (string) tempnam(sys_get_temp_dir(), 'anexo');
        file_put_contents($caminho, $conteudo);

        return new UploadedFile($caminho, $nome, null, null, true);
    }

    private function criarProposicao(?User $autor = null): int
    {
        /** @var TestResponse<Response> $response */
        $response = $this->como($autor ?? $this->autor, $this->tenant)->postJson('/api/requerimentos/proposicoes', [
            'tipo_slug'     => 'requerimento',
            'ementa'        => 'Teste de anexos',
            'area_tematica' => 'administracao',
            'poder_origem'  => 'camara',
        ]);
        $response->assertCreated();

        return (int) $response->json('id');
    }

    public function test_autor_anexa_pdf_na_propria_proposicao_e_baixa_depois(): void
    {
        $proposicaoId = $this->criarProposicao();

        $resposta = $this->como($this->autor, $this->tenant)
            ->postJson("/api/requerimentos/proposicoes/{$proposicaoId}/anexos", ['arquivo' => $this->pdf('Comprovante.pdf')]);

        $resposta->assertCreated()
            ->assertJsonPath('nome_arquivo', 'Comprovante.pdf')
            ->assertJsonPath('mime_type', 'application/pdf');

        $caminho = (string) $resposta->json('url_armazenamento');
        $this->assertMatchesRegularExpression(
            "#^requerimentos/{$this->tenant->id}/proposicao/{$proposicaoId}/[0-9a-f-]{36}\\.pdf$#",
            $caminho,
        );
        Storage::disk('local')->assertExists($caminho);

        $anexoId = $resposta->json('id');
        $download = $this->como($this->autor, $this->tenant)->get("/api/requerimentos/anexos/{$anexoId}/download");
        $download->assertOk();
        $download->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $download->streamedContent());
    }

    public function test_rejeita_arquivo_com_conteudo_que_nao_e_pdf_nem_imagem(): void
    {
        $proposicaoId = $this->criarProposicao();

        $this->como($this->autor, $this->tenant)
            ->postJson("/api/requerimentos/proposicoes/{$proposicaoId}/anexos", ['arquivo' => $this->pdf('falso.pdf', '<?php echo 1;')])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('arquivo');

        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_quem_nao_e_autor_nem_tem_permissao_de_editar_e_recusado(): void
    {
        $proposicaoId = $this->criarProposicao();

        $this->como($this->tramitador, $this->tenant)
            ->postJson("/api/requerimentos/proposicoes/{$proposicaoId}/anexos", ['arquivo' => $this->pdf()])
            ->assertForbidden();
    }

    public function test_anexo_de_outro_tenant_responde_404_no_download(): void
    {
        $proposicaoId = $this->criarProposicao();
        $anexoId = $this->como($this->autor, $this->tenant)
            ->postJson("/api/requerimentos/proposicoes/{$proposicaoId}/anexos", ['arquivo' => $this->pdf()])
            ->json('id');

        $outroTenant = $this->criarTenant('prefeitura-b');
        $outroAutor = $this->usuario($outroTenant, ['autor_requerimentos'], 'Autor B');

        $this->como($outroAutor, $outroTenant)
            ->get("/api/requerimentos/anexos/{$anexoId}/download")
            ->assertNotFound();
    }

    public function test_autor_exclui_anexo_da_propria_proposicao(): void
    {
        $proposicaoId = $this->criarProposicao();
        $resposta = $this->como($this->autor, $this->tenant)
            ->postJson("/api/requerimentos/proposicoes/{$proposicaoId}/anexos", ['arquivo' => $this->pdf()]);
        $anexoId = $resposta->json('id');
        $caminho = (string) $resposta->json('url_armazenamento');

        $this->como($this->autor, $this->tenant)
            ->deleteJson("/api/requerimentos/anexos/{$anexoId}")
            ->assertOk()
            ->assertJsonPath('deleted', true);

        Storage::disk('local')->assertMissing($caminho);
        $this->como($this->autor, $this->tenant)->get("/api/requerimentos/anexos/{$anexoId}/download")->assertNotFound();
    }

    public function test_tramitador_anexa_na_resposta_e_fica_bloqueado_apos_o_envio(): void
    {
        $proposicaoId = $this->criarProposicao();

        $tramitacaoId = $this->como($this->tramitador, $this->tenant)->postJson('/api/requerimentos/tramitacoes-poderes', [
            'proposicao_id' => $proposicaoId,
            'poder_origem'  => 'camara',
            'poder_destino' => 'prefeitura',
        ])->assertCreated()->json('id');

        $respostaId = $this->como($this->tramitador, $this->tenant)->postJson('/api/requerimentos/respostas', [
            'tramitacao_id' => $tramitacaoId,
            'conteudo'      => 'Em análise, parecer técnico anexo.',
        ])->assertCreated()->json('id');

        $this->como($this->tramitador, $this->tenant)
            ->postJson("/api/requerimentos/respostas/{$respostaId}/anexos", ['arquivo' => $this->pdf('parecer.pdf')])
            ->assertCreated();

        $this->como($this->tramitador, $this->tenant)
            ->patchJson("/api/requerimentos/respostas/{$respostaId}/enviar")
            ->assertOk();

        $this->como($this->tramitador, $this->tenant)
            ->postJson("/api/requerimentos/respostas/{$respostaId}/anexos", ['arquivo' => $this->pdf('tardio.pdf')])
            ->assertStatus(422);
    }
}
