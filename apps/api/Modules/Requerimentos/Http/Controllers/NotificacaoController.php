<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Requerimentos\Models\Notificacao;

final class NotificacaoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $query = Notificacao::doUsuario($user->id)
            ->with('proposicao:id,numero,ementa')
            ->latest();

        if ($request->boolean('nao_lidas')) {
            $query->naoLidas();
        }

        $notificacoes = $query->paginate($request->input('per_page', 20));

        return response()->json($notificacoes);
    }

    public function marcarLida(int $id, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $notificacao = Notificacao::doUsuario($user->id)->findOrFail($id);
        $notificacao->update(['lida' => true, 'lida_em' => now()]);

        return response()->json(['message' => 'Notificação marcada como lida.']);
    }

    public function marcarTodasLidas(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        Notificacao::doUsuario($user->id)
            ->naoLidas()
            ->update(['lida' => true, 'lida_em' => now()]);

        return response()->json(['message' => 'Todas as notificações marcadas como lidas.']);
    }

    public function preferencias(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        // PreferenciaNotificacao é TenantAware: tenant_id vem do TenantContext da requisição.
        $preferencias = \Modules\Requerimentos\Models\PreferenciaNotificacao::firstOrCreate(
            ['user_id' => $user->id],
            [
                'canais'        => ['email', 'portal'],
                'digest_diario' => false,
            ]
        );

        return response()->json($preferencias);
    }

    public function atualizarPreferencias(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'canais'        => ['nullable', 'array'],
            'canais.*'      => ['string', 'in:email,portal'],
            'digest_diario' => ['nullable', 'boolean'],
        ]);

        $preferencias = \Modules\Requerimentos\Models\PreferenciaNotificacao::updateOrCreate(
            ['user_id' => $user->id],
            array_filter($validated, fn ($v) => $v !== null),
        );

        return response()->json($preferencias);
    }
}