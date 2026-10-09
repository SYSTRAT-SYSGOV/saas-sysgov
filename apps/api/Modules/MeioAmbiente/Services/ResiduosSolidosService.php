<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Services;

use App\Support\AuditLogger;
use Modules\MeioAmbiente\Models\ColetaResiduo;
use Modules\MeioAmbiente\Models\EntregaLogisticaReversa;
use Modules\MeioAmbiente\Models\GeradorResiduo;
use Modules\MeioAmbiente\Models\PontoLogisticaReversa;
use Modules\MeioAmbiente\Support\RegraNegocioException;

/**
 * Cadastro de geradores de resíduos, registro de coletas (regular/seletiva) e
 * controle de logística reversa — ver spec `meio-ambiente/residuos-solidos`.
 */
final readonly class ResiduosSolidosService
{
    public function __construct(private AuditLogger $audit) {}

    /** @param array{nome?: string|null, tipo: string, pessoa_id?: int|null, empreendimento_id?: int|null} $dados */
    public function cadastrarGerador(array $dados): GeradorResiduo
    {
        $gerador = GeradorResiduo::create($dados);
        $this->audit->record('meio_ambiente', 'gerador_residuo.cadastrado', "GeradorResiduo #{$gerador->id}", null, $gerador->toArray());

        return $gerador;
    }

    /** @param array{tipo_coleta: string, rota?: string|null, volume_kg: float, destinacao: string, coletada_em?: string} $dados */
    public function registrarColeta(GeradorResiduo $gerador, array $dados): ColetaResiduo
    {
        if ($dados['volume_kg'] <= 0) {
            throw new RegraNegocioException(
                'volume_invalido',
                'Volume coletado deve ser positivo.',
            );
        }

        $coleta = ColetaResiduo::create([
            'gerador_residuo_id' => $gerador->id,
            'tipo_coleta' => $dados['tipo_coleta'],
            'rota' => $dados['rota'] ?? null,
            'volume_kg' => $dados['volume_kg'],
            'destinacao' => $dados['destinacao'],
            'coletada_em' => $dados['coletada_em'] ?? now(),
        ]);
        $this->audit->record('meio_ambiente', 'coleta_residuo.registrada', "ColetaResiduo #{$coleta->id} (GeradorResiduo #{$gerador->id})", null, $coleta->toArray());

        return $coleta;
    }

    /** @param array{nome: string, categoria: string, endereco?: string|null, latitude?: float|null, longitude?: float|null} $dados */
    public function cadastrarPontoLogisticaReversa(array $dados): PontoLogisticaReversa
    {
        $ponto = PontoLogisticaReversa::create($dados);
        $this->audit->record('meio_ambiente', 'ponto_logistica_reversa.cadastrado', "PontoLogisticaReversa #{$ponto->id}", null, $ponto->toArray());

        return $ponto;
    }

    /** @param array{quantidade_kg: float, entregue_em?: string} $dados */
    public function registrarEntrega(PontoLogisticaReversa $ponto, array $dados): EntregaLogisticaReversa
    {
        if ($dados['quantidade_kg'] <= 0) {
            throw new RegraNegocioException(
                'quantidade_invalida',
                'Quantidade entregue deve ser positiva.',
            );
        }

        $entrega = EntregaLogisticaReversa::create([
            'ponto_logistica_reversa_id' => $ponto->id,
            'quantidade_kg' => $dados['quantidade_kg'],
            'entregue_em' => $dados['entregue_em'] ?? now(),
        ]);
        $this->audit->record('meio_ambiente', 'entrega_logistica_reversa.registrada', "EntregaLogisticaReversa #{$entrega->id} (PontoLogisticaReversa #{$ponto->id})", null, $entrega->toArray());

        return $entrega;
    }
}
