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

/** Tratador de `cursos.InscricaoCancelada` (tarefa 5.2, design D12) — o motivo veio pro payload nesta tarefa; pode ser nulo (cancelamento sem motivo informado). */
final class InscricaoCanceladaTratador implements Tratador
{
    public const string TIPO = 'inscricao_cancelada';

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
        $paragrafos = ["Sua inscrição no curso \"{$inscricao->turma->curso->titulo}\", turma \"{$inscricao->turma->nome}\", foi cancelada."];
        $motivo = $evento->payload['motivo'] ?? null;
        if (is_string($motivo) && $motivo !== '') {
            $paragrafos[] = "Motivo informado: {$motivo}";
        }

        $mailable = new InscricaoStatusMail($identidade, 'Inscrição cancelada', $paragrafos);

        return [new Mensagem(self::TIPO, $inscricao->participante->email, $mailable)];
    }
}
