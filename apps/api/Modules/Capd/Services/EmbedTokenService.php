<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Modules\Capd\Models\Servidor;

final class EmbedTokenService
{
    /**
     * Gera um token de embutimento seguro para um servidor ou chefia.
     *
     * @param string $mode 'autoavaliacao' | 'diario-bordo' | 'espelho' | 'recurso'
     */
    public function generateToken(
        int $tenantId,
        string $cpfOuMatricula,
        string $mode = 'autoavaliacao',
        int $ttlMinutes = 60
    ): string {
        $cpfLimpo = preg_replace('/\D/', '', $cpfOuMatricula);

        $servidor = Servidor::where('tenant_id', $tenantId)
            ->where(function ($q) use ($cpfOuMatricula, $cpfLimpo) {
                $q->where('matricula', $cpfOuMatricula);
                if (strlen($cpfLimpo) === 11) {
                    $q->orWhere('cpf', 'like', "%{$cpfLimpo}%");
                }
            })
            ->first();

        $payload = [
            'tenant_id'    => $tenantId,
            'servidor_id'  => $servidor?->id,
            'matricula'    => $servidor?->matricula ?? $cpfOuMatricula,
            'nome'         => $servidor?->nome_completo ?? 'Servidor Municipal',
            'mode'         => $mode,
            'nonce'        => Str::random(16),
            'expires_at'   => now()->addMinutes($ttlMinutes)->timestamp,
        ];

        return Crypt::encryptString(json_encode($payload));
    }

    /**
     * Valida um token de embutimento e retorna os metadados da sessão.
     *
     * @return array{tenant_id: int, servidor_id: ?int, matricula: string, nome: string, mode: string}|null
     */
    public function validateToken(string $token): ?array
    {
        try {
            $json = Crypt::decryptString($token);
            $payload = json_decode($json, true);

            if (!is_array($payload)) {
                return null;
            }

            if (($payload['expires_at'] ?? 0) < now()->timestamp) {
                return null;
            }

            return [
                'tenant_id'   => (int) $payload['tenant_id'],
                'servidor_id' => isset($payload['servidor_id']) ? (int) $payload['servidor_id'] : null,
                'matricula'   => (string) $payload['matricula'],
                'nome'        => (string) $payload['nome'],
                'mode'        => (string) ($payload['mode'] ?? 'autoavaliacao'),
            ];
        } catch (\Throwable) {
            return null;
        }
    }
}
