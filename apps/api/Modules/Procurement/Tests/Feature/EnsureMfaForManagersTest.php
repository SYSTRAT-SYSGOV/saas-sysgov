<?php

declare(strict_types=1);

namespace Modules\Procurement\Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Modules\Procurement\Http\Middleware\EnsureMfaForManagers;
use Modules\Procurement\Tests\TestCase;

/**
 * Regressão RN-006: o fallback de sessão em EnsureMfaForManagers usava `true` como
 * default (`session()->get('mfa_verified', true)`), o que tornava o bloqueio de MFA um
 * no-op em qualquer API stateless (sem sessão). O fix usa `false` como default.
 */
final class EnsureMfaForManagersTest extends TestCase
{
    use RefreshDatabase;

    private function makeManager(): User
    {
        $role = Role::create(['name' => 'Gestor Financeiro', 'slug' => 'gestor-financeiro', 'scope' => 'tenant', 'guard_name' => 'web']);
        $user = User::create(['name' => 'Gestor', 'email' => 'gestor@teste.gov', 'password' => 'StrongPass!123']);
        $user->roles()->attach($role->id);

        return $user;
    }

    public function test_manager_without_mfa_verified_is_blocked(): void
    {
        $user = $this->makeManager();
        $request = Request::create('/api/licitacoes/1/homologar', 'POST');
        $request->setUserResolver(fn () => $user);
        $request->setLaravelSession(new \Illuminate\Session\Store('test', new \Illuminate\Session\ArraySessionHandler(120)));

        $middleware = new EnsureMfaForManagers();
        $response = $middleware->handle($request, fn ($req) => response()->json(['ok' => true]));

        self::assertSame(403, $response->getStatusCode());
        self::assertSame('MFA_REQUIRED', json_decode($response->getContent(), true)['code']);
    }

    public function test_manager_with_mfa_header_passes_through(): void
    {
        $user = $this->makeManager();
        $request = Request::create('/api/licitacoes/1/homologar', 'POST');
        $request->headers->set('X-MFA-Verified', 'true');
        $request->setUserResolver(fn () => $user);

        $middleware = new EnsureMfaForManagers();
        $response = $middleware->handle($request, fn ($req) => response()->json(['ok' => true]));

        self::assertSame(200, $response->getStatusCode());
    }

    public function test_non_manager_passes_through_without_mfa(): void
    {
        $user = User::create(['name' => 'Servidor Comum', 'email' => 'servidor@teste.gov', 'password' => 'StrongPass!123']);
        $request = Request::create('/api/licitacoes/1/homologar', 'POST');
        $request->setUserResolver(fn () => $user);

        $middleware = new EnsureMfaForManagers();
        $response = $middleware->handle($request, fn ($req) => response()->json(['ok' => true]));

        self::assertSame(200, $response->getStatusCode());
    }
}
