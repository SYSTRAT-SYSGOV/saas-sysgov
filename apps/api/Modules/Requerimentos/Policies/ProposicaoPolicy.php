<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Policies;

use App\Models\User;
use Modules\Requerimentos\Models\Proposicao;
use Modules\Requerimentos\Policies\Concerns\PermissoesRequerimentos;

final class ProposicaoPolicy
{
    use PermissoesRequerimentos;

    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('requerimentos.view');
    }

    public function view(User $user, Proposicao $proposicao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if (! $this->doTenant($proposicao)) {
            return false;
        }

        // Proposições públicas são visíveis para todos do tenant
        if ($proposicao->visibilidade_publica) {
            return true;
        }

        // Autor sempre vê suas proposições
        if ($proposicao->autor_principal_id === $user->id) {
            return true;
        }

        // Coautores também podem ver
        if ($proposicao->autores()->where('user_id', $user->id)->exists()) {
            return true;
        }

        // Usuários envolvidos na tramitação podem ver
        if ($proposicao->tramitacoesPoderes()
            ->where(function ($q) use ($user) {
                $q->where('remetente_id', $user->id)
                  ->orWhere('responsavel_id', $user->id);
            })->exists()) {
            return true;
        }

        return $user->hasPermission('requerimentos.view');
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('requerimentos.create');
    }

    public function update(User $user, Proposicao $proposicao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if (! $this->doTenant($proposicao)) {
            return false;
        }

        // Apenas usuários do mesmo Poder podem editar
        // O poder_origem da proposição deve corresponder ao poder do usuário
        if (! $user->hasPermission('requerimentos.edit')) {
            return false;
        }

        return $proposicao->autor_principal_id === $user->id || $user->hasPermission('requerimentos.admin');
    }

    public function delete(User $user, Proposicao $proposicao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        return $this->doTenant($proposicao) && $user->hasPermission('requerimentos.delete');
    }

    /**
     * Anexar documentos é uma ação mais leve que `update` (não altera o conteúdo protocolado):
     * o autor/coautor da proposição pode anexar mesmo sem `requerimentos.edit`, permissão que
     * por padrão o perfil "Autor de Proposições" não tem (só view+create).
     */
    public function anexar(User $user, Proposicao $proposicao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        if (! $this->doTenant($proposicao)) {
            return false;
        }

        if ($proposicao->autor_principal_id === $user->id
            || $proposicao->autores()->where('user_id', $user->id)->exists()) {
            return true;
        }

        return $user->hasPermission('requerimentos.edit') || $user->hasPermission('requerimentos.admin');
    }

    public function encaminhar(User $user, Proposicao $proposicao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        return $this->doTenant($proposicao)
            && $user->hasPermission('requerimentos.tramitar');
    }

    public function responder(User $user, Proposicao $proposicao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        return $this->doTenant($proposicao)
            && $user->hasPermission('requerimentos.responder');
    }

    public function auditar(User $user, Proposicao $proposicao): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        return $this->doTenant($proposicao)
            && $user->hasPermission('requerimentos.auditoria');
    }
}