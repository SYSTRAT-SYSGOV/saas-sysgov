<?php

declare(strict_types=1);

namespace Modules\Protocolo\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Protocolo\Models\Andamento;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Models\TipoTramitacao;

final class TramitacaoService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * Registra nova tramitação de processo entre órgãos (D3/D4).
     */
    public function tramitar(
        Processo|int $processo,
        int $orgaoDestinoId,
        int $tipoTramitacaoId,
        int $usuarioId,
        ?string $descricao = null,
        ?int $prazoDias = null,
    ): Andamento {
        $processoId = $processo instanceof Processo ? $processo->id : (int) $processo;

        return DB::transaction(function () use (
            $processoId,
            $orgaoDestinoId,
            $tipoTramitacaoId,
            $usuarioId,
            $descricao,
            $prazoDias
        ): Andamento {
            $proc = Processo::query()->where('id', $processoId)->lockForUpdate()->firstOrFail();

            if (in_array($proc->status, ['concluido', 'arquivado'], true)) {
                throw new LogicException('Não é possível tramitar um processo concluído ou arquivado.');
            }

            $tipo = TipoTramitacao::query()->where('id', $tipoTramitacaoId)->firstOrFail();
            if (!$tipo->ativo) {
                throw new LogicException('Tipo de tramitação inativo.');
            }

            $andamentoAtual = Andamento::query()
                ->where('processo_id', $proc->id)
                ->where('and_atual', true)
                ->first();

            $agora = now();

            if ($andamentoAtual !== null) {
                $andamentoAtual->update([
                    'data_envio' => $agora,
                    'and_atual' => false,
                ]);
                $novaSequencia = $andamentoAtual->sequencia + 1;
                $orgaoOrigemId = $proc->orgao_atual_id;
            } else {
                $novaSequencia = 1;
                $orgaoOrigemId = $proc->orgao_origem_id;
            }

            $novoAndamento = Andamento::create([
                'tenant_id' => $proc->tenant_id,
                'processo_id' => $proc->id,
                'orgao_origem_id' => $orgaoOrigemId,
                'orgao_destino_id' => $orgaoDestinoId,
                'tipo_tramitacao_id' => $tipo->id,
                'usuario_id' => $usuarioId,
                'descricao' => $descricao,
                'sequencia' => $novaSequencia,
                'and_atual' => true,
            ]);

            $before = $proc->only(['orgao_atual_id', 'status', 'ultimo_andamento_id', 'data_conclusao']);

            $proc->orgao_atual_id = $orgaoDestinoId;
            $proc->ultimo_andamento_id = $novoAndamento->id;

            if ($tipo->efeito_status !== null) {
                $proc->status = $tipo->efeito_status;
                if ($tipo->efeito_status === 'concluido') {
                    $proc->data_conclusao = $agora;
                }
            } elseif ($proc->status === 'aberto') {
                $proc->status = 'em_tramitacao';
            }

            $proc->save();
            $after = $proc->only(['orgao_atual_id', 'status', 'ultimo_andamento_id', 'data_conclusao']);

            $this->auditLogger->record(
                module: 'protocolo',
                action: 'processo.tramitar',
                resource: "Processo #{$proc->id} ({$proc->numero_formatado})",
                before: $before,
                after: $after,
            );

            return $novoAndamento;
        });
    }

    /**
     * Confirma recebimento pelo órgão de destino.
     */
    public function receber(
        Processo|int $processo,
        int $usuarioRecebedorId,
        ?int $orgaoUsuarioId = null,
    ): Andamento {
        $processoId = $processo instanceof Processo ? $processo->id : (int) $processo;

        return DB::transaction(function () use ($processoId, $usuarioRecebedorId, $orgaoUsuarioId): Andamento {
            $proc = Processo::query()->where('id', $processoId)->lockForUpdate()->firstOrFail();

            $andamentoAtual = Andamento::query()
                ->where('processo_id', $proc->id)
                ->where('and_atual', true)
                ->firstOrFail();

            if ($andamentoAtual->data_recebimento !== null) {
                throw new LogicException('Este andamento já foi recebido anteriormente.');
            }

            if ($orgaoUsuarioId !== null && $andamentoAtual->orgao_destino_id !== $orgaoUsuarioId) {
                throw new LogicException('Apenas usuários do órgão de destino podem confirmar o recebimento.');
            }

            $agora = now();
            $andamentoAtual->update([
                'data_recebimento' => $agora,
                'usuario_recebedor_id' => $usuarioRecebedorId,
            ]);

            $this->auditLogger->record(
                module: 'protocolo',
                action: 'processo.receber',
                resource: "Processo #{$proc->id} ({$proc->numero_formatado})",
                before: ['data_recebimento' => null],
                after: ['data_recebimento' => $agora, 'usuario_recebedor_id' => $usuarioRecebedorId],
            );

            return $andamentoAtual;
        });
    }

    /**
     * Consulta localização e situação atual do processo.
     *
     * @return array<string, mixed>
     */
    public function localizacao(Processo|int $processo): array
    {
        $processoId = $processo instanceof Processo ? $processo->id : (int) $processo;

        $proc = Processo::query()
            ->with(['orgaoAtual', 'andamentoAtual.usuarioRecebedor', 'andamentoAtual.usuario', 'andamentoAtual.orgaoDestino', 'andamentoAtual.tipoTramitacao'])
            ->findOrFail($processoId);

        $andamento = $proc->andamentoAtual;

        if (in_array($proc->status, ['concluido', 'arquivado'], true)) {
            $situacao = 'encerrado';
            $usuarioAtual = null;
            $tempoSegundos = 0;
        } elseif ($andamento === null) {
            $situacao = 'aberto';
            $usuarioAtual = null;
            $tempoSegundos = 0;
        } elseif ($andamento->data_recebimento === null) {
            $situacao = 'em_transito';
            $usuarioAtual = null;
            $tempoSegundos = abs((int) now()->diffInSeconds($andamento->created_at));
        } else {
            $situacao = 'em_posse';
            $usuarioAtual = $andamento->usuarioRecebedor ? [
                'id' => $andamento->usuarioRecebedor->id,
                'name' => $andamento->usuarioRecebedor->name,
            ] : null;
            $tempoSegundos = abs((int) now()->diffInSeconds($andamento->data_recebimento));
        }

        return [
            'processo_id' => $proc->id,
            'numero' => $proc->numero,
            'ano' => $proc->ano,
            'numero_formatado' => $proc->numero_formatado,
            'status' => $proc->status,
            'situacao' => $situacao,
            'orgao_atual' => $proc->orgaoAtual ? [
                'id' => $proc->orgaoAtual->id,
                'name' => $proc->orgaoAtual->name,
                'code' => $proc->orgaoAtual->code,
            ] : null,
            'usuario_atual' => $usuarioAtual,
            'tempo_aberto_segundos' => $tempoSegundos,
            'ultima_movimentacao' => $andamento?->created_at?->toIso8601String(),
            'tipo_tramitacao_atual' => $andamento?->tipoTramitacao?->nome,
            'prazo_dias' => $andamento?->tipoTramitacao?->prazo_dias,
        ];
    }

    /**
     * Histórico de tempo de permanência de cada andamento.
     *
     * @return array<int, array<string, mixed>>
     */
    public function permanencia(Processo|int $processo): array
    {
        $processoId = $processo instanceof Processo ? $processo->id : (int) $processo;

        $andamentos = Andamento::query()
            ->where('processo_id', $processoId)
            ->with(['orgaoOrigem', 'orgaoDestino', 'usuario', 'usuarioRecebedor', 'tipoTramitacao'])
            ->orderBy('sequencia')
            ->get();

        $itens = [];
        foreach ($andamentos as $and) {
            $tempoTransitoSegundos = $and->data_recebimento !== null
                ? abs((int) $and->data_recebimento->diffInSeconds($and->created_at))
                : abs((int) now()->diffInSeconds($and->created_at));

            $tempoPermanenciaSegundos = 0;
            if ($and->data_recebimento !== null) {
                $fim = $and->data_envio ?? now();
                $tempoPermanenciaSegundos = abs((int) $fim->diffInSeconds($and->data_recebimento));
            }

            if ($and->data_envio !== null) {
                $situacao = 'concluido';
            } elseif ($and->data_recebimento !== null) {
                $situacao = 'em_posse';
            } else {
                $situacao = 'em_transito';
            }

            $itens[] = [
                'id' => $and->id,
                'sequencia' => $and->sequencia,
                'tipo' => $and->tipoTramitacao?->nome,
                'orgao_origem' => $and->orgaoOrigem ? ['id' => $and->orgaoOrigem->id, 'name' => $and->orgaoOrigem->name] : null,
                'orgao_destino' => $and->orgaoDestino ? ['id' => $and->orgaoDestino->id, 'name' => $and->orgaoDestino->name] : null,
                'usuario_envio' => $and->usuario ? ['id' => $and->usuario->id, 'name' => $and->usuario->name] : null,
                'usuario_recebedor' => $and->usuarioRecebedor ? ['id' => $and->usuarioRecebedor->id, 'name' => $and->usuarioRecebedor->name] : null,
                'data_envio' => $and->data_envio?->toIso8601String(),
                'data_recebimento' => $and->data_recebimento?->toIso8601String(),
                'created_at' => $and->created_at->toIso8601String(),
                'tempo_transito_segundos' => $tempoTransitoSegundos,
                'tempo_permanencia_segundos' => $tempoPermanenciaSegundos,
                'situacao' => $situacao,
                'and_atual' => (bool) $and->and_atual,
            ];
        }

        return $itens;
    }

    /**
     * Consulta andamentos atuais com prazos excedidos.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function prazosExcedidos(?int $orgaoId = null): Collection
    {
        $query = Andamento::query()
            ->where('and_atual', true)
            ->whereHas('tipoTramitacao', function ($q): void {
                $q->whereNotNull('prazo_dias');
            })
            ->whereHas('processo', function ($q): void {
                $q->whereNotIn('status', ['concluido', 'arquivado']);
            })
            ->with(['processo', 'orgaoDestino', 'usuarioRecebedor', 'usuario', 'tipoTramitacao']);

        if ($orgaoId !== null) {
            $query->where('orgao_destino_id', $orgaoId);
        }

        $andamentos = $query->get();
        $agora = now();
        $resultado = collect();

        foreach ($andamentos as $and) {
            $dataBase = $and->data_recebimento ?? $and->created_at;
            $diasCorridos = abs((int) $dataBase->diffInDays($agora));
            $prazo = (int) $and->tipoTramitacao?->prazo_dias;

            if ($prazo > 0 && $diasCorridos > $prazo) {
                $resultado->push([
                    'andamento_id' => $and->id,
                    'processo_id' => $and->processo_id,
                    'processo_numero' => $and->processo?->numero_formatado,
                    'processo_assunto' => $and->processo?->assunto,
                    'orgao_id' => $and->orgao_destino_id,
                    'orgao_nome' => $and->orgaoDestino?->name,
                    'usuario_responsavel' => $and->usuarioRecebedor?->name ?? $and->usuario?->name,
                    'tipo_tramitacao' => $and->tipoTramitacao?->nome,
                    'prazo_dias' => $prazo,
                    'dias_corridos' => $diasCorridos,
                    'dias_atraso' => $diasCorridos - $prazo,
                    'em_posse' => $and->data_recebimento !== null,
                ]);
            }
        }

        return $resultado;
    }
}

