<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Middleware;

use App\Models\User;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Membro;
use Modules\Campanha\Support\CampanhaContext;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolve a campanha de trabalho (cabeçalho X-Campanha-ID) e confere o acesso (D2): admin da
 * plataforma e quem tem campanha.gestao.manage acessam todas as campanhas do tenant; os demais, só
 * as de que são membros. Sem o cabeçalho, vale a campanha única do tenant. Campanha encerrada só
 * aceita consulta. Precisa vir depois de 'tenant' e antes de 'bindings'.
 */
final class ResolveCampanha
{
    public function __construct(
        private readonly CampanhaContext $context,
        private readonly TenantContext $tenant,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $cabecalho = $request->header('X-Campanha-ID');
        if ($cabecalho !== null && $cabecalho !== '') {
            // TenantAware: campanha de outro tenant simplesmente não existe aqui.
            $campanha = ctype_digit((string) $cabecalho) ? Campanha::query()->find((int) $cabecalho) : null;
            abort_if($campanha === null, 404, 'Campanha não encontrada.');
        } else {
            $campanhas = Campanha::query()->orderBy('id')->limit(2)->get();
            abort_if($campanhas->count() !== 1, 422, 'Selecione a campanha de trabalho.');
            $campanha = $campanhas->first();
        }

        /** @var User|null $user */
        $user = $request->user();
        abort_unless($user !== null && self::podeAcessar($user, $campanha, $this->tenant->id()), 403, 'Você não tem acesso a esta campanha.');
        // Exceção: a exclusão a pedido do titular (LGPD) vale também depois do encerramento.
        $exclusaoDoTitular = $request->isMethod('DELETE') && $request->is('api/campanha/eleitores/*');
        abort_if($campanha->encerrada() && !$request->isMethodSafe() && !$exclusaoDoTitular, 422, 'Esta campanha está encerrada: não aceita alterações.');

        $this->context->set($campanha);
        try {
            return $next($request);
        } finally {
            $this->context->clear();
        }
    }

    public static function podeAcessar(User $user, Campanha $campanha, int $tenantId): bool
    {
        return $user->is_platform_admin
            || $user->hasPermission('campanha.gestao.manage', $tenantId)
            || Membro::query()->where('campanha_id', $campanha->id)->where('user_id', $user->id)->exists();
    }
}
