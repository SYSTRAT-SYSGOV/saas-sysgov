<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Enums\SituacaoAluno;
use Modules\Escola\Models\Aluno;
use Modules\Transporte\Enums\MediacaoDidatica;
use Modules\Transporte\Enums\PoderPublico;
use Modules\Transporte\Models\Alocacao;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Models\RotaParada;
use Modules\Transporte\Support\ConflitoException;

final class AlocacaoService
{
    public function __construct(private readonly AuditLogger $audit, private readonly RotaService $rotas) {}

    /**
     * Aloca o aluno na rota e na parada. Tudo sob o lock da rota (D17/D18): duas alocações para a última vaga não passam.
     *
     * @param array<string, mixed> $dados
     */
    public function alocar(Rota $rota, Aluno $aluno, array $dados, bool $podeExcederCapacidade): Alocacao
    {
        return DB::transaction(function () use ($rota, $aluno, $dados, $podeExcederCapacidade): Alocacao {
            $rota = Rota::query()->with(['veiculo.empresa.pessoa', 'empresa.pessoa', 'motorista.pessoa'])->whereKey($rota->id)->lockForUpdate()->firstOrFail();

            $this->conferirAluno($rota, $aluno);
            $paradaId = (int) $dados['parada_id'];
            $this->conferirParadaNoItinerario($rota, $paradaId);

            $duplicada = Alocacao::query()->where('rota_id', $rota->id)->where('aluno_id', $aluno->id)->whereNull('data_fim')->exists();
            if ($duplicada) {
                throw new ConflitoException('O aluno já está alocado nesta rota.');
            }

            if (!$rota->ativa) {
                throw new ConflitoException('A rota está inativa.');
            }
            if ($rota->veiculo === null) {
                throw new ConflitoException('A rota não tem veículo: sem capacidade conhecida não há como alocar alunos.');
            }
            $this->rotas->exigirRegular($rota);

            $necessidade = (bool) ($dados['necessidade_especial'] ?? false);
            if ($necessidade && !$rota->veiculo->acessivel) {
                throw new ConflitoException("O aluno precisa de transporte adaptado e o veículo {$rota->veiculo->placa} não é acessível.");
            }

            $justificativa = isset($dados['justificativa_excesso']) ? trim((string) $dados['justificativa_excesso']) : '';
            $excesso = $this->conferirCapacidade($rota, $podeExcederCapacidade, $justificativa);

            $alocacao = Alocacao::create([
                'aluno_id' => $aluno->id,
                'rota_id' => $rota->id,
                'parada_id' => $paradaId,
                'turno' => $rota->turno,
                'usa_transporte_rural' => $dados['usa_transporte_rural'] ?? true,
                'poder_publico' => $dados['poder_publico'] ?? null,
                'necessidade_especial' => $necessidade,
                'necessidade_observacao' => $necessidade ? ($dados['necessidade_observacao'] ?? null) : null,
                'atendimento_curricular' => $dados['atendimento_curricular'] ?? true,
                'mediacao_didatica' => $dados['mediacao_didatica'] ?? MediacaoDidatica::Presencial->value,
                'pais_residencia' => strtoupper((string) ($dados['pais_residencia'] ?? 'BR')),
                'data_inicio' => $dados['data_inicio'] ?? today()->toDateString(),
                'justificativa_excesso' => $excesso ? $justificativa : null,
                'observacoes' => $dados['observacoes'] ?? null,
            ]);

            $this->audit->record('transporte', 'alocacao.criada', "alocacao:{$alocacao->id}", null, $this->retrato($alocacao));
            if ($excesso) {
                $this->audit->record('transporte', 'alocacao.excesso_autorizado', "alocacao:{$alocacao->id}", null, [
                    'rota_id' => $rota->id, 'aluno_id' => $aluno->id, 'capacidade' => $rota->veiculo->capacidade, 'justificativa' => $justificativa,
                ]);
            }

            return $alocacao;
        });
    }

    /**
     * Altera os dados da alocação ativa. Trocar a parada exige parada do itinerário; marcar necessidade especial exige veículo acessível.
     *
     * @param array<string, mixed> $dados
     */
    public function atualizar(Alocacao $alocacao, array $dados): Alocacao
    {
        return DB::transaction(function () use ($alocacao, $dados): Alocacao {
            $rota = Rota::query()->with('veiculo')->whereKey($alocacao->rota_id)->lockForUpdate()->firstOrFail();
            if (!$alocacao->ativa()) {
                throw new ConflitoException('A alocação já foi encerrada.');
            }
            $antes = $this->retrato($alocacao);

            $paradaId = (int) ($dados['parada_id'] ?? $alocacao->parada_id);
            if ($paradaId !== $alocacao->parada_id) {
                $this->conferirParadaNoItinerario($rota, $paradaId);
            }
            $necessidade = (bool) ($dados['necessidade_especial'] ?? $alocacao->necessidade_especial);
            if ($necessidade && $rota->veiculo !== null && !$rota->veiculo->acessivel) {
                throw new ConflitoException("O aluno precisa de transporte adaptado e o veículo {$rota->veiculo->placa} não é acessível.");
            }

            $alocacao->update([
                'parada_id' => $paradaId,
                'usa_transporte_rural' => $dados['usa_transporte_rural'] ?? $alocacao->usa_transporte_rural,
                'poder_publico' => array_key_exists('poder_publico', $dados) ? $dados['poder_publico'] : $alocacao->poder_publico,
                'necessidade_especial' => $necessidade,
                'necessidade_observacao' => $necessidade
                    ? (array_key_exists('necessidade_observacao', $dados) ? $dados['necessidade_observacao'] : $alocacao->necessidade_observacao)
                    : null,
                'atendimento_curricular' => $dados['atendimento_curricular'] ?? $alocacao->atendimento_curricular,
                'mediacao_didatica' => $dados['mediacao_didatica'] ?? $alocacao->mediacao_didatica,
                'pais_residencia' => isset($dados['pais_residencia']) ? strtoupper((string) $dados['pais_residencia']) : $alocacao->pais_residencia,
                'observacoes' => array_key_exists('observacoes', $dados) ? $dados['observacoes'] : $alocacao->observacoes,
            ]);
            $this->audit->record('transporte', 'alocacao.alterada', "alocacao:{$alocacao->id}", $antes, $this->retrato($alocacao));

            return $alocacao;
        });
    }

    public function encerrar(Alocacao $alocacao, string $dataFim, string $motivo): Alocacao
    {
        return DB::transaction(function () use ($alocacao, $dataFim, $motivo): Alocacao {
            Rota::query()->whereKey($alocacao->rota_id)->lockForUpdate()->first();
            if (!$alocacao->ativa()) {
                throw new ConflitoException('A alocação já foi encerrada.');
            }
            if (trim($motivo) === '') {
                throw new DomainException('Informe o motivo do encerramento.');
            }
            if ($alocacao->data_inicio->gt($dataFim)) {
                throw new DomainException('A data de término não pode ser anterior à data de início.');
            }
            $antes = $this->retrato($alocacao);
            $alocacao->update(['data_fim' => $dataFim, 'motivo_fim' => trim($motivo)]);
            $this->audit->record('transporte', 'alocacao.encerrada', "alocacao:{$alocacao->id}", $antes, $this->retrato($alocacao));

            return $alocacao;
        });
    }

    /** Encerramento automático quando o aluno deixa de estar ativo ou é excluído (D21). Retorna quantas alocações foram encerradas. */
    public function encerrarDoAluno(Aluno $aluno, string $motivo): int
    {
        $ativas = Alocacao::query()->withoutGlobalScope('tenant')->where('tenant_id', $aluno->tenant_id)
            ->where('aluno_id', $aluno->id)->whereNull('data_fim')->get();
        foreach ($ativas as $alocacao) {
            $antes = $this->retrato($alocacao);
            $fim = today()->lt($alocacao->data_inicio) ? $alocacao->data_inicio->toDateString() : today()->toDateString();
            $alocacao->update(['data_fim' => $fim, 'motivo_fim' => $motivo]);
            $this->audit->record('transporte', 'alocacao.encerrada_automaticamente', "alocacao:{$alocacao->id}", $antes, $this->retrato($alocacao));
        }

        return $ativas->count();
    }

    private function conferirAluno(Rota $rota, Aluno $aluno): void
    {
        if ($aluno->situacao !== SituacaoAluno::Ativo->value) {
            throw new DomainException("O aluno não está ativo (situação: {$aluno->situacao}).");
        }
        $turma = $aluno->turma;
        if ($turma === null) {
            throw new DomainException('O aluno não tem turma: não há como conferir o ano letivo.');
        }
        if ($turma->ano_letivo !== $rota->ano_letivo) {
            throw new DomainException("A turma do aluno é do ano letivo {$turma->ano_letivo} e a rota é de {$rota->ano_letivo}.");
        }
    }

    private function conferirParadaNoItinerario(Rota $rota, int $paradaId): void
    {
        if (!RotaParada::query()->where('rota_id', $rota->id)->where('parada_id', $paradaId)->exists()) {
            throw new DomainException('A parada não pertence ao itinerário da rota.');
        }
    }

    /** @return bool `true` quando a alocação passa da capacidade e foi autorizada */
    private function conferirCapacidade(Rota $rota, bool $podeExceder, string $justificativa): bool
    {
        $capacidade = (int) $rota->veiculo?->capacidade;
        $alocados = (int) Alocacao::query()->where('rota_id', $rota->id)->whereNull('data_fim')->count();
        if ($alocados < $capacidade) {
            return false;
        }
        if (!$podeExceder) {
            throw new ConflitoException("Capacidade do veículo esgotada: {$capacidade} lugares e {$alocados} alunos alocados.");
        }
        if ($justificativa === '') {
            throw new ConflitoException("A rota está lotada ({$alocados} de {$capacidade}): informe a justificativa para alocar acima da capacidade.");
        }

        return true;
    }

    /**
     * Retrato para a auditoria. A observação da necessidade especial é dado de saúde e não entra no log (D22):
     * só se registra se ela existe.
     *
     * @return array<string, mixed>
     */
    private function retrato(Alocacao $alocacao): array
    {
        $dados = $alocacao->makeVisible('necessidade_observacao')->toArray();
        $dados['necessidade_observacao'] = $dados['necessidade_observacao'] !== null ? '[informada]' : null;

        return $dados;
    }
}
