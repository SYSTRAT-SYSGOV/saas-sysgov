<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use Carbon\CarbonInterface;
use Modules\Transporte\Models\Empresa;
use Modules\Transporte\Models\Motorista;
use Modules\Transporte\Models\Veiculo;

/**
 * Alertas de vencimento (CNH, curso, toxicológico, vistoria e contrato): vencidos são `critico`; os que vencem em
 * até 30 dias são `atencao`. Itens inativos não geram alerta. Críticos primeiro, depois por data.
 */
final class AlertaService
{
    public const DIAS_ANTECEDENCIA = 30;

    /** @return list<array{tipo: string, gravidade: string, item_tipo: string, item_id: int, item: string, data: string, dias: int}> */
    public function listar(): array
    {
        $alertas = [];

        Motorista::query()->with('pessoa')->where('ativo', true)->get()->each(function (Motorista $m) use (&$alertas): void {
            foreach (['cnh' => $m->cnh_validade, 'curso' => $m->curso_validade, 'toxicologico' => $m->toxicologico_validade] as $tipo => $data) {
                $this->acrescentar($alertas, $tipo, 'motorista', $m->id, $m->nome(), $data);
            }
        });

        Veiculo::query()->where('ativo', true)->withMax('vistorias', 'validade')->get()->each(function (Veiculo $v) use (&$alertas): void {
            $this->acrescentar($alertas, 'vistoria', 'veiculo', $v->id, $v->placa, $v->validadeDaVistoria());
        });

        Empresa::query()->with('pessoa')->where('ativa', true)->get()->each(function (Empresa $e) use (&$alertas): void {
            $this->acrescentar($alertas, 'contrato', 'empresa', $e->id, $e->nome(), $e->vigencia_fim);
        });

        usort($alertas, fn (array $a, array $b): int => [$a['gravidade'] === 'critico' ? 0 : 1, $a['data']] <=> [$b['gravidade'] === 'critico' ? 0 : 1, $b['data']]);

        return $alertas;
    }

    /** @param list<array<string, mixed>> $alertas */
    private function acrescentar(array &$alertas, string $tipo, string $itemTipo, int $itemId, string $item, ?CarbonInterface $data): void
    {
        if ($data === null) {
            return;
        }
        $dias = (int) today()->diffInDays($data->copy()->startOfDay(), false);
        if ($dias > self::DIAS_ANTECEDENCIA) {
            return;
        }
        $alertas[] = [
            'tipo' => $tipo,
            'gravidade' => $dias < 0 ? 'critico' : 'atencao',
            'item_tipo' => $itemTipo,
            'item_id' => $itemId,
            'item' => $item,
            'data' => $data->toDateString(),
            'dias' => $dias,
        ];
    }
}
