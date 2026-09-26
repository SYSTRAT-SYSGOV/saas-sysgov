import React, { useState } from 'react';
import {
  Modal,
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
} from '@sysgov/ui';
import { ConfirmDialog } from '@/components/ui';
import {
  Building2,
  Layers,
  User,
  UserX,
  FileText,
  QrCode,
  MapPin,
  History,
  DollarSign,
  Receipt,
  Download,
  AlertCircle,
  CheckCircle2,
  Users,
  Clock,
  ExternalLink,
  Edit,
  Phone,
  Mail,
  Home,
  Stethoscope,
  BookOpen,
  Search,
  Loader2,
  Compass,
} from 'lucide-react';
import {
  cemiteriosApi,
  formatarData,
  consultarCep,
  type Jazigo,
  type Concessao,
  type Concessionario,
  type Inumacao,
  type Guia,
} from '../api';
import { ErroBox, EstadoChip, Mono, useAcao, useDados } from './comum';
import { useCan } from '@/core/rbac/useCan';
import { useCemiteriosNavigation } from '../CemiteriosContext';
import { PainelRegulatorioDrawer } from './PainelRegulatorioDrawer';
import { SecaoVistoriasJazigo } from './SecaoVistoriasJazigo';
import { ModalNovaVistoriaJazigo } from './ModalNovaVistoriaJazigo';
import { ModalQrCodeJazigo } from './ModalQrCodeJazigo';
import { ModalFichaCadastral } from './ModalFichaCadastral';


export function formatarCpfCnpj(doc: string | null | undefined): string {
  if (!doc) return '—';
  const limpo = doc.replace(/\D/g, '');
  if (limpo.length === 11) {
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (limpo.length === 14) {
    return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc;
}

export function parseEnderecoTexto(end: string | null | undefined) {
  if (!end) return { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };

  let cep = '';
  const cepMatch = end.match(/(?:CEP[:\s]*)?(\d{5}-?\d{3})/i);
  if (cepMatch) {
    cep = cepMatch[1];
  }

  const semCep = end.replace(/(?:,?\s*CEP[:\s]*)?\d{5}-?\d{3}/i, '').trim();
  const partes = semCep.split(',').map((p) => p.trim()).filter(Boolean);

  if (partes.length >= 2) {
    const logradouro = partes[0] || '';
    const numCompl = partes[1] || '';
    const numMatch = numCompl.match(/^n[ºo]?\s*(\d+|s\/n)/i) || numCompl.match(/^(\d+|s\/n)/i);
    const numero = numMatch ? numMatch[1] : numCompl;
    const complemento = numMatch ? numCompl.replace(numMatch[0], '').replace(/^[\s\-()]+/, '').replace(/[\s\-()]+$/, '') : '';
    const bairro = partes[2] || '';
    const cidUf = partes[3] || '';
    const [cidade, uf] = cidUf.split('/').map((s) => s.trim());
    return {
      cep,
      logradouro,
      numero: numero || '',
      complemento: complemento || '',
      bairro: bairro || '',
      cidade: cidade || '',
      uf: uf || '',
    };
  }

  return {
    cep,
    logradouro: semCep || end,
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  };
}

export interface ModalDetalheJazigoProps {
  jazigo: Pick<Jazigo, 'id'> | null;
  onFechar: () => void;
  onAlterado?: () => void;
}

export type SubAbaDetalhe = 'geral' | 'concessao' | 'ocupantes' | 'financeiro' | 'vistorias';

export const ModalDetalheJazigo: React.FC<ModalDetalheJazigoProps> = ({
  jazigo,
  onFechar,
  onAlterado,
}) => {
  const { can } = useCan();
  const pode = can('cemiterios.inventario.manage') || can('cemiterios.gis.edit');
  const podeFinanceiro = can('cemiterios.financeiro.manage');
  const { navegarParaMapa } = useCemiteriosNavigation();
  const id = jazigo?.id ?? null;

  const [subAba, setSubAba] = useState<SubAbaDetalhe>('geral');
  const [confirmar, setConfirmar] = useState(false);
  const [abrirQr, setAbrirQr] = useState(false);
  const [abrirFicha, setAbrirFicha] = useState(false);
  const [abrirNovaVistoria, setAbrirNovaVistoria] = useState(false);

  const { erro, executar } = useAcao();

  const detalhe = useDados(() => (id ? cemiteriosApi.jazigo(id) : Promise.resolve(null)), [id]);
  const historico = useDados(() => (id ? cemiteriosApi.historico(id) : Promise.resolve([])), [id]);
  const inumacoes = useDados(() => (id ? cemiteriosApi.inumacoes({ plot_id: id }) : Promise.resolve(null)), [id]);
  const concessoes = useDados(() => (id ? cemiteriosApi.concessoes({ plot_id: id }) : Promise.resolve(null)), [id]);
  const vistorias = useDados(() => (id ? cemiteriosApi.vistorias(id) : Promise.resolve(null)), [id]);
  const guiasQuery = useDados(() => (id ? cemiteriosApi.guias({ plot_id: id, per_page: 50 }) : Promise.resolve(null)), [id]);

  const j = detalhe.dados;
  const emManutencao = j?.estado === 'manutencao';
  const listaOcupantes: Inumacao[] = inumacoes.dados?.data ?? [];
  const concessaoAtiva: Concessao | undefined = concessoes.dados?.data?.[0];
  const listaGuias: Guia[] = guiasQuery.dados?.data ?? [];

  // Cálculos financeiros consolidados da sepultura
  const totalGuias = listaGuias.length;
  const guiasPagas = listaGuias.filter((g) => g.situacao === 'paga');
  const guiasVencidas = listaGuias.filter((g) => g.vencida || (g.situacao === 'emitida' && new Date(g.vencimento) < new Date()));
  const totalPagoCentavos = guiasPagas.reduce((acc, g) => acc + (g.valor_pago_centavos ?? g.valor_centavos), 0);
  const totalPendenteCentavos = listaGuias
    .filter((g) => g.situacao === 'emitida')
    .reduce((acc, g) => acc + g.valor_centavos, 0);

  // Inteligência cemiterial de ocupação, gavetas e rotatividade sanitária
  const capacidadeTotal = Math.max(1, j?.capacidade ?? 1);
  const ocupacaoAtual = j?.ocupacao ?? 0;
  const gavetasLivres = Math.max(0, capacidadeTotal - ocupacaoAtual);
  const percentualOcupacao = Math.min(100, Math.round((ocupacaoAtual / capacidadeTotal) * 100));

  // Prazo sanitário legal de decomposição natural: 3 anos (36 meses) segundo CONAMA e normas municipais
  const agoraTimestamp = Date.now();
  const tresAnosMs = 3 * 365.25 * 24 * 60 * 60 * 1000;

  // Análise nicho a nicho das gavetas físicas da sepultura
  const gavetasDetalhadas = Array.from({ length: capacidadeTotal }, (_, idx) => {
    const numGaveta = idx + 1;
    const ocupante =
      listaOcupantes.find((o) => o.gaveta_numero === numGaveta) ||
      (idx < ocupacaoAtual ? listaOcupantes[idx] : undefined);

    let aptoExumacao = false;
    let dataLiberacaoStr = '';
    let mesesRestantes = 0;

    if (ocupante?.sepultado_em) {
      const dataSep = new Date(ocupante.sepultado_em);
      const diffMs = agoraTimestamp - dataSep.getTime();
      aptoExumacao = diffMs >= tresAnosMs;
      const dataLib = new Date(dataSep.getTime() + tresAnosMs);
      dataLiberacaoStr = dataLib.toLocaleDateString('pt-BR');
      if (!aptoExumacao) {
        mesesRestantes = Math.max(1, Math.ceil((tresAnosMs - diffMs) / (30.44 * 24 * 60 * 60 * 1000)));
      }
    }

    return {
      numero: numGaveta,
      ocupada: Boolean(ocupante) || idx < ocupacaoAtual,
      ocupante,
      aptoExumacao,
      dataLiberacaoStr,
      mesesRestantes,
    };
  });

  const gavetasAptasExumacao = gavetasDetalhadas.filter((g) => g.ocupada && g.aptoExumacao);

  const transicionar = async (motivo: string) => {
    setConfirmar(false);
    if (!j) return;
    const ok = await executar(() =>
      cemiteriosApi.alterarEstado(j.id, emManutencao ? 'restaurar' : 'manutencao', motivo, j.lock_version)
    );
    if (ok) {
      await Promise.all([detalhe.recarregar(), historico.recarregar()]);
      onAlterado?.();
    }
  };

  const handleBaixarPdfGuia = async (guia: Guia) => {
    try {
      await cemiteriosApi.pdfGuia(guia);
    } catch (e) {
      console.error('Erro ao baixar PDF da guia:', e);
    }
  };

  const handleSegundaVia = async (guia: Guia) => {
    try {
      await cemiteriosApi.segundaVia(guia.id);
      await guiasQuery.recarregar();
    } catch (e) {
      console.error('Erro ao emitir 2ª via da guia:', e);
    }
  };

  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Estados para edição do Túmulo (Jazigo)
  const [editandoJazigo, setEditandoJazigo] = useState(false);
  const [erroJazigo, setErroJazigo] = useState<string | null>(null);
  const [formJazigo, setFormJazigo] = useState({
    codigo: '',
    codigo_legado: '',
    tipo: 'jazigo',
    capacidade: 1,
    processo_administrativo: '',
    comprimento_m: '',
    largura_m: '',
    lat: '',
    lng: '',
  });

  const abrirEdicaoJazigo = () => {
    if (!j) return;
    setErroJazigo(null);
    setFormJazigo({
      codigo: j.codigo ?? '',
      codigo_legado: j.codigo_legado ?? '',
      tipo: j.tipo ?? 'jazigo',
      // Garante que túmulos legados com ocupação registrada iniciem com capacidade mínima correspondente
      capacidade: Math.max(j.capacidade ?? 1, j.ocupacao ?? 1),
      processo_administrativo: j.processo_administrativo ?? '',
      comprimento_m: j.comprimento_m != null ? String(j.comprimento_m) : '',
      largura_m: j.largura_m != null ? String(j.largura_m) : '',
      lat: j.lat != null ? String(j.lat) : '',
      lng: j.lng != null ? String(j.lng) : '',
    });
    setEditandoJazigo(true);
  };

  const salvarJazigo = async () => {
    if (!j) return;
    setSalvandoEdicao(true);
    setErroJazigo(null);
    try {
      await cemiteriosApi.atualizarJazigo(j.id, {
        codigo: formJazigo.codigo.trim(),
        codigo_legado: formJazigo.codigo_legado?.trim() || null,
        tipo: formJazigo.tipo as any,
        capacidade: Number(formJazigo.capacidade),
        processo_administrativo: formJazigo.processo_administrativo?.trim() || null,
        comprimento_m: formJazigo.comprimento_m ? Number(formJazigo.comprimento_m) : null,
        largura_m: formJazigo.largura_m ? Number(formJazigo.largura_m) : null,
        lat: formJazigo.lat ? Number(formJazigo.lat) : null,
        lng: formJazigo.lng ? Number(formJazigo.lng) : null,
      });
      // Fecha a modal imediatamente para garantir excelente experiência do usuário
      setEditandoJazigo(false);
      // Recarrega os dados completos do túmulo e histórico
      await Promise.all([detalhe.recarregar(), historico.recarregar()]);
      onAlterado?.();
    } catch (e: any) {
      console.error('Erro ao atualizar jazigo:', e);
      const msg =
        e?.response?.data?.errors
          ? Object.values(e.response.data.errors).flat().join(' ')
          : e?.response?.data?.message || e?.message || 'Falha ao salvar as alterações do túmulo.';
      setErroJazigo(msg);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // Estados para edição do Titular Concessionário com campos separados de endereço
  const [editandoTitular, setEditandoTitular] = useState(false);
  const [formTitular, setFormTitular] = useState<Partial<Concessionario>>({});
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [msgCep, setMsgCep] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [formEndereco, setFormEndereco] = useState({
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  const abrirEdicaoTitular = () => {
    if (!concessaoAtiva?.concessionario) return;
    const c = concessaoAtiva.concessionario;
    setMsgCep(null);

    const endStr = c.endereco ?? '';
    const parsed = parseEnderecoTexto(endStr);

    setFormEndereco({
      cep: c.cep || parsed.cep,
      logradouro: c.logradouro || parsed.logradouro,
      numero: c.numero || parsed.numero,
      complemento: c.complemento || parsed.complemento,
      bairro: c.bairro || parsed.bairro,
      cidade: c.cidade || parsed.cidade,
      uf: c.uf || parsed.uf,
    });

    setFormTitular({
      nome: c.nome ?? '',
      documento: c.documento ?? '',
      email: c.email ?? '',
      telefone: c.telefone ?? '',
      endereco: endStr,
      titular_falecido: c.titular_falecido ?? false,
      data_falecimento_titular: c.data_falecimento_titular ? String(c.data_falecimento_titular).split('T')[0] : '',
      processo_inventario: c.processo_inventario ?? '',
    });
    // Abertura imediata sem bloquear a interface
    setEditandoTitular(true);
  };

  const handleBuscarCep = async (cepInformado?: string) => {
    const raw = (cepInformado ?? formEndereco.cep).replace(/\D/g, '');
    if (raw.length !== 8) {
      setMsgCep({ tipo: 'erro', texto: 'Informe um CEP com 8 dígitos para consultar.' });
      return;
    }
    setBuscandoCep(true);
    setMsgCep(null);
    try {
      const res = await consultarCep(raw);
      if (!res) {
        setMsgCep({ tipo: 'erro', texto: 'CEP não encontrado na base de endereços.' });
        return;
      }
      setFormEndereco((p) => ({
        ...p,
        cep: res.cep || raw.replace(/(\d{5})(\d{3})/, '$1-$2'),
        logradouro: res.logradouro || p.logradouro,
        bairro: res.bairro || p.bairro,
        cidade: res.localidade || p.cidade,
        uf: res.uf || p.uf,
        complemento: res.complemento || p.complemento,
      }));
      setMsgCep({ tipo: 'sucesso', texto: `Endereço localizado: ${res.localidade}/${res.uf}` });
    } catch {
      setMsgCep({ tipo: 'erro', texto: 'Falha ao consultar CEP.' });
    } finally {
      setBuscandoCep(false);
    }
  };

  const salvarTitular = async () => {
    if (!concessaoAtiva?.concessionario?.id) return;
    setSalvandoEdicao(true);
    try {
      const partesEndereco: string[] = [];
      if (formEndereco.logradouro.trim()) partesEndereco.push(formEndereco.logradouro.trim());
      if (formEndereco.numero.trim()) {
        partesEndereco.push(`nº ${formEndereco.numero.trim()}${formEndereco.complemento.trim() ? ` (${formEndereco.complemento.trim()})` : ''}`);
      }
      if (formEndereco.bairro.trim()) partesEndereco.push(formEndereco.bairro.trim());
      if (formEndereco.cidade.trim() || formEndereco.uf.trim()) {
        partesEndereco.push([formEndereco.cidade.trim(), formEndereco.uf.trim()].filter(Boolean).join('/'));
      }
      if (formEndereco.cep.trim()) partesEndereco.push(`CEP: ${formEndereco.cep.trim()}`);
      const enderecoCompleto = partesEndereco.join(', ');

      await cemiteriosApi.atualizarConcessionario(concessaoAtiva.concessionario.id, {
        ...formTitular,
        documento: formTitular.documento ? formTitular.documento.replace(/\D/g, '') : undefined,
        endereco: enderecoCompleto || null,
        cep: formEndereco.cep || null,
        logradouro: formEndereco.logradouro || null,
        numero: formEndereco.numero || null,
        complemento: formEndereco.complemento || null,
        bairro: formEndereco.bairro || null,
        cidade: formEndereco.cidade || null,
        uf: formEndereco.uf || null,
      });
      setEditandoTitular(false);
      await Promise.all([concessoes.recarregar(), detalhe.recarregar(), historico.recarregar()]);
      onAlterado?.();
    } catch (e) {
      console.error('Erro ao atualizar titular:', e);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // Estados para edição do Sepultado / Inumação (com CPF e campos completos)
  const [inumacaoEditando, setInumacaoEditando] = useState<Inumacao | null>(null);
  const [formInumacao, setFormInumacao] = useState({
    nome: '',
    documento: '',
    nascimento: '',
    falecimento: '',
    certidao_numero: '',
    certidao_cartorio: '',
    gaveta_numero: '',
    sepultado_em: '',
    tipo: '',
    livro_referencia: '',
    coveiro_nome: '',
    pedreiro_nome: '',
    medico: '',
  });

  const abrirEdicaoInumacao = (oc: Inumacao) => {
    setInumacaoEditando(oc);
    setFormInumacao({
      nome: oc.falecido?.nome ?? '',
      documento: oc.falecido?.documento ?? '',
      nascimento: oc.falecido?.nascimento ? oc.falecido.nascimento.split('T')[0] : '',
      falecimento: oc.falecido?.falecimento ? oc.falecido.falecimento.split('T')[0] : '',
      certidao_numero: oc.falecido?.certidao_numero ?? '',
      certidao_cartorio: oc.falecido?.certidao_cartorio ?? oc.cartorio ?? '',
      gaveta_numero: oc.gaveta_numero != null ? String(oc.gaveta_numero) : '',
      sepultado_em: oc.sepultado_em ? oc.sepultado_em.split('T')[0] : '',
      tipo: oc.tipo ?? '',
      livro_referencia: oc.livro_referencia ?? '',
      coveiro_nome: oc.coveiro_nome ?? '',
      pedreiro_nome: oc.pedreiro_nome ?? '',
      medico: oc.medico ?? '',
    });
  };

  const salvarInumacao = async () => {
    if (!inumacaoEditando) return;
    setSalvandoEdicao(true);
    try {
      await cemiteriosApi.atualizarInumacao(inumacaoEditando.id, {
        gaveta_numero: formInumacao.gaveta_numero ? Number(formInumacao.gaveta_numero) : null,
        sepultado_em: formInumacao.sepultado_em,
        tipo: formInumacao.tipo || null,
        livro_referencia: formInumacao.livro_referencia || null,
        coveiro_nome: formInumacao.coveiro_nome || null,
        pedreiro_nome: formInumacao.pedreiro_nome || null,
        cartorio: formInumacao.certidao_cartorio || null,
        medico: formInumacao.medico || null,
        falecido: {
          nome: formInumacao.nome,
          documento: formInumacao.documento ? formInumacao.documento.replace(/\D/g, '') : null,
          nascimento: formInumacao.nascimento || null,
          falecimento: formInumacao.falecimento,
          certidao_numero: formInumacao.certidao_numero || null,
          certidao_cartorio: formInumacao.certidao_cartorio || null,
        },
      });
      setInumacaoEditando(null);
      await Promise.all([inumacoes.recarregar(), detalhe.recarregar(), historico.recarregar()]);
      onAlterado?.();
    } catch (e) {
      console.error('Erro ao atualizar inumação:', e);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  if (!id) return null;

  return (
    <>
      <Modal
        open={id !== null}
        onClose={onFechar}
        title={j ? `Informações do Túmulo — ${j.codigo}` : 'Detalhes do Túmulo'}
        description={
          j
            ? `Cemitério: ${j.cemiterio?.nome ?? 'Municipal'} · Setor ${j.setor?.codigo ?? ''} · ${j.tipo.toUpperCase()} · Capacidade: ${j.ocupacao} de ${j.capacidade} ocupados`
            : 'Carregando informações da sepultura...'
        }
        size="full"
        className="sm:max-w-[96vw] lg:max-w-[96vw] max-w-[96vw] w-[96vw] max-h-[96vh] h-[96vh] overflow-y-auto"
      >
        <div className="space-y-4 py-1">
          <ErroBox erro={erro} />

          {/* Barra de Ações Rápidas do Cabeçalho */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              {j && <EstadoChip estado={j.estado} />}
              {guiasVencidas.length > 0 ? (
                <Badge variant="destructive" className="font-mono text-[11px] gap-1">
                  <AlertCircle className="h-3 w-3" /> Inadimplente ({guiasVencidas.length} débito(s))
                </Badge>
              ) : totalGuias > 0 ? (
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 font-mono text-[11px] gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Adimplente
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[11px]">
                  Sem Débitos Cadastrados
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {pode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={abrirEdicaoJazigo}
                  className="h-8 text-xs gap-1.5 font-medium border-border"
                  title="Editar dados físicos e cadastrais deste túmulo"
                >
                  <Edit className="h-3.5 w-3.5 text-primary" /> Editar Túmulo
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAbrirFicha(true)}
                className="h-8 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10"
              >
                <FileText className="h-3.5 w-3.5" /> Ficha Cadastral
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAbrirQr(true)}
                className="h-8 text-xs gap-1.5 font-medium"
              >
                <QrCode className="h-3.5 w-3.5 text-primary" /> Plaqueta QR Code
              </Button>
              {j?.lat && j?.lng && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onFechar();
                    navegarParaMapa({
                      jazigoId: j.id,
                      codigo: j.codigo,
                      lat: j.lat,
                      lng: j.lng,
                    });
                  }}
                  className="h-8 text-xs gap-1 text-primary hover:text-primary/80"
                  title="Visualizar este jazigo diretamente no mapa cartográfico GIS"
                >
                  <MapPin className="h-3.5 w-3.5" /> Ver no Mapa
                </Button>
              )}
            </div>
          </div>

          {/* Sub-Abas de Navegação */}
          <div className="flex border-b border-border space-x-1 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSubAba('geral')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-md transition-colors ${
                subAba === 'geral'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Visão Geral & Físico</span>
            </button>

            <button
              type="button"
              onClick={() => setSubAba('concessao')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-md transition-colors ${
                subAba === 'concessao'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Concessão & Titulares</span>
              {concessaoAtiva && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSubAba('ocupantes')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-md transition-colors ${
                subAba === 'ocupantes'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Sepultados ({listaOcupantes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubAba('financeiro')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-md transition-colors ${
                subAba === 'financeiro'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>Financeiro & Taxas</span>
              {guiasVencidas.length > 0 && (
                <span className="px-1 py-0 text-[10px] rounded-full bg-rose-500 text-white font-mono">
                  {guiasVencidas.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSubAba('vistorias')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-md transition-colors ${
                subAba === 'vistorias'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Vistorias & Histórico</span>
            </button>
          </div>

          {/* Conteúdo das Sub-Abas */}
          {j && (
            <div className="pt-2">
              {/* ── ABA 1: VISÃO GERAL & FÍSICO ── */}
              {subAba === 'geral' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                    {/* CARD 1: CAPACIDADE, OCUPAÇÃO & GAVETAS CEMITERIAIS */}
                    <Card className="p-4 bg-muted/20 border-border flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-1 border-b border-border/60 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Layers className="h-4 w-4 text-primary" />
                            <span>Capacidade & Ocupação</span>
                          </div>
                          {gavetasLivres > 0 ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 font-medium">
                              {gavetasLivres} gaveta(s) livre(s)
                            </Badge>
                          ) : gavetasAptasExumacao.length > 0 ? (
                            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 font-medium">
                              {gavetasAptasExumacao.length} apta(s) a exumação
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] font-medium">
                              Lotação Máxima (Em Carência)
                            </Badge>
                          )}
                        </div>

                        {/* Indicadores Principais */}
                        <div className="mt-2.5 flex items-baseline justify-between">
                          <div>
                            <div className="flex items-baseline gap-1">
                              <Mono className="text-2xl font-bold text-foreground">
                                {ocupacaoAtual}
                              </Mono>
                              <span className="text-xs text-muted-foreground font-mono">
                                / {capacidadeTotal} gavetas
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground block mt-0.5">
                              {gavetasLivres > 0
                                ? `${gavetasLivres} vaga(s) disponível(is) para novo sepultamento`
                                : gavetasAptasExumacao.length > 0
                                  ? 'Lotado — gaveta liberável mediante exumação legal'
                                  : 'Lotado — sepultamentos recentes em carência sanitária'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold font-mono text-foreground">
                              {percentualOcupacao}%
                            </span>
                            <span className="text-[10px] text-muted-foreground block">ocupação</span>
                          </div>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              ocupacaoAtual >= capacidadeTotal
                                ? gavetasAptasExumacao.length > 0
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                                : ocupacaoAtual > 0
                                  ? 'bg-primary'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percentualOcupacao}%` }}
                          />
                        </div>

                        {/* Gaveteiro Visual (Nicho a Nicho) */}
                        <div className="mt-3 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Gaveteiro da Sepultura
                          </span>
                          <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-0.5">
                            {gavetasDetalhadas.map((gav) => (
                              <div
                                key={gav.numero}
                                className={`p-2 rounded border text-xs flex items-center justify-between gap-2 transition-colors ${
                                  gav.ocupada
                                    ? gav.aptoExumacao
                                      ? 'border-amber-500/30 bg-amber-500/5'
                                      : 'border-border bg-card/60'
                                    : 'border-dashed border-emerald-500/40 bg-emerald-500/5'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono font-bold text-[11px] shrink-0 px-1.5 py-0.5 rounded bg-muted/70 text-foreground">
                                    G#{gav.numero}
                                  </span>
                                  <div className="truncate">
                                    {gav.ocupada ? (
                                      <>
                                        <span className="font-medium text-foreground block truncate">
                                          {gav.ocupante?.falecido?.nome || 'Corpo Inumado'}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground block font-mono">
                                          {gav.ocupante?.sepultado_em
                                            ? `Sepultado em ${formatarData(gav.ocupante.sepultado_em)}`
                                            : 'Sepultamento antigo'}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-emerald-500 font-medium">
                                        Gaveta Livre (Pronta p/ Sepultamento)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  {gav.ocupada ? (
                                    gav.aptoExumacao ? (
                                      <span
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                        title="Sepultado há mais de 3 anos. Restos mortais aptos a exumação para ossuário, liberando a gaveta."
                                      >
                                        Apto a Exumação
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                                        title={`Prazo legal de decomposição natural até ${gav.dataLiberacaoStr}`}
                                      >
                                        Carência: ~{gav.mesesRestantes}m
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[10px] text-emerald-500 font-mono font-bold">Livre</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>Carência sanitária: 3 anos (36m)</span>
                        {pode && (
                          <button
                            type="button"
                            onClick={abrirEdicaoJazigo}
                            className="text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="h-3 w-3" /> Alterar gavetas
                          </button>
                        )}
                      </div>
                    </Card>

                    {/* CARD 2: DIMENSÕES FÍSICAS & ÁREA DE OCUPAÇÃO */}
                    <Card className="p-4 bg-muted/20 border-border flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-1 border-b border-border/60 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Compass className="h-4 w-4 text-primary" />
                            <span>Dimensões & Área de Solo</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize font-medium">
                            {j.tipo ?? 'Jazigo'}
                          </Badge>
                        </div>

                        <div className="mt-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between py-1 border-b border-border/40">
                            <span className="text-muted-foreground">Comprimento × Largura:</span>
                            <Mono className="font-bold text-foreground">
                              {j.comprimento_m ? `${j.comprimento_m} m` : '—'} × {j.largura_m ? `${j.largura_m} m` : '—'}
                            </Mono>
                          </div>

                          <div className="flex items-center justify-between py-1 border-b border-border/40">
                            <span className="text-muted-foreground">Área Total Projetada:</span>
                            <Mono className="font-bold text-foreground text-sm">
                              {j.comprimento_m && j.largura_m
                                ? `${(j.comprimento_m * j.largura_m).toFixed(2)} m²`
                                : '—'}
                            </Mono>
                          </div>

                          <div className="flex items-center justify-between py-1 border-b border-border/40">
                            <span className="text-muted-foreground">Perímetro no Terreno:</span>
                            <Mono className="font-medium text-foreground">
                              {j.comprimento_m && j.largura_m
                                ? `${(2 * (j.comprimento_m + j.largura_m)).toFixed(2)} m`
                                : '—'}
                            </Mono>
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-muted-foreground">Processo Regularização:</span>
                            <span className="truncate max-w-[150px]" title={j.processo_administrativo || 'Sem processo'}>
                              <Mono className="font-medium text-foreground text-[11px]">
                                {j.processo_administrativo || 'Não informado'}
                              </Mono>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>Padrão cemiterial regulamentado</span>
                        {pode && (
                          <button
                            type="button"
                            onClick={abrirEdicaoJazigo}
                            className="text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="h-3 w-3" /> Editar medidas
                          </button>
                        )}
                      </div>
                    </Card>

                    {/* CARD 3: LOCALIZAÇÃO CARTOGRÁFICA & TOPOGRÁFICA */}
                    <Card className="p-4 bg-muted/20 border-border flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-1 border-b border-border/60 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span>Localização Cartográfica & GPS</span>
                          </div>
                          {j.lat && j.lng ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 font-medium">
                              Georreferenciado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 font-medium">
                              Sem Coordenadas GPS
                            </Badge>
                          )}
                        </div>

                        <div className="mt-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between py-1 border-b border-border/40">
                            <span className="text-muted-foreground">Cemitério:</span>
                            <span className="font-semibold text-foreground truncate max-w-[160px]" title={j.cemiterio?.nome ?? ''}>
                              {j.cemiterio?.nome ?? 'Cemitério Municipal'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between py-1 border-b border-border/40">
                            <span className="text-muted-foreground">Setor / Quadra:</span>
                            <span className="font-semibold text-foreground">
                              {j.setor?.descricao || j.setor?.codigo || 'Geral'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between py-1 border-b border-border/40">
                            <span className="text-muted-foreground">Código da Sepultura:</span>
                            <Mono className="font-bold text-foreground">{j.codigo}</Mono>
                          </div>

                          {j.codigo_legado && (
                            <div className="flex items-center justify-between py-1 border-b border-border/40">
                              <span className="text-muted-foreground">Código Livro / Ficha:</span>
                              <Mono className="font-medium text-foreground">{j.codigo_legado}</Mono>
                            </div>
                          )}

                          <div className="py-1">
                            <span className="text-muted-foreground block text-[11px] mb-1">Coordenadas Geográficas:</span>
                            {j.lat && j.lng ? (
                              <div className="flex items-center justify-between gap-2 p-2 rounded bg-card/60 border border-border">
                                <Mono className="text-xs font-semibold text-foreground">
                                  {j.lat.toFixed(6)}, {j.lng.toFixed(6)}
                                </Mono>
                                <a
                                  href={`https://www.google.com/maps?q=${j.lat},${j.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 text-[11px] font-medium"
                                  title="Abrir coordenadas no Google Maps"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>Ver Mapa</span>
                                </a>
                              </div>
                            ) : (
                              <div className="p-2 rounded border border-dashed border-amber-500/30 bg-amber-500/5 text-amber-500 text-[11px] flex items-center justify-between gap-1">
                                <span>Coordenadas GPS não cadastradas.</span>
                                {pode && (
                                  <button
                                    type="button"
                                    onClick={abrirEdicaoJazigo}
                                    className="underline font-semibold shrink-0 cursor-pointer"
                                  >
                                    Cadastrar
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>Topografia e SIG Cemiterial</span>
                        {pode && (
                          <button
                            type="button"
                            onClick={abrirEdicaoJazigo}
                            className="text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="h-3 w-3" /> Editar localização
                          </button>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Painel Regulatório e Sanitário */}
                  <PainelRegulatorioDrawer
                    jazigo={j}
                    concessao={concessaoAtiva}
                    inumacoes={listaOcupantes}
                    vistorias={vistorias.dados?.data ?? []}
                  />

                  {/* Ações de Estado Operacional */}
                  {pode && (
                    <div className="p-3.5 rounded-lg border border-border bg-muted/10 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold block text-foreground">Controle Operacional da Sepultura</span>
                        <span className="text-[11px] text-muted-foreground">
                          {emManutencao
                            ? 'Este túmulo está interditado para novos sepultamentos por motivo de manutenção ou ruína.'
                            : 'Interditar este jazigo caso apresente instabilidade estrutural, infiltração ou degradação.'}
                        </span>
                      </div>
                      <Button
                        variant={emManutencao ? 'outline' : 'destructive'}
                        size="sm"
                        onClick={() => setConfirmar(true)}
                        className="h-8 text-xs font-medium"
                      >
                        {emManutencao ? 'Restaurar / Liberar Jazigo' : 'Interditar por Ruína / Manutenção'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ── ABA 2: CONCESSÃO & TITULARES ── */}
              {subAba === 'concessao' && (
                <div className="space-y-4">
                  {concessaoAtiva ? (
                    <div className="space-y-4">
                      <Card className="p-4 border-border space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-2.5">
                          <div className="flex items-center gap-2">
                            <div>
                              <span className="text-[11px] text-muted-foreground block uppercase font-medium">Termo de Concessão</span>
                              <Mono className="text-base font-bold text-foreground">{concessaoAtiva.numero}</Mono>
                            </div>
                            <Badge variant="outline" className="capitalize text-xs ml-2">
                              Modalidade: {concessaoAtiva.modalidade}
                            </Badge>
                          </div>
                          {pode && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={abrirEdicaoTitular}
                              className="h-8 text-xs gap-1.5 font-medium"
                            >
                              <Edit className="h-3.5 w-3.5" /> Editar Titular
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Titular da Concessão:</span>
                            <span className="font-semibold text-foreground block text-sm">
                              {concessaoAtiva.concessionario?.nome ?? 'Não informado'}
                            </span>
                            <Mono className="text-xs font-semibold text-foreground block mt-0.5">
                              CPF/CNPJ: {concessaoAtiva.concessionario?.documento
                                ? formatarCpfCnpj(concessaoAtiva.concessionario.documento)
                                : (concessaoAtiva.concessionario?.documento_mascarado || '—')}
                            </Mono>
                          </div>

                          <div>
                            <span className="text-muted-foreground block text-[11px]">Vigência do Título:</span>
                            <Mono className="font-semibold text-foreground block">
                              {formatarData(concessaoAtiva.inicio)} até{' '}
                              {concessaoAtiva.termino ? formatarData(concessaoAtiva.termino) : 'Perpétua'}
                            </Mono>
                            <span className="text-[11px] text-muted-foreground block mt-0.5">
                              {concessaoAtiva.termino
                                ? `${Math.ceil((new Date(concessaoAtiva.termino).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias restantes`
                                : 'Concessão perpétua por outorga'}
                            </span>
                          </div>

                          <div>
                            <span className="text-muted-foreground block text-[11px]">Processo Administrativo:</span>
                            <Mono className="font-semibold text-foreground block">
                              {concessaoAtiva.processo_administrativo ?? j.processo_administrativo ?? '—'}
                            </Mono>
                          </div>

                          <div>
                            <span className="text-muted-foreground block text-[11px]">Telefone de Contato:</span>
                            <Mono className="text-foreground block">
                              {concessaoAtiva.concessionario?.telefone || 'Não informado'}
                            </Mono>
                          </div>

                          <div>
                            <span className="text-muted-foreground block text-[11px]">E-mail:</span>
                            <span className="text-foreground block truncate" title={concessaoAtiva.concessionario?.email || ''}>
                              {concessaoAtiva.concessionario?.email || 'Não informado'}
                            </span>
                          </div>

                          <div>
                            <span className="text-muted-foreground block text-[11px]">Situação Vital do Titular:</span>
                            {concessaoAtiva.concessionario?.titular_falecido ? (
                              <Badge variant="destructive" className="text-[10px] mt-0.5">
                                Titular Falecido
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px] mt-0.5">
                                Vivo / Regular
                              </Badge>
                            )}
                          </div>

                          <div className="sm:col-span-2 md:col-span-3 pt-1 border-t border-border/50">
                            <span className="text-muted-foreground block text-[11px]">Endereço Completo do Titular:</span>
                            <span className="text-foreground block font-medium">
                              {concessaoAtiva.concessionario?.endereco || 'Endereço não cadastrado'}
                            </span>
                          </div>
                        </div>

                        {concessaoAtiva.concessionario?.titular_falecido ? (
                          <div className="p-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-3">
                            <UserX className="h-5 w-5 text-rose-400 shrink-0" />
                            <div>
                              <strong className="font-semibold block text-rose-400">
                                Titular Falecido — Abertura de Sucessão Obrigatória
                              </strong>
                              <span>
                                O titular originário desta concessão faleceu{' '}
                                {concessaoAtiva.concessionario.data_falecimento_titular
                                  ? `em ${formatarData(concessaoAtiva.concessionario.data_falecimento_titular)}`
                                  : ''}
                                . Sepultamentos de terceiros e transferências
                                estão condicionados à instauração do processo de sucessão hereditária ou autorização judicial
                                {concessaoAtiva.concessionario.processo_inventario
                                  ? ` (Proc. ${concessaoAtiva.concessionario.processo_inventario})`
                                  : ''}.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-xs flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>Titular em vida com outorga regular e titularidade plena.</span>
                          </div>
                        )}
                      </Card>
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed border-border rounded-lg space-y-2">
                      <User className="h-8 w-8 text-muted-foreground mx-auto" />
                      <h4 className="text-sm font-semibold text-foreground">Nenhuma Concessão Vinculada</h4>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Este túmulo encontra-se cadastrado como cova pública, unidade disponível ou pendente de outorga de concessão formal.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── ABA 3: SEPULTADOS & INUMAÇÕES ── */}
              {subAba === 'ocupantes' && (
                <div className="space-y-3">
                  {listaOcupantes.length > 0 ? (
                    <div className="space-y-3">
                      {listaOcupantes.map((oc) => (
                        <Card key={oc.id} className="p-4 border-border bg-card shadow-2xs space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {oc.gaveta_numero ? `G${oc.gaveta_numero}` : '#'}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-foreground">
                                  {oc.falecido?.nome ?? 'Restos Mortais'}
                                </h4>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  {oc.falecido?.nascimento && (
                                    <span>Nasc: <Mono>{formatarData(oc.falecido.nascimento)}</Mono></span>
                                  )}
                                  {oc.falecido?.falecimento && (
                                    <span>Óbito: <Mono>{formatarData(oc.falecido.falecimento)}</Mono></span>
                                  )}
                                  {oc.falecido?.idade_obito != null && (
                                    <span className="font-mono">({oc.falecido.idade_obito} anos)</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {oc.gaveta_numero ? (
                                <Badge variant="secondary" className="font-mono text-xs">
                                  Gaveta {oc.gaveta_numero}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Posição Geral</Badge>
                              )}
                              <Badge variant="outline" className="capitalize text-xs">
                                {oc.situacao}
                              </Badge>
                              {pode && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => abrirEdicaoInumacao(oc)}
                                  className="h-7 text-xs gap-1.5 font-medium ml-1"
                                >
                                  <Edit className="h-3 w-3" /> Editar Sepultado
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-[11px] text-muted-foreground block font-medium">Certidão de Óbito:</span>
                              <Mono className="font-semibold text-foreground text-xs block">
                                {oc.falecido?.certidao_numero ? `Nº ${oc.falecido.certidao_numero}` : '—'}
                              </Mono>
                              <span className="text-[11px] text-muted-foreground block truncate" title={oc.falecido?.certidao_cartorio || oc.cartorio || 'Cartório não informado'}>
                                Cartório: {oc.falecido?.certidao_cartorio || oc.cartorio || '—'}
                              </span>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[11px] text-muted-foreground block font-medium">Médico Atestante (Declaração de Óbito):</span>
                              <span className="font-semibold text-foreground text-xs block truncate" title={oc.medico || 'Não informado'}>
                                {oc.medico || 'Não informado'}
                              </span>
                              <span className="text-[11px] text-muted-foreground block">
                                Causa da Morte: Restrita (sigilo médico)
                              </span>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[11px] text-muted-foreground block font-medium">Data do Sepultamento:</span>
                              <Mono className="font-semibold text-foreground text-xs block">
                                {formatarData(oc.sepultado_em)}
                              </Mono>
                              <span className="text-[11px] text-muted-foreground block">
                                Tipo: {oc.tipo || 'Sepultamento'}
                              </span>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[11px] text-muted-foreground block font-medium">Registro Cemiterial & Equipe:</span>
                              <div title={oc.livro_referencia || 'Livro não registrado'}>
                                <Mono className="text-[11px] text-foreground block truncate">
                                  Livro: {oc.livro_referencia || '—'}
                                </Mono>
                              </div>
                              <span className="text-[11px] text-muted-foreground block truncate" title={[oc.coveiro_nome ? `Cov: ${oc.coveiro_nome}` : null, oc.pedreiro_nome ? `Ped: ${oc.pedreiro_nome}` : null].filter(Boolean).join(' · ')}>
                                {[oc.coveiro_nome ? `Cov: ${oc.coveiro_nome}` : null, oc.pedreiro_nome ? `Ped: ${oc.pedreiro_nome}` : null].filter(Boolean).join(' · ') || 'Equipe não informada'}
                              </span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed border-border rounded-lg space-y-2">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto" />
                      <h4 className="text-sm font-semibold text-foreground">Nenhum Resto Mortal Sepultado</h4>
                      <p className="text-xs text-muted-foreground">
                        Esta unidade de sepultamento encontra-se atualmente vazia e disponível para novos procedimentos.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── ABA 4: FINANCEIRO & ARRECADAÇÃO ── */}
              {subAba === 'financeiro' && (
                <div className="space-y-4">
                  {/* Resumo de Regularidade Fiscal da Sepultura */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Card className="p-3 bg-muted/20 border-border">
                      <span className="text-[11px] text-muted-foreground block">Total Lançado (DAM)</span>
                      <div className="mt-1">
                        <Mono className="text-base font-bold text-foreground">
                          R$ {((totalPagoCentavos + totalPendenteCentavos) / 100).toFixed(2)}
                        </Mono>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                          {totalGuias} guia(s) de recolhimento
                        </span>
                      </div>
                    </Card>

                    <Card className="p-3 bg-muted/20 border-border">
                      <span className="text-[11px] text-muted-foreground block">Total Pago / Arrecadado</span>
                      <div className="mt-1">
                        <Mono className="text-base font-bold text-emerald-500">
                          R$ {(totalPagoCentavos / 100).toFixed(2)}
                        </Mono>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                          {guiasPagas.length} guia(s) quitadas
                        </span>
                      </div>
                    </Card>

                    <Card className="p-3 bg-muted/20 border-border">
                      <span className="text-[11px] text-muted-foreground block">Total Pendente / Vencido</span>
                      <div className="mt-1">
                        <Mono className={`text-base font-bold ${totalPendenteCentavos > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                          R$ {(totalPendenteCentavos / 100).toFixed(2)}
                        </Mono>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                          {guiasVencidas.length > 0 ? `${guiasVencidas.length} guia(s) vencida(s)` : 'Sem guias em aberto'}
                        </span>
                      </div>
                    </Card>
                  </div>

                  {/* Listagem de Guias do Jazigo */}
                  {listaGuias.length > 0 ? (
                    <div className="rounded-md border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                          <tr>
                            <th className="py-2.5 px-3 text-left font-semibold">Número da Guia</th>
                            <th className="py-2.5 px-3 text-left font-semibold">Serviço / Exercício</th>
                            <th className="py-2.5 px-3 text-left font-semibold">Vencimento</th>
                            <th className="py-2.5 px-3 text-right font-semibold">Valor (R$)</th>
                            <th className="py-2.5 px-3 text-center font-semibold">Situação</th>
                            <th className="py-2.5 px-3 text-right font-semibold">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {listaGuias.map((guia) => (
                            <tr key={guia.id} className="hover:bg-muted/10">
                              <td className="py-2.5 px-3 font-mono font-semibold text-foreground">
                                {guia.numero}
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground capitalize">
                                {guia.servico.replace(/_/g, ' ')}
                                {guia.exercicio && <span className="text-[11px] block font-mono">Exercício {guia.exercicio}</span>}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                                {formatarData(guia.vencimento)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                                R$ {(guia.valor_centavos / 100).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <Badge
                                  variant={
                                    guia.situacao === 'paga'
                                      ? 'outline'
                                      : guia.vencida
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                  className={`text-[10px] capitalize font-mono ${
                                    guia.situacao === 'paga' ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' : ''
                                  }`}
                                >
                                  {guia.vencida && guia.situacao === 'emitida' ? 'Vencida' : guia.situacao}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-right space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => void handleBaixarPdfGuia(guia)}
                                  className="h-7 px-2 text-xs gap-1"
                                  title="Baixar PDF da Guia / DAM"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>PDF</span>
                                </Button>
                                {podeFinanceiro && guia.situacao === 'emitida' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleSegundaVia(guia)}
                                    className="h-7 px-2 text-xs gap-1"
                                    title="Emitir Segunda Via Atualizada"
                                  >
                                    <Receipt className="h-3 w-3" />
                                    <span>2ª Via</span>
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed border-border rounded-lg space-y-2">
                      <Receipt className="h-8 w-8 text-muted-foreground mx-auto" />
                      <h4 className="text-sm font-semibold text-foreground">Nenhuma Guia Financeira Registrada</h4>
                      <p className="text-xs text-muted-foreground">
                        Não constam taxas de manutenção anual ou taxas de serviços vinculadas a este jazigo ou sua concessão.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── ABA 5: VISTORIAS & HISTÓRICO ── */}
              {subAba === 'vistorias' && (
                <div className="space-y-4">
                  {/* Linha do Tempo de Auditoria */}
                  <Card className="gap-0 py-0 overflow-hidden shadow-2xs">
                    <CardHeader className="p-3 border-b border-border bg-muted/30">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-primary" /> Trilha de Auditoria e Eventos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 text-xs">
                      <ol className="space-y-3 border-l-2 border-border/80 pl-3.5 ml-1">
                        {(historico.dados ?? []).map((e: { data: string; tipo: string; descricao: string }, i: number) => (
                          <li key={i} className="text-xs relative">
                            <div className="absolute -left-[19px] top-1 h-2 w-2 rounded-full bg-primary" />
                            <Mono className="block text-[10px] text-muted-foreground">{formatarData(e.data)}</Mono>
                            <span className="font-semibold text-foreground capitalize mr-1">{e.tipo}:</span>
                            <span className="text-muted-foreground">{e.descricao}</span>
                          </li>
                        ))}
                        {!historico.carregando && historico.dados?.length === 0 && (
                          <li className="text-xs text-muted-foreground italic">
                            Sem registros na linha do tempo.
                          </li>
                        )}
                      </ol>
                    </CardContent>
                  </Card>

                  {/* Vistorias Técnicas de Conservação */}
                  <SecaoVistoriasJazigo
                    vistorias={vistorias.dados?.data ?? []}
                    onNovaVistoria={() => setAbrirNovaVistoria(true)}
                    podeEditar={pode}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal de Confirmação para Interdição ou Liberação */}
      <ConfirmDialog
        open={confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={(motivo: string) => void transicionar(motivo)}
        requireReason
        title={emManutencao ? 'Restaurar Jazigo' : 'Interditar por Ruína / Manutenção'}
        description="Informe formalmente a justificativa técnica. O registro será gravado com fé pública na trilha de auditoria e no histórico do jazigo."
        confirmLabel="Confirmar Transição"
        destructive={!emManutencao}
        reasonPlaceholder="Descreva o motivo da alteração de estado..."
      />

      {/* Modais Vinculados de Identificação e Vistoria */}
      <ModalQrCodeJazigo
        aberto={abrirQr}
        jazigo={j ?? null}
        ocupantes={listaOcupantes}
        onFechar={() => setAbrirQr(false)}
      />

      <ModalFichaCadastral
        aberto={abrirFicha}
        jazigo={j ?? null}
        concessao={concessaoAtiva}
        ocupantes={listaOcupantes}
        onFechar={() => setAbrirFicha(false)}
      />

      {j && (
        <ModalNovaVistoriaJazigo
          aberto={abrirNovaVistoria}
          jazigo={j}
          onFechar={() => setAbrirNovaVistoria(false)}
          onSucesso={() => {
            setAbrirNovaVistoria(false);
            void vistorias.recarregar();
            void historico.recarregar();
            onAlterado?.();
          }}
        />
      )}

      {/* Modal de Edição das Informações do Túmulo */}
      <Modal
        open={editandoJazigo}
        onClose={() => setEditandoJazigo(false)}
        title={j ? `Editar Informações do Túmulo — ${j.codigo}` : 'Editar Informações do Túmulo'}
        description="Atualização de dados cadastrais, capacidade, dimensões e localização geográfica da sepultura."
        size="2xl"
        className="sm:max-w-4xl max-w-4xl"
      >
        <div className="space-y-4">
          {erroJazigo && (
            <div className="p-3 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/30 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{erroJazigo}</span>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              1. Identificação Cadastral & Capacidade
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Código do Túmulo *
                </label>
                <Input
                  type="text"
                  value={formJazigo.codigo}
                  onChange={(e) => setFormJazigo((p) => ({ ...p, codigo: e.target.value }))}
                  placeholder="Ex: JAZ-001-A"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Código Legado (Livros/Fichas)
                </label>
                <Input
                  type="text"
                  value={formJazigo.codigo_legado}
                  onChange={(e) => setFormJazigo((p) => ({ ...p, codigo_legado: e.target.value }))}
                  placeholder="Ex: L-012/B"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Tipo de Sepultura *
                </label>
                <Select
                  value={formJazigo.tipo}
                  onChange={(v) => setFormJazigo((p) => ({ ...p, tipo: v }))}
                  options={[
                    { value: 'jazigo', label: 'Jazigo' },
                    { value: 'gaveta', label: 'Gaveta' },
                    { value: 'ossuario', label: 'Ossuário' },
                    { value: 'cova_publica', label: 'Cova Pública' },
                  ]}
                  className="text-xs h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Capacidade Total (Gavetas) *
                </label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={formJazigo.capacidade}
                  onChange={(e) => setFormJazigo((p) => ({ ...p, capacidade: Number(e.target.value) }))}
                  className="text-xs font-mono h-9"
                />
                {j && j.ocupacao > 0 && (
                  <span className="text-[11px] text-muted-foreground block mt-1">
                    Ocupação atual: <strong className="text-foreground">{j.ocupacao}</strong> sepultado(s)
                  </span>
                )}
              </div>

              <div className="md:col-span-8">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Processo Administrativo de Criação / Regularização
                </label>
                <Input
                  type="text"
                  value={formJazigo.processo_administrativo}
                  onChange={(e) => setFormJazigo((p) => ({ ...p, processo_administrativo: e.target.value }))}
                  placeholder="Ex: PA-2024/0981"
                  className="text-xs font-mono h-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              2. Dimensões Físicas & Métricas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Comprimento (metros)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formJazigo.comprimento_m}
                  onChange={(e) => setFormJazigo((p) => ({ ...p, comprimento_m: e.target.value }))}
                  placeholder="Ex: 2.20"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Largura (metros)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formJazigo.largura_m}
                  onChange={(e) => setFormJazigo((p) => ({ ...p, largura_m: e.target.value }))}
                  placeholder="Ex: 1.10"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Área Estimada
                </label>
                <div className="h-9 px-3 py-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground flex items-center">
                  {formJazigo.comprimento_m && formJazigo.largura_m
                    ? `${(Number(formJazigo.comprimento_m) * Number(formJazigo.largura_m)).toFixed(2)} m²`
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              3. Localização Geográfica (GPS)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Latitude GPS
                </label>
                <Input
                  type="number"
                  step="0.000001"
                  value={formJazigo.lat}
                  onChange={(e) => setFormJazigo((p) => ({ ...p, lat: e.target.value }))}
                  placeholder="Ex: -23.550520"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Longitude GPS
                </label>
                <Input
                  type="number"
                  step="0.000001"
                  value={formJazigo.lng}
                  onChange={(e) => setFormJazigo((p) => ({ ...p, lng: e.target.value }))}
                  placeholder="Ex: -46.633308"
                  className="text-xs font-mono h-9"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setEditandoJazigo(false)} disabled={salvandoEdicao}>
              Cancelar
            </Button>
            <Button size="sm" onClick={salvarJazigo} disabled={salvandoEdicao || !formJazigo.codigo.trim()}>
              {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Edição do Titular Concessionário */}
      <Modal
        open={editandoTitular}
        onClose={() => setEditandoTitular(false)}
        title="Editar Dados do Titular Concessionário"
        description="Atualização de dados cadastrais, endereço com busca automática por CEP, contatos e situação vital do concessionário."
        size="xl"
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              1. Identificação e Contatos do Titular
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nome Completo do Titular *
                </label>
                <Input
                  type="text"
                  value={formTitular.nome ?? ''}
                  onChange={(e) => setFormTitular((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome do titular"
                  className="text-xs h-9"
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  CPF / CNPJ
                </label>
                <Input
                  type="text"
                  value={formTitular.documento ?? ''}
                  onChange={(e) => setFormTitular((p) => ({ ...p, documento: e.target.value }))}
                  placeholder="Somente dígitos ou formatado"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Telefone de Contato
                </label>
                <Input
                  type="text"
                  value={formTitular.telefone ?? ''}
                  onChange={(e) => setFormTitular((p) => ({ ...p, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-foreground mb-1">
                  E-mail
                </label>
                <Input
                  type="email"
                  value={formTitular.email ?? ''}
                  onChange={(e) => setFormTitular((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com.br"
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between border-b border-border pb-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-primary" />
                <span>2. Endereço Residencial do Titular</span>
              </h4>
              <span className="text-[11px] text-muted-foreground">Preenchimento automático via CEP</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  CEP
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="text"
                    value={formEndereco.cep}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormEndereco((p) => ({ ...p, cep: val }));
                      if (val.replace(/\D/g, '').length === 8) {
                        void handleBuscarCep(val);
                      }
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                    className="text-xs font-mono h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleBuscarCep()}
                    disabled={buscandoCep}
                    className="h-9 px-3 gap-1 text-xs shrink-0"
                    title="Consultar endereço pelo CEP"
                  >
                    {buscandoCep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    <span>Buscar</span>
                  </Button>
                </div>
              </div>

              <div className="md:col-span-8">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Logradouro (Rua, Avenida, etc.)
                </label>
                <Input
                  type="text"
                  value={formEndereco.logradouro}
                  onChange={(e) => setFormEndereco((p) => ({ ...p, logradouro: e.target.value }))}
                  placeholder="Nome da rua ou avenida"
                  className="text-xs h-9"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Número
                </label>
                <Input
                  type="text"
                  value={formEndereco.numero}
                  onChange={(e) => setFormEndereco((p) => ({ ...p, numero: e.target.value }))}
                  placeholder="Ex: 123 ou S/N"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Complemento
                </label>
                <Input
                  type="text"
                  value={formEndereco.complemento}
                  onChange={(e) => setFormEndereco((p) => ({ ...p, complemento: e.target.value }))}
                  placeholder="Apto, Bloco, Casa..."
                  className="text-xs h-9"
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Bairro
                </label>
                <Input
                  type="text"
                  value={formEndereco.bairro}
                  onChange={(e) => setFormEndereco((p) => ({ ...p, bairro: e.target.value }))}
                  placeholder="Bairro"
                  className="text-xs h-9"
                />
              </div>

              <div className="md:col-span-8">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Cidade
                </label>
                <Input
                  type="text"
                  value={formEndereco.cidade}
                  onChange={(e) => setFormEndereco((p) => ({ ...p, cidade: e.target.value }))}
                  placeholder="Município"
                  className="text-xs h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Estado (UF)
                </label>
                <Input
                  type="text"
                  maxLength={2}
                  value={formEndereco.uf}
                  onChange={(e) => setFormEndereco((p) => ({ ...p, uf: e.target.value.toUpperCase() }))}
                  placeholder="UF (ex: SP)"
                  className="text-xs font-mono h-9 uppercase"
                />
              </div>
            </div>

            {msgCep && (
              <div
                className={`text-xs p-2 rounded border flex items-center gap-1.5 ${
                  msgCep.tipo === 'sucesso'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                }`}
              >
                {msgCep.tipo === 'sucesso' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                <span>{msgCep.texto}</span>
              </div>
            )}
          </div>

          <div className="p-3 border border-border rounded-lg bg-muted/20 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="check-titular-falecido"
                checked={Boolean(formTitular.titular_falecido)}
                onChange={(e) => setFormTitular((p) => ({ ...p, titular_falecido: e.target.checked }))}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="check-titular-falecido" className="text-xs font-semibold text-foreground cursor-pointer">
                Titular Concessionário Falecido
              </label>
            </div>

            {formTitular.titular_falecido && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Data do Falecimento
                  </label>
                  <Input
                    type="date"
                    value={formTitular.data_falecimento_titular ? String(formTitular.data_falecimento_titular).split('T')[0] : ''}
                    onChange={(e) => setFormTitular((p) => ({ ...p, data_falecimento_titular: e.target.value }))}
                    className="text-xs font-mono h-9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Processo de Inventário / Partilha
                  </label>
                  <Input
                    type="text"
                    value={formTitular.processo_inventario ?? ''}
                    onChange={(e) => setFormTitular((p) => ({ ...p, processo_inventario: e.target.value }))}
                    placeholder="Ex: Proc. 0001234-56.2024.8.26.0000"
                    className="text-xs font-mono h-9"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setEditandoTitular(false)} disabled={salvandoEdicao}>
              Cancelar
            </Button>
            <Button size="sm" onClick={salvarTitular} disabled={salvandoEdicao || !formTitular.nome?.trim()}>
              {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Edição da Inumação e Falecido */}
      <Modal
        open={Boolean(inumacaoEditando)}
        onClose={() => setInumacaoEditando(null)}
        title="Editar Informações do Sepultado & Registro"
        description="Atualização completa de dados cadastrais do falecido, documentos civis, certidão de óbito, atestado médico e operação cemiterial."
        size="xl"
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              1. Dados Pessoais do Falecido
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-8">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nome Completo do Falecido *
                </label>
                <Input
                  type="text"
                  value={formInumacao.nome}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome completo do falecido"
                  className="text-xs h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-foreground mb-1">
                  CPF do Falecido
                </label>
                <Input
                  type="text"
                  value={formInumacao.documento}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, documento: e.target.value }))}
                  placeholder="000.000.000-00"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Data de Nascimento
                </label>
                <Input
                  type="date"
                  value={formInumacao.nascimento}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, nascimento: e.target.value }))}
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Data de Falecimento *
                </label>
                <Input
                  type="date"
                  value={formInumacao.falecimento}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, falecimento: e.target.value }))}
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Nº da Certidão de Óbito
                </label>
                <Input
                  type="text"
                  value={formInumacao.certidao_numero}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, certidao_numero: e.target.value }))}
                  placeholder="Registro / Termo"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Cartório do Registro Civil (Certidão)
                </label>
                <Input
                  type="text"
                  value={formInumacao.certidao_cartorio}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, certidao_cartorio: e.target.value }))}
                  placeholder="Ex: 1º Ofício de Registro Civil das Pessoas Naturais"
                  className="text-xs h-9"
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Médico Atestante (Declaração de Óbito / CRM)
                </label>
                <Input
                  type="text"
                  value={formInumacao.medico}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, medico: e.target.value }))}
                  placeholder="Ex: Dr. Hisati Kiromoto — CRM 12345/SP"
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              2. Dados do Sepultamento & Operação Cemiterial
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Gaveta / Posição no Túmulo
                </label>
                <Input
                  type="number"
                  min={1}
                  value={formInumacao.gaveta_numero}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, gaveta_numero: e.target.value }))}
                  placeholder="Nº da gaveta (ex: 1)"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Data do Sepultamento *
                </label>
                <Input
                  type="date"
                  value={formInumacao.sepultado_em}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, sepultado_em: e.target.value }))}
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Tipo de Procedimento
                </label>
                <Input
                  type="text"
                  value={formInumacao.tipo}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, tipo: e.target.value }))}
                  placeholder="Ex: caixão, ossada, cinzas"
                  className="text-xs h-9"
                />
              </div>

              <div className="md:col-span-12">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Livro / Folha de Registro Cemiterial
                </label>
                <Input
                  type="text"
                  value={formInumacao.livro_referencia}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, livro_referencia: e.target.value }))}
                  placeholder="Ex: Livro Geral nº 14, Folha 82, Termo 1024"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Coveiro Responsável
                </label>
                <Input
                  type="text"
                  value={formInumacao.coveiro_nome}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, coveiro_nome: e.target.value }))}
                  placeholder="Nome do coveiro"
                  className="text-xs h-9"
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Pedreiro / Construtor
                </label>
                <Input
                  type="text"
                  value={formInumacao.pedreiro_nome}
                  onChange={(e) => setFormInumacao((p) => ({ ...p, pedreiro_nome: e.target.value }))}
                  placeholder="Nome do pedreiro"
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setInumacaoEditando(null)} disabled={salvandoEdicao}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={salvarInumacao}
              disabled={salvandoEdicao || !formInumacao.nome?.trim() || !formInumacao.falecimento || !formInumacao.sepultado_em}
            >
              {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
