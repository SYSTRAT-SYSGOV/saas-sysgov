<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Models\SucessaoDocumento;
use Modules\Cemiterios\Services\DocumentoSucessaoService;
use Modules\Cemiterios\Support\EstadoSucessao;
use Modules\Cemiterios\Support\RegraNegocioException;
use Modules\Cemiterios\Support\TipoDocumentoSucessao;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

final class DocumentoSucessaoServiceTest extends CemiteriosTestCase
{
    private Tenant $tenant;
    private DocumentoSucessaoService $service;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->actingAs($this->admin($this->tenant));
        $this->service = app(DocumentoSucessaoService::class);
    }

    public function test_upload_calcula_hash_sha256_e_persiste_arquivo(): void
    {
        $sucessao = $this->novaSucessao();
        $conteudo = 'conteudo-determinado-do-documento';
        $arquivo = UploadedFile::fake()->createWithContent('certidao.pdf', $conteudo);

        $documento = $this->service->upload($sucessao, $arquivo, TipoDocumentoSucessao::CertidaoObito);

        self::assertSame(hash('sha256', $conteudo), $documento->hash);
        self::assertSame(TipoDocumentoSucessao::CertidaoObito, $documento->tipo);
        Storage::disk('s3')->assertExists($documento->arquivo);
    }

    public function test_upload_rejeita_documento_duplicado_por_hash(): void
    {
        $sucessao = $this->novaSucessao();
        $conteudo = 'mesmo-conteudo';

        $this->service->upload($sucessao, UploadedFile::fake()->createWithContent('a.pdf', $conteudo), TipoDocumentoSucessao::CertidaoObito);

        $this->expectException(RegraNegocioException::class);
        $this->service->upload($sucessao, UploadedFile::fake()->createWithContent('b.pdf', $conteudo), TipoDocumentoSucessao::Inventario);
    }

    public function test_verificarHash_retorna_true_quando_arquivo_intacto(): void
    {
        $sucessao = $this->novaSucessao();
        $conteudo = 'documento-integro';
        $documento = $this->service->upload($sucessao, UploadedFile::fake()->createWithContent('c.pdf', $conteudo), TipoDocumentoSucessao::Escritura);

        self::assertTrue($this->service->verificarHash($documento));
    }

    public function test_verificarHash_retorna_false_quando_arquivo_alterado(): void
    {
        $sucessao = $this->novaSucessao();
        $documento = $this->service->upload($sucessao, UploadedFile::fake()->createWithContent('d.pdf', 'original'), TipoDocumentoSucessao::Escritura);

        Storage::disk('s3')->put($documento->arquivo, 'conteudo-adulterado');

        self::assertFalse($this->service->verificarHash($documento));
    }

    public function test_verificarHash_retorna_false_quando_arquivo_removido_do_disco(): void
    {
        $sucessao = $this->novaSucessao();
        $documento = $this->service->upload($sucessao, UploadedFile::fake()->createWithContent('e.pdf', 'x'), TipoDocumentoSucessao::Outro);

        Storage::disk('s3')->delete($documento->arquivo);

        self::assertFalse($this->service->verificarHash($documento));
    }

    public function test_downloadUrl_gera_url_assinada_temporaria(): void
    {
        $sucessao = $this->novaSucessao();
        $documento = $this->service->upload($sucessao, UploadedFile::fake()->createWithContent('f.pdf', 'y'), TipoDocumentoSucessao::Procuracao);

        Storage::disk('s3')->buildTemporaryUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration) => "https://fake-s3.test/{$path}?expires=" . $expiration->getTimestamp()
        );

        $url = $this->service->downloadUrl($documento);

        self::assertStringContainsString($documento->arquivo, $url);
    }

    public function test_purgarExpirados_remove_apenas_documentos_de_processos_encerrados_e_vencidos(): void
    {
        $processoEncerradoAntigo = $this->novaSucessao(EstadoSucessao::Arquivada);
        $docAntigoEncerrado = $this->service->upload($processoEncerradoAntigo, UploadedFile::fake()->createWithContent('velho.pdf', 'v1'), TipoDocumentoSucessao::Outro);
        $docAntigoEncerrado->forceFill(['created_at' => now()->subDays(4000)])->saveQuietly();

        $processoEncerradoRecente = $this->novaSucessao(EstadoSucessao::Sucedida);
        $docRecenteEncerrado = $this->service->upload($processoEncerradoRecente, UploadedFile::fake()->createWithContent('recente.pdf', 'v2'), TipoDocumentoSucessao::Outro);

        $processoAberto = $this->novaSucessao(EstadoSucessao::EmAnalise);
        $docAbertoAntigo = $this->service->upload($processoAberto, UploadedFile::fake()->createWithContent('aberto.pdf', 'v3'), TipoDocumentoSucessao::Outro);
        $docAbertoAntigo->forceFill(['created_at' => now()->subDays(4000)])->saveQuietly();

        $purgados = $this->service->purgarExpirados($this->tenant->id);

        self::assertSame(1, $purgados);
        self::assertSoftDeleted($docAntigoEncerrado);
        self::assertNotSoftDeleted(SucessaoDocumento::withTrashed()->find($docRecenteEncerrado->id));
        self::assertNotSoftDeleted(SucessaoDocumento::withTrashed()->find($docAbertoAntigo->id));
    }

    public function test_getDocumentosObrigatoriosPorVia_retorna_lista_conforme_via(): void
    {
        $obrigatorios = $this->service->getDocumentosObrigatoriosPorVia('inventario_extrajudicial');

        self::assertSame(
            [TipoDocumentoSucessao::CertidaoObito, TipoDocumentoSucessao::Escritura],
            $obrigatorios
        );
    }

    private function novaSucessao(EstadoSucessao $estado = EstadoSucessao::EmAnalise): Sucessao
    {
        $jazigo = $this->novoJazigo(concedido: false);
        $titular = Concessionario::create([
            'nome' => 'Titular Doc',
            'tipo_doc' => 'cpf',
            'documento' => $this->cpfValido(),
            'documento_hash' => hash('sha256', 'titular-' . uniqid()),
        ]);
        $concessao = Concessao::create([
            'numero' => 'CON-DOC-' . uniqid(),
            'plot_id' => $jazigo->id,
            'holder_id' => $titular->id,
            'tipo' => 'perpetua',
            'data_inicio' => '2000-01-01',
            'estado' => 'Ativa',
        ]);

        return Sucessao::create([
            'concession_id' => $concessao->id,
            'park_id' => $jazigo->park_id,
            'plot_id' => $jazigo->id,
            'via' => 'inventario_extrajudicial',
            'estado' => $estado,
            'lock_version' => 1,
        ]);
    }
}
