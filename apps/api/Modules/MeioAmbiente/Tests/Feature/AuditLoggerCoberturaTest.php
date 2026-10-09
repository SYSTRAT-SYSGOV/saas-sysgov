<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route as RotaLaravel;
use Illuminate\Support\Facades\Route;
use Modules\MeioAmbiente\Database\Seeders\TabelaMultaAmbientalSeeder;
use Modules\MeioAmbiente\Models\AreaProtegida;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\ColetaResiduo;
use Modules\MeioAmbiente\Models\Condicionante;
use Modules\MeioAmbiente\Models\DestinacaoCompensacao;
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
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Modules\MeioAmbiente\Tests\Concerns\CriaExecucaoVistoria;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Services\ProcessoSancionatorioService;
use Tests\TestCase;

/**
 * Toda mutação do módulo grava `AuditLog` — gravado nos Services (não nos Controllers),
 * para cobrir também as mutações que acontecem como efeito colateral de outra
 * (compensação calculada no deferimento, auto de infração aberto pela queimada).
 */
final class AuditLoggerCoberturaTest extends TestCase
{
    use CenarioMeioAmbiente;
    use CriaExecucaoVistoria;
    use RefreshDatabase;

    /**
     * Rotas de mutação do módulo e a ação de auditoria que cada uma grava. Uma rota nova
     * de POST/PUT/PATCH/DELETE que não estiver aqui reprova
     * `test_toda_rota_de_mutacao_do_modulo_tem_auditoria_coberta` — obriga quem a criar a
     * gravar auditoria no Service e a cobrir neste teste.
     */
    private const ROTAS_DE_MUTACAO = [
        'POST api/meio_ambiente/empreendimentos' => 'empreendimento.criado',
        'POST api/meio_ambiente/empreendimentos/{empreendimento}/responsavel-tecnico' => 'empreendimento.responsavel_tecnico_vinculado',
        'POST api/meio_ambiente/empreendimentos/{empreendimento}/processos-licenciamento' => 'processo_licenciamento.aberto',
        'POST api/meio_ambiente/processos-licenciamento/{processoLicenciamento}/documentos' => 'processo_licenciamento.documento_anexado',
        'POST api/meio_ambiente/processos-licenciamento/{processoLicenciamento}/condicionantes' => 'condicionante.registrada',
        'POST api/meio_ambiente/condicionantes/{condicionante}/cumprir' => 'condicionante.cumprida',
        'POST api/meio_ambiente/processos-licenciamento/{processoLicenciamento}/vistoria-tecnica' => 'processo_licenciamento.vistoria_tecnica_registrada',
        'POST api/meio_ambiente/processos-licenciamento/{processoLicenciamento}/deferir' => 'processo_licenciamento.deferido',
        'POST api/meio_ambiente/execucoes-vistoria/{execucaoVistoria}/autos-infracao-ambiental' => 'auto_infracao.emitido',
        'POST api/meio_ambiente/processos-sancionatorios/{processoSancionatorio}/parcelamento' => 'multa.parcelada',
        'POST api/meio_ambiente/parcelas-multa/{parcelaMulta}/pagamento' => 'parcela_multa.paga',
        'POST api/meio_ambiente/compensacoes-ambientais/{compensacaoAmbiental}/pagamentos' => 'compensacao.pagamento_registrado',
        'POST api/meio_ambiente/compensacoes-ambientais/{compensacaoAmbiental}/destinacoes' => 'compensacao.destinacao_registrada',
        'POST api/meio_ambiente/geradores-residuo' => 'gerador_residuo.cadastrado',
        'POST api/meio_ambiente/geradores-residuo/{geradorResiduo}/coletas' => 'coleta_residuo.registrada',
        'POST api/meio_ambiente/pontos-logistica-reversa' => 'ponto_logistica_reversa.cadastrado',
        'POST api/meio_ambiente/pontos-logistica-reversa/{pontoLogisticaReversa}/entregas' => 'entrega_logistica_reversa.registrada',
        'POST api/meio_ambiente/areas-protegidas' => 'area_protegida.cadastrada',
        'POST api/meio_ambiente/ocorrencias-queimada' => 'ocorrencia_queimada.registrada',
        'POST api/meio_ambiente/ocorrencias-queimada/{ocorrenciaQueimada}/responsavel' => 'ocorrencia_queimada.responsavel_vinculado',
        'POST api/meio_ambiente/empreendimentos/{empreendimento}/outorgas-agua' => 'outorga_agua.cadastrada',
        'POST api/meio_ambiente/empreendimentos/{empreendimento}/licencas-efluente' => 'licenca_efluente.cadastrada',
        'POST api/meio_ambiente/parametros-qualidade-efluente/{parametroQualidadeEfluente}/medicoes' => 'medicao_efluente.registrada',
        'POST api/meio_ambiente/relatorios' => 'relatorio.gerado',
        'POST api/meio_ambiente/integracoes' => 'integracao.criada',
        'DELETE api/meio_ambiente/integracoes/{meioAmbienteIntegracao}' => 'integracao.revogada',
    ];

    private Tenant $tenant;

    private User $usuario;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->usuario = $this->usuario($this->tenant, ['admin_meio_ambiente'], 'Chefia');
    }

    /** @return list<string> ações registradas para o tenant, na ordem */
    private function acoes(): array
    {
        return AuditLog::query()->where('tenant_id', $this->tenant->id)->where('module', 'meio_ambiente')->orderBy('id')->pluck('action')->all();
    }

    /** Executa o callback como o usuário autenticado, no tenant — como numa requisição real. */
    private function comoUsuario(callable $acao): mixed
    {
        $this->actingAs($this->usuario);

        return $this->noTenant($this->tenant, $acao);
    }

    private function empreendimento(bool $impactoSignificativo = false): Empreendimento
    {
        return app(EmpreendimentoService::class)->criarEmpreendimento([
            'cnpj' => '12345678000199', 'razao_social' => 'Indústria Exemplo Ltda', 'atividade' => 'industria',
            'porte' => Empreendimento::PORTE_MEDIO, 'latitude' => -25.4, 'longitude' => -49.2,
            'impacto_significativo' => $impactoSignificativo, 'valor_empreendimento_centavos' => 100_000_000,
        ]);
    }

    public function test_toda_rota_de_mutacao_do_modulo_tem_auditoria_coberta(): void
    {
        $rotas = collect(Route::getRoutes()->getRoutes())
            ->filter(fn (RotaLaravel $rota): bool => str_starts_with($rota->uri(), 'api/meio_ambiente/') && ! str_starts_with($rota->uri(), 'api/meio_ambiente/publico/'))
            ->flatMap(fn (RotaLaravel $rota) => collect($rota->methods())
                ->reject(fn (string $metodo): bool => in_array($metodo, ['GET', 'HEAD', 'OPTIONS'], true))
                ->map(fn (string $metodo): string => "{$metodo} {$rota->uri()}"))
            ->sort()->values()->all();

        $cobertas = array_keys(self::ROTAS_DE_MUTACAO);
        sort($cobertas);

        self::assertSame($cobertas, $rotas, 'Rota de mutação sem auditoria coberta (ou rota coberta que não existe mais).');
    }

    public function test_cumprir_condicionante_registra_estado_anterior_posterior_e_usuario(): void
    {
        $condicionante = $this->comoUsuario(function (): Condicionante {
            $empreendimento = $this->empreendimento();
            app(EmpreendimentoService::class)->vincularResponsavelTecnico($empreendimento, ['nome' => 'Eng. Ana', 'registro_profissional' => 'CREA-123', 'tipo_registro' => ResponsavelTecnico::TIPO_CREA]);
            $processo = app(ProcessoLicenciamentoService::class)->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);

            return app(ProcessoLicenciamentoService::class)->registrarCondicionante($processo, ['descricao' => 'Monitorar ruído', 'prazo' => now()->addMonth()->toDateString()]);
        });

        $this->como($this->usuario, $this->tenant)
            ->postJson("/api/meio_ambiente/condicionantes/{$condicionante->id}/cumprir")
            ->assertOk();

        $registro = AuditLog::where('action', 'condicionante.cumprida')->sole();
        self::assertSame(Condicionante::SITUACAO_PENDENTE, $registro->before['situacao']);
        self::assertSame(Condicionante::SITUACAO_CUMPRIDA, $registro->after['situacao']);
        self::assertSame($this->usuario->id, $registro->user_id);
        self::assertSame($this->tenant->id, $registro->tenant_id);
        self::assertSame("Condicionante #{$condicionante->id} (ProcessoLicenciamento #{$condicionante->processo_licenciamento_id})", $registro->resource);
    }

    public function test_licenciamento_e_compensacao_auditam_cada_etapa_inclusive_a_compensacao_automatica(): void
    {
        $this->comoUsuario(function (): void {
            $licenciamento = app(ProcessoLicenciamentoService::class);
            $compensacoes = app(CompensacaoAmbientalService::class);

            $empreendimento = $this->empreendimento(impactoSignificativo: true);
            app(EmpreendimentoService::class)->vincularResponsavelTecnico($empreendimento, ['nome' => 'Eng. Ana', 'registro_profissional' => 'CREA-123', 'tipo_registro' => ResponsavelTecnico::TIPO_CREA]);
            $processo = $licenciamento->abrirProcesso($empreendimento, ProcessoLicenciamento::FASE_LP);
            $licenciamento->anexarDocumento($processo, 'outro');
            $condicionante = $licenciamento->registrarCondicionante($processo, ['descricao' => 'Plantio', 'prazo' => now()->addMonth()->toDateString()]);
            $licenciamento->marcarCondicionanteCumprida($condicionante);
            $licenciamento->registrarVistoriaTecnica($processo, ['resultado' => VistoriaTecnicaLicenciamento::RESULTADO_FAVORAVEL]);
            $licenciamento->deferir($processo->refresh());

            $compensacao = $processo->compensacaoAmbiental()->firstOrFail();
            $compensacoes->registrarPagamento($compensacao, ['valor_centavos' => 1000]);
            $compensacoes->registrarDestinacao($compensacao->refresh(), ['destino' => DestinacaoCompensacao::DESTINO_FUNDO_MUNICIPAL, 'valor_centavos' => 1000]);
        });

        self::assertSame([
            'empreendimento.criado',
            'empreendimento.responsavel_tecnico_vinculado',
            'processo_licenciamento.aberto',
            'processo_licenciamento.documento_anexado',
            'condicionante.registrada',
            'condicionante.cumprida',
            'processo_licenciamento.vistoria_tecnica_registrada',
            'processo_licenciamento.deferido',
            'compensacao.calculada',
            'compensacao.pagamento_registrado',
            'compensacao.destinacao_registrada',
        ], $this->acoes());
    }

    public function test_fiscalizacao_e_queimada_auditam_auto_aberto_automaticamente_parcelamento_e_baixa(): void
    {
        $this->comoUsuario(function (): void {
            (new TabelaMultaAmbientalSeeder())->run();
            $empreendimento = $this->empreendimento();
            $queimadas = app(QueimadasService::class);

            $ocorrencia = $queimadas->registrarOcorrencia(['data_ocorrencia' => now()->toDateString(), 'latitude' => -25.4, 'longitude' => -49.2, 'area_queimada_ha' => 3]);
            $ocorrencia = $queimadas->vincularResponsavel($ocorrencia, [
                'responsavel_empreendimento_id' => $empreendimento->id,
                'execucao_vistoria_id' => $this->criarExecucaoVistoriaConcluida()->id,
            ]);

            $auto = AutoInfracaoAmbiental::findOrFail($ocorrencia->auto_infracao_ambiental_id);
            $processos = app(ProcessoSancionatorioService::class);
            $processo = $auto->documento->processoSancionatorio;
            $processos->apresentarDefesa($processo, 'Defesa.');
            $processo = $processos->julgar($processo->refresh(), ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Fundamentação.', $this->usuario, 200_000);

            $fiscalizacao = app(FiscalizacaoAmbientalService::class);
            $parcela = $fiscalizacao->parcelar($processo, 2)->parcelas()->orderBy('numero')->firstOrFail();
            $fiscalizacao->registrarPagamentoParcela($parcela);
        });

        self::assertSame([
            'empreendimento.criado',
            'ocorrencia_queimada.registrada',
            // O auto aberto pela queimada é auditado por conta própria, antes do vínculo.
            'auto_infracao.emitido',
            'ocorrencia_queimada.responsavel_vinculado',
            'multa.parcelada',
            'parcela_multa.paga',
        ], $this->acoes());
    }

    public function test_residuos_areas_recursos_hidricos_relatorios_e_integracoes_auditam_cada_mutacao(): void
    {
        $this->comoUsuario(function (): void {
            $residuos = app(ResiduosSolidosService::class);
            $gerador = $residuos->cadastrarGerador(['nome' => 'Mercado', 'tipo' => GeradorResiduo::TIPO_COMERCIAL]);
            $residuos->registrarColeta($gerador, ['tipo_coleta' => ColetaResiduo::TIPO_COLETA_SELETIVA, 'volume_kg' => 10, 'destinacao' => ColetaResiduo::DESTINACAO_RECICLAGEM]);
            $ponto = $residuos->cadastrarPontoLogisticaReversa(['nome' => 'Ponto Centro', 'categoria' => PontoLogisticaReversa::CATEGORIA_ELETRONICOS]);
            $residuos->registrarEntrega($ponto, ['quantidade_kg' => 2]);

            app(AreasProtegidasService::class)->cadastrarAreaProtegida([
                'tipo' => AreaProtegida::TIPO_APP,
                'geometria' => ['type' => 'Polygon', 'coordinates' => [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]]],
            ]);

            $empreendimento = $this->empreendimento();
            $hidricos = app(RecursosHidricosService::class);
            $hidricos->cadastrarOutorga($empreendimento, ['tipo_captacao' => OutorgaAgua::TIPO_CAPTACAO_POCO, 'vazao_m3_hora' => 5, 'finalidade' => OutorgaAgua::FINALIDADE_INDUSTRIAL]);
            $licenca = $hidricos->cadastrarLicencaEfluente($empreendimento, [['parametro' => 'DBO', 'limite_max' => 60, 'unidade' => 'mg/L']]);
            $hidricos->registrarMedicao($licenca->parametros()->firstOrFail(), ['valor' => 40]);

            $relatorios = app(RelatorioAmbientalService::class);
            $relatorio = $relatorios->gerarRelatorio(RelatorioAmbiental::TIPO_RARS, 2025);
            $relatorios->exportarRelatorio($relatorio, RelatorioAmbiental::FORMATO_JSON);

            $integracoes = app(IntegracaoMeioAmbienteService::class);
            $integracao = $integracoes->criar(['nome' => 'IBAMA', 'orgao' => MeioAmbienteIntegracao::ORGAO_IBAMA])['integracao'];
            $integracoes->revogar($integracao);
        });

        self::assertSame([
            'gerador_residuo.cadastrado',
            'coleta_residuo.registrada',
            'ponto_logistica_reversa.cadastrado',
            'entrega_logistica_reversa.registrada',
            'area_protegida.cadastrada',
            'empreendimento.criado',
            'outorga_agua.cadastrada',
            'licenca_efluente.cadastrada',
            'medicao_efluente.registrada',
            'relatorio.gerado',
            'relatorio.exportado',
            'integracao.criada',
            'integracao.revogada',
        ], $this->acoes());
        // Fora de uma requisição HTTP o AuditLogger não tem usuário (fica null, como num job/
        // comando); a gravação do usuário é verificada pelo teste da condicionante, via HTTP.
        self::assertSame(0, AuditLog::where('module', 'meio_ambiente')->whereNull('tenant_id')->count());
    }
}
