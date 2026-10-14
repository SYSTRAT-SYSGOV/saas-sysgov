<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Admin\Models\Module;
use Modules\MeioAmbiente\Models\AreaProtegida;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\ColetaResiduo;
use Modules\MeioAmbiente\Models\DestinacaoCompensacao;
use Modules\MeioAmbiente\Models\DocumentoLicenciamento;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\GeradorResiduo;
use Modules\MeioAmbiente\Models\MeioAmbienteIntegracao;
use Modules\MeioAmbiente\Models\OutorgaAgua;
use Modules\MeioAmbiente\Models\PontoLogisticaReversa;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Models\RelatorioAmbiental;
use Modules\MeioAmbiente\Models\ResponsavelTecnico;
use Modules\MeioAmbiente\Models\VistoriaTecnicaLicenciamento;
use Modules\MeioAmbiente\Services\AreasProtegidasService;
use Modules\MeioAmbiente\Services\CompensacaoAmbientalService;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Services\FiscalizacaoAmbientalService;
use Modules\MeioAmbiente\Services\IntegracaoMeioAmbienteService;
use Modules\MeioAmbiente\Services\ProcessoLicenciamentoService;
use Modules\MeioAmbiente\Services\QueimadasService;
use Modules\MeioAmbiente\Services\RecursosHidricosService;
use Modules\MeioAmbiente\Services\RelatorioAmbientalService;
use Modules\MeioAmbiente\Services\ResiduosSolidosService;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Services\ProcessoSancionatorioService;
use RuntimeException;

/**
 * Dados de demonstração do módulo Meio Ambiente: 3 empreendimentos (um deles de
 * impacto significativo, percorrendo LP → LI → LO com condicionantes, vistorias,
 * alerta de vencimento e compensação ambiental com pagamento e destinação), 3
 * autos de infração ambiental em estados distintos (penalidade parcelada e paga
 * em parte, arquivado por improcedência, e aberto a partir de uma ocorrência de
 * queimada), 2 geradores de resíduos com coletas, um ponto de logística reversa,
 * 3 áreas protegidas, 2 ocorrências de queimada, uma outorga de água e uma
 * licença de lançamento de efluentes com parâmetros/medições/alerta, relatórios
 * ambientais (RARS e GEE) e uma credencial de integração com órgão de controle.
 *
 * Passa pelos Services do módulo (não cria registros "crus"), então auditoria,
 * numeração sequencial e as regras de negócio valem como no uso real. O auto de
 * infração ambiental reaproveita o Documento/ProcessoSancionatorio do módulo
 * Vistoria — a execução de vistoria que o origina é montada pelo caminho mínimo
 * real desse módulo (mesma receita de `Modules\MeioAmbiente\Tests\Concerns\CriaExecucaoVistoria`).
 *
 * Uso: php artisan tinker --execute="app(Modules\MeioAmbiente\Database\Seeders\MeioAmbienteDadosDemonstracaoSeeder::class)->seedTenant(1);"
 * Não roda se o tenant já tiver empreendimentos cadastrados (evita duplicar).
 */
final class MeioAmbienteDadosDemonstracaoSeeder extends Seeder
{
    private User $autor;

    private OrgUnit $orgUnitFiscalizacao;

    private User $fiscal;

    private Empreendimento $mineradora;

    private Empreendimento $agroindustria;

    private Empreendimento $postoPetroleo;

    public function run(?int $tenantId = null): void
    {
        $tenants = $tenantId !== null
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::where('slug', 'systrat')->get();

        foreach ($tenants as $tenant) {
            $this->seedTenant((int) $tenant->id);
        }
    }

    public function seedTenant(int $tenantId): void
    {
        $tenant = Tenant::find($tenantId);
        if (! $tenant) {
            $this->informar("Tenant #{$tenantId} não encontrado — nada a semear no Meio Ambiente.", aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);
        echo "==> Semeando dados de demonstração do Meio Ambiente para o Tenant: [{$tenant->id}] {$tenant->name}\n";

        if (Empreendimento::query()->exists()) {
            echo "    Tenant já tem empreendimentos cadastrados no Meio Ambiente — nada a fazer.\n";
            return;
        }

        $this->habilitarModulo($tenant);
        $this->autor = $this->usuarioAutor($tenant);
        (new TabelaMultaAmbientalSeeder())->run();

        DB::transaction(function (): void {
            $this->criarInfraestruturaFiscalizacao();
            $this->criarIntegracao();
            $this->criarEmpreendimentos();
            $this->cenarioLicenciamentoMineradora();
            $this->cenarioLicenciamentoAgroindustria();
            $this->cenarioLicenciamentoPostoPetroleo();
            $this->gerarAlertaLicenciamento();
            $this->cenarioFiscalizacao();
            $this->cenarioResiduosSolidos();
            $this->cenarioAreasProtegidas();
            $this->cenarioQueimadas();
            $this->cenarioRecursosHidricos();
            $this->cenarioRelatorios();
        });

        echo "    Concluído.\n";
    }

    // ---------------------------------------------------------------- cenários

    private function criarEmpreendimentos(): void
    {
        $empreendimentos = app(EmpreendimentoService::class);

        $this->mineradora = $empreendimentos->criarEmpreendimento([
            'cnpj' => $this->cnpjValido(),
            'razao_social' => 'Mineradora Vale do Rio Verde Ltda',
            'atividade' => 'mineracao_extracao_mineral',
            'porte' => Empreendimento::PORTE_GRANDE,
            // Reclassificado como impacto significativo só na fase de instalação (ver
            // `cenarioLicenciamentoMineradora`) — `criarSeNecessario()` roda a cada
            // deferimento, não só na LO, então ligar o flag desde o início geraria uma
            // compensação ambiental (não paga) já na LP e bloquearia a LO.
            'impacto_significativo' => false,
            'valor_empreendimento_centavos' => 800_000_000,
            'latitude' => -25.6012,
            'longitude' => -49.3987,
        ]);
        $empreendimentos->vincularResponsavelTecnico($this->mineradora, [
            'nome' => 'Eng. Fernando Augusto Lima',
            'registro_profissional' => 'CREA-PR 123456',
            'tipo_registro' => ResponsavelTecnico::TIPO_CREA,
        ]);

        $this->agroindustria = $empreendimentos->criarEmpreendimento([
            'cnpj' => $this->cnpjValido(),
            'razao_social' => 'Agroindústria Boa Safra Ltda',
            'atividade' => 'agroindustria_alimenticia',
            'porte' => Empreendimento::PORTE_MEDIO,
            'impacto_significativo' => false,
            'valor_empreendimento_centavos' => 120_000_000,
            'latitude' => -25.5721,
            'longitude' => -49.4453,
        ]);
        $empreendimentos->vincularResponsavelTecnico($this->agroindustria, [
            'nome' => 'Eng.ª Camila dos Santos Pereira',
            'registro_profissional' => 'CREA-PR 234567',
            'tipo_registro' => ResponsavelTecnico::TIPO_CREA,
        ]);

        $this->postoPetroleo = $empreendimentos->criarEmpreendimento([
            'cnpj' => $this->cnpjValido(),
            'razao_social' => 'Posto Petróleo Sul Ltda',
            'atividade' => 'comercio_varejista_combustiveis',
            'porte' => Empreendimento::PORTE_PEQUENO,
            'impacto_significativo' => false,
            'valor_empreendimento_centavos' => 35_000_000,
            'latitude' => -25.4512,
            'longitude' => -49.2890,
        ]);
        $empreendimentos->vincularResponsavelTecnico($this->postoPetroleo, [
            'nome' => 'Eng. Ricardo Nunes Barbosa',
            'registro_profissional' => 'CREA-PR 345678',
            'tipo_registro' => ResponsavelTecnico::TIPO_CREA,
        ]);
    }

    /** LP → LI → LO completos, com documento obrigatório, condicionantes (cumprida e pendente) e compensação ambiental. */
    private function cenarioLicenciamentoMineradora(): void
    {
        $licenciamento = app(ProcessoLicenciamentoService::class);

        $lp = $this->como($this->autor, fn () => $licenciamento->abrirProcesso($this->mineradora, ProcessoLicenciamento::FASE_LP));
        $this->como($this->autor, fn () => $licenciamento->anexarDocumento($lp, DocumentoLicenciamento::TIPO_EIA_RIMA));
        $this->como($this->autor, fn () => $licenciamento->registrarVistoriaTecnica($lp, [
            'resultado' => VistoriaTecnicaLicenciamento::RESULTADO_FAVORAVEL,
            'parecer' => 'EIA/RIMA compatível com a atividade pretendida. Parecer favorável à Licença Prévia.',
        ]));
        $this->como($this->autor, fn () => $licenciamento->deferir($lp->refresh()));

        $li = $this->como($this->autor, fn () => $licenciamento->abrirProcesso($this->mineradora->refresh(), ProcessoLicenciamento::FASE_LI));
        $this->como($this->autor, fn () => $licenciamento->registrarVistoriaTecnica($li, [
            'resultado' => VistoriaTecnicaLicenciamento::RESULTADO_FAVORAVEL,
            'parecer' => 'Projeto executivo atende às condicionantes da LP. Parecer favorável à Licença de Instalação.',
        ]));

        $condicionanteCumprida = $this->como($this->autor, fn () => $licenciamento->registrarCondicionante($li, [
            'descricao' => 'Apresentar laudo semestral de emissões atmosféricas das chaminés.',
            'prazo' => today()->subDays(10)->toDateString(),
        ]));
        $this->como($this->autor, fn () => $licenciamento->marcarCondicionanteCumprida($condicionanteCumprida));
        $this->como($this->autor, fn () => $licenciamento->registrarCondicionante($li, [
            'descricao' => 'Instalar barreira acústica no perímetro da planta industrial.',
            'prazo' => today()->addDays(90)->toDateString(),
        ]));

        $this->como($this->autor, fn () => $licenciamento->deferir($li->refresh()));

        // Só a partir da Licença de Operação o empreendimento é reclassificado como de
        // impacto significativo (laudo final de instalação) — assim a compensação
        // ambiental nasce uma única vez, vinculada à LO.
        $this->mineradora->update(['impacto_significativo' => true]);

        $lo = $this->como($this->autor, fn () => $licenciamento->abrirProcesso($this->mineradora->refresh(), ProcessoLicenciamento::FASE_LO));
        $this->como($this->autor, fn () => $licenciamento->registrarVistoriaTecnica($lo, [
            'resultado' => VistoriaTecnicaLicenciamento::RESULTADO_FAVORAVEL,
            'parecer' => 'Instalação em conformidade com o projeto aprovado. Parecer favorável à Licença de Operação.',
        ]));
        $this->como($this->autor, fn () => $licenciamento->deferir($lo->refresh()));

        $this->cenarioCompensacaoAmbiental($lo->refresh());
    }

    private function cenarioCompensacaoAmbiental(ProcessoLicenciamento $processoLo): void
    {
        $compensacoes = app(CompensacaoAmbientalService::class);
        $compensacao = $processoLo->compensacaoAmbiental()->firstOrFail();

        $this->como($this->autor, fn () => $compensacoes->registrarPagamento($compensacao, [
            'valor_centavos' => 2_500_000,
            'pago_em' => today()->subDays(10)->toDateString(),
            'comprovante' => 'Depósito identificado — guia 2026/0001.',
        ]));
        $this->como($this->autor, fn () => $compensacoes->registrarPagamento($compensacao, [
            'valor_centavos' => 1_500_000,
            'pago_em' => today()->subDays(3)->toDateString(),
            'comprovante' => 'Depósito identificado — guia 2026/0002.',
        ]));

        $this->como($this->autor, fn () => $compensacoes->registrarDestinacao($compensacao->refresh(), [
            'destino' => DestinacaoCompensacao::DESTINO_FUNDO_MUNICIPAL,
            'valor_centavos' => 2_000_000,
        ]));
        $this->como($this->autor, fn () => $compensacoes->registrarDestinacao($compensacao->refresh(), [
            'destino' => DestinacaoCompensacao::DESTINO_UNIDADE_CONSERVACAO,
            'valor_centavos' => 1_200_000,
        ]));
    }

    /** Processo aberto, ainda em análise — sem vistoria nem deferimento (estado de demonstração do fluxo em andamento). */
    private function cenarioLicenciamentoAgroindustria(): void
    {
        app(ProcessoLicenciamentoService::class)->abrirProcesso($this->agroindustria, ProcessoLicenciamento::FASE_LP);
    }

    /** Parecer técnico desfavorável, deferido mediante justificativa expressa (empreendimento de pequeno porte, sem EIA/RIMA). */
    private function cenarioLicenciamentoPostoPetroleo(): void
    {
        $licenciamento = app(ProcessoLicenciamentoService::class);

        $lp = $this->como($this->autor, fn () => $licenciamento->abrirProcesso($this->postoPetroleo, ProcessoLicenciamento::FASE_LP));
        $this->como($this->autor, fn () => $licenciamento->registrarVistoriaTecnica($lp, [
            'resultado' => VistoriaTecnicaLicenciamento::RESULTADO_DESFAVORAVEL,
            'parecer' => 'Tanques de armazenamento sem laudo de estanqueidade atualizado.',
        ]));
        $this->como($this->autor, fn () => $licenciamento->deferir(
            $lp->refresh(),
            'Laudo de estanqueidade apresentado em complementação e aprovado pela equipe técnica — defiro com condicionante de renovação anual.',
        ));
    }

    /**
     * O posto de combustíveis (LP recém-deferida) vence em 30 dias — gera o alerta
     * real via o job diário (`verificarPrazos`), e não por escrita direta no alerta.
     */
    private function gerarAlertaLicenciamento(): void
    {
        ProcessoLicenciamento::query()
            ->where('empreendimento_id', $this->postoPetroleo->id)
            ->where('fase', ProcessoLicenciamento::FASE_LP)
            ->firstOrFail()
            ->update(['validade_em' => today()->addDays(30)]);

        app(ProcessoLicenciamentoService::class)->verificarPrazos();
    }

    /**
     * Três autos de infração ambiental em estados diferentes: multa parcelada e
     * parcialmente paga, processo arquivado por improcedência, e um auto aberto a
     * partir de uma ocorrência de queimada (ver `cenarioQueimadas`).
     */
    private function cenarioFiscalizacao(): void
    {
        $fiscalizacao = app(FiscalizacaoAmbientalService::class);
        $sancionatorio = app(ProcessoSancionatorioService::class);

        // Auto 1 — poluição hídrica no Posto Petróleo Sul: penalidade aplicada, parcelada em 6x, 2 parcelas pagas.
        $execucao1 = $this->criarExecucaoVistoria('Posto Petróleo Sul — Unidade Centro', -25.4512, -49.2890);
        $auto1 = $this->como($this->autor, fn () => $fiscalizacao->emitirAutoInfracaoAmbiental($execucao1, $this->postoPetroleo, [
            'tipo_infracao' => AutoInfracaoAmbiental::TIPO_POLUICAO_HIDRICA,
            'irregularidade' => 'Lançamento de efluente oleoso na rede de drenagem pluvial sem tratamento prévio.',
            'enquadramento_legal' => 'Art. 61 do Decreto Federal 6.514/2008',
            'prazo_dias' => 30,
        ]));
        $processo1 = $auto1->documento->processoSancionatorio;
        $this->como($this->autor, fn () => $sancionatorio->apresentarDefesa($processo1, 'A empresa alega que o vazamento foi pontual e que a canalização já foi reparada.'));
        $this->como($this->autor, fn () => $sancionatorio->julgar(
            $processo1->refresh(),
            ProcessoSancionatorio::DECISAO_PROCEDENTE,
            'Laudo técnico confirma o lançamento irregular de efluente. Mantida a autuação.',
            $this->autor,
            penalidadeCentavos: 1_200_000,
        ));
        $parcelamento = $this->como($this->autor, fn () => $fiscalizacao->parcelar($processo1->refresh(), 6));
        foreach ($parcelamento->parcelas()->orderBy('numero')->take(2)->get() as $parcela) {
            $this->como($this->autor, fn () => $fiscalizacao->registrarPagamentoParcela($parcela));
        }

        // Auto 2 — desmatamento na Mineradora: processo julgado improcedente (arquivado), sem penalidade.
        $execucao2 = $this->criarExecucaoVistoria('Mineradora Vale do Rio Verde — Frente de Lavra 2', -25.6012, -49.3987);
        $auto2 = $this->como($this->autor, fn () => $fiscalizacao->emitirAutoInfracaoAmbiental($execucao2, $this->mineradora, [
            'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO,
            'area_afetada_ha' => 2.5,
            'irregularidade' => 'Supressão de vegetação nativa sem autorização prévia do órgão ambiental.',
            'enquadramento_legal' => 'Art. 50 do Decreto Federal 6.514/2008',
            'prazo_dias' => 15,
        ]));
        $processo2 = $auto2->documento->processoSancionatorio;
        $this->como($this->autor, fn () => $sancionatorio->apresentarDefesa($processo2, 'A área suprimida já estava descaracterizada antes da vistoria, conforme imagens de satélite anteriores.'));
        $this->como($this->autor, fn () => $sancionatorio->julgar(
            $processo2->refresh(),
            ProcessoSancionatorio::DECISAO_IMPROCEDENTE,
            'Imagens de satélite anteriores à vistoria comprovam a alegação da defesa. Processo arquivado.',
            $this->autor,
        ));
    }

    private function cenarioResiduosSolidos(): void
    {
        $residuos = app(ResiduosSolidosService::class);

        $geradorIndustrial = $this->como($this->autor, fn () => $residuos->cadastrarGerador([
            'nome' => 'Pátio de Resíduos — Posto Petróleo Sul',
            'tipo' => GeradorResiduo::TIPO_INDUSTRIAL,
            'empreendimento_id' => $this->postoPetroleo->id,
        ]));
        $this->como($this->autor, fn () => $residuos->registrarColeta($geradorIndustrial, [
            'tipo_coleta' => ColetaResiduo::TIPO_COLETA_REGULAR,
            'rota' => 'Rota Industrial Norte',
            'volume_kg' => 850.5,
            'destinacao' => ColetaResiduo::DESTINACAO_ATERRO,
            'coletada_em' => today()->subDays(20)->toDateString(),
        ]));
        $this->como($this->autor, fn () => $residuos->registrarColeta($geradorIndustrial, [
            'tipo_coleta' => ColetaResiduo::TIPO_COLETA_SELETIVA,
            'rota' => 'Rota Industrial Norte',
            'volume_kg' => 120.0,
            'destinacao' => ColetaResiduo::DESTINACAO_RECICLAGEM,
            'coletada_em' => today()->subDays(10)->toDateString(),
        ]));

        $moradora = Pessoa::factory()->create(['nome' => 'Francisca Helena Martins']);
        $geradorDomiciliar = $this->como($this->autor, fn () => $residuos->cadastrarGerador([
            'nome' => 'Residência Rua das Palmeiras, 220',
            'tipo' => GeradorResiduo::TIPO_DOMICILIAR,
            'pessoa_id' => $moradora->id,
        ]));
        $this->como($this->autor, fn () => $residuos->registrarColeta($geradorDomiciliar, [
            'tipo_coleta' => ColetaResiduo::TIPO_COLETA_REGULAR,
            'volume_kg' => 45.0,
            'destinacao' => ColetaResiduo::DESTINACAO_ATERRO,
            'coletada_em' => today()->subDays(15)->toDateString(),
        ]));
        $this->como($this->autor, fn () => $residuos->registrarColeta($geradorDomiciliar, [
            'tipo_coleta' => ColetaResiduo::TIPO_COLETA_SELETIVA,
            'volume_kg' => 12.5,
            'destinacao' => ColetaResiduo::DESTINACAO_RECICLAGEM,
            'coletada_em' => today()->subDays(5)->toDateString(),
        ]));

        $ponto = $this->como($this->autor, fn () => $residuos->cadastrarPontoLogisticaReversa([
            'nome' => 'Ecoponto Eletrônicos — Centro',
            'categoria' => PontoLogisticaReversa::CATEGORIA_ELETRONICOS,
            'endereco' => 'Praça Rui Barbosa, 10 — Centro',
            'latitude' => -25.4298,
            'longitude' => -49.2671,
        ]));
        $this->como($this->autor, fn () => $residuos->registrarEntrega($ponto, [
            'quantidade_kg' => 35.2,
            'entregue_em' => today()->subDays(7)->toDateString(),
        ]));
        $this->como($this->autor, fn () => $residuos->registrarEntrega($ponto, [
            'quantidade_kg' => 18.0,
            'entregue_em' => today()->subDays(1)->toDateString(),
        ]));
    }

    private function cenarioAreasProtegidas(): void
    {
        $areas = app(AreasProtegidasService::class);

        $this->como($this->autor, fn () => $areas->cadastrarAreaProtegida([
            'tipo' => AreaProtegida::TIPO_APP,
            'subtipo' => 'mata_ciliar',
            'ato_legal' => 'Lei Federal 12.651/2012, art. 4º',
            'geometria' => $this->poligonoDemonstracao(-49.4350, -25.5650, 0.012, 0.006),
        ]));
        $this->como($this->autor, fn () => $areas->cadastrarAreaProtegida([
            'tipo' => AreaProtegida::TIPO_RESERVA_LEGAL,
            'subtipo' => null,
            'ato_legal' => 'CAR PR-4106902-0001.2026 (averbação da Reserva Legal)',
            'geometria' => $this->poligonoDemonstracao(-49.3950, -25.6080, 0.02, 0.015),
        ]));
        $this->como($this->autor, fn () => $areas->cadastrarAreaProtegida([
            'tipo' => AreaProtegida::TIPO_UNIDADE_CONSERVACAO,
            'subtipo' => 'parque_natural_municipal',
            'ato_legal' => 'Decreto Municipal 123/2015',
            'geometria' => $this->poligonoDemonstracao(-49.2600, -25.5450, 0.015, 0.01),
        ]));
    }

    /**
     * Duas ocorrências: a primeira com responsável identificado (abre o 3º auto de
     * infração ambiental automaticamente), a segunda sem responsável identificado.
     */
    private function cenarioQueimadas(): void
    {
        $queimadas = app(QueimadasService::class);

        $ocorrencia1 = $this->como($this->autor, fn () => $queimadas->registrarOcorrencia([
            'data_ocorrencia' => today()->subDays(5)->toDateString(),
            'latitude' => -25.5705,
            'longitude' => -49.4470,
            'area_queimada_ha' => 4.8,
            'referencia_imagem_satelite' => ['fonte' => 'INPE Queimadas', 'satelite' => 'AQUA_M-T', 'detectado_em' => today()->subDays(5)->toDateString()],
        ]));
        $execucaoQueimada = $this->criarExecucaoVistoria('Agroindústria Boa Safra — Talhão 7', -25.5721, -49.4453);
        $this->como($this->autor, fn () => $queimadas->vincularResponsavel($ocorrencia1, [
            'responsavel_empreendimento_id' => $this->agroindustria->id,
            'execucao_vistoria_id' => $execucaoQueimada->id,
        ]));

        $this->como($this->autor, fn () => $queimadas->registrarOcorrencia([
            'data_ocorrencia' => today()->subDays(2)->toDateString(),
            'latitude' => -25.6250,
            'longitude' => -49.3600,
            'area_queimada_ha' => 1.2,
            'referencia_imagem_satelite' => null,
        ]));
    }

    /** Outorga de água (com alerta de vencimento em 7 dias) e licença de efluentes com parâmetros e medições. */
    private function cenarioRecursosHidricos(): void
    {
        $recursosHidricos = app(RecursosHidricosService::class);

        $outorga = $this->como($this->autor, fn () => $recursosHidricos->cadastrarOutorga($this->agroindustria, [
            'tipo_captacao' => OutorgaAgua::TIPO_CAPTACAO_SUPERFICIAL,
            'vazao_m3_hora' => 180.0,
            'finalidade' => OutorgaAgua::FINALIDADE_IRRIGACAO,
        ]));
        $outorga->update(['validade_em' => today()->addDays(7)]);

        $licenca = $this->como($this->autor, fn () => $recursosHidricos->cadastrarLicencaEfluente($this->postoPetroleo, [
            ['parametro' => 'pH', 'limite_min' => 6.0, 'limite_max' => 9.0, 'unidade' => 'pH'],
            ['parametro' => 'DBO', 'limite_min' => null, 'limite_max' => 60.0, 'unidade' => 'mg/L'],
        ]));
        [$parametroPh, $parametroDbo] = $licenca->parametros()->orderBy('id')->get()->all();

        $this->como($this->autor, fn () => $recursosHidricos->registrarMedicao($parametroPh, [
            'valor' => 7.2,
            'medida_em' => today()->subDays(5)->toDateString(),
        ]));
        $this->como($this->autor, fn () => $recursosHidricos->registrarMedicao($parametroDbo, [
            'valor' => 85.0,
            'medida_em' => today()->subDays(5)->toDateString(),
        ]));

        $recursosHidricos->verificarPrazos();
    }

    private function cenarioRelatorios(): void
    {
        $relatorios = app(RelatorioAmbientalService::class);
        $exercicio = (int) now()->year;

        $relatorios->gerarRelatorio(RelatorioAmbiental::TIPO_RARS, $exercicio, $this->autor->id);
        $relatorios->gerarRelatorio(RelatorioAmbiental::TIPO_GEE, $exercicio, $this->autor->id);
    }

    private function criarIntegracao(): void
    {
        app(IntegracaoMeioAmbienteService::class)->criar([
            'nome' => 'Integração IBAMA — Envio de Autos de Infração',
            'orgao' => MeioAmbienteIntegracao::ORGAO_IBAMA,
            'envio_url' => 'https://ibama.exemplo.gov.br/api/autos-infracao',
            'envio_token' => 'token-demonstracao-' . Str::random(16),
        ]);
    }

    // ---------------------------------------------------------------- montagem

    /** OrgUnit e fiscal únicos, reaproveitados pelas execuções de vistoria que originam os autos de infração. */
    private function criarInfraestruturaFiscalizacao(): void
    {
        $this->orgUnitFiscalizacao = OrgUnit::create(['name' => 'Secretaria de Meio Ambiente', 'code' => 'SMA-' . uniqid()]);
        $this->fiscal = User::create([
            'name' => 'Fiscal Ambiental Demonstração',
            'email' => 'fiscal-ambiental-demo-' . uniqid() . '@teste.gov.br',
            'password' => bcrypt('secret'),
        ]);
    }

    /** Execução de vistoria concluída pelo caminho real do módulo Vistoria — pré-requisito para emitir um auto de infração. */
    private function criarExecucaoVistoria(string $nomeLocal, float $latitude, float $longitude): ExecucaoVistoria
    {
        $proprietario = Pessoa::factory()->create();
        $local = LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => $nomeLocal,
            'tipo' => LocalFiscalizavel::TIPO_ESTABELECIMENTO_COMERCIAL,
            'latitude' => $latitude,
            'longitude' => $longitude,
        ]);
        $ordem = OrdemServico::create([
            'local_id' => $local->id,
            'org_unit_id' => $this->orgUnitFiscalizacao->id,
            'fiscal_id' => $this->fiscal->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_ATENDIMENTO_DENUNCIA,
            'data_prevista' => now()->subDay()->toDateString(),
        ]);

        return ExecucaoVistoria::create([
            'ordem_servico_id' => $ordem->id,
            'fiscal_id' => $this->fiscal->id,
            'client_uuid' => (string) Str::uuid(),
            'status' => ExecucaoVistoria::STATUS_SINCRONIZADA,
            'sincronizado_em' => now(),
        ]);
    }

    /**
     * Polígono retangular fechado em torno de ($centroLng, $centroLat), para servir de
     * geometria de demonstração de uma área protegida (GeoJSON Polygon).
     *
     * @return array{type: string, coordinates: array<int, array<int, array{0: float, 1: float}>>}
     */
    private function poligonoDemonstracao(float $centroLng, float $centroLat, float $larguraGraus, float $alturaGraus): array
    {
        $meiaLargura = $larguraGraus / 2;
        $meiaAltura = $alturaGraus / 2;

        $anel = [
            [$centroLng - $meiaLargura, $centroLat - $meiaAltura],
            [$centroLng + $meiaLargura, $centroLat - $meiaAltura],
            [$centroLng + $meiaLargura, $centroLat + $meiaAltura],
            [$centroLng - $meiaLargura, $centroLat + $meiaAltura],
            [$centroLng - $meiaLargura, $centroLat - $meiaAltura],
        ];

        return ['type' => 'Polygon', 'coordinates' => [$anel]];
    }

    private function habilitarModulo(Tenant $tenant): void
    {
        $modulo = Module::query()->where('alias', 'meio_ambiente')->first();
        if ($modulo === null) {
            throw new RuntimeException('Módulo "meio_ambiente" não está no catálogo — rode php artisan module:seed MeioAmbiente antes.');
        }
        $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
        app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, 'meio_ambiente');
    }

    private function usuarioAutor(Tenant $tenant): User
    {
        $usuario = User::query()->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenant->id))->orderBy('id')->first();
        if ($usuario === null) {
            throw new RuntimeException('O tenant precisa de ao menos um usuário para autorar os dados de demonstração do Meio Ambiente.');
        }

        return $usuario;
    }

    /** CNPJ com dígitos verificadores válidos (algoritmo padrão), só com fins de demonstração. */
    private function cnpjValido(): string
    {
        $n = [];
        for ($i = 0; $i < 8; $i++) {
            $n[$i] = random_int(0, 9);
        }
        // Filial 0001 — matriz.
        [$n[8], $n[9], $n[10], $n[11]] = [0, 0, 0, 1];

        $pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        $soma = 0;
        foreach ($pesos1 as $i => $peso) {
            $soma += $n[$i] * $peso;
        }
        $resto = $soma % 11;
        $n[12] = $resto < 2 ? 0 : 11 - $resto;

        $pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        $soma = 0;
        foreach ($pesos2 as $i => $peso) {
            $soma += $n[$i] * $peso;
        }
        $resto = $soma % 11;
        $n[13] = $resto < 2 ? 0 : 11 - $resto;

        return implode('', $n);
    }

    /**
     * Executa $acao com $user como usuário da requisição — o AuditLogger lê o
     * autor de request()->user(), que no console seria null.
     *
     * @template T
     * @param callable(): T $acao
     * @return T
     */
    private function como(User $user, callable $acao): mixed
    {
        request()->setUserResolver(fn () => $user);

        try {
            return $acao();
        } finally {
            request()->setUserResolver(fn () => null);
        }
    }

    /** $this->command é null quando o seeder é chamado direto (ex.: nos testes). */
    private function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}
