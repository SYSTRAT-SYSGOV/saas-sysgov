import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, ConfirmDialog, DataTable, StatusChip, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { cemiteriosApi, formatarCentavos, formatarData, type Concessao, type Concessionario, type FiltrosConcessoesAvancados } from '../api';
import { ErroBox, FormModal, Mono, limparCacheDados, sanitizarTextoLegado, useAcao, useDados } from './comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';
import { ConcessoesFiltros } from './ConcessoesFiltros';
import { ConcessionariosFiltros, type FiltrosConcessionarios } from './ConcessionariosFiltros';
import { ModalEditarConcessionario } from './ModalEditarConcessionario';
import { DrawerHistoricoConcessao } from './DrawerHistoricoConcessao';
import { PessoaPicker } from '@sysgov/ui';
import { usePessoaPicker } from '@/modules/pessoas/hooks';
import { pessoasApi } from '@/modules/pessoas/api';
import { ModalFichaPessoa } from '@/modules/pessoas/views/ModalFichaPessoa';
import {
  ExternalLink,
  User,
  Users,
  UserCheck,
  AlertTriangle,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Edit3,
  Clock,
  Coins,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Landmark,
} from 'lucide-react';

const SITUACAO: Record<string, 'success' | 'warning' | 'danger'> = { vigente: 'success', expirada: 'warning', extinta: 'danger' };
const MOTIVO_EXTINCAO_LABEL: Record<string, string> = { renuncia: 'Renúncia voluntária', abandono: 'Abandono (processo administrativo)' };

const FILTROS_INICIAIS: FiltrosConcessoesAvancados = {
  setorId: null,
  modalidade: 'todas',
  situacao: 'todas',
  pendenciaRegularizacao: false,
  financeiro: 'todas',
  venceEm: 'todas',
  busca: '',
};

const FILTROS_CONCESSIONARIOS_INICIAIS: FiltrosConcessionarios = {
  busca: '',
  tipoDoc: 'todos',
  origem: 'todos',
  situacaoVital: 'todas',
  baseLegal: 'todas',
};

/** Converte o estado dos filtros avançados nos parâmetros aceitos por `ConcessaoController@index`. */
function paraParametrosApi(filtros: FiltrosConcessoesAvancados, parkId: number | null): Record<string, unknown> {
  const params: Record<string, unknown> = { per_page: 100 };
  if (parkId) params.park_id = parkId;
  if (filtros.setorId) params.setor_id = filtros.setorId;
  if (filtros.modalidade && filtros.modalidade !== 'todas') params.modalidade = filtros.modalidade;
  if (filtros.situacao && filtros.situacao !== 'todas') params.situacao = filtros.situacao;
  if (filtros.pendenciaRegularizacao) params.pendencia_regularizacao = true;
  if (filtros.financeiro && filtros.financeiro !== 'todas') params.financeiro = filtros.financeiro;
  if (filtros.venceEm && filtros.venceEm !== 'todas') {
    const data = new Date();
    data.setDate(data.getDate() + Number(filtros.venceEm));
    params.vence_ate = data.toISOString().slice(0, 10);
  }
  if (filtros.busca.trim()) params.busca = filtros.busca.trim();
  return params;
}

/** Converte os filtros avançados de concessionários para a query de `ConcessaoController@titulares`. */
function paraParametrosConcessionariosApi(filtros: FiltrosConcessionarios): Record<string, unknown> {
  const params: Record<string, unknown> = { per_page: 100 };
  if (filtros.busca.trim()) params.q = filtros.busca.trim();
  if (filtros.tipoDoc !== 'todos') params.tipo_doc = filtros.tipoDoc;
  if (filtros.origem !== 'todos') params.origem = filtros.origem;
  if (filtros.situacaoVital !== 'todas') params.situacao_vital = filtros.situacaoVital;
  if (filtros.baseLegal !== 'todas') params.base_legal = filtros.baseLegal;
  return params;
}

/** Concessionários (CPF mascarado) e concessões temporárias/perpétuas (RF-11..RF-14). */
export const ConcessoesView: React.FC = () => {
  const { can } = useCan();
  const { cemiterioAtivoId, cemiterioAtivo } = useCemiteriosNavigation();
  const { buscarPessoas, criarPessoaRapido } = usePessoaPicker();
  const gerencia = can('cemiterios.concessoes.manage');
  const [aba, setAba] = useState<'concessoes' | 'titulares'>('concessoes');
  const [modal, setModal] = useState<'concessao' | 'titular' | null>(null);
  const [modalEditarTitular, setModalEditarTitular] = useState<Concessionario | null>(null);
  const [renovar, setRenovar] = useState<Concessao | null>(null);
  const [renunciar, setRenunciar] = useState<Concessao | null>(null);
  const [transferir, setTransferir] = useState<Concessao | null>(null);
  const [historico, setHistorico] = useState<Concessao | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosConcessoesAvancados>(FILTROS_INICIAIS);
  const [filtrosConcessionarios, setFiltrosConcessionarios] = useState<FiltrosConcessionarios>(FILTROS_CONCESSIONARIOS_INICIAIS);
  const [pessoaModalId, setPessoaModalId] = useState<number | null>(null);

  const setoresDisponiveis = cemiterioAtivo?.setores ?? [];

  const concessoes = useDados(
    () => cemiteriosApi.concessoes(paraParametrosApi(filtros, cemiterioAtivoId)),
    [cemiterioAtivoId, filtros]
  );
  const titulares = useDados(
    () => (gerencia && (aba === 'titulares' || modal === 'concessao')
      ? cemiteriosApi.titulares(paraParametrosConcessionariosApi(filtrosConcessionarios))
      : Promise.resolve(null)),
    [gerencia, aba, modal, filtrosConcessionarios]
  );
  const { erro, executar } = useAcao();

  const listaConcessoes = concessoes.dados?.data ?? [];
  const kpisConcessoes = useMemo(() => {
    const total = concessoes.dados?.total ?? listaConcessoes.length;
    const vigentes = listaConcessoes.filter((c) => c.situacao === 'vigente').length;
    const perpetuas = listaConcessoes.filter((c) => c.modalidade === 'perpetua').length;
    const temporarias = listaConcessoes.filter((c) => c.modalidade === 'temporaria').length;
    const inadimplentes = listaConcessoes.filter((c) => Boolean(c.inadimplente)).length;
    const falecidos = listaConcessoes.filter((c) => Boolean(c.concessionario?.titular_falecido)).length;
    return { total, vigentes, perpetuas, temporarias, inadimplentes, falecidos };
  }, [concessoes.dados?.total, listaConcessoes]);

  const colunasConcessoes = useMemo<ColumnDef<Concessao, unknown>[]>(() => [
    {
      id: 'numero',
      header: 'Concessão / Proc.',
      accessorKey: 'numero',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Mono className="font-bold text-foreground">{row.original.numero}</Mono>
          {row.original.processo_administrativo ? (
            <Mono className="text-[10px] text-muted-foreground">{row.original.processo_administrativo}</Mono>
          ) : (
            <span className="text-[10px] text-muted-foreground">Sem processo</span>
          )}
        </div>
      ),
      meta: { exportHeader: 'Número', exportValue: (r) => r.numero, sortValue: (r) => r.numero },
    },
    {
      id: 'jazigo',
      header: 'Jazigo & Localização',
      accessorFn: (r) => r.jazigo?.codigo ?? '',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Mono className="font-semibold text-foreground">{row.original.jazigo?.codigo ?? '—'}</Mono>
          <span className="text-[10px] text-muted-foreground">
            Setor {row.original.jazigo?.setor?.codigo ?? '—'}
            {row.original.jazigo?.cemiterio?.nome ? ` • ${row.original.jazigo.cemiterio.nome}` : ''}
          </span>
        </div>
      ),
      meta: { exportHeader: 'Jazigo', exportValue: (r) => r.jazigo?.codigo ?? '' },
    },
    {
      id: 'titular',
      header: 'Concessionário / Titular',
      accessorFn: (r) => r.concessionario?.nome ?? '',
      cell: ({ row }) => {
        const c = row.original.concessionario || (row.original as any).holder || (row.original as any).titular;
        const nomeTitular = sanitizarTextoLegado(c?.nome) || sanitizarTextoLegado((c as any)?.pessoa?.nome) || sanitizarTextoLegado((c as any)?.pessoa?.nome_social) || sanitizarTextoLegado((row.original as any).titular_nome) || sanitizarTextoLegado((row.original as any).holder_nome);
        // Para acesso administrativo (gerencia), exibe documento desmascarado sem filtro de LGPD
        const docAdmin = gerencia
          ? (c?.documento_desmascarado || c?.documento || c?.documento_mascarado)
          : c?.documento_mascarado;

        if (!nomeTitular && !c) {
          return <span className="text-muted-foreground text-xs italic">Sem titular vinculado</span>;
        }

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <User className="h-3.5 w-3.5 text-primary/70 shrink-0" />
              {nomeTitular ? (
                c?.pessoa_id ? (
                  <button
                    type="button"
                    onClick={() => setPessoaModalId(c.pessoa_id!)}
                    className="font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1 text-left"
                    title="Abrir ficha cadastral central (MDM)"
                  >
                    <span className="text-sm font-semibold">{nomeTitular}</span>
                    <ExternalLink className="h-3 w-3 inline text-primary/70 shrink-0" />
                  </button>
                ) : (
                  <span className="font-semibold text-foreground text-sm">{nomeTitular}</span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60">
                  <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Titular Não Identificado (Legado)</span>
                </span>
              )}
              {c?.titular_falecido && (
                <span className="inline-flex items-center rounded bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  ⚠️ Falecido
                </span>
              )}
            </div>
            {docAdmin && (
              <span className="font-mono tabular-nums text-[11px] text-muted-foreground flex items-center gap-1">
                <span>{docAdmin}</span>
                {c?.telefone && <span>• {c.telefone}</span>}
              </span>
            )}
          </div>
        );
      },
      meta: { exportHeader: 'Concessionário / Titular', exportValue: (r) => r.concessionario?.nome ?? '' },
    },
    {
      id: 'modalidade',
      header: 'Modalidade',
      accessorKey: 'modalidade',
      cell: ({ row }) => (
        <span className="capitalize text-xs font-medium text-foreground">
          {row.original.modalidade === 'perpetua' ? 'Perpétua' : 'Temporária'}
        </span>
      ),
      meta: { exportHeader: 'Modalidade', exportValue: (r) => r.modalidade, sortValue: (r) => r.modalidade },
    },
    {
      id: 'termino',
      header: 'Vigência / Término',
      cell: ({ row }) => {
        const { inicio, termino, modalidade } = row.original;
        if (modalidade === 'perpetua') {
          return (
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-primary">Perpétua</span>
              <span className="text-[10px] text-muted-foreground font-mono">Desde {formatarData(inicio)}</span>
            </div>
          );
        }
        return (
          <div className="flex flex-col">
            <Mono className="text-xs font-semibold">{termino ? formatarData(termino) : '—'}</Mono>
            <span className="text-[10px] text-muted-foreground font-mono">Início: {formatarData(inicio)}</span>
          </div>
        );
      },
      meta: { exportHeader: 'Término', exportValue: (r) => r.termino ?? 'Perpétua', sortValue: (r) => r.termino ?? '' },
    },
    {
      id: 'financeiro',
      header: 'Situação Fiscal',
      cell: ({ row }) => row.original.inadimplente
        ? <StatusChip label="Inadimplente" variant="danger" />
        : (row.original.guias_count ?? 0) > 0
          ? <StatusChip label="Adimplente" variant="success" />
          : <span className="text-xs text-muted-foreground">Sem guias</span>,
      meta: {
        exportHeader: 'Situação Financeira',
        exportValue: (r) => (r.inadimplente ? 'Inadimplente' : (r.guias_count ?? 0) > 0 ? 'Adimplente' : 'Sem guias'),
        sortValue: (r) => (r.inadimplente ? 2 : (r.guias_count ?? 0) > 0 ? 0 : 1),
      },
    },
    {
      id: 'situacao',
      header: 'Situação',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-1">
            <StatusChip label={row.original.situacao} variant={SITUACAO[row.original.situacao] ?? 'neutral'} />
            {row.original.pendencia_regularizacao && <StatusChip label="regularizar" variant="danger" />}
          </div>
          {row.original.situacao === 'extinta' && row.original.motivo_extincao && (
            <span className="text-[10px] text-muted-foreground" title={row.original.extinta_em ? `Extinta em ${formatarData(row.original.extinta_em)}` : undefined}>
              {MOTIVO_EXTINCAO_LABEL[row.original.motivo_extincao] ?? row.original.motivo_extincao}
            </span>
          )}
        </div>
      ),
      meta: { exportHeader: 'Situação', exportValue: (r) => r.situacao, sortValue: (r) => r.situacao },
    },
    {
      id: 'acoes',
      header: '',
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="xs" variant="ghost" onClick={() => setHistorico(row.original)}>Histórico</Button>
          {gerencia && row.original.modalidade === 'temporaria' && row.original.situacao === 'vigente' && (
            <Button size="xs" variant="outline" onClick={() => setRenovar(row.original)}>Renovar</Button>
          )}
          {gerencia && row.original.situacao === 'vigente' && (
            <Button size="xs" variant="outline" onClick={() => setTransferir(row.original)}>Transferir titular</Button>
          )}
          {gerencia && row.original.situacao === 'vigente' && (
            <Button size="xs" variant="outline" onClick={() => setRenunciar(row.original)}>Renunciar</Button>
          )}
        </div>
      ),
    },
  ], [gerencia]);

  const listaTitulares = titulares.dados?.data ?? [];
  const kpisConcessionarios = useMemo(() => {
    const total = titulares.dados?.total ?? listaTitulares.length;
    const mdm = listaTitulares.filter((t) => Boolean(t.pessoa_id)).length;
    const legados = listaTitulares.filter((t) => !t.pessoa_id).length;
    const falecidos = listaTitulares.filter((t) => Boolean(t.titular_falecido)).length;
    return { total, mdm, legados, falecidos };
  }, [titulares.dados?.total, listaTitulares]);

  const colunasTitulares = useMemo<ColumnDef<Concessionario, unknown>[]>(() => [
    {
      id: 'nome',
      header: 'Concessionário / Titular',
      accessorFn: (r) => r.nome,
      cell: ({ row }) => {
        const t = row.original;
        const nomeTitular = sanitizarTextoLegado(t.nome) || sanitizarTextoLegado(t.pessoa?.nome) || sanitizarTextoLegado(t.pessoa?.nome_social);
        return (
          <div className="flex flex-col gap-1 py-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="h-3.5 w-3.5 text-primary/70 shrink-0" />
              {nomeTitular ? (
                t.pessoa_id ? (
                  <button
                    type="button"
                    onClick={() => setPessoaModalId(t.pessoa_id!)}
                    className="font-bold text-foreground hover:text-primary hover:underline cursor-pointer flex items-center gap-1 text-left text-sm"
                    title="Abrir ficha cadastral central (MDM)"
                  >
                    <span>{nomeTitular}</span>
                    <ExternalLink className="h-3 w-3 inline text-primary/70 shrink-0" />
                  </button>
                ) : (
                  <span className="font-bold text-foreground text-sm">{nomeTitular}</span>
                )
              ) : (
                <div className="flex flex-col">
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60">
                    <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Nome Não Informado (Legado)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground italic">
                    Clique em Editar para regularizar
                  </span>
                </div>
              )}
              {t.pessoa_id ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-medium">
                  MDM Ativo
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium">
                  Legado Local
                </span>
              )}
            </div>
            {t.titular_falecido && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                Falecido {t.data_falecimento_titular ? `(${formatarData(t.data_falecimento_titular)})` : ''}
                {t.processo_inventario ? ` • Proc: ${t.processo_inventario}` : ''}
              </span>
            )}
          </div>
        );
      },
      meta: { exportHeader: 'Concessionário / Titular', exportValue: (r) => r.nome, sortValue: (r) => r.nome },
    },
    {
      id: 'doc',
      header: 'CPF / CNPJ (Admin)',
      cell: ({ row }) => {
        const t = row.original;
        // Para acessos administrativos, mostra documento completo sem censura LGPD
        const docVisivel = (gerencia && (t.documento_desmascarado || t.documento))
          ? (t.documento_desmascarado || t.documento)
          : t.documento_mascarado;

        return (
          <div className="flex flex-col">
            <Mono className="font-semibold">{docVisivel}</Mono>
            <span className="text-[10px] text-muted-foreground uppercase font-mono">
              {t.tipo_doc === 'cnpj' ? 'Pessoa Jurídica' : 'Pessoa Física'}
            </span>
          </div>
        );
      },
      meta: { exportHeader: 'Documento', exportValue: (r) => (r.documento_desmascarado || r.documento || r.documento_mascarado) },
    },
    {
      id: 'jazigos',
      header: 'Jazigos Concedidos',
      cell: ({ row }) => {
        const concessoesTitular = row.original.concessoes;
        if (!concessoesTitular || concessoesTitular.length === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {concessoesTitular.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-mono font-medium text-foreground border border-border"
                title={`Concessão ${c.numero} (${c.situacao})`}
              >
                <span>{c.jazigo?.codigo || c.numero}</span>
              </span>
            ))}
          </div>
        );
      },
      meta: { exportHeader: 'Jazigos', exportValue: (r) => r.concessoes?.map((c) => c.jazigo?.codigo || c.numero).join(', ') ?? '' },
    },
    {
      id: 'contatos',
      header: 'Contatos',
      cell: ({ row }) => {
        const { email, telefone, contatos_adicionais } = row.original;
        const qtdAdicionais = contatos_adicionais?.length ?? 0;
        if (!email && !telefone && qtdAdicionais === 0) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="flex flex-col gap-1 text-xs">
            {email && (
              <span className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[200px]" title={email}>
                <Mail className="h-3 w-3 text-primary/70 shrink-0" />
                <span className="truncate">{email}</span>
              </span>
            )}
            {telefone && (
              <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
                <Phone className="h-3 w-3 text-primary/70 shrink-0" />
                <span className="tabular-nums">{telefone}</span>
              </span>
            )}
            {qtdAdicionais > 0 && (
              <span
                className="inline-flex items-center text-[10px] text-primary/90 font-medium cursor-help"
                title={contatos_adicionais?.map((c) => `${c.tipo}: ${c.valor}${c.descricao ? ` (${c.descricao})` : ''}`).join('\n')}
              >
                +{qtdAdicionais} contato(s) extra(s)
              </span>
            )}
          </div>
        );
      },
      meta: { exportHeader: 'Contatos', exportValue: (r) => [r.email, r.telefone].filter(Boolean).join(' / ') },
    },
    {
      id: 'localizacao',
      header: 'Localização / Cidade',
      cell: ({ row }) => {
        const t = row.original;
        const cidade = sanitizarTextoLegado(t.cidade);
        const uf = sanitizarTextoLegado(t.uf);
        const bairro = sanitizarTextoLegado(t.bairro);
        const cep = sanitizarTextoLegado(t.cep);
        const endereco = sanitizarTextoLegado(t.endereco);

        if (cidade && uf) {
          return (
            <div className="flex flex-col text-xs">
              <span className="font-medium text-foreground">{cidade} / {uf}</span>
              {bairro && <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">{bairro}</span>}
              {cep && <Mono className="text-[10px] text-muted-foreground/80">CEP {cep}</Mono>}
            </div>
          );
        }
        if (endereco) {
          return (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[200px]" title={endereco}>
              <MapPin className="h-3 w-3 text-primary/60 shrink-0" />
              <span className="truncate">{endereco}</span>
            </span>
          );
        }
        return <span className="text-muted-foreground text-xs">—</span>;
      },
      meta: { exportHeader: 'Localização', exportValue: (r) => r.cidade ? `${r.cidade}/${r.uf}` : (r.endereco ?? '') },
    },
    {
      id: 'observacoes',
      header: 'Observações',
      cell: ({ row }) => {
        const obs = row.original.observacoes;
        if (!obs) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[180px]" title={obs}>
            <FileText className="h-3 w-3 text-muted-foreground/70 shrink-0" />
            <span className="truncate">{obs}</span>
          </span>
        );
      },
      meta: { exportHeader: 'Observações', exportValue: (r) => r.observacoes ?? '' },
    },
    {
      id: 'situacao_titular',
      header: 'Situação / Sucessão',
      cell: ({ row }) => row.original.titular_falecido ? (
        <StatusChip label="Falecido / Sucessão" variant="warning" />
      ) : (
        <StatusChip label="Regular / Vivo" variant="success" />
      ),
      meta: { exportHeader: 'Situação', exportValue: (r) => r.titular_falecido ? 'Falecido' : 'Regular' },
    },
    {
      id: 'base',
      header: 'Base Legal',
      cell: ({ row }) => {
        const base = row.original.base_legal;
        const labels: Record<string, string> = {
          execucao_contrato: 'Exec. Contrato',
          obrigacao_legal: 'Obrig. Legal',
          consentimento: 'Consentimento',
        };
        return <span className="text-xs text-muted-foreground">{labels[base] ?? base ?? '—'}</span>;
      },
      meta: { exportHeader: 'Base Legal LGPD', exportValue: (r) => r.base_legal ?? '' },
    },
    {
      id: 'acoes',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5">
          {gerencia && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setModalEditarTitular(row.original)}
              className="gap-1 h-7 text-xs"
              title="Editar dados cadastrais, endereço com CEP e contatos"
            >
              <Edit3 className="h-3 w-3" />
              <span>Editar</span>
            </Button>
          )}
          {row.original.pessoa_id && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setPessoaModalId(row.original.pessoa_id!)}
              className="gap-1 h-7 text-xs text-primary"
              title="Ver ficha completa no Cadastro Central"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Ficha</span>
            </Button>
          )}
        </div>
      ),
    },
  ], [gerencia]);

  const confirmarRenovacao = async () => {
    const alvo = renovar;
    setRenovar(null);
    if (!alvo) return;
    const r = await executar(() => cemiteriosApi.renovar(alvo.id));
    if (r) {
      setAviso(`Concessão ${r.concessao.numero} renovada até ${formatarData(r.concessao.termino)}. Guia ${r.guia.numero} de ${formatarCentavos(r.guia.valor_centavos)} emitida.`);
      await concessoes.recarregar();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs items={[{ key: 'concessoes', label: 'Concessões' }, ...(gerencia ? [{ key: 'titulares' as const, label: 'Concessionários' }] : [])]} value={aba} onChange={setAba} />
        {gerencia && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal('titular')}>Novo concessionário</Button>
            <Button onClick={() => setModal('concessao')}>Nova concessão</Button>
          </div>
        )}
      </div>
      {aviso && <p className="rounded-md border border-border bg-accent/50 p-3 text-sm" role="status">{aviso}</p>}
      <ErroBox erro={erro ?? concessoes.erro ?? titulares.erro} />

      {aba === 'concessoes' && (
        <div className="space-y-3.5">
          {/* Indicadores / KPIs de Concessões */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-lg border border-border bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total Concessões</span>
                <FileSpreadsheet className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-foreground">
                {kpisConcessoes.total}
              </p>
              <span className="text-[11px] text-muted-foreground">Emitidas no cemitério</span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Vigentes Ativas</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {kpisConcessoes.vigentes}
              </p>
              <span className="text-[11px] text-muted-foreground">Em plena vigência</span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Perpétuas / Temporárias</span>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-foreground">
                {kpisConcessoes.perpetuas} <span className="text-xs font-normal text-muted-foreground">/ {kpisConcessoes.temporarias}</span>
              </p>
              <span className="text-[11px] text-muted-foreground">Distribuição de regime</span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Inadimplentes</span>
                <Coins className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {kpisConcessoes.inadimplentes}
              </p>
              <span className="text-[11px] text-muted-foreground">Guias vencidas em aberto</span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Alerta de Sucessão</span>
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                {kpisConcessoes.falecidos}
              </p>
              <span className="text-[11px] text-muted-foreground">Titular falecido no jazigo</span>
            </div>
          </div>

          <ConcessoesFiltros
            filtros={filtros}
            onFiltrosChange={(novos) => setFiltros((f) => ({ ...f, ...novos }))}
            onLimparFiltros={() => setFiltros(FILTROS_INICIAIS)}
            setoresDisponiveis={setoresDisponiveis}
            totalRegistros={concessoes.dados?.total ?? 0}
            carregando={concessoes.carregando}
          />
        </div>
      )}

      {aba === 'concessoes' ? (
        <DataTable
          columns={colunasConcessoes}
          data={concessoes.dados?.data ?? []}
          loading={concessoes.carregando}
          searchable={false}
          exportable
          exportFileName="concessoes"
          exportTitle="Concessões"
          pageSizeSelector
          pageSizeOptions={[10, 25, 50, 100]}
          resizableColumns
          emptyText="Nenhuma concessão encontrada para os filtros selecionados."
        />
      ) : (
        <div className="space-y-3.5">
          {/* Indicadores / KPIs de Concessionários */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg border border-border bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total Concessionários</span>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-foreground">
                {kpisConcessionarios.total}
              </p>
              <span className="text-[11px] text-muted-foreground">Registrados no município</span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">MDM Central Ativo</span>
                <UserCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {kpisConcessionarios.mdm}
              </p>
              <span className="text-[11px] text-muted-foreground">Integrados ao cadastro geral</span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Registros Legados</span>
                <ShieldCheck className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {kpisConcessionarios.legados}
              </p>
              <span className="text-[11px] text-muted-foreground">Passíveis de vinculação</span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-card shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Titulares Falecidos</span>
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                {kpisConcessionarios.falecidos}
              </p>
              <span className="text-[11px] text-muted-foreground">Abertura de sucessão pendente</span>
            </div>
          </div>

          <ConcessionariosFiltros
            filtros={filtrosConcessionarios}
            onFiltrosChange={(novos) => setFiltrosConcessionarios((f) => ({ ...f, ...novos }))}
            onLimparFiltros={() => setFiltrosConcessionarios(FILTROS_CONCESSIONARIOS_INICIAIS)}
            totalRegistros={titulares.dados?.total ?? listaTitulares.length}
            carregando={titulares.carregando}
          />

          <DataTable
            columns={colunasTitulares}
            data={listaTitulares}
            loading={titulares.carregando}
            searchable={false}
            exportable
            exportFileName="concessionarios"
            exportTitle="Concessionários"
            pageSizeSelector
            pageSizeOptions={[10, 25, 50, 100]}
            resizableColumns
            emptyText="Nenhum concessionário encontrado para os filtros selecionados."
          />
        </div>
      )}

      {/* Modal: Novo Concessionário (size 2xl, campos responsivos sem quebras) */}
      <FormModal
        aberto={modal === 'titular'}
        titulo="Novo concessionário"
        description="Cadastre um novo titular de jazigo vinculando-o ao Cadastro Central de Munícipes."
        size="2xl"
        onFechar={() => setModal(null)}
        iniciais={{ base_legal: 'execucao_contrato' }}
        campos={[
          {
            nome: 'pessoa_id',
            rotulo: 'Vincular Pessoa Física (Cadastro Central)',
            tipo: 'custom',
            colSpan: 2,
            dica: 'Opcional. Preencha para vincular e importar os dados cadastrais do munícipe.',
            renderCustom: (valor, onChange, setValores) => (
              <PessoaPicker
                value={valor ? Number(valor) : null}
                onChange={async (id, pessoaOption) => {
                  onChange(id);
                  if (id && setValores) {
                    if (pessoaOption) {
                      setValores((prev) => ({
                        ...prev,
                        nome: pessoaOption.nome || prev.nome,
                        documento: pessoaOption.cpf_mascarado || prev.documento,
                      }));
                    }
                    try {
                      const detalhes = await pessoasApi.obter(id);
                      if (detalhes) {
                        const primEndereco = detalhes.enderecos?.[0];
                        const endFormatado = primEndereco
                          ? `${primEndereco.logradouro || ''}, ${primEndereco.numero || 's/n'}${primEndereco.bairro ? ` - ${primEndereco.bairro}` : ''}${primEndereco.cidade ? ` - ${primEndereco.cidade}/${primEndereco.uf}` : ''}`
                          : '';

                        const emailContato = detalhes.contatos?.find((c) => c.tipo === 'email')?.valor;
                        const telContato = detalhes.contatos?.find((c) => c.tipo === 'celular' || c.tipo === 'telefone')?.valor;

                        setValores((prev) => ({
                          ...prev,
                          nome: detalhes.nome || prev.nome,
                          documento: detalhes.cpf_mascarado || prev.documento,
                          email: emailContato || prev.email,
                          telefone: telContato || prev.telefone,
                          endereco: endFormatado || prev.endereco,
                        }));
                      }
                    } catch (e) {
                      console.warn('Não foi possível obter detalhes adicionais da pessoa:', e);
                    }
                  }
                }}
                onSearch={buscarPessoas}
                onCreatePessoa={criarPessoaRapido}
                placeholder="Buscar munícipe por nome ou CPF no cadastro geral..."
              />
            ),
          },
          { nome: 'nome', rotulo: 'Nome / razão social', obrigatorio: true, colSpan: 1 },
          { nome: 'documento', rotulo: 'CPF ou CNPJ', obrigatorio: true, dica: 'Armazenado cifrado; exibido mascarado.', colSpan: 1 },
          { nome: 'email', rotulo: 'E-mail', colSpan: 1 },
          { nome: 'telefone', rotulo: 'Telefone', colSpan: 1 },
          { nome: 'endereco', rotulo: 'Endereço Completo', colSpan: 2 },
          {
            nome: 'base_legal',
            rotulo: 'Base legal',
            tipo: 'select',
            colSpan: 1,
            opcoes: [
              { value: 'execucao_contrato', label: 'Execução de contrato' },
              { value: 'obrigacao_legal', label: 'Obrigação legal' },
              { value: 'consentimento', label: 'Consentimento' },
            ],
          },
        ]}
        onEnviar={async (v) => {
          await cemiteriosApi.criarTitular(v as Partial<Concessionario> & { documento: string });
          await titulares.recarregar();
        }}
      />

      {/* Modal: Edição de Concessionário */}
      <ModalEditarConcessionario
        aberto={modalEditarTitular !== null}
        concessionario={modalEditarTitular}
        onFechar={() => setModalEditarTitular(null)}
        onSalvo={async () => {
          limparCacheDados();
          await Promise.all([titulares.recarregar(), concessoes.recarregar()]);
        }}
        onAbrirFichaPessoa={(id) => setPessoaModalId(id)}
      />

      {/* Modal: Nova Concessão (size 2xl, colunas simétricas) */}
      <FormModal
        aberto={modal === 'concessao'}
        titulo="Nova concessão"
        size="2xl"
        onFechar={() => setModal(null)}
        iniciais={{ modalidade: 'temporaria' }}
        campos={[
          { nome: 'plot_id', rotulo: 'ID do jazigo (Disponível)', tipo: 'number', obrigatorio: true, colSpan: 1 },
          {
            nome: 'holder_id',
            rotulo: 'Concessionário',
            tipo: 'select',
            obrigatorio: true,
            colSpan: 1,
            opcoes: (titulares.dados?.data ?? []).map((t) => ({ value: String(t.id), label: `${t.nome} — ${t.documento_mascarado}` })),
          },
          {
            nome: 'modalidade',
            rotulo: 'Modalidade',
            tipo: 'select',
            obrigatorio: true,
            colSpan: 1,
            opcoes: [
              { value: 'temporaria', label: 'Temporária' },
              { value: 'perpetua', label: 'Perpétua' },
            ],
          },
          { nome: 'inicio', rotulo: 'Início', tipo: 'date', colSpan: 1 },
          { nome: 'processo_administrativo', rotulo: 'Processo Administrativo', dica: 'Ex.: Proc. 1024/2026', colSpan: 2 },
        ]}
        onEnviar={async (v) => {
          const jazigo = await cemiteriosApi.jazigo(Number(v.plot_id));
          await cemiteriosApi.conceder({
            plot_id: jazigo.id,
            holder_id: Number(v.holder_id),
            modalidade: String(v.modalidade),
            processo_administrativo: (v.processo_administrativo as string) || undefined,
            inicio: (v.inicio as string) || undefined,
            lock_version: jazigo.lock_version,
          });
          await concessoes.recarregar();
        }}
      />

      <ConfirmDialog
        open={renovar !== null}
        onClose={() => setRenovar(null)}
        onConfirm={() => void confirmarRenovacao()}
        title={`Renovar concessão ${renovar?.numero ?? ''}`}
        description="A renovação estende o término pelo prazo vigente e emite a guia pelo preço atual."
        confirmLabel="Renovar"
      />

      {/* Modal: Renúncia de Concessão (size xl, campos organizados) */}
      <FormModal
        aberto={renunciar !== null}
        titulo={`Renunciar concessão ${renunciar?.numero ?? ''}`}
        description="A renúncia extingue a concessão vigente por devolução voluntária do concessionário e libera o jazigo para nova concessão."
        size="xl"
        campos={[
          { nome: 'motivo', rotulo: 'Motivo / justificativa', tipo: 'textarea', obrigatorio: true, dica: 'Registrado na auditoria da concessão.', colSpan: 2 },
          { nome: 'processo_administrativo', rotulo: 'Processo administrativo de baixa (opcional)', colSpan: 2 },
        ]}
        rotuloEnviar="Confirmar renúncia"
        onFechar={() => setRenunciar(null)}
        onEnviar={async (v) => {
          if (!renunciar) return;
          await cemiteriosApi.renunciarConcessao(renunciar.id, {
            motivo: String(v.motivo ?? ''),
            processo_administrativo: (v.processo_administrativo as string) || undefined,
          });
          await concessoes.recarregar();
        }}
      />

      {/* Modal: Transferir Titularidade (size 2xl, layout amplo) */}
      <FormModal
        aberto={transferir !== null}
        titulo={`Transferir titularidade — ${transferir?.numero ?? ''}`}
        description="Transferência inter vivos (RF-11..RF-14): vincula uma nova pessoa do cadastro central (MDM) como titular principal desta concessão vigente."
        size="2xl"
        campos={[
          {
            nome: 'pessoa_id',
            rotulo: 'Novo titular (Pessoa física)',
            tipo: 'custom',
            obrigatorio: true,
            colSpan: 2,
            dica: 'Busque no cadastro central por nome/CPF ou cadastre rapidamente uma nova pessoa.',
            renderCustom: (valor, onChange) => (
              <PessoaPicker
                value={valor ? Number(valor) : null}
                onChange={(id) => onChange(id)}
                onSearch={buscarPessoas}
                onCreatePessoa={criarPessoaRapido}
                placeholder="Buscar nova pessoa titular por nome ou CPF..."
              />
            ),
          },
          { nome: 'processo_administrativo', rotulo: 'Processo administrativo (opcional)', colSpan: 2 },
        ]}
        rotuloEnviar="Transferir titularidade"
        onFechar={() => setTransferir(null)}
        onEnviar={async (v) => {
          if (!transferir || !v.pessoa_id) return;
          await cemiteriosApi.transferirTitular(transferir.id, {
            pessoa_id: Number(v.pessoa_id),
            processo_administrativo: (v.processo_administrativo as string) || undefined,
          });
          await concessoes.recarregar();
        }}
      />

      <DrawerHistoricoConcessao concessao={historico} onFechar={() => setHistorico(null)} />

      {pessoaModalId && (
        <ModalFichaPessoa
          pessoaId={pessoaModalId}
          onFechar={() => setPessoaModalId(null)}
          onAtualizado={() => {
            void titulares.recarregar();
            void concessoes.recarregar();
          }}
        />
      )}
    </div>
  );
};
