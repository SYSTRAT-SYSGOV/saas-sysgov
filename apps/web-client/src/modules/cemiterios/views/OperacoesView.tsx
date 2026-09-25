import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { FileDown, Play, CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import { Button, Card, ConfirmDialog, DataTable, StatusChip, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { cemiteriosApi, formatarData, type Exumacao, type Inumacao, type OrdemServico } from '../api';
import { aninhar, ErroBox, FormModal, Mono, useAcao, useDados, type CampoForm } from './comum';
import { useCemiteriosNavigation } from '../CemiteriosContext';

type Aba = 'ordens' | 'inumacoes' | 'exumacoes';
type Acao = 'iniciar' | 'concluir' | 'suspender' | 'cancelar';

const SITUACAO_OS: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  emitida: 'info', em_execucao: 'warning', concluida: 'success', suspensa: 'danger', cancelada: 'neutral',
};

const CAMPOS_FALECIDO: CampoForm[] = [
  { nome: 'falecido.nome', rotulo: 'Nome do falecido', obrigatorio: true },
  { nome: 'falecido.nascimento', rotulo: 'Nascimento', tipo: 'date' },
  { nome: 'falecido.falecimento', rotulo: 'Falecimento', tipo: 'date', obrigatorio: true },
];

/** Inumação, exumação, trasladação e ordens de serviço (RF-05..RF-10). */
export const OperacoesView: React.FC = () => {
  const { can } = useCan();
  const [aba, setAba] = useState<Aba>('ordens');
  const [modal, setModal] = useState<'inumacao' | 'historica' | 'exumacao' | 'judicial' | 'trasladacao' | null>(null);

  const abas = [
    { key: 'ordens' as const, label: 'Ordens de serviço' },
    { key: 'inumacoes' as const, label: 'Inumações' },
    { key: 'exumacoes' as const, label: 'Exumações' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs items={abas} value={aba} onChange={setAba} />
        <div className="flex flex-wrap gap-2">
          {can('cemiterios.operacoes.create') && <Button onClick={() => setModal('inumacao')}>Nova inumação</Button>}
          {can('cemiterios.operacoes.historico') && <Button variant="outline" onClick={() => setModal('historica')}>Lançamento histórico</Button>}
          {can('cemiterios.operacoes.create') && <Button variant="outline" onClick={() => setModal('exumacao')}>Exumação</Button>}
          {can('cemiterios.exumacao.judicial') && <Button variant="outline" onClick={() => setModal('judicial')}>Exumação judicial</Button>}
          {can('cemiterios.operacoes.create') && <Button variant="outline" onClick={() => setModal('trasladacao')}>Trasladação</Button>}
        </div>
      </div>

      {aba === 'ordens' && <OrdensServico />}
      {aba === 'inumacoes' && <Inumacoes />}
      {aba === 'exumacoes' && <Exumacoes />}

      <FormModal aberto={modal === 'inumacao'} titulo="Nova inumação" rotuloEnviar="Confirmar inumação" onFechar={() => setModal(null)}
        campos={[
          ...CAMPOS_FALECIDO,
          { nome: 'falecido.certidao_numero', rotulo: 'Nº da certidão de óbito', obrigatorio: true },
          { nome: 'falecido.certidao_cartorio', rotulo: 'Cartório emissor', obrigatorio: true },
          { nome: 'certidao_arquivo', rotulo: 'Certidão (PDF/imagem)', tipo: 'file', aceitar: '.pdf,image/*', obrigatorio: true },
          { nome: 'plot_id', rotulo: 'ID do jazigo', tipo: 'number', obrigatorio: true },
          { nome: 'gaveta_numero', rotulo: 'Nº da Gaveta / Nicho', tipo: 'number', dica: 'Identificação da gaveta ocupada na carneira' },
          { nome: 'coveiro_nome', rotulo: 'Nome do Coveiro', dica: 'Profissional responsável pela abertura/fechamento' },
          { nome: 'pedreiro_nome', rotulo: 'Nome do Pedreiro', dica: 'Profissional da alvenaria (se houver obra/reparo)' },
          { nome: 'cartorio', rotulo: 'Cartório do Registro', dica: 'Cartório de registro do óbito' },
          { nome: 'medico', rotulo: 'Médico Atestante', dica: 'Médico que assinou o atestado de óbito' },
          { nome: 'sepultado_em', rotulo: 'Data/hora do sepultamento', tipo: 'datetime-local', obrigatorio: true },
          { nome: 'equipe', rotulo: 'Equipe' },
          { nome: 'falecido.causa_morte', rotulo: 'Causa da morte (sigilosa)', tipo: 'textarea', dica: 'Cifrada; visível só com permissão restrita.' },
        ]}
        onEnviar={(v) => cemiteriosApi.inumar(aninhar(v))} />
      <FormModal aberto={modal === 'historica'} titulo="Lançamento de inumação histórica" onFechar={() => setModal(null)}
        campos={[
          ...CAMPOS_FALECIDO,
          { nome: 'plot_id', rotulo: 'ID do jazigo', tipo: 'number', obrigatorio: true },
          { nome: 'gaveta_numero', rotulo: 'Nº da Gaveta / Nicho', tipo: 'number' },
          { nome: 'coveiro_nome', rotulo: 'Nome do Coveiro' },
          { nome: 'pedreiro_nome', rotulo: 'Nome do Pedreiro' },
          { nome: 'cartorio', rotulo: 'Cartório do Registro' },
          { nome: 'medico', rotulo: 'Médico Atestante' },
          { nome: 'sepultado_em', rotulo: 'Data do sepultamento', tipo: 'date', obrigatorio: true },
          { nome: 'livro_referencia', rotulo: 'Livro/folha', obrigatorio: true },
          { nome: 'falecido.certidao_numero', rotulo: 'Nº da certidão (opcional)' },
          { nome: 'certidao_arquivo', rotulo: 'Certidão (opcional)', tipo: 'file', aceitar: '.pdf,image/*' },
        ]}
        onEnviar={(v) => cemiteriosApi.inumarHistorica(aninhar(v))} />
      <FormModal aberto={modal === 'exumacao'} titulo="Exumação ordinária" onFechar={() => setModal(null)}
        campos={[{ nome: 'burial_id', rotulo: 'ID da inumação', tipo: 'number', obrigatorio: true }, { nome: 'destino', rotulo: 'Destino dos restos' }, { nome: 'agendada_para', rotulo: 'Agendar para', tipo: 'datetime-local' }]}
        onEnviar={(v) => cemiteriosApi.exumar({ ...v, tipo: 'ordinaria' })} />
      <FormModal aberto={modal === 'judicial'} titulo="Exumação por determinação judicial" onFechar={() => setModal(null)}
        campos={[
          { nome: 'burial_id', rotulo: 'ID da inumação', tipo: 'number', obrigatorio: true },
          { nome: 'processo', rotulo: 'Nº do processo', obrigatorio: true }, { nome: 'juizo', rotulo: 'Juízo', obrigatorio: true },
          { nome: 'data_decisao', rotulo: 'Data da decisão', tipo: 'date', obrigatorio: true },
          { nome: 'mandado', rotulo: 'Mandado (PDF/imagem)', tipo: 'file', aceitar: '.pdf,image/*', obrigatorio: true },
        ]}
        onEnviar={(v) => cemiteriosApi.exumar({ ...v, tipo: 'judicial' })} />
      <FormModal aberto={modal === 'trasladacao'} titulo="Trasladação" onFechar={() => setModal(null)}
        campos={[
          { nome: 'burial_id', rotulo: 'ID da inumação', tipo: 'number', obrigatorio: true },
          { nome: 'plot_destino_id', rotulo: 'ID do jazigo de destino (interno)', tipo: 'number' },
          { nome: 'destino_externo', rotulo: 'Destino externo (outro município)' },
          { nome: 'documento_destino', rotulo: 'Documento de destino', dica: 'Obrigatório para destino externo.' },
        ]}
        onEnviar={(v) => cemiteriosApi.trasladar(v)} />
    </div>
  );
};

/** Lista de OS em cartões — utilizável em celular pela equipe de campo (RF-07, RF-10). */
const OrdensServico: React.FC = () => {
  const { can } = useCan();
  const [filtro, setFiltro] = useState<'abertas' | 'todas'>('abertas');
  const { cemiterioAtivoId } = useCemiteriosNavigation();
  const ordens = useDados(
    () =>
      cemiteriosApi.ordens({
        park_id: cemiterioAtivoId ?? undefined,
        situacao: filtro === 'abertas' ? ['emitida', 'em_execucao'] : undefined,
        per_page: 50,
      }),
    [filtro, cemiterioAtivoId]
  );
  const [pendente, setPendente] = useState<{ ordem: OrdemServico; acao: Acao } | null>(null);
  const { erro, executar } = useAcao();
  const executa = can('cemiterios.operacoes.executar');

  const confirmar = async (motivo: string) => {
    if (!pendente) return;
    const { ordem, acao } = pendente;
    setPendente(null);
    if (await executar(() => cemiteriosApi.transicaoOrdem(ordem.id, acao, motivo || undefined))) await ordens.recarregar();
  };

  return (
    <div className="space-y-3">
      <Tabs items={[{ key: 'abertas', label: 'Em aberto' }, { key: 'todas', label: 'Todas' }]} value={filtro} onChange={setFiltro} />
      <ErroBox erro={erro ?? ordens.erro} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(ordens.dados?.data ?? []).map((o) => (
          <Card key={o.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Mono className="text-lg font-bold">OS {o.numero}/{o.ano}</Mono>
                <p className="text-sm capitalize text-muted-foreground">{o.tipo} · jazigo <Mono>{o.jazigo?.codigo ?? '—'}</Mono></p>
              </div>
              <StatusChip label={o.situacao.replace('_', ' ')} variant={SITUACAO_OS[o.situacao] ?? 'neutral'} />
            </div>
            <p className="text-xs text-muted-foreground">Agendada: <Mono>{o.agendada_para ? formatarData(o.agendada_para) : 'a definir'}</Mono> · Equipe: {o.equipe ?? '—'}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" variant="outline" onClick={() => void cemiteriosApi.pdfOrdem(o)}><FileDown className="h-4 w-4" /> PDF</Button>
              {executa && o.situacao === 'emitida' && <Button size="lg" variant="outline" onClick={() => setPendente({ ordem: o, acao: 'iniciar' })}><Play className="h-4 w-4" /> Iniciar</Button>}
              {executa && ['emitida', 'em_execucao'].includes(o.situacao) && (
                <>
                  <Button size="lg" variant="success" onClick={() => setPendente({ ordem: o, acao: 'concluir' })}><CheckCircle2 className="h-4 w-4" /> Concluir</Button>
                  <Button size="lg" variant="destructive" onClick={() => setPendente({ ordem: o, acao: 'suspender' })}><PauseCircle className="h-4 w-4" /> Suspender</Button>
                </>
              )}
              {can('cemiterios.operacoes.create') && ['emitida', 'em_execucao', 'suspensa'].includes(o.situacao) && (
                <Button size="lg" variant="ghost" onClick={() => setPendente({ ordem: o, acao: 'cancelar' })}><XCircle className="h-4 w-4" /> Cancelar</Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {!ordens.carregando && ordens.dados?.data.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ordem de serviço.</p>}
      <ConfirmDialog
        open={pendente !== null}
        onClose={() => setPendente(null)}
        onConfirm={(motivo) => void confirmar(motivo)}
        requireReason={pendente?.acao === 'suspender'}
        destructive={pendente?.acao === 'suspender' || pendente?.acao === 'cancelar'}
        title={pendente ? `${pendente.acao[0].toUpperCase()}${pendente.acao.slice(1)} OS ${pendente.ordem.numero}/${pendente.ordem.ano}` : ''}
        description={pendente?.acao === 'suspender'
          ? 'Informe o motivo (ex.: restos não decompostos). Os restos permanecem no jazigo e a carência reinicia hoje.'
          : 'Confirme a operação na ordem de serviço.'}
        reasonPlaceholder="Motivo da suspensão"
        confirmLabel="Confirmar"
      />
    </div>
  );
};

const Inumacoes: React.FC = () => {
  const { can } = useCan();
  const { cemiterioAtivoId } = useCemiteriosNavigation();
  const [pendentes, setPendentes] = useState(false);
  const lista = useDados(
    () =>
      cemiteriosApi.inumacoes({
        park_id: cemiterioAtivoId ?? undefined,
        revisao_pendente: pendentes ? 1 : undefined,
        per_page: 100,
      }),
    [pendentes, cemiterioAtivoId]
  );
  const [cancelar, setCancelar] = useState<Inumacao | null>(null);
  const { erro, executar } = useAcao();

  const colunas = useMemo<ColumnDef<Inumacao, unknown>[]>(() => [
    { id: 'falecido', header: 'Falecido', accessorFn: (r) => r.falecido?.nome ?? '' },
    { id: 'jazigo', header: 'Jazigo', cell: ({ row }) => <Mono>{row.original.jazigo?.codigo}</Mono> },
    {
      id: 'gaveta',
      header: 'Gaveta',
      cell: ({ row }) => row.original.gaveta_numero ? <Mono className="text-xs">G{row.original.gaveta_numero}</Mono> : <span className="text-muted-foreground">—</span>,
    },
    { id: 'data', header: 'Sepultamento', cell: ({ row }) => <Mono>{formatarData(row.original.sepultado_em)}</Mono> },
    {
      id: 'profissionais',
      header: 'Coveiro / Pedreiro',
      cell: ({ row }) => {
        const partes = [
          row.original.coveiro_nome ? `Cov: ${row.original.coveiro_nome}` : null,
          row.original.pedreiro_nome ? `Ped: ${row.original.pedreiro_nome}` : null,
        ].filter(Boolean);
        return partes.length > 0 ? (
          <span className="text-xs text-muted-foreground">{partes.join(' · ')}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    { id: 'carencia', header: 'Carência desde', cell: ({ row }) => <Mono>{formatarData(row.original.carencia_desde)}</Mono> },
    {
      id: 'situacao', header: 'Situação', cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <StatusChip label={row.original.situacao} variant={row.original.situacao === 'confirmada' ? 'success' : 'neutral'} />
          {row.original.revisao_pendente && <StatusChip label="revisão pendente" variant="warning" />}
        </div>
      ),
    },
    {
      id: 'acoes', header: '', cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.revisao_pendente && can('cemiterios.operacoes.historico') && (
            <Button size="xs" variant="outline" onClick={async () => { if (await executar(() => cemiteriosApi.revisar(row.original.id))) await lista.recarregar(); }}>Revisar</Button>
          )}
          {row.original.situacao === 'confirmada' && can('cemiterios.operacoes.create') && (
            <Button size="xs" variant="ghost" onClick={() => setCancelar(row.original)}>Cancelar</Button>
          )}
        </div>
      ),
    },
  ], [can, executar, lista]);

  return (
    <div className="space-y-3">
      <Tabs items={[{ key: 'todas', label: 'Todas' }, { key: 'pendentes', label: 'Pendentes de revisão' }]} value={pendentes ? 'pendentes' : 'todas'} onChange={(v) => setPendentes(v === 'pendentes')} />
      <ErroBox erro={erro ?? lista.erro} />
      <DataTable columns={colunas} data={lista.dados?.data ?? []} loading={lista.carregando} searchable emptyText="Nenhuma inumação." />
      <ConfirmDialog open={cancelar !== null} onClose={() => setCancelar(null)} destructive title="Cancelar inumação"
        description="O cancelamento desfaz a ocupação e o estado do jazigo." confirmLabel="Cancelar inumação"
        onConfirm={async () => { const alvo = cancelar; setCancelar(null); if (alvo && await executar(() => cemiteriosApi.cancelarInumacao(alvo.id))) await lista.recarregar(); }} />
    </div>
  );
};

const Exumacoes: React.FC = () => {
  const { cemiterioAtivoId } = useCemiteriosNavigation();
  const lista = useDados(
    () => cemiteriosApi.exumacoes({ park_id: cemiterioAtivoId ?? undefined }),
    [cemiterioAtivoId]
  );
  const colunas = useMemo<ColumnDef<Exumacao, unknown>[]>(() => [
    { id: 'falecido', header: 'Falecido', accessorFn: (r) => r.inumacao?.falecido?.nome ?? '' },
    { id: 'tipo', header: 'Tipo', accessorKey: 'tipo' },
    { id: 'prazo', header: 'Prazo aplicado', cell: ({ row }) => <Mono>{row.original.prazo_aplicado_anos ?? '—'} anos</Mono> },
    { id: 'liberada', header: 'Liberada em', cell: ({ row }) => <Mono>{formatarData(row.original.liberada_em)}</Mono> },
    { id: 'situacao', header: 'Situação', cell: ({ row }) => <StatusChip label={row.original.situacao} variant={row.original.situacao === 'suspensa' ? 'danger' : 'info'} /> },
    { id: 'motivo', header: 'Motivo da suspensão', accessorFn: (r) => r.motivo_suspensao ?? '' },
  ], []);

  return (
    <div className="space-y-3">
      <ErroBox erro={lista.erro} />
      <DataTable columns={colunas} data={lista.dados?.data ?? []} loading={lista.carregando} emptyText="Nenhuma exumação." />
    </div>
  );
};
