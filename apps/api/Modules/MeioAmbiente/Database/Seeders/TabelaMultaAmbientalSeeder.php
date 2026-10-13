<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Database\Seeders;

use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\TabelaMultaAmbiental;

/**
 * Semeia a tabela de enquadramento legal de multas ambientais do tenant atual,
 * com valores iniciais inspirados no Decreto Federal 6.514/2008 — editáveis depois
 * por `meio_ambiente.chefia` sem deploy (ver design.md, decisão D4). Os valores aqui
 * são um ponto de partida ilustrativo: cabe à Secretaria revisá-los antes de uso em
 * produção (ver Open Questions do design.md).
 */
final class TabelaMultaAmbientalSeeder extends Seeder
{
    /** @var array<string, array{criterio: string, valor_base_centavos: int, agravante_reincidencia_percentual: int}> */
    public const VALORES_INICIAIS = [
        AutoInfracaoAmbiental::TIPO_DESMATAMENTO => [
            'criterio' => TabelaMultaAmbiental::CRITERIO_POR_HECTARE,
            'valor_base_centavos' => 500_000,
            'agravante_reincidencia_percentual' => 50,
        ],
        AutoInfracaoAmbiental::TIPO_POLUICAO_HIDRICA => [
            'criterio' => TabelaMultaAmbiental::CRITERIO_FIXO,
            'valor_base_centavos' => 1_000_000,
            'agravante_reincidencia_percentual' => 50,
        ],
        AutoInfracaoAmbiental::TIPO_POLUICAO_ATMOSFERICA => [
            'criterio' => TabelaMultaAmbiental::CRITERIO_FIXO,
            'valor_base_centavos' => 1_000_000,
            'agravante_reincidencia_percentual' => 50,
        ],
        AutoInfracaoAmbiental::TIPO_QUEIMADA => [
            'criterio' => TabelaMultaAmbiental::CRITERIO_POR_HECTARE,
            'valor_base_centavos' => 100_000,
            'agravante_reincidencia_percentual' => 50,
        ],
        AutoInfracaoAmbiental::TIPO_CACA_ILEGAL => [
            'criterio' => TabelaMultaAmbiental::CRITERIO_FIXO,
            'valor_base_centavos' => 500_000,
            'agravante_reincidencia_percentual' => 50,
        ],
        AutoInfracaoAmbiental::TIPO_OUTRA => [
            'criterio' => TabelaMultaAmbiental::CRITERIO_FIXO,
            'valor_base_centavos' => 500_000,
            'agravante_reincidencia_percentual' => 30,
        ],
    ];

    public function run(): void
    {
        $tenantId = app(TenantContext::class)->id();

        foreach (self::VALORES_INICIAIS as $tipoInfracao => $valores) {
            TabelaMultaAmbiental::updateOrCreate(
                ['tenant_id' => $tenantId, 'tipo_infracao' => $tipoInfracao],
                $valores,
            );
        }

        $this->informar('Meio Ambiente: tabela de enquadramento legal de multas ambientais semeada (' . count(self::VALORES_INICIAIS) . ' tipos).');
    }

    private function informar(string $mensagem): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $this->command->info($mensagem);
        }
    }
}
