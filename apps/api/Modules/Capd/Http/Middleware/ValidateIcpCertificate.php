<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Modules\Capd\Models\Sessao;
use Modules\Capd\Services\Adapters\AssinaturaAdapterFactory;

/**
 * Valida o certificado digital ICP-Brasil antes de selar a ata — só se
 * exigível: sessões de ciclos com `tipo_assinatura_ata = 'sha256'` (padrão,
 * gratuito) não usam certificado e passam direto (spec: digital-signature).
 */
final class ValidateIcpCertificate
{
    public function __construct(
        private readonly AssinaturaAdapterFactory $adapters,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $sessao = Sessao::findOrFail($request->route('id'));
        $ciclo = $sessao->comissao?->ciclo;

        if (! $ciclo instanceof \Modules\Capd\Models\CicloAvaliacao || ! $ciclo->usaAssinaturaIcp()) {
            return $next($request);
        }

        $certificado = $request->input('certificado');
        if (empty($certificado)) {
            return response()->json([
                'error' => 'Certificado digital não fornecido.',
            ], 422);
        }

        if (! $this->adapters->paraSessao($sessao)->validarCertificado($certificado)) {
            return response()->json([
                'error' => 'O certificado digital fornecido está expirado ou foi revogado.',
            ], 423);
        }

        return $next($request);
    }
}
