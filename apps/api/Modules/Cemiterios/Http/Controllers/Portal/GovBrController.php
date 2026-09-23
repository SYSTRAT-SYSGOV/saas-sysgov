<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Support\Documento;
use Modules\Cemiterios\Support\RegraNegocioException;

/**
 * Login do concessionário pelo Gov.br (RF-27; D9): OIDC authorization code +
 * PKCE. O backend troca o código, valida o id_token (RS256 via JWKS, iss, aud,
 * exp, nonce), extrai o CPF e emite token do guard "concessionario".
 */
final class GovBrController extends Controller
{
    public function iniciar(TenantContext $tenant): JsonResponse
    {
        $estado = Str::random(40);
        $verificador = Str::random(64);
        $nonce = Str::random(32);
        Cache::put("cemiterios:govbr:{$estado}", ['verificador' => $verificador, 'nonce' => $nonce, 'tenant' => $tenant->id()], 600);

        $c = config('cemiterios.govbr');

        return response()->json(['url' => rtrim($c['issuer'], '/') . '/authorize?' . http_build_query([
            'response_type' => 'code',
            'client_id' => $c['client_id'],
            'scope' => 'openid email profile',
            'redirect_uri' => $c['redirect_uri'],
            'state' => $estado,
            'nonce' => $nonce,
            'code_challenge' => self::b64url(hash('sha256', $verificador, true)),
            'code_challenge_method' => 'S256',
        ])]);
    }

    public function callback(Request $request, TenantContext $tenant): JsonResponse
    {
        $dados = $request->validate(['code' => ['required', 'string', 'max:2000'], 'state' => ['required', 'string', 'max:100']]);
        $sessao = Cache::pull("cemiterios:govbr:{$dados['state']}");
        if (!is_array($sessao) || $sessao['tenant'] !== $tenant->id()) {
            throw new RegraNegocioException('govbr.estado_invalido', 'Sessão de login expirada. Tente novamente.');
        }

        $c = config('cemiterios.govbr');
        $issuer = rtrim((string) $c['issuer'], '/');
        $tokens = Http::asForm()->withBasicAuth((string) $c['client_id'], (string) $c['client_secret'])->timeout(15)
            ->post("{$issuer}/token", [
                'grant_type' => 'authorization_code', 'code' => $dados['code'],
                'redirect_uri' => $c['redirect_uri'], 'code_verifier' => $sessao['verificador'],
            ])->throw()->json();

        $claims = $this->validarIdToken((string) ($tokens['id_token'] ?? ''), $issuer, (string) $c['client_id'], $sessao['nonce']);

        // Mensagem neutra: não revela se o CPF existe em outro município nem dados de terceiros.
        $titular = Concessionario::where('documento_hash', Documento::hash((string) $claims['sub']))->first();
        if (!$titular || !$titular->concessoes()->exists()) {
            return response()->json(['message' => 'Não há concessões vinculadas a este CPF neste município.', 'code' => 'portal.sem_concessoes'], 403);
        }

        return response()->json([
            'token' => $titular->createToken('portal-govbr', ['portal'], now()->addHours(8))->plainTextToken,
            'nome' => $titular->nome,
        ]);
    }

    /** @return array<string, mixed> */
    private function validarIdToken(string $jwt, string $issuer, string $clientId, string $nonce): array
    {
        $partes = explode('.', $jwt);
        if (count($partes) !== 3) {
            throw new RegraNegocioException('govbr.token_invalido', 'Resposta de autenticação inválida.');
        }

        [$h, $p, $s] = $partes;
        $cabecalho = json_decode(self::b64urlDecode($h), true);
        $claims = json_decode(self::b64urlDecode($p), true);

        $jwks = Cache::remember('cemiterios:govbr:jwks', 3600, fn () => Http::timeout(10)->get("{$issuer}/jwk")->throw()->json('keys'));
        $chave = collect((array) $jwks)->firstWhere('kid', $cabecalho['kid'] ?? null);

        $valido = is_array($cabecalho) && is_array($claims)
            && ($cabecalho['alg'] ?? null) === 'RS256'
            && is_array($chave)
            && openssl_verify("{$h}.{$p}", self::b64urlDecode($s), self::pem($chave['n'], $chave['e']), OPENSSL_ALGO_SHA256) === 1
            && rtrim((string) ($claims['iss'] ?? ''), '/') === $issuer
            && in_array($clientId, (array) ($claims['aud'] ?? []), true)
            && (int) ($claims['exp'] ?? 0) > time()
            && hash_equals($nonce, (string) ($claims['nonce'] ?? ''))
            && strlen(Documento::somenteDigitos((string) ($claims['sub'] ?? ''))) === 11;

        if (!$valido) {
            throw new RegraNegocioException('govbr.token_invalido', 'Não foi possível validar a autenticação Gov.br.');
        }

        return $claims;
    }

    /** Chave pública RSA (JWK n/e) em PEM SubjectPublicKeyInfo. */
    private static function pem(string $n, string $e): string
    {
        $inteiro = fn (string $b) => self::der(0x02, ord($b[0]) > 0x7F ? "\x00{$b}" : $b);
        $rsa = self::der(0x30, $inteiro(self::b64urlDecode($n)) . $inteiro(self::b64urlDecode($e)));
        $algoritmo = self::der(0x30, self::der(0x06, "\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01") . "\x05\x00");
        $spki = self::der(0x30, $algoritmo . self::der(0x03, "\x00{$rsa}"));

        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }

    private static function der(int $tag, string $valor): string
    {
        $n = strlen($valor);
        if ($n < 0x80) {
            return chr($tag) . chr($n) . $valor;
        }
        $bytes = ltrim(pack('N', $n), "\x00");

        return chr($tag) . chr(0x80 | strlen($bytes)) . $bytes . $valor;
    }

    private static function b64url(string $binario): string
    {
        return rtrim(strtr(base64_encode($binario), '+/', '-_'), '=');
    }

    private static function b64urlDecode(string $texto): string
    {
        return (string) base64_decode(strtr($texto, '-_', '+/'), true);
    }
}
