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
use Modules\Cursos\Services\InscricaoService;

/**
 * Tratador de `cursos.InscricaoCriada` (tarefa 5.2, design D12) — o texto muda pelo status com
 * que a inscrição nasceu: `confirmada`, `pendente` (aguarda aprovação) ou `lista_espera` (com a
 * posição, calculada na hora do envio — mais precisa que guardar no payload, já que a fila pode
 * mudar entre a criação e o envio).
 */
final class InscricaoCriadaTratador implements Tratador
{
    public const string TIPO = 'inscricao_criada';

    public function __construct(
        private readonly ResolvedorIdentidade $resolvedorIdentidade,
        private readonly InscricaoService $inscricoes,
    ) {}

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

        $curso = $inscricao->turma->curso->titulo;
        $turma = $inscricao->turma->nome;

        [$assunto, $paragrafo] = match ($inscricao->statusEnum()) {
            StatusInscricao::Confirmada => ['Inscrição confirmada', "Sua inscrição no curso \"{$curso}\", turma \"{$turma}\", foi confirmada."],
            StatusInscricao::Pendente => ['Inscrição recebida', "Sua inscrição no curso \"{$curso}\", turma \"{$turma}\", foi recebida e está aguardando aprovação do Administrador."],
            StatusInscricao::ListaEspera => [
                'Você entrou na lista de espera',
                "A turma \"{$turma}\" do curso \"{$curso}\" está com as vagas ocupadas. Sua inscrição entrou na lista de espera, na posição {$this->inscricoes->posicaoNaFila($inscricao)}.",
            ],
            default => [null, null],
        };
        if ($assunto === null || $paragrafo === null) {
            return [];
        }

        $identidade = $this->resolvedorIdentidade->resolver($tenant);
        $mailable = new InscricaoStatusMail($identidade, $assunto, [$paragrafo]);

        return [new Mensagem(self::TIPO, $inscricao->participante->email, $mailable)];
    }
}
