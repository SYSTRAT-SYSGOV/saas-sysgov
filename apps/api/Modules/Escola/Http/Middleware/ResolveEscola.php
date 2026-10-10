<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Middleware;

use App\Services\ModuleAccessService;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Modules\Escola\Models\Escola;
use Modules\Escola\Support\EscolaContext;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolve a escola de trabalho (cabeçalho X-Escola-ID) e confere se o usuário pode acessá-la
 * (D2): admin geral acessa todas; os demais, as escolas cujas unidades estão no seu escopo de
 * acesso ao módulo da rota (`escola:pedagogico`), com expansão hierárquica. Sem o cabeçalho,
 * vale a escola única do tenant. Precisa vir depois de 'tenant' e antes de 'bindings'.
 */
final class ResolveEscola
{
    public function __construct(
        private readonly EscolaContext $context,
        private readonly TenantContext $tenant,
        private readonly ModuleAccessService $access,
    ) {}

    public function handle(Request $request, Closure $next, string $modulo = 'escola'): Response
    {
        $cabecalho = $request->header('X-Escola-ID');

        if ($cabecalho !== null && $cabecalho !== '') {
            // TenantAware: escola de outro tenant simplesmente não existe aqui.
            $escola = ctype_digit((string) $cabecalho) ? Escola::query()->find((int) $cabecalho) : null;
            abort_if($escola === null, 403, 'Escola inválida ou não pertence a este órgão.');
        } else {
            $escola = $this->context->escolaUnicaDoTenant();
            abort_if($escola === null, 422, 'Selecione a escola de trabalho.');
        }

        abort_unless($this->podeAcessar($request, $escola, $modulo), 403, 'Você não tem acesso a esta escola.');
        // Escola inativa continua consultável, mas não aceita cadastros nem lançamentos.
        abort_if(!$escola->ativa && !$request->isMethodSafe(), 422, 'Esta escola está inativa: não aceita novos cadastros ou lançamentos.');

        $this->context->set($escola);

        try {
            return $next($request);
        } finally {
            $this->context->clear();
        }
    }

    private function podeAcessar(Request $request, Escola $escola, string $modulo): bool
    {
        $user = $request->user();
        if ($user === null) {
            return false;
        }

        $permitidas = $this->access->allowedOrgUnitIds($user, $modulo, $this->tenant->id());

        return $permitidas === null
            || $escola->org_unit_id === null
            || in_array($escola->org_unit_id, $permitidas, true);
    }
}
