<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use App\Support\AuditLogger;
use GuzzleHttp\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class OidcController
{
    private Client $http;

    public function __construct(private readonly AuditLogger $audit)
    {
        $this->http = new Client(['http_errors' => false, 'timeout' => 10]);
    }

    /**
     * Inicia o fluxo OIDC do tenant (RN-USR-008) — redirect para o issuer com state + PKCE
     */
    public function redirect(Tenant $tenant): RedirectResponse
    {
        $config = $this->configFor($tenant);

        if ($config === null) {
            abort(422, 'SSO OpenID Connect não configurado para este tenant.');
        }

        $discovery = $this->discover($config['issuer']);

        if (!isset($discovery['authorization_endpoint'])) {
            abort(502, 'Não foi possível obter o authorization_endpoint do issuer OIDC.');
        }

        $state = Str::random(40);
        $verifier = Str::random(64);
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

        // Guarda o estado do fluxo por 10 minutos
        Cache::put("oidc:state:{$state}", [
            'tenant_id' => $tenant->id,
            'verifier' => $verifier,
            'redirect_uri' => url('/api/admin/oidc/callback'),
        ], 600);

        $params = http_build_query([
            'client_id' => $config['client_id'],
            'redirect_uri' => url('/api/admin/oidc/callback'),
            'response_type' => 'code',
            'scope' => $config['scopes'] ?? 'openid email profile',
            'state' => $state,
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
        ]);

        return redirect()->away($discovery['authorization_endpoint'].'?'.$params);
    }

    /**
     * Callback OIDC — troca o code, busca userinfo e vincula o usuário por e-mail
     * RN-USR-008: usuário vinculado por e-mail; 409 se não existir
     */
    public function callback(Request $request): JsonResponse
    {
        $state = $request->string('state');
        $code = $request->string('code');

        if (!$state || !$code) {
            abort(422, 'Parâmetros inválidos no callback OIDC.');
        }

        $flow = Cache::pull("oidc:state:{$state}");

        if (!$flow) {
            abort(422, 'Estado do fluxo OIDC inválido ou expirado.');
        }

        $tenant = Tenant::findOrFail($flow['tenant_id']);
        $config = $this->configFor($tenant);

        if ($config === null) {
            abort(422, 'SSO OpenID Connect não configurado para este tenant.');
        }

        $discovery = $this->discover($config['issuer']);

        if (!isset($discovery['token_endpoint']) || !isset($discovery['userinfo_endpoint'])) {
            abort(502, 'Discovery OIDC incompleto para o issuer.');
        }

        // Troca o code por tokens
        $tokenResponse = $this->http->post($discovery['token_endpoint'], [
            'form_params' => [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => url('/api/admin/oidc/callback'),
                'client_id' => $config['client_id'],
                'client_secret' => $config['client_secret'],
                'code_verifier' => $flow['verifier'],
            ],
        ]);

        $tokens = json_decode((string) $tokenResponse->getBody(), true);

        if (($tokenResponse->getStatusCode() !== 200) || !isset($tokens['access_token'])) {
            abort(401, 'Falha ao trocar o código de autorização.');
        }

        $userInfoResponse = $this->http->get($discovery['userinfo_endpoint'], [
            'headers' => ['Authorization' => 'Bearer '.$tokens['access_token']],
        ]);

        $userInfo = json_decode((string) $userInfoResponse->getBody(), true);

        if ($userInfoResponse->getStatusCode() !== 200 || empty($userInfo['email'])) {
            abort(401, 'Falha ao obter as informações do usuário no IdP.');
        }

        // Localiza o usuário vinculado ao tenant pelo e-mail
        $user = User::where('email', $userInfo['email'])
            ->whereHas('tenants', fn ($q) => $q->where('tenant_id', $tenant->id)->where('status', 'active'))
            ->first();

        if (!$user) {
            // RN-USR-008: não cria usuário automaticamente via SSO sem vínculo/convite
            return response()->json([
                'message' => 'Nenhum usuário vinculado a este tenant foi encontrado para o e-mail '.$userInfo['email'].'. Solicite o convite ou vínculo ao administrador.',
                'error_code' => 'OIDC_USER_NOT_LINKED',
            ], 409);
        }

        $user->forceFill([
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        $this->audit->record('admin', 'oidc.login', "User #{$user->id} via OIDC", null, [
            'tenant_id' => $tenant->id,
            'issuer' => $config['issuer'],
        ]);

        $token = $user->createToken('oidc-session', ['api'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->only(['id', 'name', 'email']),
            'tenant' => ['id' => $tenant->id, 'name' => $tenant->name, 'slug' => $tenant->slug],
        ]);
    }

    /**
     * Lê a configuração OIDC do settings do tenant
     */
    private function configFor(Tenant $tenant): ?array
    {
        $settings = $tenant->settings ?? [];

        $issuer = $settings['oidc']['issuer'] ?? null;
        $clientId = $settings['oidc']['client_id'] ?? null;
        $clientSecret = $settings['oidc']['client_secret'] ?? null;

        if (!$issuer || !$clientId || !$clientSecret) {
            return null;
        }

        return [
            'issuer' => rtrim((string) $issuer, '/'),
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'scopes' => $settings['oidc']['scopes'] ?? 'openid email profile',
        ];
    }

    /**
     * Discovery OIDC via .well-known/openid-configuration
     */
    private function discover(string $issuer): array
    {
        $response = $this->http->get($issuer.'/.well-known/openid-configuration');

        if ($response->getStatusCode() !== 200) {
            return [];
        }

        return json_decode((string) $response->getBody(), true) ?: [];
    }
}
