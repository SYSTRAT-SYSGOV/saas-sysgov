<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Unit;

use Illuminate\Http\Client\Request as ClienteRequisicao;
use Illuminate\Support\Facades\Http;
use Modules\Capd\Contracts\AssinaturaResultado;
use Modules\Capd\Services\Adapters\IcpBrasilAdapter;
use Tests\TestCase;

final class IcpBrasilAdapterTest extends TestCase
{
    /** @var array<string, string> */
    private array $config = [
        'icp_brasil_provider' => 'certisign',
        'icp_brasil_api_key'  => 'test_key_123',
        'icp_brasil_api_url'  => 'https://api.psc-mock.com/v1',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        // O PSC é sempre mockado (host "psc-mock") — nenhum teste deste
        // adapter deve depender de rede real.
        Http::fake([
            '*/sign' => Http::response([
                'hash' => 'hash_gerado_psc_abc123',
                'urlDocumentoAssinado' => 'https://psc-mock.com/docs/abc123',
                'certificadoSerial' => 'SERIAL-123456',
                'assinadoEm' => now()->toIso8601String(),
            ]),
            '*/verify*' => fn (ClienteRequisicao $req) => Http::response([
                'valid' => ($req->data()['hash'] ?? null) === 'hash_valido_psc',
            ]),
            '*/validate-certificate' => fn (ClienteRequisicao $req) => Http::response([
                'valid' => ($req->data()['certificado'] ?? null) === 'certificado_valido_psc',
            ]),
        ]);
    }

    public function test_assinar_faz_chamada_ao_psc_e_retorna_resultado_valido(): void
    {
        $adapter = new IcpBrasilAdapter($this->config);

        $resultado = $adapter->assinar(
            textoAta: 'Ata de sessão oficial da CAPD',
            sessaoId: 123,
            usuarioId: 456,
            contexto: ['cpf' => '123.456.789-00']
        );

        self::assertInstanceOf(AssinaturaResultado::class, $resultado);
        self::assertSame('icp_brasil', $resultado->tipo);
        self::assertNotEmpty($resultado->hash);
        self::assertNotEmpty($resultado->urlDocumentoAssinado);
        self::assertNotEmpty($resultado->certificadoSerial);
        self::assertNotEmpty($resultado->assinadoEm);
    }

    public function test_verificar_valida_hash_via_psc(): void
    {
        $adapter = new IcpBrasilAdapter($this->config);

        $isValid = $adapter->verificar('Texto da ata', 'hash_valido_psc');

        self::assertTrue($isValid);
    }

    public function test_verificar_rejeita_hash_invalido(): void
    {
        $adapter = new IcpBrasilAdapter($this->config);

        $isValid = $adapter->verificar('Texto da ata', 'hash_invalido');

        self::assertFalse($isValid);
    }

    public function test_validar_certificado_aceita_certificado_valido_via_psc(): void
    {
        $adapter = new IcpBrasilAdapter($this->config);

        self::assertTrue($adapter->validarCertificado('certificado_valido_psc'));
    }

    public function test_validar_certificado_rejeita_expirado_ou_revogado(): void
    {
        $adapter = new IcpBrasilAdapter($this->config);

        self::assertFalse($adapter->validarCertificado('certificado_expirado_ou_revogado'));
    }
}
