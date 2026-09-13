<?php

declare(strict_types=1);

namespace Modules\Capd\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\ComissaoMembro;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\HierarquiaService;

/**
 * Policy de Avaliação de Desempenho.
 *
 * Papéis relevantes:
 *   - avaliador (chefia imediata) → cria/edita avaliações dos subordinados
 *   - membro_capd               → homologa avaliações, acessa tudo no tenant
 *   - servidor                  → visualiza apenas a própria avaliação
 */
final class AvaliacaoPolicy
{
    use HandlesAuthorization;

    public function __construct(private readonly HierarquiaService $hierarquia)
    {
    }

    public function before(User $user, string $ability): ?bool
    {
        if ($user->is_platform_admin || collect(['admin_tenant', 'admin', 'gestor_rh', 'root'])->some(fn ($r) => $user->hasRole($r))) {
            return true;
        }

        return null;
    }

    public function view(User $user, Avaliacao $avaliacao): bool
    {
        // Servidor pode ver a própria avaliação
        if ($avaliacao->servidor_id === $user->id) {
            return true;
        }

        // Avaliador pode ver avaliações que criou
        if ($avaliacao->avaliador_id === $user->id) {
            return true;
        }

        // Membros da CAPD têm acesso total no tenant
        return $this->isMembro($user);
    }

    public function create(User $user): bool
    {
        // Qualquer usuário com papel de avaliador pode criar
        return $user->hasPermissionTo('capd.avaliacoes.criar')
            || $user->hasRole(['admin_tenant', 'gestor_rh']);
    }

    public function update(User $user, Avaliacao $avaliacao): bool
    {
        // Somente o avaliador original pode editar (enquanto não homologada)
        return $avaliacao->avaliador_id === $user->id
            && ! $avaliacao->homologada;
    }

    /**
     * Autoriza a submissão/edição de uma avaliação, recalculando quem é o
     * superior imediato resolvido pela hierarquia real (nunca confia apenas
     * no avaliador_id gravado no registro — RN de resolução hierárquica).
     */
    public function avaliar(User $user, Avaliacao $avaliacao): bool
    {
        if ($avaliacao->homologada) {
            return false;
        }

        $servidor = Servidor::query()->where('user_id', $avaliacao->servidor_id)->first();

        if ($servidor === null) {
            return false;
        }

        $resolvido = $this->hierarquia->resolverAvaliador($servidor, now());

        return ! $resolvido->pendente && $resolvido->userId === $user->id;
    }

    public function homologar(User $user): bool
    {
        // Somente membros ativos da CAPD podem homologar
        return $this->isMembro($user)
            || $user->hasPermissionTo('capd.avaliacoes.homologar');
    }

    private function isMembro(User $user): bool
    {
        return ComissaoMembro::query()
            ->where('servidor_id', $user->id)
            ->where('ativo', true)
            ->exists();
    }
}
