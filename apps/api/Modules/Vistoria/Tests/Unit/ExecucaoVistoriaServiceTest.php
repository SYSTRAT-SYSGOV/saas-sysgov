<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Services\ExecucaoVistoriaService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class ExecucaoVistoriaServiceTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    public function test_sincroniza_execucao_e_conclui_a_ordem_de_servico(): void
    {
        $tenant = $this->criarTenant();

        [$ordem, $fiscal, $resultado] = $this->noTenant($tenant, function () use ($tenant) {
            [$ordem, $fiscal] = $this->montarOrdem($tenant);

            $resultado = app(ExecucaoVistoriaService::class)->sincronizar(
                $fiscal,
                $ordem,
                (string) Str::uuid(),
                ['dados' => ['observacao' => 'Tudo regular']],
            );

            return [$ordem, $fiscal, $resultado];
        });

        self::assertFalse($resultado['duplicado']);
        self::assertSame(ExecucaoVistoria::STATUS_SINCRONIZADA, $resultado['execucao']->status);
        self::assertSame(OrdemServico::STATUS_CONCLUIDA, $ordem->fresh()->status);
    }

    public function test_reenvio_com_mesmo_client_uuid_nao_duplica(): void
    {
        $tenant = $this->criarTenant();

        $totalExecucoes = $this->noTenant($tenant, function () use ($tenant) {
            [$ordem, $fiscal] = $this->montarOrdem($tenant);
            $clientUuid = (string) Str::uuid();
            $service = app(ExecucaoVistoriaService::class);

            $primeiro = $service->sincronizar($fiscal, $ordem, $clientUuid, ['dados' => ['observacao' => 'Primeiro envio']]);
            $segundo = $service->sincronizar($fiscal, $ordem, $clientUuid, ['dados' => ['observacao' => 'Reenvio por timeout']]);

            self::assertFalse($primeiro['duplicado']);
            self::assertTrue($segundo['duplicado']);
            self::assertSame($primeiro['execucao']->id, $segundo['execucao']->id);

            return ExecucaoVistoria::query()->count();
        });

        self::assertSame(1, $totalExecucoes);
    }

    public function test_segunda_execucao_de_outro_dispositivo_vira_suplementar_sem_sobrescrever_a_primeira(): void
    {
        $tenant = $this->criarTenant();

        [$primeira, $segunda] = $this->noTenant($tenant, function () use ($tenant) {
            [$ordem, $fiscal] = $this->montarOrdem($tenant);
            $service = app(ExecucaoVistoriaService::class);

            $primeiro = $service->sincronizar($fiscal, $ordem, (string) Str::uuid(), ['dados' => ['observacao' => 'Dispositivo 1']]);
            $segundo = $service->sincronizar($fiscal, $ordem, (string) Str::uuid(), ['dados' => ['observacao' => 'Dispositivo 2']]);

            return [$primeiro['execucao'], $segundo['execucao']];
        });

        self::assertSame(ExecucaoVistoria::STATUS_SINCRONIZADA, $primeira->fresh()->status);
        self::assertSame(ExecucaoVistoria::STATUS_SUPLEMENTAR, $segunda->status);
        self::assertSame(2, ExecucaoVistoria::query()->count());
    }

    /**
     * @return array{0: OrdemServico, 1: User}
     */
    private function montarOrdem(Tenant $tenant): array
    {
        $proprietario = Pessoa::factory()->create();
        $orgUnit = OrgUnit::create(['name' => 'Secretaria de Agricultura', 'code' => 'SEC-AGRI-' . uniqid()]);
        $local = LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Teste',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
        $fiscal = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Fiscal');
        $ordem = OrdemServico::create([
            'local_id' => $local->id,
            'org_unit_id' => $orgUnit->id,
            'fiscal_id' => $fiscal->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
            'data_prevista' => now()->addDay()->toDateString(),
        ]);

        return [$ordem, $fiscal];
    }
}
