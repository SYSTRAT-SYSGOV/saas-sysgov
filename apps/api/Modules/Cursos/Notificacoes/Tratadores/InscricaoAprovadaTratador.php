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

/** Tratador de `cursos.InscricaoAprovada` (tarefa 5.2, design D12). */
final class InscricaoAprovadaTratador implements Tratador
{
    public const string TIPO = 'inscricao_aprovada';

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
        $paragrafo = "Sua inscrição no curso \"{$inscricao->turma->curso->titulo}\", turma \"{$inscricao->turma->nome}\", foi aprovada.";
        $mailable = new InscricaoStatusMail($identidade, 'Inscrição aprovada', [$paragrafo]);

        return [new Mensagem(self::TIPO, $inscricao->participante->email, $mailable)];
    }
}
