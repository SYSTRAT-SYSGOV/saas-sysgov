<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\AlvaraObra;
use Modules\Cemiterios\Models\Empreiteiro;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\Penalidade;
use Modules\Cemiterios\Support\RegraNegocioException;

/** Empreiteiros, alvarás anuais, alvarás de obra e penalidades (RF-29..RF-32; RN-08, RN-09). */
final readonly class EmpreiteiroService
{
    public function __construct(private ParametroService $parametros) {}

    /** Apto = alvará anual vigente e sem suspensão em curso; Cancelado é definitivo. */
    public function atualizarAptidao(Empreiteiro $empreiteiro): Empreiteiro
    {
        if ($empreiteiro->situacao === 'cancelado') {
            return $empreiteiro;
        }

        $hoje = today()->toDateString();
        $suspenso = $empreiteiro->penalidades()->where('tipo', 'suspensao')
            ->whereDate('inicio', '<=', $hoje)->where(fn ($q) => $q->whereNull('fim')->orWhereDate('fim', '>=', $hoje))->exists();
        $comAlvara = $empreiteiro->alvaras()->whereDate('validade', '>=', $hoje)->exists();

        $empreiteiro->forceFill(['situacao' => $suspenso ? 'suspenso' : ($comAlvara ? 'apto' : 'inapto')])->save();

        return $empreiteiro;
    }

    /** @param array{plot_id: int, descricao: string, comprimento_m: float, largura_m: float, prazo_fim: string} $dados */
    public function emitirObra(Empreiteiro $empreiteiro, array $dados): AlvaraObra
    {
        $empreiteiro = $this->atualizarAptidao($empreiteiro);
        if ($empreiteiro->situacao !== 'apto') {
            throw new RegraNegocioException('empreiteiro.inapto', "Empreiteiro {$empreiteiro->situacao}: não pode receber alvará de obra.");
        }

        $jazigo = Jazigo::findOrFail($dados['plot_id']);
        if ($jazigo->concessaoVigente() === null) {
            throw new RegraNegocioException('obra.sem_concessao', 'Obra exige jazigo com concessão vigente.');
        }

        $p = $this->parametros->vigente();
        $comprimento = max($dados['comprimento_m'], $dados['largura_m']);
        $largura = min($dados['comprimento_m'], $dados['largura_m']);
        if ($comprimento > $p->tumulo_max_comprimento_m || $largura > $p->tumulo_max_largura_m) {
            throw new RegraNegocioException('jazigo.dimensao_excedida', sprintf(
                'Projeto de %.2f m × %.2f m excede o máximo de %.2f m × %.2f m.', $comprimento, $largura, $p->tumulo_max_comprimento_m, $p->tumulo_max_largura_m,
            ));
        }

        return DB::transaction(function () use ($empreiteiro, $dados, $p): AlvaraObra {
            Empreiteiro::whereKey($empreiteiro->id)->lockForUpdate()->first();
            $pendentes = $empreiteiro->obras()->where('situacao', 'pendente')->whereDate('prazo_fim', '>=', today()->toDateString())->count();
            if ($pendentes >= $p->obras_simultaneas_max) {
                throw new RegraNegocioException('empreiteiro.limite_obras', "Limite de {$p->obras_simultaneas_max} obras simultâneas atingido.", ['limite' => $p->obras_simultaneas_max]);
            }

            return $empreiteiro->obras()->create($dados);
        });
    }

    /**
     * Suspensão torna o empreiteiro inapto; ao atingir o número parametrizado de
     * suspensões, o cadastro é cancelado e as obras pendentes sinalizadas (RF-32).
     *
     * @param array{tipo: string, inicio?: string|null, fim?: string|null, motivo: string, arquivo?: string|null} $dados
     */
    public function penalizar(Empreiteiro $empreiteiro, array $dados): Penalidade
    {
        return DB::transaction(function () use ($empreiteiro, $dados): Penalidade {
            $penalidade = $empreiteiro->penalidades()->create($dados);

            $suspensoes = $empreiteiro->penalidades()->where('tipo', 'suspensao')->count();
            if ($dados['tipo'] === 'suspensao' && $suspensoes >= $this->parametros->vigente()->suspensoes_para_cancelamento) {
                $empreiteiro->forceFill(['situacao' => 'cancelado'])->save();
                $empreiteiro->obras()->where('situacao', 'pendente')->update(['sinalizada' => true]);
            } else {
                $this->atualizarAptidao($empreiteiro);
            }

            return $penalidade;
        });
    }

    /** Rotina diária: alvarás vencidos, fim de suspensões e obras vencidas (D10). */
    public function rotinaDiaria(): int
    {
        $total = 0;
        Empreiteiro::where('situacao', '!=', 'cancelado')->each(function (Empreiteiro $e) use (&$total): void {
            $antes = $e->situacao;
            if ($this->atualizarAptidao($e)->situacao !== $antes) {
                $total++;
            }
        });

        AlvaraObra::where('situacao', 'pendente')->whereDate('prazo_fim', '<', today()->toDateString())->update(['sinalizada' => true]);

        return $total;
    }
}
