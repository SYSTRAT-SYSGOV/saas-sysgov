<?php

declare(strict_types=1);

namespace Modules\Cursos\Notificacoes\Tratadores;

use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Notificacoes\Mensagem;
use App\Notificacoes\ResolvedorIdentidade;
use App\Notificacoes\Tratador;
use Modules\Cursos\Mail\CertificadoEmitidoMail;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Services\CertificadoService;

/**
 * Tratador de `cursos.CertificadoEmitido` (tarefa 5.3, design D12) — leva o código e o link de
 * validação pública, mesma URL que já vai no QR code do PDF (`CertificadoService::urlValidacao`,
 * `config('cursos.url_portal')`) — não reaproveita `config('app.portal_url')` (D3, a variável
 * nova desta mudança) pra não ter dois links diferentes pro mesmo certificado.
 */
final class CertificadoEmitidoTratador implements Tratador
{
    public const string TIPO = 'certificado_emitido';

    public function __construct(private readonly ResolvedorIdentidade $resolvedorIdentidade) {}

    public function tratar(OutboxEvent $evento): array
    {
        $certificadoId = $evento->payload['id'] ?? null;
        $certificado = $certificadoId !== null ? Certificado::with('participante')->find($certificadoId) : null;
        if ($certificado === null || empty($certificado->participante->email)) {
            return [];
        }
        if ($certificado->revogado()) {
            // Emitido e revogado antes deste evento ser processado (raro, mas o e-mail "seu
            // certificado foi emitido" não faz sentido pra algo que já não vale mais).
            return [];
        }

        $tenant = $evento->tenant_id !== null ? Tenant::find($evento->tenant_id) : null;
        if ($tenant === null) {
            return [];
        }

        $identidade = $this->resolvedorIdentidade->resolver($tenant);
        $curso = (string) ($certificado->dados['curso'] ?? '');
        $link = CertificadoService::urlValidacao($certificado->codigo);
        $mailable = new CertificadoEmitidoMail($identidade, $certificado->participante->nome, $curso, $certificado->codigoFormatado(), $link);

        return [new Mensagem(self::TIPO, $certificado->participante->email, $mailable)];
    }
}
