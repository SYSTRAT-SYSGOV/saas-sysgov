<?php

declare(strict_types=1);

namespace Modules\Cursos\Notificacoes\Tratadores;

use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Notificacoes\Mensagem;
use App\Notificacoes\ResolvedorIdentidade;
use App\Notificacoes\Tratador;
use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Mail\InscricaoStatusMail;
use Modules\Cursos\Models\Inscricao;

/** Tratador de `cursos.InscricaoPromovida` (tarefa 5.2, design D12) — saída da lista de espera por vaga liberada. */
final class InscricaoPromovidaTratador implements Tratador
{
    public const string TIPO = 'inscricao_promovida';

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

        $novoStatus = StatusInscricao::tryFrom((string) ($evento->payload['status'] ?? ''));
        $situacao = $novoStatus === StatusInscricao::Pendente
            ? 'Sua inscrição está aguardando aprovação do Administrador.'
            : 'Sua inscrição está confirmada.';

        $identidade = $this->resolvedorIdentidade->resolver($tenant);
        $paragrafos = [
            "Uma vaga foi liberada na turma \"{$inscricao->turma->nome}\" do curso \"{$inscricao->turma->curso->titulo}\" e você saiu da lista de espera.",
            $situacao,
        ];
        $mailable = new InscricaoStatusMail($identidade, 'Você saiu da lista de espera', $paragrafos);

        return [new Mensagem(self::TIPO, $inscricao->participante->email, $mailable)];
    }
}
