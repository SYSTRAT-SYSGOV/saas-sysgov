<?php

declare(strict_types=1);

namespace Modules\Cursos\Notificacoes\Tratadores;

use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Notificacoes\Mensagem;
use App\Notificacoes\ResolvedorIdentidade;
use App\Notificacoes\Tratador;
use Modules\Cursos\Mail\InscricaoStatusMail;
use Modules\Cursos\Models\Inscricao;

/** Tratador de `cursos.InscricaoRecusada` (tarefa 5.2, design D12) — o motivo veio pro payload nesta tarefa. */
final class InscricaoRecusadaTratador implements Tratador
{
    public const string TIPO = 'inscricao_recusada';

    public function __construct(private readonly ResolvedorIdentidade $resolvedorIdentidade) {}

    public function tratar(OutboxEvent $evento): array
    {
        $inscricaoId = $evento->payload['id'] ?? null;
        $inscricao = $inscricaoId !== null ? Inscricao::with(['turma.curso', 'participante'])->find($inscricaoId) : null;
        if ($inscricao === null || empty($inscricao->participante->email)) {
            return [];
        }

        $tenant = $evento->tenant_id !== null ? Tenant::find($evento->tenant_id) : null;
        if ($tenant === null) {
            return [];
        }

        $identidade = $this->resolvedorIdentidade->resolver($tenant);
        $paragrafos = ["Sua inscrição no curso \"{$inscricao->turma->curso->titulo}\", turma \"{$inscricao->turma->nome}\", foi recusada."];
        $motivo = $evento->payload['motivo'] ?? null;
        if (is_string($motivo) && $motivo !== '') {
            // InscricaoService::recusar prefixa "Recusada: " no motivo antes de gravar na coluna
            // motivo_cancelamento (compartilhada com o cancelamento) — no e-mail isso repetiria
            // "recusada" duas vezes na mesma frase.
            $paragrafos[] = 'Motivo informado: ' . (preg_replace('/^Recusada:\s*/', '', $motivo) ?? $motivo);
        }

        $mailable = new InscricaoStatusMail($identidade, 'Inscrição recusada', $paragrafos);

        return [new Mensagem(self::TIPO, $inscricao->participante->email, $mailable)];
    }
}
