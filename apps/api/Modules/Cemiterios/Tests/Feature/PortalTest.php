<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\SolicitacaoPortal;
use Modules\Cemiterios\Services\GuiaService;
use Modules\Cemiterios\Services\ParametroService;
use Modules\Cemiterios\Services\PrecoService;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: cemiterio/portal (tarefas 6.1–6.5). */
final class PortalTest extends CemiteriosTestCase
{
    private const ISSUER = 'https://sso.teste.gov.br';

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        config(['cemiterios.mapa_base.provedor' => 'esri', 'cemiterios.govbr' => [
            'issuer' => self::ISSUER, 'client_id' => 'sysgov', 'client_secret' => 'segredo', 'redirect_uri' => 'https://portal.teste/callback',
        ]]);
        $this->tenant = $this->portal('pref-a');
    }

    // 1.5

    public function test_tres_grupos_de_rotas_com_seus_middlewares(): void
    {
        $rotas = collect(app('router')->getRoutes()->getRoutes())->filter(fn ($r) => str_contains($r->uri(), 'cemiterios'));
        $middlewares = fn (string $prefixo) => $rotas->filter(fn ($r) => str_starts_with($r->uri(), $prefixo))
            ->map(fn ($r) => $r->gatherMiddleware())->first() ?? [];

        self::assertContains('module-access:cemiterios', $middlewares('api/cemiterios/'));
        self::assertContains('auth:sanctum', $middlewares('api/cemiterios/'));
        self::assertContains('throttle:cemiterios-publico', $middlewares('api/public/cemiterios/{tenantSlug}'));
        self::assertNotContains('auth:sanctum', $middlewares('api/public/cemiterios/{tenantSlug}'));
        self::assertContains('auth:concessionario', $middlewares('api/portal/cemiterios/{tenantSlug}/me'));
        self::assertGreaterThan(70, $rotas->count());
    }

    // 6.1

    public function test_municipio_sem_portal_responde_404_e_busca_isolada(): void
    {
        $this->criarTenant('pref-sem-portal');
        $this->getJson('/api/public/cemiterios/pref-sem-portal/falecidos?q=joao')->assertNotFound();
        $this->getJson('/api/public/cemiterios/inexistente/falecidos?q=joao')->assertNotFound();
        $this->getJson('/api/public/cemiterios/pref-a/identidade')->assertOk()
            ->assertJsonPath('nome', 'Prefeitura pref-a')->assertJsonPath('hideProviderSignature', false);

        $this->noTenant($this->tenant);
        $this->sepultar('João da Conceição');
        $b = $this->portal('pref-b');
        $this->noTenant($b);
        $this->sepultar('João Batista');
        $this->semContexto();

        $this->getJson('/api/public/cemiterios/pref-a/falecidos?q=joao')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.nome', 'João da Conceição');
    }

    // 6.2

    public function test_busca_publica_normaliza_e_expoe_somente_a_lista_branca(): void
    {
        $this->noTenant($this->tenant);
        $cpf = $this->cpfValido();
        $jazigo = $this->sepultar('João da Conceição', 'Insuficiência respiratória');
        $this->concessao($jazigo, Concessionario::create(['nome' => 'Titular Secreto', 'tipo_doc' => 'cpf', 'documento' => $cpf]));
        $this->semContexto();

        $resposta = $this->getJson('/api/public/cemiterios/pref-a/falecidos?q=joao da conceicao')->assertOk()
            ->assertJsonPath('data.0.nome', 'João da Conceição')
            ->assertJsonPath('data.0.jazigo', $jazigo->codigo);

        $corpo = (string) $resposta->getContent();
        foreach ([$cpf, 'Insufici', 'Titular Secreto', 'causa_morte', 'documento', 'certidao', 'estado', 'concess'] as $proibido) {
            self::assertStringNotContainsString($proibido, $corpo, "A busca pública expôs \"{$proibido}\".");
        }
        self::assertSame(['nome', 'nascimento', 'falecimento', 'cemiterio', 'cemiterio_codigo', 'setor', 'jazigo'], array_keys($resposta->json('data.0')));

        $this->getJson('/api/public/cemiterios/pref-a/falecidos?q=jo')->assertUnprocessable();
    }

    public function test_excesso_de_buscas_recebe_429(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $this->getJson('/api/public/cemiterios/pref-a/falecidos?q=maria')->assertOk();
        }
        $this->getJson('/api/public/cemiterios/pref-a/falecidos?q=maria')->assertStatus(429);
    }

    // 6.3

    public function test_ver_no_mapa_sem_estado_nem_concessao_e_com_rota(): void
    {
        $this->noTenant($this->tenant);
        $jazigo = $this->sepultar('Maria Souza');
        Cemiterio::whereKey($jazigo->park_id)->update(['lat' => -25.43, 'lng' => -49.27]);
        $this->semContexto();

        $resposta = $this->getJson("/api/public/cemiterios/pref-a/jazigos/{$jazigo->codigo}/mapa")->assertOk()
            ->assertJsonPath('como_chegar', 'https://www.google.com/maps/dir/?api=1&destination=-25.43,-49.27')
            ->assertJsonPath('mapa_base.provedor', 'esri');

        self::assertStringNotContainsString('estado', (string) $resposta->getContent());
        self::assertStringNotContainsString('concess', (string) $resposta->getContent());
    }

    // 6.4

    public function test_login_govbr_com_pkce_e_id_token_validado(): void
    {
        $this->noTenant($this->tenant);
        $cpf = $this->cpfValido();
        $this->concessao($this->novoJazigo(), Concessionario::create(['nome' => 'Ana Titular', 'tipo_doc' => 'cpf', 'documento' => $cpf]));
        $this->semContexto();

        $token = $this->loginGovBr($cpf)->assertOk()->assertJsonPath('nome', 'Ana Titular')->json('token');
        self::assertIsString($token);

        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/token') && strlen((string) $r['code_verifier']) === 64);
    }

    public function test_cpf_sem_concessao_recebe_mensagem_neutra_e_token_adulterado_e_recusado(): void
    {
        $this->loginGovBr($this->cpfValido())->assertForbidden()
            ->assertJsonPath('code', 'portal.sem_concessoes')
            ->assertJsonPath('message', 'Não há concessões vinculadas a este CPF neste município.');

        $this->loginGovBr($this->cpfValido(), adulterar: true)->assertUnprocessable()->assertJsonPath('code', 'govbr.token_invalido');
    }

    // 6.5

    public function test_painel_mostra_apenas_os_dados_do_titular(): void
    {
        $this->noTenant($this->tenant);
        $cpf = $this->cpfValido();
        $titular = Concessionario::create(['nome' => 'Ana Titular', 'tipo_doc' => 'cpf', 'documento' => $cpf, 'email' => 'ana@x.com']);
        $jazigo = $this->sepultar('Pedro Pai');
        $minha = Concessao::where('plot_id', $jazigo->id)->firstOrFail();
        $minha->update(['holder_id' => $titular->id]);
        $alheia = $this->concessao($this->novoJazigo(2, false));
        app(PrecoService::class)->novaVigencia('renovacao', 20000, CarbonImmutable::today());
        $guia = app(GuiaService::class)->emitirParaConcessao($minha, 'renovacao');
        $this->semContexto();

        $token = $this->loginGovBr($cpf)->assertOk()->json('token');
        $portal = fn (string $metodo, string $uri, array $dados = []) => $this->withHeader('Authorization', "Bearer {$token}")
            ->json($metodo, "/api/portal/cemiterios/pref-a{$uri}", $dados);

        $portal('GET', '/me')->assertOk()->assertJsonPath('documento', $cpf);
        $portal('GET', '/concessoes')->assertOk()->assertJsonCount(1)->assertJsonPath('0.numero', $minha->numero);
        $portal('GET', "/concessoes/{$alheia->id}")->assertNotFound();
        $portal('GET', '/guias')->assertOk()->assertJsonPath('0.valor_centavos', 20000);
        $portal('GET', "/guias/{$guia->id}/pdf")->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $portal('POST', "/guias/{$guia->id}/segunda-via")->assertCreated()->assertJsonPath('original_id', $guia->id);
        $portal('GET', '/sepultados')->assertOk()->assertJsonPath('0.falecido.nome', 'Pedro Pai')->assertJsonMissingPath('0.falecido.causa_morte');
        $portal('POST', '/solicitacoes', ['tipo' => 'renovacao', 'concession_id' => $minha->id, 'mensagem' => 'Quero renovar'])->assertCreated();
        $portal('POST', '/solicitacoes', ['tipo' => 'renovacao', 'concession_id' => $alheia->id, 'mensagem' => 'x'])->assertNotFound();

        $this->noTenant($this->tenant);
        self::assertSame(1, SolicitacaoPortal::where('holder_id', $titular->id)->count());
    }

    public function test_token_do_concessionario_nao_vale_em_outro_municipio_nem_no_painel(): void
    {
        $this->noTenant($this->tenant);
        $cpf = $this->cpfValido();
        $this->concessao($this->novoJazigo(), Concessionario::create(['nome' => 'Ana', 'tipo_doc' => 'cpf', 'documento' => $cpf]));
        $this->semContexto();
        $token = $this->loginGovBr($cpf)->json('token');
        $this->portal('pref-b');

        $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/portal/cemiterios/pref-b/me')->assertUnauthorized();
        $this->withHeader('Authorization', "Bearer {$token}")->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/cemiterios/parques')->assertUnauthorized();
    }

    private function portal(string $slug): Tenant
    {
        $tenant = $this->criarTenant($slug);
        $this->noTenant($tenant);
        app(ParametroService::class)->novaVersao(['portal_habilitado' => true], null);
        $this->semContexto();

        return $tenant;
    }

    private function semContexto(): void
    {
        app(TenantContext::class)->clear();
    }

    private function sepultar(string $nome, ?string $causa = null): Jazigo
    {
        $jazigo = $this->novoJazigo();
        $inumacao = $this->sepultado($jazigo, '2024-05-10');
        Falecido::whereKey($inumacao->deceased_id)->firstOrFail()->update(['nome' => $nome, 'causa_morte' => $causa]);

        return $jazigo->refresh();
    }

    /**
     * Provedor OIDC simulado: chave RSA gerada no teste, JWKS e endpoint de token falsos.
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function loginGovBr(string $cpf, bool $adulterar = false): TestResponse
    {
        $url = $this->getJson('/api/portal/cemiterios/pref-a/auth/govbr')->assertOk()->json('url');
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        self::assertSame('S256', $query['code_challenge_method']);

        $opcoes = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA];
        $cnf = dirname(PHP_BINARY) . '/extras/ssl/openssl.cnf'; // Windows não tem openssl.cnf padrão
        $chave = openssl_pkey_new(is_file($cnf) ? $opcoes + ['config' => $cnf] : $opcoes);
        $rsa = openssl_pkey_get_details($chave)['rsa'];
        $b64 = fn (string $v) => rtrim(strtr(base64_encode($v), '+/', '-_'), '=');

        $cabecalho = $b64((string) json_encode(['alg' => 'RS256', 'kid' => 'k1', 'typ' => 'JWT']));
        $claims = $b64((string) json_encode([
            'iss' => self::ISSUER, 'aud' => 'sysgov', 'sub' => $cpf, 'exp' => time() + 300, 'nonce' => $query['nonce'],
        ]));
        openssl_sign("{$cabecalho}.{$claims}", $assinatura, $chave, OPENSSL_ALGO_SHA256);
        $idToken = "{$cabecalho}.{$claims}." . $b64($adulterar ? strrev($assinatura) : $assinatura);

        Http::fake([
            self::ISSUER . '/token' => Http::response(['access_token' => 'x', 'id_token' => $idToken]),
            self::ISSUER . '/jwk' => Http::response(['keys' => [['kty' => 'RSA', 'kid' => 'k1', 'n' => $b64($rsa['n']), 'e' => $b64($rsa['e'])]]]),
        ]);
        Cache::forget('cemiterios:govbr:jwks');

        return $this->postJson('/api/portal/cemiterios/pref-a/auth/govbr/callback', ['code' => 'codigo-123', 'state' => $query['state']]);
    }
}
