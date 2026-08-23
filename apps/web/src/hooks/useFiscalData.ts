import { useState, useEffect, useCallback } from 'react';
import {
  FiscalKPIs,
  RevenueSource,
  ExpenseNature,
  ExpenseFunction,
  LRFLimit,
  FundebData,
  FiscalAlert,
  EmendaParlamentar,
  ConvenioRecurso,
  ObraAraucaria,
  ObrasSummary,
  SiconfiApiStatus,
  ComparativeAnalysis,
} from '../types/fiscal';
import { buildComparativeAnalysis } from '../utils/comparative';
import { isEmendaRecente } from '../utils/formatters';
import api from '../api/client';

export interface FiscalDataHook {
  loading: boolean;
  error: string | null;
  temDadosReais: boolean;
  summary: FiscalKPIs | null;
  receitas: RevenueSource[];
  porNatureza: ExpenseNature[];
  porFuncao: ExpenseFunction[];
  limites: LRFLimit[];
  captacao: {
    metaAnual: number;
    captadoAcumulado: number;
    percentualAtingimento: string;
    novasEmendas7Dias?: number;
    emendas: EmendaParlamentar[];
    convenios: ConvenioRecurso[];
  } | null;
  fundeb: FundebData | null;
  alerts: FiscalAlert[];
  obrasData: {
    obras: ObraAraucaria[];
    summary: ObrasSummary | null;
  };
  siconfiStatus: SiconfiApiStatus | null;
  comparativeData: ComparativeAnalysis | null;
  refetch: () => Promise<void>;
}

const NOMES_FUNCOES: Record<string, string> = {
  '10': 'Saúde',
  '12': 'Educação',
  '01': 'Legislativa',
  '02': 'Judiciária',
  '04': 'Administração',
  '06': 'Segurança Pública',
  '08': 'Assistência Social',
  '09': 'Previdência Social',
  '13': 'Cultura',
  '15': 'Urbanismo',
  '16': 'Habitação',
  '17': 'Saneamento',
  '18': 'Gestão Ambiental',
  '20': 'Agricultura',
  '22': 'Indústria',
  '23': 'Comércio e Serviços',
  '26': 'Transporte',
  '28': 'Desporto e Lazer',
  '31': 'Trabalho',
};

export function useFiscalData(
  tenantId: string,
  codigoIbge: string,
  ano: number = 2026,
  isComparativoAnual: boolean = false
): FiscalDataHook {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [temDadosReais, setTemDadosReais] = useState<boolean>(false);

  const [summary, setSummary] = useState<FiscalKPIs | null>(null);
  const [receitas, setReceitas] = useState<RevenueSource[]>([]);
  const [porNatureza, setPorNatureza] = useState<ExpenseNature[]>([]);
  const [porFuncao, setPorFuncao] = useState<ExpenseFunction[]>([]);
  const [limites, setLimites] = useState<LRFLimit[]>([]);
  const [captacao, setCaptacao] = useState<FiscalDataHook['captacao']>(null);
  const [fundeb, setFundeb] = useState<FundebData | null>(null);
  const [alerts, setAlerts] = useState<FiscalAlert[]>([]);
  const [obrasData, setObrasData] = useState<FiscalDataHook['obrasData']>({
    obras: [],
    summary: null,
  });
  const [siconfiStatus, setSiconfiStatus] = useState<SiconfiApiStatus | null>(null);
  const [comparativeData, setComparativeData] = useState<ComparativeAnalysis | null>(null);

  const loadData = useCallback(async () => {
    if (!tenantId || tenantId === 'dev-tenant-central' || codigoIbge === '0000000') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const query = `?tenantId=${encodeURIComponent(tenantId)}&codigoIbge=${encodeURIComponent(codigoIbge)}&ano=${ano}`;

    try {
      const [
        summaryRes,
        receitasRes,
        despesasRes,
        lrfRes,
        alertasRes,
        captacaoRes,
        fundebRes,
        obrasRes,
        siconfiRes,
      ] = await Promise.all([
        api.get<any>(`/api/fiscal/summary${query}`),
        api.get<any>(`/api/fiscal/receitas${query}`),
        api.get<any>(`/api/fiscal/despesas${query}`),
        api.get<any>(`/api/fiscal/lrf${query}`),
        api.get<any>(`/api/fiscal/alertas${query}`).catch(() => ({ alertas: [], temDadosReais: false })),
        api.get<any>(`/api/fiscal/captacao${query}`).catch(() => null),
        api.get<any>(`/api/fiscal/fundeb${query}`).catch(() => null),
        api.get<any>(`/api/fiscal/obras${query}`).catch(() => null),
        api.get<any>('/api/siconfi/status').catch(() => null),
      ]);

      // ── Summary → FiscalKPIs (somente dados reais do banco) ──
      const real = !!summaryRes?.temDadosReais;
      setTemDadosReais(real);

      const lrfLimites = lrfRes?.limites ?? {};
      const saudeValor = Number(lrfLimites.saude?.despesa ?? 0);
      const educacaoValor = Number(lrfLimites.educacao?.despesa ?? 0);
      const pessoalValor = Number(lrfLimites.pessoal?.despesa ?? 0);
      const rcl = Number(summaryRes?.receitas ?? 0);

      const kpis: FiscalKPIs = {
        receitaTotalOrcada: rcl,
        receitaTotalRealizada: rcl,
        receitaTotalReestimada: rcl,
        despesaTotalOrcada: Number(summaryRes?.despesas ?? 0),
        despesaTotalEmpenhada: Number(summaryRes?.despesas ?? 0),
        despesaTotalLiquidada: Number(summaryRes?.despesas ?? 0),
        despesaTotalPaga: Number(summaryRes?.despesas ?? 0),
        rcl,
        despesaPessoalTotal: pessoalValor,
        despesaPessoalPercentualRCL: Number(lrfLimites.pessoal?.percentual ?? 0),
        limiteAlertaPessoal: 48.6,
        limitePrudencialPessoal: 51.3,
        limiteLegalPessoal: 54.0,
        statusPessoal:
          lrfLimites.pessoal?.status === 'FORA' ? 'CRITICO' : lrfLimites.pessoal?.status === 'DENTRO' ? 'OK' : 'ATENCAO',
        aportePrevidenciarioFPMA: 0,
        servicoDivida: 0,
        resultadoPrimario: Number(summaryRes?.saldo ?? 0),
        resultadoNominal: Number(summaryRes?.saldo ?? 0),
        superavitOrcamentario: Number(summaryRes?.saldo ?? 0),
        aplicacaoEducacaoValor: educacaoValor,
        aplicacaoEducacaoPercentual: Number(lrfLimites.educacao?.percentual ?? 0),
        aplicacaoSaudeValor: saudeValor,
        aplicacaoSaudePercentual: Number(lrfLimites.saude?.percentual ?? 0),
        fundebTotal: Number(fundebRes?.total ?? 0),
        fundebMagisterioPercentual: 0,
        metaCaptacaoAnual: 0,
        captacaoRealizada: Number(captacaoRes?.totalCaptado ?? 0),
        dataSource: real
          ? { origin: 'OFICIAL', source: 'SICONFI / fontes oficiais', collectedAt: new Date().toISOString() }
          : { origin: 'OFICIAL', source: 'Sem dados sincronizados', collectedAt: new Date().toISOString() },
      };
      setSummary(kpis);

      // ── Receitas → RevenueSource[] ──
      const receitasApi: RevenueSource[] = (receitasRes?.receitas ?? []).map((r: any) => ({
        id: String(r.code),
        nome: r.name,
        categoria: 'Outras',
        orcado: 0,
        reestimado: 0,
        realizado: Number(r.valor ?? 0),
        variacaoPercentual: 0,
        historicoMensal: [],
        detalhes: [],
        dataSource: { origin: 'OFICIAL', source: r.sourceKey ?? 'SICONFI', collectedAt: new Date().toISOString() },
      }));
      setReceitas(receitasApi);

      // ── Despesas → ExpenseNature[] + ExpenseFunction[] ──
      const despesasApi = despesasRes?.despesas ?? [];
      const naturezas: ExpenseNature[] = despesasApi.map((d: any) => ({
        id: String(d.code),
        categoria: d.name,
        empenhado: Number(d.valor ?? 0),
        liquidado: Number(d.valor ?? 0),
        pago: 0,
        orcado: 0,
        percentualTotal: 0,
      }));
      const totalDespesas = naturezas.reduce((acc, n) => acc + n.empenhado, 0);
      if (totalDespesas > 0) {
        naturezas.forEach((n) => {
          n.percentualTotal = Math.round((n.empenhado / totalDespesas) * 1000) / 10;
        });
      }
      setPorNatureza(naturezas);

      const funcoes: ExpenseFunction[] = despesasApi
        .filter((d: any) => NOMES_FUNCOES[String(d.code)])
        .map((d: any) => ({
          id: String(d.code),
          funcao: NOMES_FUNCOES[String(d.code)],
          icone: String(d.code) === '10' ? 'HeartPulse' : String(d.code) === '12' ? 'GraduationCap' : 'Building2',
          orcado: 0,
          empenhado: Number(d.valor ?? 0),
          liquidado: Number(d.valor ?? 0),
          pago: 0,
          percentualOrcamento: totalDespesas > 0 ? Math.round((Number(d.valor ?? 0) / totalDespesas) * 1000) / 10 : 0,
        }));
      setPorFuncao(funcoes);

      // ── Limites LRF → LRFLimit[] ──
      const limitesApi: LRFLimit[] = [
        {
          id: 'pessoal',
          nome: 'Despesa Total com Pessoal',
          baseCalculoNome: 'Receita Corrente Líquida',
          baseCalculoValor: rcl,
          valorRealizado: pessoalValor,
          percentualRealizado: Number(lrfLimites.pessoal?.percentual ?? 0),
          limiteMinimoOuMaximo: 'maximo',
          limiteAlerta: 48.6,
          limitePrudencial: 51.3,
          limiteLegal: 54.0,
          status:
            lrfLimites.pessoal?.status === 'FORA'
              ? 'CRITICO'
              : Number(lrfLimites.pessoal?.percentual ?? 0) >= 48.6
                ? 'ATENCAO'
                : 'OK',
          fundamentoLegal: 'Art. 18, 19, III e 20, III, "b" da LC 101/2000 (LRF)',
          observacao: 'Limite máximo de 54% da RCL para o Poder Executivo Municipal.',
        },
        {
          id: 'saude',
          nome: 'Aplicação em Saúde (ASPS)',
          baseCalculoNome: 'Receita de Impostos e Transferências',
          baseCalculoValor: rcl,
          valorRealizado: saudeValor,
          percentualRealizado: Number(lrfLimites.saude?.percentual ?? 0),
          limiteMinimoOuMaximo: 'minimo',
          limiteLegal: 15.0,
          status: lrfLimites.saude?.status === 'FORA' ? 'CRITICO' : lrfLimites.saude?.status === 'DENTRO' ? 'OK' : 'ATENCAO',
          fundamentoLegal: 'Art. 198, § 2º, III da CF/88 e ADCT Art. 77 (EC 86/2015)',
          observacao: 'Aplicação mínima de 15% em Ações e Serviços Públicos de Saúde.',
        },
        {
          id: 'educacao',
          nome: 'Aplicação em Educação (MDE)',
          baseCalculoNome: 'Receita de Impostos e Transferências',
          baseCalculoValor: rcl,
          valorRealizado: educacaoValor,
          percentualRealizado: Number(lrfLimites.educacao?.percentual ?? 0),
          limiteMinimoOuMaximo: 'minimo',
          limiteLegal: 25.0,
          status:
            lrfLimites.educacao?.status === 'FORA' ? 'CRITICO' : lrfLimites.educacao?.status === 'DENTRO' ? 'OK' : 'ATENCAO',
          fundamentoLegal: 'Art. 212 da CF/88 e Art. 10 da Lei 11.494/2007',
          observacao: 'Aplicação mínima de 25% na Manutenção e Desenvolvimento do Ensino.',
        },
      ];
      setLimites(limitesApi);

      // ── Alertas → FiscalAlert[] ──
      const alertasApi: FiscalAlert[] = (alertasRes?.alertas ?? []).map((a: any, idx: number) => ({
        id: `alert-${idx}`,
        tipo: a.severidade === 'CRITICO' ? 'CRITICO' : a.severidade === 'ALERTA' ? 'ATENCAO' : 'INFO',
        titulo: a.mensagem ?? a.titulo ?? 'Alerta fiscal',
        descricao: a.mensagem ?? '',
        impacto: a.valor != null ? `R$ ${Number(a.valor).toLocaleString('pt-BR')}` : '',
        orgao: a.tipo === 'LRF' ? 'LRF / TCE' : a.fonte ?? 'Sistema',
        dataAlerta: new Date().toISOString(),
        acaoRecomendada: 'Verificar demonstrativos oficiais e regularizar a pendência.',
      }));
      setAlerts(alertasApi);

      // ── Captação ──
      if (captacaoRes) {
        const emendasApi: EmendaParlamentar[] = (captacaoRes.emendas ?? []).map((e: any, idx: number) => ({
          id: e.id || `emenda-${idx}`,
          autor: e.autor || 'Parlamentar',
          partido: e.partido || 'N/A',
          esfera: (e.esfera as any) || 'Federal',
          tipo: (e.tipo as any) || 'RP6 (Individual)',
          numero: e.numero || `EMD-${idx + 1}`,
          objeto: e.objeto || 'Destinação municipal',
          orgaoDestino: e.orgaoDestino || 'Prefeitura Municipal',
          valorIndicado: Number(e.valorIndicado || e.valorEmpenhado || 0),
          valorEmpenhado: Number(e.valorEmpenhado || 0),
          valorPago: Number(e.valorPago || 0),
          status: (e.valorPago > 0 ? 'Paga' : 'Empenhada') as any,
          ano: Number(ano),
          dataProcessamento: e.dataProcessamento || new Date().toISOString(),
        }));

        const conveniosApi: ConvenioRecurso[] = (captacaoRes.convenios ?? []).map((c: any, idx: number) => ({
          id: c.id || `conv-${idx}`,
          numeroProposta: c.numero || `CONV-${idx + 1}`,
          concedente: c.concedente || 'Governo Federal',
          ministerio: c.ministerio || 'Governo Federal',
          objeto: c.objeto || 'Convênio federal',
          valorGlobal: Number(c.valorGlobal || 0),
          valorRepasse: Number(c.valorRepasse || 0),
          contrapartida: Number(c.valorContrapartida || 0),
          valorLiberado: Number(c.valorRepasse || 0),
          status: 'Em Execução',
          vigenciaFim: c.dataFim || '',
        }));

        setCaptacao({
          metaAnual: 0,
          captadoAcumulado: Number(captacaoRes.totalCaptado ?? 0),
          percentualAtingimento: '—',
          novasEmendas7Dias: emendasApi.filter(e => isEmendaRecente(e.dataProcessamento)).length,
          emendas: emendasApi,
          convenios: conveniosApi,
        });
      }

      // ── FUNDEB ──
      if (fundebRes) {
        setFundeb({
          exercicio: Number(fundebRes.exercicio ?? ano),
          repassesRecebidosTotal: Number(fundebRes.total ?? 0),
          repassesMensais: [],
          gastoProfissionaisEducacao: 0,
          percentualMagisterio: 0,
          gastoManutencaoDesenvolvimento: Number(fundebRes.total ?? 0),
          percentualManutencao: 0,
          statusSIOPE: 'Pendente',
          statusMSC: 'Pendente',
          riscoPerdaVAAT: false,
          parecerTCEPR: 'Em Acompanhamento',
        });
      }

      // ── Obras ──
      if (obrasRes) {
        const obrasApi: ObraAraucaria[] = (obrasRes.obras ?? []).map((o: any, idx: number) => ({
          id: `obra-${idx}`,
          codigo: o.fonte === 'NOVO_PAC' ? `PAC-${idx + 1}` : `PNCP-${idx + 1}`,
          titulo: o.nome ?? 'Obra registrada',
          secretaria: 'SMOP',
          secretariaNome: 'Obras',
          status: 'EM_EXECUCAO',
          valorPrevisto: Number(o.valor ?? 0),
          valorLiquidado: 0,
          progressoFisico: 0,
          progressoFinanceiro: 0,
          bairro: '',
          regiao: 'Urbana Central',
          coordenadasSvg: { x: 400, y: 300 },
          coordenadasGeo: { lat: -25.5163, lng: -49.4222 },
          fonteRecurso: o.fonte === 'NOVO_PAC' ? 'Novo PAC / União' : 'Convênio Federal / Transferegov',
          empresaContratada: o.empresa ?? '',
          numeroContrato: '',
          dataInicio: o.dataInicio ?? '',
          dataPrevisaoFim: o.dataFim ?? '',
          prazoDias: 0,
          diasDecorridos: 0,
          descricao: o.nome ?? '',
          destaque: false,
          impactoSocial: '',
        }));

        const totalInvestimento = obrasApi.reduce((acc, o) => acc + o.valorPrevisto, 0);
        const summaryObras: ObrasSummary = {
          totalObras: obrasApi.length,
          totalInvestimento,
          totalLiquidado: 0,
          totalEmExecucao: obrasApi.length,
          progressoMedioFisico: 0,
          progressoMedioFinanceiro: 0,
          obrasPorSecretaria: {},
          obrasPorStatus: { EM_EXECUCAO: obrasApi.length },
        };
        setObrasData({ obras: obrasApi, summary: summaryObras });
      }

      // ── Status SICONFI ──
      if (siconfiRes) {
        setSiconfiStatus({
          online: !!siconfiRes.online,
          endpoint: siconfiRes.endpoint ?? '/api/siconfi/status',
          lastChecked: siconfiRes.lastChecked ?? new Date().toISOString(),
          latencyMs: Number(siconfiRes.latencyMs ?? 0),
          enteNome: siconfiRes.enteNome ?? '',
          enteCodIbge: siconfiRes.enteCodIbge ?? codigoIbge,
          exercicioAtivo: Number(siconfiRes.exercicioAtivo ?? ano),
          totalConsultasHoje: Number(siconfiRes.totalConsultasHoje ?? 0),
          cacheAtivo: !!siconfiRes.cacheAtivo,
        });
      }

      // ── Comparativo anual (dados reais dos dois exercícios) ──
      if (isComparativoAnual && real) {
        try {
          const prevSummary = await api.get<any>(
            `/api/fiscal/summary?tenantId=${encodeURIComponent(tenantId)}&codigoIbge=${encodeURIComponent(codigoIbge)}&ano=${ano - 1}`
          );
          if (prevSummary?.temDadosReais) {
            const comp = buildComparativeAnalysis(
              ano,
              kpis,
              { ...kpis, receitaTotalRealizada: Number(prevSummary.receitas ?? 0), rcl: Number(prevSummary.receitas ?? 0), superavitOrcamentario: Number(prevSummary.saldo ?? 0) },
              receitasApi,
              receitasApi,
              naturezas,
              naturezas,
              funcoes,
              funcoes
            );
            setComparativeData(comp);
          }
        } catch {
          // Sem dados do exercício anterior — comparativo indisponível
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Falha ao carregar indicadores fiscais.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, codigoIbge, ano, isComparativoAnual]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    loading,
    error,
    temDadosReais,
    summary,
    receitas,
    porNatureza,
    porFuncao,
    limites,
    captacao,
    fundeb,
    alerts,
    obrasData,
    siconfiStatus,
    comparativeData,
    refetch: loadData,
  };
}
