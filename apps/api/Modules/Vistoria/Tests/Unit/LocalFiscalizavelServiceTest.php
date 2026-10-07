<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Services\LocalFiscalizavelService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class LocalFiscalizavelServiceTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    public function test_cria_local_com_proprietario_existente_no_cadastro_unico(): void
    {
        $tenant = $this->criarTenant();

        $local = $this->noTenant($tenant, function () {
            $proprietario = Pessoa::factory()->create();

            return app(LocalFiscalizavelService::class)->criarLocal([
                'proprietario_pessoa_id' => $proprietario->id,
                'nome' => 'Fazenda Boa Vista',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
                'classificacao_atividade' => 'producao_animal',
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);
        });

        self::assertSame('Fazenda Boa Vista', $local->nome);
        self::assertSame($tenant->id, $local->tenant_id);
    }

    public function test_lanca_domain_exception_quando_proprietario_nao_existe_no_cadastro_unico(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Proprietário não encontrado no Cadastro Único.');

        $this->noTenant($tenant, function () {
            app(LocalFiscalizavelService::class)->criarLocal([
                'proprietario_pessoa_id' => 999999,
                'nome' => 'Fazenda Inexistente',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);
        });
    }

    public function test_obter_historico_retorna_vistorias_concluidas_ordenadas_por_data_decrescente(): void
    {
        $tenant = $this->criarTenant();

        [$local, $antiga, $recente] = $this->noTenant($tenant, function () {
            $proprietario = Pessoa::factory()->create();
            $orgUnit = OrgUnit::create(['name' => 'Secretaria de Agricultura', 'code' => 'SEC-AGRI']);

            $local = LocalFiscalizavel::create([
                'proprietario_pessoa_id' => $proprietario->id,
                'nome' => 'Fazenda com Histórico',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);

            $antiga = OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'status' => OrdemServico::STATUS_CONCLUIDA,
                'data_prevista' => '2026-01-10',
            ]);

            $recente = OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'status' => OrdemServico::STATUS_CONCLUIDA,
                'data_prevista' => '2026-06-10',
            ]);

            // Ordem agendada (não concluída) não deve entrar no histórico.
            OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'status' => OrdemServico::STATUS_AGENDADA,
                'data_prevista' => '2026-09-10',
            ]);

            return [$local, $antiga, $recente];
        });

        app(TenantContext::class)->set($tenant);
        $historico = app(LocalFiscalizavelService::class)->obterHistorico($local);
        app(TenantContext::class)->clear();

        self::assertCount(2, $historico);
        self::assertSame($recente->id, $historico->first()->id);
        self::assertSame($antiga->id, $historico->last()->id);
    }

    public function test_conta_autuacoes_recentes_do_local_e_do_responsavel_nos_ultimos_12_meses(): void
    {
        $tenant = $this->criarTenant();

        [$localA, $qtd] = $this->noTenant($tenant, function () use ($tenant) {
            $proprietarioA = Pessoa::factory()->create();
            $orgUnit = OrgUnit::create(['name' => 'Secretaria', 'code' => 'SEC-' . uniqid()]);
            $fiscal = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Fiscal');
            $localA = LocalFiscalizavel::create([
                'proprietario_pessoa_id' => $proprietarioA->id,
                'nome' => 'Fazenda A',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);

            $criarDocumento = function (LocalFiscalizavel $local, Pessoa $autuado, string $tipo) use ($orgUnit, $fiscal): Documento {
                $ordem = OrdemServico::create([
                    'local_id' => $local->id,
                    'org_unit_id' => $orgUnit->id,
                    'fiscal_id' => $fiscal->id,
                    'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                    'data_prevista' => now()->toDateString(),
                ]);
                $execucao = ExecucaoVistoria::create([
                    'ordem_servico_id' => $ordem->id,
                    'fiscal_id' => $fiscal->id,
                    'client_uuid' => (string) Str::uuid(),
                    'status' => ExecucaoVistoria::STATUS_SINCRONIZADA,
                    'sincronizado_em' => now(),
                ]);

                return Documento::create([
                    'execucao_id' => $execucao->id,
                    'autuado_pessoa_id' => $autuado->id,
                    'tipo' => $tipo,
                    'numero' => $tipo . '/' . uniqid(),
                    'numero_sequencial' => 1,
                    'exercicio' => (int) now()->year,
                ]);
            };

            // Dentro da janela: conta.
            $criarDocumento($localA, $proprietarioA, Documento::TIPO_AUTO_INFRACAO);

            // Fora da janela (13 meses atrás): não conta.
            $this->travel(-13)->months();
            $criarDocumento($localA, $proprietarioA, Documento::TIPO_AUTO_INFRACAO);
            $this->travelBack();

            // Tipo diferente de auto de infração: não conta.
            $criarDocumento($localA, $proprietarioA, Documento::TIPO_NOTIFICACAO);

            // Outro local/responsável: não conta para o local A.
            $proprietarioB = Pessoa::factory()->create();
            $localB = LocalFiscalizavel::create([
                'proprietario_pessoa_id' => $proprietarioB->id,
                'nome' => 'Fazenda B',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);
            $criarDocumento($localB, $proprietarioB, Documento::TIPO_AUTO_INFRACAO);

            return [$localA, app(LocalFiscalizavelService::class)->contarAutuacoesRecentes($localA)];
        });

        self::assertSame(1, $qtd);
    }
}
