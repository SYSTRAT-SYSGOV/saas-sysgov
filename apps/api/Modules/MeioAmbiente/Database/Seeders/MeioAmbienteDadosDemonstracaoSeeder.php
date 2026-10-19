<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Modules\MeioAmbiente\Models\AreaProtegida;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\CompensacaoAmbiental;
use Modules\MeioAmbiente\Models\Condicionante;
use Modules\MeioAmbiente\Models\DocumentoLicenciamento;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\GeradorResiduo;
use Modules\MeioAmbiente\Models\ParametroQualidadeEfluente;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Models\RelatorioAmbiental;
use Modules\MeioAmbiente\Models\VistoriaTecnicaLicenciamento;
use Modules\MeioAmbiente\Services\AreasProtegidasService;
use Modules\MeioAmbiente\Services\CompensacaoAmbientalService;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Services\FiscalizacaoAmbientalService;
use Modules\MeioAmbiente\Services\ProcessoLicenciamentoService;
use Modules\MeioAmbiente\Services\QueimadasService;
use Modules\MeioAmbiente\Services\RecursosHidricosService;
use Modules\MeioAmbiente\Services\RelatorioAmbientalService;
use Modules\MeioAmbiente\Services\ResiduosSolidosService;
use Modules\MeioAmbiente\Support\RegraNegocioException;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ProcessoSancionatorio;

/**
 * Massa de dados de demonstração do módulo Meio Ambiente:
 *
 *  - 18 empreendimentos (com responsável técnico) em todas as situações de
 *    licenciamento: LP/LI/LO deferidas e vigentes, licenças vencendo em 90/30/7
 *    dias (com alertas), vencida e irregular, renovação em análise, LP
 *    indeferida, condicionante vencida que trava a fase seguinte, deferimento da
 *    LO travado por compensação ambiental pendente e um cadastro sem processo;
 *  - condicionantes, vistorias técnicas, documentos (EIA/RIMA), compensações
 *    ambientais com pagamentos e destinações;
 *  - autos de infração ambiental sobre os autos já existentes no módulo
 *    Vistoria, com multa sugerida (tabela de enquadramento), reincidência e
 *    parcelamento de multa com parcelas pagas e em atraso;
 *  - ocorrências de queimada, 12 áreas protegidas (APP, reserva legal e unidades
 *    de conservação), geradores e coletas de resíduos, logística reversa,
 *    outorgas de água, licenças de lançamento de efluentes com medições, e os
 *    relatórios RARS e GEE de dois exercícios.
 *
 * Tudo passa pelos Services do módulo (regras de licenciamento, compensação,
 * multas, auditoria); só as datas são reescritas depois, para a linha do tempo
 * ficar coerente. Os CNPJs são gerados (dígitos válidos, mas fictícios).
 *
 * Os autos de infração ambiental dependem dos autos do módulo Vistoria
 * (VistoriaDadosDemonstracaoSeeder); sem eles, essa parte é pulada.
 *
 * Uso: php artisan db:seed --force --class='Modules\MeioAmbiente\Database\Seeders\MeioAmbienteDadosDemonstracaoSeeder'
 * Não roda se o tenant já tiver empreendimentos (evita duplicar).
 */
final class MeioAmbienteDadosDemonstracaoSeeder extends Seeder
{
    private const CENTRO_LAT = -25.5930;

    private const CENTRO_LNG = -49.4100;

    private User $usuario;

    /** @var array<int, Empreendimento> */
    private array $empreendimentos = [];

    private Carbon $hoje;

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear em Meio Ambiente.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        if (Empreendimento::query()->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem empreendimentos — nada a fazer.");
            return;
        }

        $usuario = $tenant->users()->orderBy('users.id')->first();
        if (!$usuario instanceof User) {
            $this->informar('O tenant não tem usuários.', aviso: true);
            return;
        }
        $this->usuario = $usuario;
        $this->hoje = Carbon::today();

        // Tudo ou nada: se algo falhar, nada fica gravado (o guard acima bloquearia uma
        // nova execução sobre dados parciais).
        DB::transaction(function (): void {
            app(TabelaMultaAmbientalSeeder::class)->run();

            $this->criarEmpreendimentos();
            $this->criarAreasProtegidas();
            $this->criarLicenciamento();
            $autos = $this->criarAutosEParcelamentos();
            $this->criarQueimadas($autos);
            $this->criarResiduos();
            $this->criarRecursosHidricos();

            // Gera os alertas de vencimento (90/30/7 dias) das licenças e outorgas montadas acima.
            $this->como(fn () => app(ProcessoLicenciamentoService::class)->verificarPrazos());
            $this->como(fn () => app(RecursosHidricosService::class)->verificarPrazos());

            $this->criarRelatorios();
        });

        $this->informar("Dados de demonstração de Meio Ambiente criados no tenant [{$tenant->id}] {$tenant->name}: "
            . count($this->empreendimentos) . ' empreendimentos e seus desdobramentos.');
    }

    // ------------------------------------------------------ empreendimentos

    private function criarEmpreendimentos(): void
    {
        $service = app(EmpreendimentoService::class);
        $fisicas = Pessoa::query()->where('tipo', 'fisica')->orderBy('id')->limit(6)->get();

        // [razão social/atividade, atividade, porte, impacto, valor em R$ (milhões), responsável técnico]
        $linhas = [
            ['Pedreira Basalto Sul Ltda.', 'Mineração de basalto', 'grande', true, 48.0, ['Eng. Marcelo Antunes Reis', 'CREA-PR 148220/D', 'CREA']],
            ['Usina de Asfalto Estrada Nova Ltda.', 'Usina de asfalto', 'grande', true, 22.0, ['Eng. Cláudia Ferraz Dutra', 'CREA-PR 112908/D', 'CREA']],
            ['Loteamento Jardim das Araucárias SPE Ltda.', 'Loteamento residencial', 'grande', true, 35.0, ['Eng. Renato Salles Prado', 'CREA-PR 097341/D', 'CREA']],
            ['Frigorífico Santa Clara Ltda.', 'Frigorífico', 'grande', true, 15.0, ['Biól. Patrícia Moura Gentil', 'CRBio 45612/07-D', 'CRBio']],
            ['Curtume Rio Claro Ltda.', 'Curtume', 'medio', false, null, ['Eng. Fábio Lemos Tavares', 'CREA-PR 128776/D', 'CREA']],
            ['Laticínios Vale Verde Ltda.', 'Indústria de laticínios', 'medio', false, null, ['Eng. Simone Aguiar Pinto', 'CREA-PR 134502/D', 'CREA']],
            ['Granja Suína Três Barras', 'Suinocultura', 'medio', false, null, ['Biól. Eduardo Brandão Leal', 'CRBio 38821/07-D', 'CRBio']],
            ['Posto Ipiranga do Trevo Ltda.', 'Posto de combustíveis', 'pequeno', false, null, ['Eng. Hélio Camargo Neto', 'CREA-PR 076459/D', 'CREA']],
            ['Serraria Pinheiro Velho Ltda.', 'Serraria', 'medio', false, null, ['Eng. Luciana Barros Veiga', 'CREA-PR 141093/D', 'CREA']],
            ['Aviário Recanto Feliz', 'Avicultura', 'pequeno', false, null, ['Biól. Tiago Rangel Moreira', 'CRBio 51377/07-D', 'CRBio']],
            ['Piscicultura Águas Claras', 'Piscicultura', 'pequeno', false, null, ['Biól. Carolina Dias Prates', 'CRBio 49920/07-D', 'CRBio']],
            ['Aterro de Inertes Boa Vista Ltda.', 'Aterro de inertes', 'medio', false, null, ['Eng. Oswaldo Pires Bastos', 'CREA-PR 119834/D', 'CREA']],
            ['Granja de Ovos Sol Nascente', 'Granja de ovos', 'medio', false, null, ['Biól. Vanessa Coelho Franco', 'CRBio 42105/07-D', 'CRBio']],
            ['Cerâmica Forno Alto Ltda.', 'Fábrica de cerâmica', 'medio', false, null, ['Eng. Rogério Matos Nunes', 'CREA-PR 105667/D', 'CREA']],
            ['Lavanderia Industrial Alvorada Ltda.', 'Lavanderia industrial', 'medio', false, null, ['Eng. Beatriz Soares Lima', 'CREA-PR 138245/D', 'CREA']],
            ['ETE Municipal Vila Nova', 'Estação de tratamento de efluentes', 'medio', false, null, ['Eng. Gustavo Ramos Teles', 'CREA-PR 092318/D', 'CREA']],
            ['Cooperativa Recicla Mais', 'Cooperativa de reciclagem', 'pequeno', false, null, ['Biól. Fernanda Azevedo Costa', 'CRBio 47703/07-D', 'CRBio']],
            ['Marmoraria Pedra Bela Ltda.', 'Marmoraria', 'pequeno', false, null, ['Eng. Ivan Cardoso Moraes', 'CREA-PR 121549/D', 'CREA']],
        ];

        foreach ($linhas as $i => [$razao, $atividade, $porte, $impacto, $valorMilhoes, $rt]) {
            // Os 6 últimos da lista com titular pessoa física usam o Cadastro Único; os demais têm CNPJ.
            $usaPessoa = in_array($i, [9, 10, 12, 16], true) && $fisicas->count() > 0;
            $empreendimento = $service->criarEmpreendimento([
                'titular_pessoa_id' => $usaPessoa ? $fisicas->get($i % $fisicas->count())->id : null,
                'cnpj' => $usaPessoa ? null : $this->gerarCnpj(52310000 + $i * 91133),
                'razao_social' => $razao,
                'atividade' => $atividade,
                'porte' => $porte,
                'impacto_significativo' => $impacto,
                'valor_empreendimento_centavos' => $valorMilhoes !== null ? (int) round($valorMilhoes * 100_000_000) : null,
                'latitude' => round(self::CENTRO_LAT + (($i * 37) % 17 - 8) * 0.011, 7),
                'longitude' => round(self::CENTRO_LNG + (($i * 53) % 17 - 8) * 0.011, 7),
            ]);

            $service->vincularResponsavelTecnico($empreendimento, [
                'nome' => $rt[0],
                'registro_profissional' => $rt[1],
                'tipo_registro' => $rt[2],
            ]);

            DB::table('meio_ambiente_empreendimentos')->where('id', $empreendimento->id)->update([
                'created_at' => $this->hoje->copy()->subDays(1500 - $i * 60),
            ]);

            $this->empreendimentos[] = $empreendimento;
        }
    }

    // ------------------------------------------------------ áreas protegidas

    private function criarAreasProtegidas(): void
    {
        $service = app(AreasProtegidasService::class);

        // Cada área é um retângulo em torno de um empreendimento (as 6 primeiras criam
        // sobreposição, para o alerta de verificação) ou de pontos soltos pelo município.
        $linhas = [
            ['app', 'margem_rio', 0, 0.004, 'Lei 12.651/2012, art. 4º, I (faixa marginal do Rio Iguaçu)'],
            ['app', 'nascente', 3, 0.0035, 'Lei 12.651/2012, art. 4º, IV (raio de 50 m de nascente)'],
            ['app', 'margem_rio', 4, 0.0045, 'Lei 12.651/2012, art. 4º, I (faixa marginal do Rio Passaúna)'],
            ['reserva_legal', null, 6, 0.006, 'Averbação AV-5, matrícula 18.442 (20% da propriedade)'],
            ['reserva_legal', null, 9, 0.005, 'Averbação AV-3, matrícula 22.910 (20% da propriedade)'],
            ['unidade_conservacao', 'parque_municipal', 15, 0.009, 'Decreto Municipal nº 1.482/2012 — Parque Municipal Vale do Iguaçu'],
            ['unidade_conservacao', 'area_protecao_ambiental', null, 0.014, 'Lei Municipal nº 2.318/2009 — APA do Rio Verde'],
            ['app', 'topo_morro', null, 0.003, 'Lei 12.651/2012, art. 4º, IX (topo de morro)'],
            ['reserva_legal', null, null, 0.007, 'Averbação AV-2, matrícula 9.771 (20% da propriedade)'],
            ['app', 'margem_rio', null, 0.004, 'Lei 12.651/2012, art. 4º, I (faixa marginal do Ribeirão Claro)'],
            ['unidade_conservacao', 'reserva_particular', null, 0.005, 'Portaria IAT nº 118/2016 — RPPN Mata Atlântica Viva'],
            ['app', 'nascente', null, 0.003, 'Lei 12.651/2012, art. 4º, IV (raio de 50 m de nascente)'],
        ];

        foreach ($linhas as $i => [$tipo, $subtipo, $indiceEmpreendimento, $meio, $ato]) {
            $lat = $indiceEmpreendimento !== null
                ? (float) $this->empreendimentos[$indiceEmpreendimento]->latitude
                : self::CENTRO_LAT + (($i * 29) % 15 - 7) * 0.013;
            $lng = $indiceEmpreendimento !== null
                ? (float) $this->empreendimentos[$indiceEmpreendimento]->longitude
                : self::CENTRO_LNG + (($i * 41) % 15 - 7) * 0.013;

            $this->como(fn () => $service->cadastrarAreaProtegida([
                'tipo' => $tipo,
                'subtipo' => $subtipo,
                'geometria' => [
                    'type' => 'Polygon',
                    'coordinates' => [[
                        [$lng - $meio, $lat - $meio], [$lng + $meio, $lat - $meio],
                        [$lng + $meio, $lat + $meio], [$lng - $meio, $lat + $meio],
                        [$lng - $meio, $lat - $meio],
                    ]],
                ],
                'ato_legal' => $ato,
            ]));
        }
    }

    // --------------------------------------------------------- licenciamento

    private function criarLicenciamento(): void
    {
        $e = $this->empreendimentos;

        // Mineração, usina e frigorífico/loteamento: impacto significativo (compensação).
        $this->licencaCompleta($e[0], lp: 900, li: 700, lo: 400);
        $this->licencaCompleta($e[1], lp: 520, li: 430, lo: 380);

        $this->processo($e[2], ProcessoLicenciamento::FASE_LP, ['deferido_ha' => 300, 'vistoria' => 'favoravel']);
        $this->processo($e[2], ProcessoLicenciamento::FASE_LI, ['criado_ha' => 20, 'vistoria' => 'favoravel']);

        // Frigorífico: a compensação da LI ficou pela metade — o deferimento da LO é travado.
        $this->processo($e[3], ProcessoLicenciamento::FASE_LP, ['deferido_ha' => 800, 'vistoria' => 'favoravel']);
        $this->processo($e[3], ProcessoLicenciamento::FASE_LI, ['deferido_ha' => 600, 'vistoria' => 'favoravel', 'pagar_compensacao' => 0.4]);
        $lo = $this->processo($e[3], ProcessoLicenciamento::FASE_LO, ['criado_ha' => 25, 'vistoria' => 'favoravel']);
        try {
            $this->como(fn () => app(ProcessoLicenciamentoService::class)->deferir($lo));
        } catch (RegraNegocioException) {
            // Esperado: compensação ambiental com saldo pendente impede a emissão da licença.
        }

        // Licenças vigentes que vencem em 30, 90 e 7 dias (geram alertas) e uma já vencida.
        $this->licencaCompleta($e[4], lp: 2400, li: 2200, lo: 1795);   // vence em 30 dias
        $this->licencaCompleta($e[5], lp: 2300, li: 2100, lo: 1735);   // vence em 90 dias
        $this->licencaCompleta($e[6], lp: 2450, li: 2250, lo: 1818);   // vence em 7 dias
        $this->licencaCompleta($e[7], lp: 2500, li: 2300, lo: 1900);   // vencida e sem renovação: irregular

        // Renovação em análise de uma licença que ainda está vigente.
        $this->licencaCompleta($e[8], lp: 2350, li: 2150, lo: 1790);
        $this->processo($e[8], ProcessoLicenciamento::FASE_RENOVACAO, ['criado_ha' => 10, 'vistoria' => 'favoravel']);

        // LP deferida com condicionante vencida e pendente: impede abrir a LI.
        $lp = $this->processo($e[9], ProcessoLicenciamento::FASE_LP, [
            'deferido_ha' => 200, 'vistoria' => 'favoravel',
            'condicionantes' => [['Apresentar o plano de gerenciamento de resíduos da granja', -40, 'pendente']],
        ]);
        try {
            $this->como(fn () => app(ProcessoLicenciamentoService::class)->abrirProcesso($e[9], ProcessoLicenciamento::FASE_LI));
        } catch (RegraNegocioException) {
            // Esperado: condicionante pendente impede avanço de fase.
        }
        unset($lp);

        $this->processo($e[10], ProcessoLicenciamento::FASE_LP, ['criado_ha' => 12, 'vistoria' => 'favoravel']);
        $this->processo($e[11], ProcessoLicenciamento::FASE_LP, ['criado_ha' => 270, 'indeferido_ha' => 250, 'vistoria' => 'desfavoravel']);

        // Granja de ovos: LP e LI deferidas, LO recém-protocolada.
        $this->processo($e[12], ProcessoLicenciamento::FASE_LP, ['deferido_ha' => 420, 'vistoria' => 'favoravel']);
        $this->processo($e[12], ProcessoLicenciamento::FASE_LI, ['deferido_ha' => 300, 'vistoria' => 'favoravel']);
        $this->processo($e[12], ProcessoLicenciamento::FASE_LO, ['criado_ha' => 8, 'vistoria' => 'favoravel']);

        $this->licencaCompleta($e[13], lp: 1000, li: 800, lo: 600, condicionantesLo: [
            ['Monitorar semestralmente as emissões atmosféricas dos fornos', 120, 'pendente'],
            ['Instalar filtro de mangas na chaminé principal', -30, 'cumprida'],
        ]);

        // Lavanderia: LO deferida mesmo com parecer técnico desfavorável (justificada).
        $this->processo($e[14], ProcessoLicenciamento::FASE_LP, ['deferido_ha' => 700, 'vistoria' => 'favoravel']);
        $this->processo($e[14], ProcessoLicenciamento::FASE_LI, ['deferido_ha' => 500, 'vistoria' => 'favoravel']);
        $this->processo($e[14], ProcessoLicenciamento::FASE_LO, ['deferido_ha' => 300, 'vistoria' => 'desfavoravel']);

        $this->licencaCompleta($e[15], lp: 1300, li: 1100, lo: 900);

        $this->processo($e[16], ProcessoLicenciamento::FASE_LP, ['deferido_ha' => 100, 'vistoria' => 'favoravel']);
        $this->processo($e[16], ProcessoLicenciamento::FASE_LI, ['deferido_ha' => 60, 'vistoria' => 'favoravel']);
        $this->processo($e[16], ProcessoLicenciamento::FASE_LO, ['criado_ha' => 5]);
        // e[17] (marmoraria) fica só cadastrada, sem processo.
    }

    /** @param array<int, array{0: string, 1: int, 2: string}> $condicionantesLo */
    private function licencaCompleta(Empreendimento $empreendimento, int $lp, int $li, int $lo, array $condicionantesLo = []): void
    {
        $this->processo($empreendimento, ProcessoLicenciamento::FASE_LP, ['deferido_ha' => $lp, 'vistoria' => 'favoravel']);
        $this->processo($empreendimento, ProcessoLicenciamento::FASE_LI, ['deferido_ha' => $li, 'vistoria' => 'favoravel']);
        $this->processo($empreendimento, ProcessoLicenciamento::FASE_LO, [
            'deferido_ha' => $lo,
            'vistoria' => 'favoravel',
            'condicionantes' => $condicionantesLo !== [] ? $condicionantesLo : [['Apresentar relatório anual de monitoramento ambiental', 180, 'pendente']],
        ]);
    }

    /**
     * Abre, instrui e (se pedido) defere ou indefere um processo de licenciamento, reescrevendo as
     * datas depois: o Service usa sempre "hoje".
     *
     * Opções: deferido_ha, criado_ha, indeferido_ha (dias atrás), vistoria (favoravel|desfavoravel),
     * condicionantes ([descrição, prazo em dias relativos ao deferimento, cumprida|pendente]) e
     * pagar_compensacao (fração do valor devido, padrão 1).
     *
     * @param array<string, mixed> $o
     */
    private function processo(Empreendimento $empreendimento, string $fase, array $o): ProcessoLicenciamento
    {
        $service = app(ProcessoLicenciamentoService::class);
        $deferidoHa = $o['deferido_ha'] ?? null;
        $referencia = (int) ($deferidoHa ?? $o['indeferido_ha'] ?? $o['criado_ha'] ?? 10);
        $criadoEm = $this->hoje->copy()->subDays($deferidoHa !== null || isset($o['indeferido_ha']) ? $referencia + 25 : $referencia)->setTime(9, 30);

        $processo = $this->como(fn () => $service->abrirProcesso($empreendimento, $fase));
        DB::table('meio_ambiente_processos_licenciamento')->where('id', $processo->id)->update(['created_at' => $criadoEm, 'updated_at' => $criadoEm]);

        if ($fase === ProcessoLicenciamento::FASE_LP && $empreendimento->porte === Empreendimento::PORTE_GRANDE) {
            $documento = $this->como(fn () => $service->anexarDocumento($processo, DocumentoLicenciamento::TIPO_EIA_RIMA));
            DB::table('meio_ambiente_documentos_licenciamento')->where('id', $documento->id)->update(['anexado_em' => $criadoEm->copy()->addDays(3), 'created_at' => $criadoEm->copy()->addDays(3)]);
        }

        $justificativa = null;
        if (isset($o['vistoria'])) {
            $desfavoravel = $o['vistoria'] === 'desfavoravel';
            $vistoria = $this->como(fn () => $service->registrarVistoriaTecnica($processo, [
                'resultado' => $desfavoravel ? VistoriaTecnicaLicenciamento::RESULTADO_DESFAVORAVEL : VistoriaTecnicaLicenciamento::RESULTADO_FAVORAVEL,
                'parecer' => $desfavoravel
                    ? 'Vistoria constatou inadequações no sistema de tratamento de efluentes e na gestão de resíduos; recomenda-se condicionantes rigorosas.'
                    : 'Vistoria técnica sem não conformidades relevantes. Empreendimento apto, observadas as condicionantes.',
            ]));
            $realizada = $criadoEm->copy()->addDays(12)->setTime(14, 0);
            DB::table('meio_ambiente_vistorias_tecnicas_licenciamento')->where('id', $vistoria->id)->update(['realizada_em' => $realizada, 'created_at' => $realizada]);
            $justificativa = $desfavoravel ? 'Deferido com condicionantes de adequação, a critério da chefia, conforme análise do órgão colegiado.' : null;
        }

        if (isset($o['indeferido_ha'])) {
            DB::table('meio_ambiente_processos_licenciamento')->where('id', $processo->id)->update([
                'status' => ProcessoLicenciamento::STATUS_INDEFERIDO,
                'updated_at' => $this->hoje->copy()->subDays((int) $o['indeferido_ha']),
            ]);

            return $processo->refresh();
        }

        if ($deferidoHa === null) {
            return $processo->refresh();
        }

        $this->como(fn () => $service->deferir($processo, $justificativa));
        $dataDeferimento = $this->hoje->copy()->subDays((int) $deferidoHa);
        $validade = $dataDeferimento->copy()->addDays(ProcessoLicenciamento::VALIDADE_DIAS_POR_FASE[$fase]);
        DB::table('meio_ambiente_processos_licenciamento')->where('id', $processo->id)->update([
            'data_deferimento' => $dataDeferimento->toDateString(),
            'validade_em' => $validade->toDateString(),
            'updated_at' => $dataDeferimento,
        ]);

        $this->movimentarCompensacao($processo, $dataDeferimento, (float) ($o['pagar_compensacao'] ?? 1.0));

        foreach ($o['condicionantes'] ?? [] as [$descricao, $prazoDias, $situacao]) {
            $condicionante = $this->como(fn () => $service->registrarCondicionante($processo, [
                'descricao' => $descricao,
                'prazo' => $dataDeferimento->copy()->addDays((int) $prazoDias)->toDateString(),
            ]));
            // Prazos negativos: relativos a hoje (já vencidos); positivos: relativos ao deferimento.
            $prazo = $prazoDias < 0 ? $this->hoje->copy()->addDays((int) $prazoDias) : $dataDeferimento->copy()->addDays((int) $prazoDias);
            DB::table('meio_ambiente_condicionantes')->where('id', $condicionante->id)->update(['prazo' => $prazo->toDateString(), 'created_at' => $dataDeferimento]);

            if ($situacao === 'cumprida') {
                $this->como(fn () => $service->marcarCondicionanteCumprida($condicionante));
                DB::table('meio_ambiente_condicionantes')->where('id', $condicionante->id)->update(['cumprida_em' => $prazo->copy()->subDays(6)]);
            }
        }

        return $processo->refresh();
    }

    private function movimentarCompensacao(ProcessoLicenciamento $processo, Carbon $dataDeferimento, float $fracaoPaga): void
    {
        $compensacao = CompensacaoAmbiental::query()->where('processo_licenciamento_id', $processo->id)->first();
        if ($compensacao === null) {
            return;
        }

        DB::table('meio_ambiente_compensacoes_ambientais')->where('id', $compensacao->id)->update(['created_at' => $dataDeferimento, 'updated_at' => $dataDeferimento]);

        $service = app(CompensacaoAmbientalService::class);
        $valorPago = (int) round($compensacao->valor_devido_centavos * $fracaoPaga);
        if ($valorPago <= 0) {
            return;
        }

        $pagoEm = $dataDeferimento->copy()->addDays(15);
        $pagamento = $this->como(fn () => $service->registrarPagamento($compensacao, [
            'valor_centavos' => $valorPago,
            'pago_em' => $pagoEm->toDateString(),
            'comprovante' => 'DAM-' . $compensacao->id . '-' . $pagoEm->format('Ymd'),
        ]));
        DB::table('meio_ambiente_pagamentos_compensacao')->where('id', $pagamento->id)->update(['created_at' => $pagoEm]);

        // 60% para o fundo municipal e 40% para unidade de conservação.
        $fundo = (int) round($valorPago * 0.6);
        foreach ([['fundo_municipal', $fundo], ['unidade_conservacao', $valorPago - $fundo]] as [$destino, $valor]) {
            $destinacao = $this->como(fn () => $service->registrarDestinacao($compensacao, ['destino' => $destino, 'valor_centavos' => $valor]));
            DB::table('meio_ambiente_destinacoes_compensacao')->where('id', $destinacao->id)->update(['registrada_em' => $pagoEm->copy()->addDays(10), 'created_at' => $pagoEm->copy()->addDays(10)]);
        }
    }

    // ------------------------------------------------------- autos e multas

    /**
     * Cria um auto de infração ambiental sobre cada auto de infração do módulo Vistoria e parcela as
     * multas dos processos sancionatórios com penalidade aplicada.
     *
     * @return array<int, AutoInfracaoAmbiental>
     */
    private function criarAutosEParcelamentos(): array
    {
        $documentos = Documento::query()->where('tipo', Documento::TIPO_AUTO_INFRACAO)->orderBy('created_at')->get();
        if ($documentos->isEmpty()) {
            $this->informar('Não há autos de infração no módulo Vistoria — autos ambientais e multas não foram criados.', aviso: true);
            return [];
        }

        $fiscalizacao = app(FiscalizacaoAmbientalService::class);
        // [índice do empreendimento, tipo de infração, área afetada (ha)] — repetições geram reincidência.
        $mapa = [
            [3, AutoInfracaoAmbiental::TIPO_POLUICAO_HIDRICA, null], [4, AutoInfracaoAmbiental::TIPO_POLUICAO_HIDRICA, null],
            [0, AutoInfracaoAmbiental::TIPO_DESMATAMENTO, 3.2], [9, AutoInfracaoAmbiental::TIPO_QUEIMADA, 5.5],
            [3, AutoInfracaoAmbiental::TIPO_POLUICAO_HIDRICA, null], [5, AutoInfracaoAmbiental::TIPO_POLUICAO_ATMOSFERICA, null],
            [0, AutoInfracaoAmbiental::TIPO_DESMATAMENTO, 1.8], [6, AutoInfracaoAmbiental::TIPO_QUEIMADA, 2.4],
            [11, AutoInfracaoAmbiental::TIPO_OUTRA, null], [7, AutoInfracaoAmbiental::TIPO_POLUICAO_ATMOSFERICA, null],
            [13, AutoInfracaoAmbiental::TIPO_CACA_ILEGAL, null],
        ];

        $autos = [];
        $vistos = [];
        foreach ($documentos as $i => $documento) {
            [$indice, $tipo, $area] = $mapa[$i % count($mapa)];
            $chave = "{$indice}:{$tipo}";
            $auto = AutoInfracaoAmbiental::create([
                'documento_id' => $documento->id,
                'empreendimento_id' => $this->empreendimentos[$indice]->id,
                'tipo_infracao' => $tipo,
                'area_afetada_ha' => $area,
                'reincidente' => isset($vistos[$chave]),
            ]);
            $vistos[$chave] = true;

            $auto->valor_multa_sugerido_centavos = $fiscalizacao->calcularMultaSugerida($auto);
            $auto->save();
            DB::table('meio_ambiente_autos_infracao')->where('id', $auto->id)->update(['created_at' => $documento->created_at, 'updated_at' => $documento->created_at]);
            $autos[] = $auto;
        }

        // Parcelamento das multas aplicadas (penalidade_centavos preenchida).
        $quantidades = [6, 3, 12, 4, 10];
        $processos = ProcessoSancionatorio::query()->whereNotNull('penalidade_centavos')->orderBy('id')->get();
        foreach ($processos as $n => $processo) {
            $parcelamento = $this->como(fn () => $fiscalizacao->parcelar($processo, $quantidades[$n % count($quantidades)]));
            $base = Carbon::parse($processo->julgado_em ?? $this->hoje)->addDays(10);
            DB::table('meio_ambiente_parcelamentos_multa')->where('id', $parcelamento->id)->update(['created_at' => $base, 'updated_at' => $base]);

            foreach ($parcelamento->parcelas()->orderBy('numero')->get() as $parcela) {
                $vencimento = $base->copy()->addMonths($parcela->numero);
                DB::table('meio_ambiente_parcelas_multa')->where('id', $parcela->id)->update(['vencimento' => $vencimento->toDateString(), 'created_at' => $base]);

                // Paga as vencidas há mais de 5 dias; a 2ª parcela do 2º parcelamento fica em atraso.
                $emAtraso = $n === 1 && $parcela->numero === 2;
                if ($vencimento->copy()->addDays(5)->isPast() && !$emAtraso) {
                    $this->como(fn () => $fiscalizacao->registrarPagamentoParcela($parcela));
                    DB::table('meio_ambiente_parcelas_multa')->where('id', $parcela->id)->update(['pago_em' => $vencimento->copy()->subDays(2)->setTime(11, 0)]);
                }
            }
        }

        return $autos;
    }

    // -------------------------------------------------------------- queimadas

    /** @param array<int, AutoInfracaoAmbiental> $autos */
    private function criarQueimadas(array $autos): void
    {
        $service = app(QueimadasService::class);
        $pessoas = Pessoa::query()->orderBy('id')->limit(5)->get();
        $autosDeQueimada = array_values(array_filter($autos, fn (AutoInfracaoAmbiental $a): bool => $a->tipo_infracao === AutoInfracaoAmbiental::TIPO_QUEIMADA));

        for ($i = 0; $i < 14; $i++) {
            $comResponsavelEmpreendimento = $i % 5 === 1;
            $comResponsavelPessoa = $i % 5 === 3 && $pessoas->isNotEmpty();
            $auto = $comResponsavelEmpreendimento ? ($autosDeQueimada[intdiv($i, 5) % max(count($autosDeQueimada), 1)] ?? null) : null;

            $ocorrencia = $this->como(fn () => $service->registrarOcorrencia([
                'data_ocorrencia' => $this->hoje->copy()->subDays(4 + $i * 11)->toDateString(),
                'latitude' => round(self::CENTRO_LAT + (($i * 31) % 19 - 9) * 0.014, 7),
                'longitude' => round(self::CENTRO_LNG + (($i * 47) % 19 - 9) * 0.014, 7),
                'area_queimada_ha' => round(0.8 + ($i * 1.7) % 9, 2),
                'responsavel_pessoa_id' => $comResponsavelPessoa ? $pessoas->get($i % $pessoas->count())->id : null,
                'responsavel_empreendimento_id' => $auto?->empreendimento_id,
                'referencia_imagem_satelite' => ['satelite' => 'VIIRS 375 m', 'passagem' => $this->hoje->copy()->subDays(4 + $i * 11)->toDateString(), 'confianca' => $i % 3 === 0 ? 'alta' : 'nominal'],
            ]));

            if ($auto !== null) {
                $ocorrencia->update(['auto_infracao_ambiental_id' => $auto->id]);
            }
        }
    }

    // ---------------------------------------------------------------- resíduos

    private function criarResiduos(): void
    {
        $service = app(ResiduosSolidosService::class);

        $geradores = [
            ['Prefeitura — Coleta domiciliar Zona Norte', 'domiciliar', null], ['Prefeitura — Coleta domiciliar Zona Sul', 'domiciliar', null],
            ['Bairro Vila Nova — coleta domiciliar', 'domiciliar', null], ['Distrito Industrial — resíduos industriais', 'industrial', 4],
            ['Frigorífico Santa Clara', 'industrial', 3], ['Curtume Rio Claro', 'industrial', 4], ['Laticínios Vale Verde', 'industrial', 5],
            ['Feira do Produtor — Centro', 'comercial', null], ['Mercado Municipal', 'comercial', null], ['Shopping Araucária', 'comercial', null],
            ['Posto Ipiranga do Trevo', 'comercial', 7], ['Hospital Municipal', 'comercial', null], ['Cerâmica Forno Alto', 'industrial', 13],
            ['Cooperativa Recicla Mais', 'comercial', 16],
        ];

        foreach ($geradores as $i => [$nome, $tipo, $indiceEmpreendimento]) {
            $gerador = $this->como(fn () => $service->cadastrarGerador([
                'nome' => $nome,
                'tipo' => $tipo,
                'empreendimento_id' => $indiceEmpreendimento !== null ? $this->empreendimentos[$indiceEmpreendimento]->id : null,
            ]));

            for ($k = 0; $k < 4 + $i % 3; $k++) {
                $seletiva = ($i + $k) % 3 === 0;
                $this->como(fn () => $service->registrarColeta($gerador, [
                    'tipo_coleta' => $seletiva ? 'seletiva' : 'regular',
                    'rota' => 'Rota ' . (($i * 3 + $k) % 9 + 1),
                    'volume_kg' => round(($tipo === 'industrial' ? 1800 : 650) + (($i * 131 + $k * 77) % 900), 2),
                    'destinacao' => $seletiva ? 'reciclagem' : 'aterro',
                    'coletada_em' => $this->hoje->copy()->subDays($k * 14 + $i % 5 + 1)->toDateString(),
                ]));
            }
        }

        $pontos = [
            ['Ecoponto Centro', 'eletronicos', 'Praça Central, s/n'], ['Ecoponto Vila Nova', 'eletronicos', 'Rua das Flores, 300'],
            ['Supermercado Condor — pilhas e baterias', 'pilhas_baterias', 'Av. Brasil, 2200'], ['Escola Municipal Santos Dumont', 'pilhas_baterias', 'Rua Tiradentes, 95'],
            ['Secretaria de Meio Ambiente', 'eletronicos', 'Rua XV de Novembro, 820'], ['Câmara Municipal', 'pilhas_baterias', 'Praça da Matriz, 1'],
        ];

        foreach ($pontos as $i => [$nome, $categoria, $endereco]) {
            $ponto = $this->como(fn () => $service->cadastrarPontoLogisticaReversa([
                'nome' => $nome,
                'categoria' => $categoria,
                'endereco' => $endereco,
                'latitude' => round(self::CENTRO_LAT + (($i * 23) % 11 - 5) * 0.006, 7),
                'longitude' => round(self::CENTRO_LNG + (($i * 17) % 11 - 5) * 0.006, 7),
            ]));

            for ($k = 0; $k < 5 + $i % 3; $k++) {
                $this->como(fn () => $service->registrarEntrega($ponto, [
                    'quantidade_kg' => round($categoria === 'eletronicos' ? 38 + (($i + $k) * 17) % 120 : 4 + (($i + $k) * 7) % 35, 2),
                    'entregue_em' => $this->hoje->copy()->subDays($k * 17 + $i * 3 + 2)->toDateString(),
                ]));
            }
        }
    }

    // --------------------------------------------------------- recursos hídricos

    private function criarRecursosHidricos(): void
    {
        $service = app(RecursosHidricosService::class);

        // [índice do empreendimento, tipo de captação, vazão m³/h, finalidade, validade em dias a partir de hoje]
        $outorgas = [
            [0, 'captacao_superficial', 180.0, 'industrial', 1400], [3, 'captacao_superficial', 95.5, 'industrial', 30],
            [4, 'poco', 22.0, 'industrial', 90], [5, 'captacao_superficial', 40.0, 'industrial', 7],
            [6, 'poco', 14.5, 'abastecimento', 600], [9, 'poco', 6.0, 'abastecimento', -20],
            [10, 'captacao_superficial', 120.0, 'abastecimento', 800], [12, 'poco', 9.5, 'abastecimento', 210],
            [13, 'captacao_superficial', 30.0, 'industrial', 365], [14, 'poco', 18.0, 'industrial', -90],
            [2, 'captacao_superficial', 60.0, 'irrigacao', 1100],
        ];

        foreach ($outorgas as [$indice, $captacao, $vazao, $finalidade, $dias]) {
            $this->como(fn () => $service->cadastrarOutorga($this->empreendimentos[$indice], [
                'tipo_captacao' => $captacao,
                'vazao_m3_hora' => $vazao,
                'finalidade' => $finalidade,
                'validade_em' => $this->hoje->copy()->addDays($dias)->toDateString(),
            ]));
        }

        // Licenças de lançamento de efluentes: [índice, validade em dias a partir de hoje]
        $licencas = [[3, 1500], [4, 90], [5, 700], [14, 30], [15, 1200], [13, 7], [12, 400]];

        foreach ($licencas as $n => [$indice, $dias]) {
            $licenca = $this->como(fn () => $service->cadastrarLicencaEfluente($this->empreendimentos[$indice], [
                ['parametro' => 'pH', 'limite_min' => 5.0, 'limite_max' => 9.0, 'unidade' => 'pH'],
                ['parametro' => 'DBO', 'limite_min' => null, 'limite_max' => 60.0, 'unidade' => 'mg/L'],
                ['parametro' => 'DQO', 'limite_min' => null, 'limite_max' => 150.0, 'unidade' => 'mg/L'],
                ['parametro' => 'Sólidos sedimentáveis', 'limite_min' => null, 'limite_max' => 1.0, 'unidade' => 'mL/L'],
                ['parametro' => 'Temperatura', 'limite_min' => null, 'limite_max' => 40.0, 'unidade' => '°C'],
            ]));
            DB::table('meio_ambiente_licencas_lancamento_efluente')->where('id', $licenca->id)->update(['validade_em' => $this->hoje->copy()->addDays($dias)->toDateString()]);

            // Medições mensais dos últimos 6 meses; alguns valores estouram o limite (não conformes).
            foreach (ParametroQualidadeEfluente::query()->where('licenca_lancamento_efluente_id', $licenca->id)->get() as $p => $parametro) {
                for ($mes = 0; $mes < 6; $mes++) {
                    $base = match ($parametro->parametro) {
                        'pH' => 6.8 + (($n + $mes) % 5) * 0.4,
                        'DBO' => 38 + (($n * 7 + $mes * 9) % 30),
                        'DQO' => 95 + (($n * 11 + $mes * 13) % 50),
                        'Sólidos sedimentáveis' => 0.3 + (($n + $mes) % 4) * 0.2,
                        default => 28 + (($n + $mes) % 9),
                    };
                    // Pontual: um estouro no empreendimento 3 (DBO) e outro no 14 (pH).
                    if (($indice === 3 && $parametro->parametro === 'DBO' && $mes === 1) || ($indice === 14 && $parametro->parametro === 'pH' && $mes === 3)) {
                        $base = $parametro->parametro === 'pH' ? 9.8 : 74.0;
                    }
                    $this->como(fn () => $service->registrarMedicao($parametro, [
                        'valor' => round($base, 3),
                        'medida_em' => $this->hoje->copy()->subMonths($mes)->subDays($p)->toDateString(),
                    ]));
                }
            }
        }
    }

    // --------------------------------------------------------------- relatórios

    private function criarRelatorios(): void
    {
        $service = app(RelatorioAmbientalService::class);
        $exercicio = (int) $this->hoje->year;

        foreach ([$exercicio - 1, $exercicio] as $ano) {
            foreach ([RelatorioAmbiental::TIPO_RARS, RelatorioAmbiental::TIPO_GEE] as $tipo) {
                $this->como(fn () => $service->gerarRelatorio($tipo, $ano, $this->usuario->id));
            }
        }
    }

    // ---------------------------------------------------------------- helpers

    private function gerarCnpj(int $base): string
    {
        $d = str_split(str_pad((string) ($base % 100000000), 8, '0', STR_PAD_LEFT) . '0001');
        foreach ([[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]] as $pesos) {
            $soma = 0;
            foreach ($pesos as $i => $peso) {
                $soma += (int) $d[$i] * $peso;
            }
            $resto = $soma % 11;
            $d[] = (string) ($resto < 2 ? 0 : 11 - $resto);
        }

        return implode('', $d);
    }

    /**
     * Executa $acao com o usuário do seeder como usuário da requisição (auditoria e listeners
     * leem request()->user(), que no console seria null). Restaura o anterior ao sair.
     *
     * @template T
     * @param callable(): T $acao
     * @return T
     */
    private function como(callable $acao): mixed
    {
        $anterior = request()->getUserResolver();
        request()->setUserResolver(fn () => $this->usuario);

        try {
            return $acao();
        } finally {
            request()->setUserResolver($anterior);
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
