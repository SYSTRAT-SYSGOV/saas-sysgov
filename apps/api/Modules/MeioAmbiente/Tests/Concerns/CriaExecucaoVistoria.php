<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Concerns;

use App\Models\User;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;

/**
 * Execução de vistoria concluída pelo caminho real do módulo Vistoria — pré-requisito
 * para emitir auto de infração ambiental (Fases 4, 8 e 10). Exige um tenant já ativo
 * no `TenantContext`.
 */
trait CriaExecucaoVistoria
{
    protected function criarExecucaoVistoriaConcluida(): ExecucaoVistoria
    {
        $proprietario = Pessoa::factory()->create();
        $orgUnit = OrgUnit::create(['name' => 'Secretaria de Meio Ambiente', 'code' => 'SMA-' . uniqid()]);
        $fiscal = User::create(['name' => 'Fiscal Ambiental', 'email' => 'fiscal-' . uniqid() . '@teste.gov.br', 'password' => bcrypt('secret')]);
        $local = LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Fiscalizada',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
        $ordem = OrdemServico::create([
            'local_id' => $local->id,
            'org_unit_id' => $orgUnit->id,
            'fiscal_id' => $fiscal->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
            'data_prevista' => now()->addDay()->toDateString(),
        ]);

        return ExecucaoVistoria::create([
            'ordem_servico_id' => $ordem->id,
            'fiscal_id' => $fiscal->id,
            'client_uuid' => (string) Str::uuid(),
            'status' => ExecucaoVistoria::STATUS_SINCRONIZADA,
            'sincronizado_em' => now(),
        ]);
    }
}
