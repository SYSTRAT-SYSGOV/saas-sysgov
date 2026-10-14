<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Database\Seeders\MeioAmbienteDadosDemonstracaoSeeder;
use Modules\MeioAmbiente\Models\AlertaLicenciamento;
use Modules\MeioAmbiente\Models\AlertaRecursoHidrico;
use Modules\MeioAmbiente\Models\AreaProtegida;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\ColetaResiduo;
use Modules\MeioAmbiente\Models\CompensacaoAmbiental;
use Modules\MeioAmbiente\Models\Condicionante;
use Modules\MeioAmbiente\Models\DestinacaoCompensacao;
use Modules\MeioAmbiente\Models\DocumentoLicenciamento;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\EntregaLogisticaReversa;
use Modules\MeioAmbiente\Models\GeradorResiduo;
use Modules\MeioAmbiente\Models\LicencaLancamentoEfluente;
use Modules\MeioAmbiente\Models\MedicaoEfluente;
use Modules\MeioAmbiente\Models\MeioAmbienteIntegracao;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;
use Modules\MeioAmbiente\Models\OutorgaAgua;
use Modules\MeioAmbiente\Models\PagamentoCompensacao;
use Modules\MeioAmbiente\Models\ParametroQualidadeEfluente;
use Modules\MeioAmbiente\Models\ParcelaMulta;
use Modules\MeioAmbiente\Models\ParcelamentoMulta;
use Modules\MeioAmbiente\Models\PontoLogisticaReversa;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Models\RelatorioAmbiental;
use Modules\MeioAmbiente\Models\ResponsavelTecnico;
use Modules\MeioAmbiente\Models\VistoriaTecnicaLicenciamento;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Tests\TestCase;

final class MeioAmbienteDadosDemonstracaoSeederTest extends TestCase
{
    use CenarioMeioAmbiente;
    use RefreshDatabase;

    public function test_semeia_cenario_completo_de_demonstracao(): void
    {
        $tenant = $this->criarTenant('prefeitura-demo-meio-ambiente');
        $this->usuario($tenant, ['admin_meio_ambiente'], 'Administradora de Demonstração');

        app(MeioAmbienteDadosDemonstracaoSeeder::class)->seedTenant($tenant->id);

        $this->noTenant($tenant, function (): void {
            // Empreendimentos e licenciamento
            self::assertSame(3, Empreendimento::count());
            self::assertSame(3, ResponsavelTecnico::count());
            self::assertSame(5, ProcessoLicenciamento::count());
            self::assertSame(1, ProcessoLicenciamento::where('status', ProcessoLicenciamento::STATUS_EM_ANALISE)->count());
            self::assertSame(4, ProcessoLicenciamento::where('status', ProcessoLicenciamento::STATUS_DEFERIDO)->count());
            self::assertSame(1, DocumentoLicenciamento::count());
            self::assertSame(2, Condicionante::count());
            self::assertSame(1, Condicionante::where('situacao', Condicionante::SITUACAO_CUMPRIDA)->count());
            self::assertSame(1, Condicionante::where('situacao', Condicionante::SITUACAO_PENDENTE)->count());
            self::assertSame(4, VistoriaTecnicaLicenciamento::count());
            self::assertSame(1, VistoriaTecnicaLicenciamento::where('resultado', VistoriaTecnicaLicenciamento::RESULTADO_DESFAVORAVEL)->count());
            self::assertSame(1, AlertaLicenciamento::count());

            // Fiscalização: 3 autos em estados diferentes (parcelado/pago em parte, arquivado, aberto por queimada)
            self::assertSame(3, AutoInfracaoAmbiental::count());
            self::assertSame(1, ParcelamentoMulta::count());
            self::assertSame(6, ParcelaMulta::count());
            self::assertSame(2, ParcelaMulta::where('pago', true)->count());

            // Compensação ambiental: calculada no deferimento da LO, paga em duas vezes e parcialmente destinada
            self::assertSame(1, CompensacaoAmbiental::count());
            self::assertSame(2, PagamentoCompensacao::count());
            self::assertSame(2, DestinacaoCompensacao::count());
            $compensacao = CompensacaoAmbiental::firstOrFail();
            self::assertSame(4_000_000, $compensacao->valor_devido_centavos);
            self::assertSame(4_000_000, $compensacao->valorPagoCentavos());
            self::assertSame(3_200_000, $compensacao->valorDestinadoCentavos());

            // Resíduos sólidos e logística reversa
            self::assertSame(2, GeradorResiduo::count());
            self::assertSame(4, ColetaResiduo::count());
            self::assertSame(1, PontoLogisticaReversa::count());
            self::assertSame(2, EntregaLogisticaReversa::count());

            // Áreas protegidas
            self::assertSame(3, AreaProtegida::count());
            self::assertSame(3, AreaProtegida::whereIn('tipo', AreaProtegida::TIPOS_VALIDOS)->count());

            // Queimadas: uma com responsável identificado (abriu auto de infração), outra sem
            self::assertSame(2, OcorrenciaQueimada::count());
            self::assertSame(1, OcorrenciaQueimada::whereNotNull('auto_infracao_ambiental_id')->count());
            self::assertSame(1, OcorrenciaQueimada::where('situacao', OcorrenciaQueimada::SITUACAO_RESPONSAVEL_NAO_IDENTIFICADO)->count());

            // Recursos hídricos
            self::assertSame(1, OutorgaAgua::count());
            self::assertSame(1, LicencaLancamentoEfluente::count());
            self::assertSame(2, ParametroQualidadeEfluente::count());
            self::assertSame(2, MedicaoEfluente::count());
            self::assertSame(1, MedicaoEfluente::where('conforme', false)->count());
            self::assertSame(1, AlertaRecursoHidrico::count());

            // Relatórios e integração
            self::assertSame(2, RelatorioAmbiental::count());
            self::assertSame(1, MeioAmbienteIntegracao::count());
        });
    }

    public function test_nao_duplica_quando_tenant_ja_tem_empreendimentos(): void
    {
        $tenant = $this->criarTenant('prefeitura-demo-meio-ambiente-2');
        $this->usuario($tenant, ['admin_meio_ambiente'], 'Administradora de Demonstração');

        $seeder = app(MeioAmbienteDadosDemonstracaoSeeder::class);
        $seeder->seedTenant($tenant->id);
        $seeder->seedTenant($tenant->id);

        $this->noTenant($tenant, function (): void {
            self::assertSame(3, Empreendimento::count());
        });
    }
}
