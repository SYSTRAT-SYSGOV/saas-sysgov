import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, Download, Gauge, Pencil, Plus, Trash2, Wrench, XCircle } from 'lucide-react';
import { ActionsMenu, Badge, Button, Card, CardContent, ConfirmDialog, DataTable, Input, Modal, Select, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { useFormValidationModal } from '@/lib/useFormValidationModal';
import { mensagemDeErro, transporteApi, type Fornecedor, type GrupoGasto, type ManutencaoPrevista, type Opcoes, type OrdemServico, type Veiculo } from '../api';
import { data, prazo, prazoKm, reais } from '../formato';

const TODOS = 'todos';
const NENHUM = '0';

const numeroOuNulo = (v: string): number | null => (v.trim() === '' ? null : Number(v.replace(',', '.')));
const hoje = (): string => new Date().toISOString().slice(0, 10);

function entregar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Manutenção da frota: ordens de serviço, manutenções previstas, quilometragem, fornecedores e gastos. */
export const Manutencao: React.FC<{ opcoes: Opcoes; avisar: Toast }> = ({ opcoes, avisar }) => {
  const gerir = opcoes.permissoes.gerenciar_manutencao;
  return (
    <Tabs defaultValue="ordens">
      <TabsList>
        <TabsTrigger value="ordens">Ordens de serviço</TabsTrigger>
        <TabsTrigger value="previstas">Manutenção prevista</TabsTrigger>
        <TabsTrigger value="veiculos">Quilometragem</TabsTrigger>
        <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        <TabsTrigger value="gastos">Gastos</TabsTrigger>
      </TabsList>
      <TabsContent value="ordens"><Ordens opcoes={opcoes} gerir={gerir} avisar={avisar} /></TabsContent>
      <TabsContent value="previstas"><Previstas gerir={gerir} avisar={avisar} /></TabsContent>
      <TabsContent value="veiculos"><Quilometragem gerir={gerir} avisar={avisar} /></TabsContent>
      <TabsContent value="fornecedores"><Fornecedores opcoes={opcoes} gerir={gerir} avisar={avisar} /></TabsContent>
      <TabsContent value="gastos"><Gastos opcoes={opcoes} avisar={avisar} /></TabsContent>
    </Tabs>
  );
};

/* ------------------------------------------------------------------ Ordens de serviço */

const Ordens: React.FC<{ opcoes: Opcoes; gerir: boolean; avisar: Toast }> = ({ opcoes, gerir, avisar }) => {
  const [status, setStatus] = useState('aberta');
  const [pagina, setPagina] = useState(1);
  const carga = useCarga(() => transporteApi.ordensServico({ status: status === TODOS ? undefined : status, page: pagina }), [status, pagina]);
  const fornecedores = useCarga(() => transporteApi.fornecedores(), []);
  const [editando, setEditando] = useState<OrdemServico | 'nova' | null>(null);
  const [concluindo, setConcluindo] = useState<OrdemServico | null>(null);
  const [cancelando, setCancelando] = useState<OrdemServico | null>(null);

  const colunas = useMemo<ColumnDef<OrdemServico>[]>(() => [
    {
      id: 'acoes', header: '', size: 56, enableSorting: false,
      cell: ({ row }) => row.original.status === 'aberta' && gerir ? (
        <ActionsMenu triggerLabel={`Ações da ordem ${row.original.id}`} items={[
          { key: 'concluir', label: 'Concluir', icon: <CheckCircle2 className="h-3.5 w-3.5" />, onSelect: () => setConcluindo(row.original) },
          { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEditando(row.original) },
          { key: 'cancelar', label: 'Cancelar ordem', icon: <XCircle className="h-3.5 w-3.5" />, onSelect: () => setCancelando(row.original) },
        ]} />
      ) : null,
    },
    { id: 'veiculo', header: 'Veículo', accessorFn: (o) => o.veiculo?.placa ?? '', cell: ({ row }) => <span className="font-mono font-semibold tabular-nums">{row.original.veiculo?.placa}</span>, meta: { exportHeader: 'Veículo', exportValue: (o: OrdemServico) => o.veiculo?.placa ?? '' } },
    { id: 'tipo', header: 'Tipo', accessorKey: 'tipo_rotulo', meta: { exportHeader: 'Tipo', exportValue: (o: OrdemServico) => o.tipo_rotulo } },
    { id: 'descricao', header: 'Serviço', accessorKey: 'descricao', meta: { exportHeader: 'Serviço', exportValue: (o: OrdemServico) => o.descricao } },
    { id: 'fornecedor', header: 'Fornecedor', accessorFn: (o) => o.fornecedor?.nome ?? 'Interno', meta: { exportHeader: 'Fornecedor', exportValue: (o: OrdemServico) => o.fornecedor?.nome ?? '' } },
    { id: 'aberta', header: 'Abertura', accessorKey: 'aberta_em', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{data(row.original.aberta_em)}</span>, meta: { exportHeader: 'Abertura', exportValue: (o: OrdemServico) => data(o.aberta_em) } },
    { id: 'valor', header: 'Valor', accessorFn: (o) => o.valor ?? 0, cell: ({ row }) => <span className="font-mono tabular-nums">{reais(row.original.valor)}</span>, meta: { exportHeader: 'Valor', exportValue: (o: OrdemServico) => reais(o.valor) } },
    {
      id: 'status', header: 'Situação', accessorKey: 'status_rotulo',
      cell: ({ row }) => row.original.status === 'aberta' ? <Badge variant="secondary">Aberta</Badge> : row.original.status === 'concluida' ? <Badge variant="outline">Concluída em {data(row.original.concluida_em)}</Badge> : <Badge variant="destructive">Cancelada</Badge>,
      meta: { exportHeader: 'Situação', exportValue: (o: OrdemServico) => o.status_rotulo },
    },
  ], [gerir]);

  const recarregar = () => { setEditando(null); setConcluindo(null); void carga.recarregar(); };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-52">
            <Select label="Situação" value={status} onChange={(v) => { setStatus(v); setPagina(1); }}
              options={[{ value: 'aberta', label: 'Abertas' }, { value: 'concluida', label: 'Concluídas' }, { value: 'cancelada', label: 'Canceladas' }, { value: TODOS, label: 'Todas' }]} />
          </div>
          {gerir && <Button onClick={() => setEditando('nova')}><Plus className="mr-1 h-4 w-4" />Nova ordem de serviço</Button>}
        </div>
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <>
            <DataTable columns={colunas} data={carga.dados.data} emptyText="Nenhuma ordem de serviço." exportable exportFileName="transporte-ordens-servico" exportTitle="Transporte Escolar — Ordens de serviço" />
            {carga.dados.last_page > 1 && (
              <div className="flex items-center justify-end gap-2 text-sm">
                <span className="text-muted-foreground">Página {carga.dados.current_page} de {carga.dados.last_page}</span>
                <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={pagina >= carga.dados.last_page} onClick={() => setPagina((p) => p + 1)}>Próxima</Button>
              </div>
            )}
          </>
        )}
      </CardContent>
      {editando && (
        <OrdemModal opcoes={opcoes} fornecedores={(fornecedores.dados ?? []).filter((f) => f.ativo)} ordem={editando === 'nova' ? null : editando} aoFechar={() => setEditando(null)}
          aoSalvar={() => { avisar({ type: 'success', title: 'Ordem de serviço', message: 'Ordem salva.' }); recarregar(); }} />
      )}
      {concluindo && <ConcluirModal ordem={concluindo} aoFechar={() => setConcluindo(null)} aoConcluir={() => { avisar({ type: 'success', title: 'Ordem de serviço', message: 'Ordem concluída.' }); recarregar(); }} />}
      <ConfirmDialog open={cancelando !== null} onClose={() => setCancelando(null)} title="Cancelar ordem de serviço"
        description={`Cancelar a ordem "${cancelando?.descricao ?? ''}"? Ela não poderá mais ser alterada.`} confirmLabel="Cancelar ordem" requireReason={false}
        onConfirm={() => {
          const alvo = cancelando;
          setCancelando(null);
          if (alvo) void transporteApi.cancelarOrdemServico(alvo.id, null).then(() => { avisar({ type: 'success', title: 'Ordem de serviço', message: 'Ordem cancelada.' }); void carga.recarregar(); })
            .catch((e) => avisar({ type: 'error', title: 'Ordem de serviço', message: mensagemDeErro(e) }));
        }} />
    </Card>
  );
};

const OrdemModal: React.FC<{ opcoes: Opcoes; fornecedores: Fornecedor[]; ordem: OrdemServico | null; aoFechar: () => void; aoSalvar: () => void }> = ({ opcoes, fornecedores, ordem, aoFechar, aoSalvar }) => {
  const [d, setD] = useState({
    veiculo_id: String(ordem?.veiculo?.id ?? NENHUM), fornecedor_id: String(ordem?.fornecedor?.id ?? NENHUM), tipo: ordem?.tipo ?? opcoes.tipos_servico[0]?.valor ?? 'corretiva',
    descricao: ordem?.descricao ?? '', aberta_em: ordem?.aberta_em ?? hoje(), km: ordem?.km !== null && ordem?.km !== undefined ? String(ordem.km) : '',
    valor: ordem?.valor !== null && ordem?.valor !== undefined ? String(ordem.valor) : '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const campo = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));

  const salvar = async () => {
    setErro(null);
    const faltando: [string, string][] = [];
    if (!ordem && d.veiculo_id === NENHUM) faltando.push(['Veículo', 'Escolha o veículo.']);
    if (d.descricao.trim().length < 3) faltando.push(['Serviço', 'Descreva o serviço (mínimo de 3 letras).']);
    if (!d.aberta_em) faltando.push(['Abertura', 'Informe a data de abertura.']);
    if (faltando.length > 0) return invalidar(faltando);
    setSalvando(true);
    try {
      await transporteApi.salvarOrdemServico(ordem?.id ?? null, {
        ...(ordem ? {} : { veiculo_id: Number(d.veiculo_id) }), fornecedor_id: d.fornecedor_id === NENHUM ? null : Number(d.fornecedor_id), tipo: d.tipo,
        descricao: d.descricao.trim(), aberta_em: d.aberta_em, km: numeroOuNulo(d.km), valor: numeroOuNulo(d.valor),
      });
      aoSalvar();
    } catch (e) { if (!tratarErro(e)) setErro(mensagemDeErro(e)); } finally { setSalvando(false); }
  };

  return (
    <Modal open onClose={aoFechar} title={ordem ? 'Editar ordem de serviço' : 'Nova ordem de serviço'} size="lg"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {ordem ? <p className="self-end pb-2 text-sm">Veículo <strong className="font-mono">{ordem.veiculo?.placa}</strong></p> : (
            <Select label="Veículo *" value={d.veiculo_id} onChange={(v) => campo('veiculo_id', v)} placeholder="Selecione…" options={opcoes.veiculos.map((v) => ({ value: String(v.id), label: `${v.placa} — ${v.descricao}` }))} />
          )}
          <Select label="Tipo de serviço *" value={d.tipo} onChange={(v) => campo('tipo', v)} options={opcoes.tipos_servico.map((t) => ({ value: t.valor, label: t.rotulo }))} />
          <Select label="Fornecedor" value={d.fornecedor_id} onChange={(v) => campo('fornecedor_id', v)} options={[{ value: NENHUM, label: 'Serviço interno (sem fornecedor)' }, ...fornecedores.map((f) => ({ value: String(f.id), label: f.nome }))]} />
          <Input label="Abertura *" type="date" value={d.aberta_em} className="font-mono tabular-nums" onChange={(e) => campo('aberta_em', e.target.value)} />
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">Serviço *</span>
          <Textarea value={d.descricao} rows={2} maxLength={500} onChange={(e) => campo('descricao', e.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Quilometragem (km)" inputMode="numeric" value={d.km} className="font-mono tabular-nums" onChange={(e) => campo('km', e.target.value)} />
          <Input label="Valor previsto (R$)" inputMode="decimal" value={d.valor} className="font-mono tabular-nums" onChange={(e) => campo('valor', e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">Com a ordem aberta, o veículo aparece “em manutenção” e as novas rotas com ele recebem um aviso.</p>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};

const ConcluirModal: React.FC<{ ordem: OrdemServico; aoFechar: () => void; aoConcluir: () => void }> = ({ ordem, aoFechar, aoConcluir }) => {
  const [d, setD] = useState({ concluida_em: hoje(), km: ordem.km !== null ? String(ordem.km) : '', valor: ordem.valor !== null ? String(ordem.valor) : '' });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const confirmar = async () => {
    setErro(null);
    setSalvando(true);
    try { await transporteApi.concluirOrdemServico(ordem.id, { concluida_em: d.concluida_em, km: numeroOuNulo(d.km), valor: numeroOuNulo(d.valor) }); aoConcluir(); } catch (e) { setErro(mensagemDeErro(e)); } finally { setSalvando(false); }
  };
  return (
    <Modal open onClose={aoFechar} title={`Concluir: ${ordem.descricao}`} size="md"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void confirmar()} isLoading={salvando}>Concluir ordem</Button></>}>
      <div className="space-y-3">
        <Input label="Data de conclusão *" type="date" value={d.concluida_em} className="font-mono tabular-nums" onChange={(e) => setD((x) => ({ ...x, concluida_em: e.target.value }))} />
        <Input label="Quilometragem do veículo (km)" inputMode="numeric" value={d.km} className="font-mono tabular-nums" onChange={(e) => setD((x) => ({ ...x, km: e.target.value }))} />
        <Input label="Valor final (R$)" inputMode="decimal" value={d.valor} className="font-mono tabular-nums" onChange={(e) => setD((x) => ({ ...x, valor: e.target.value }))} />
        <p className="text-xs text-muted-foreground">A quilometragem não pode ser menor que a atual do veículo; se for maior, o hodômetro é atualizado. Concluída, a ordem não pode mais ser alterada.</p>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ Manutenção prevista */

const Previstas: React.FC<{ gerir: boolean; avisar: Toast }> = ({ gerir, avisar }) => {
  const carga = useCarga(() => transporteApi.manutencoesPrevistas('pendente'), []);
  const veiculos = useCarga(() => transporteApi.veiculos(), []);
  const fornecedores = useCarga(() => transporteApi.fornecedores(), []);
  const [nova, setNova] = useState(false);
  const [convertendo, setConvertendo] = useState<ManutencaoPrevista | null>(null);
  const [cancelando, setCancelando] = useState<ManutencaoPrevista | null>(null);

  const quando = (p: ManutencaoPrevista): string => {
    const partes: string[] = [];
    if (p.data_prevista) partes.push(`${data(p.data_prevista)} (${prazo(p.dias_restantes ?? 0)})`);
    if (p.km_previsto !== null) partes.push(`${p.km_previsto.toLocaleString('pt-BR')} km${p.km_restante !== null ? ` (${prazoKm(p.km_restante)})` : ''}`);
    return partes.join(' · ');
  };
  const vencida = (p: ManutencaoPrevista): boolean => (p.dias_restantes !== null && p.dias_restantes < 0) || (p.km_restante !== null && p.km_restante <= 0);

  const colunas = useMemo<ColumnDef<ManutencaoPrevista>[]>(() => [
    {
      id: 'acoes', header: '', size: 56, enableSorting: false,
      cell: ({ row }) => gerir ? (
        <ActionsMenu triggerLabel={`Ações da previsão ${row.original.descricao}`} items={[
          { key: 'converter', label: 'Converter em ordem', icon: <Wrench className="h-3.5 w-3.5" />, onSelect: () => setConvertendo(row.original) },
          { key: 'cancelar', label: 'Cancelar previsão', icon: <XCircle className="h-3.5 w-3.5" />, onSelect: () => setCancelando(row.original) },
        ]} />
      ) : null,
    },
    { id: 'veiculo', header: 'Veículo', accessorFn: (p) => p.veiculo?.placa ?? '', cell: ({ row }) => <span className="font-mono font-semibold tabular-nums">{row.original.veiculo?.placa}</span>, meta: { exportHeader: 'Veículo', exportValue: (p: ManutencaoPrevista) => p.veiculo?.placa ?? '' } },
    { id: 'descricao', header: 'Manutenção', accessorKey: 'descricao', meta: { exportHeader: 'Manutenção', exportValue: (p: ManutencaoPrevista) => p.descricao } },
    { id: 'quando', header: 'Previsão', accessorFn: quando, meta: { exportHeader: 'Previsão', exportValue: quando } },
    { id: 'situacao', header: 'Situação', accessorFn: (p) => (vencida(p) ? 'Vencida' : 'No prazo'), cell: ({ row }) => (vencida(row.original) ? <Badge variant="destructive">Vencida</Badge> : <Badge variant="outline">No prazo</Badge>), meta: { exportHeader: 'Situação', exportValue: (p: ManutencaoPrevista) => (vencida(p) ? 'Vencida' : 'No prazo') } },
  ], [gerir]);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Manutenções pendentes. Quando faltam 30 dias ou 500 km, ou quando vencem, aparecem como alerta no Painel.</p>
          {gerir && <Button onClick={() => setNova(true)}><Plus className="mr-1 h-4 w-4" />Registrar previsão</Button>}
        </div>
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && <DataTable columns={colunas} data={carga.dados} emptyText="Nenhuma manutenção prevista pendente." />}
      </CardContent>
      {nova && <PrevistaModal veiculos={veiculos.dados ?? []} aoFechar={() => setNova(false)} aoSalvar={() => { setNova(false); avisar({ type: 'success', title: 'Manutenção prevista', message: 'Previsão registrada.' }); void carga.recarregar(); }} />}
      {convertendo && (
        <ConverterModal prevista={convertendo} fornecedores={(fornecedores.dados ?? []).filter((f) => f.ativo)} aoFechar={() => setConvertendo(null)}
          aoConverter={() => { setConvertendo(null); avisar({ type: 'success', title: 'Manutenção prevista', message: 'Ordem de serviço aberta.' }); void carga.recarregar(); }} />
      )}
      <ConfirmDialog open={cancelando !== null} onClose={() => setCancelando(null)} title="Cancelar previsão" description={`Cancelar a previsão "${cancelando?.descricao ?? ''}"? O alerta deixa de aparecer.`}
        confirmLabel="Cancelar previsão" requireReason={false}
        onConfirm={() => { const alvo = cancelando; setCancelando(null); if (alvo) void transporteApi.cancelarManutencaoPrevista(alvo.id).then(() => void carga.recarregar()).catch((e) => avisar({ type: 'error', title: 'Manutenção prevista', message: mensagemDeErro(e) })); }} />
    </Card>
  );
};

const PrevistaModal: React.FC<{ veiculos: Veiculo[]; aoFechar: () => void; aoSalvar: () => void }> = ({ veiculos, aoFechar, aoSalvar }) => {
  const [d, setD] = useState({ veiculo_id: NENHUM, descricao: '', data_prevista: '', km_previsto: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const salvar = async () => {
    setErro(null);
    const faltando: [string, string][] = [];
    if (d.veiculo_id === NENHUM) faltando.push(['Veículo', 'Escolha o veículo.']);
    if (d.descricao.trim().length < 3) faltando.push(['Manutenção', 'Descreva a manutenção (mínimo de 3 letras).']);
    if (!d.data_prevista && d.km_previsto.trim() === '') faltando.push(['Previsão', 'Informe a data prevista, a quilometragem prevista ou as duas.']);
    if (faltando.length > 0) return invalidar(faltando);
    setSalvando(true);
    try {
      await transporteApi.criarManutencaoPrevista({ veiculo_id: Number(d.veiculo_id), descricao: d.descricao.trim(), data_prevista: d.data_prevista || null, km_previsto: numeroOuNulo(d.km_previsto) });
      aoSalvar();
    } catch (e) { if (!tratarErro(e)) setErro(mensagemDeErro(e)); } finally { setSalvando(false); }
  };
  return (
    <Modal open onClose={aoFechar} title="Registrar manutenção prevista" size="md"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-3">
        <Select label="Veículo *" value={d.veiculo_id} onChange={(v) => setD((x) => ({ ...x, veiculo_id: v }))} placeholder="Selecione…" options={veiculos.filter((v) => v.ativo).map((v) => ({ value: String(v.id), label: `${v.placa} — ${v.descricao}` }))} />
        <Input label="Manutenção *" value={d.descricao} maxLength={255} onChange={(e) => setD((x) => ({ ...x, descricao: e.target.value }))} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Data prevista" type="date" value={d.data_prevista} className="font-mono tabular-nums" onChange={(e) => setD((x) => ({ ...x, data_prevista: e.target.value }))} />
          <Input label="Quilometragem prevista (km)" inputMode="numeric" value={d.km_previsto} className="font-mono tabular-nums" onChange={(e) => setD((x) => ({ ...x, km_previsto: e.target.value }))} />
        </div>
        <p className="text-xs text-muted-foreground">Informe a data, a quilometragem ou as duas. O alerta por quilometragem depende de o hodômetro do veículo estar atualizado.</p>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};

const ConverterModal: React.FC<{ prevista: ManutencaoPrevista; fornecedores: Fornecedor[]; aoFechar: () => void; aoConverter: () => void }> = ({ prevista, fornecedores, aoFechar, aoConverter }) => {
  const [fornecedor, setFornecedor] = useState(NENHUM);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const confirmar = async () => {
    setErro(null);
    setSalvando(true);
    try { await transporteApi.converterManutencaoPrevista(prevista.id, fornecedor === NENHUM ? null : Number(fornecedor)); aoConverter(); } catch (e) { setErro(mensagemDeErro(e)); } finally { setSalvando(false); }
  };
  return (
    <Modal open onClose={aoFechar} title={`Converter em ordem de serviço: ${prevista.descricao}`} size="md"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void confirmar()} isLoading={salvando}>Abrir ordem de serviço</Button></>}>
      <div className="space-y-3">
        <p className="text-sm">Abre uma ordem <strong>preventiva</strong> para o veículo <span className="font-mono">{prevista.veiculo?.placa}</span> com a data de hoje. A previsão fica como convertida.</p>
        <Select label="Fornecedor" value={fornecedor} onChange={setFornecedor} options={[{ value: NENHUM, label: 'Serviço interno (sem fornecedor)' }, ...fornecedores.map((f) => ({ value: String(f.id), label: f.nome }))]} />
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ Quilometragem */

const Quilometragem: React.FC<{ gerir: boolean; avisar: Toast }> = ({ gerir, avisar }) => {
  const carga = useCarga(() => transporteApi.veiculos(), []);
  const [alvo, setAlvo] = useState<Veiculo | null>(null);

  const colunas = useMemo<ColumnDef<Veiculo>[]>(() => [
    {
      id: 'acoes', header: '', size: 56, enableSorting: false,
      cell: ({ row }) => gerir ? <Button variant="ghost" size="sm" aria-label={`Registrar quilometragem de ${row.original.placa}`} onClick={() => setAlvo(row.original)}><Gauge className="h-4 w-4" /></Button> : null,
    },
    { id: 'placa', header: 'Placa', accessorKey: 'placa', cell: ({ row }) => <span className="font-mono font-semibold tabular-nums">{row.original.placa}</span>, meta: { exportHeader: 'Placa', exportValue: (v: Veiculo) => v.placa } },
    { id: 'descricao', header: 'Descrição', accessorKey: 'descricao', meta: { exportHeader: 'Descrição', exportValue: (v: Veiculo) => v.descricao } },
    { id: 'km', header: 'Quilometragem', accessorFn: (v) => v.km_atual ?? -1, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.km_atual !== null ? `${row.original.km_atual.toLocaleString('pt-BR')} km` : 'não informada'}</span>, meta: { exportHeader: 'Quilometragem', exportValue: (v: Veiculo) => (v.km_atual !== null ? String(v.km_atual) : '') } },
    { id: 'atualizado', header: 'Atualizada em', accessorFn: (v) => v.km_atualizado_em ?? '', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{data(row.original.km_atualizado_em?.slice(0, 10))}</span>, meta: { exportHeader: 'Atualizada em', exportValue: (v: Veiculo) => data(v.km_atualizado_em?.slice(0, 10)) } },
    { id: 'manut', header: 'Manutenção', accessorFn: (v) => (v.em_manutencao ? 'Em manutenção' : ''), cell: ({ row }) => (row.original.em_manutencao ? <Badge variant="secondary">Em manutenção</Badge> : <span className="text-muted-foreground">—</span>), meta: { exportHeader: 'Manutenção', exportValue: (v: Veiculo) => (v.em_manutencao ? 'Em manutenção' : '') } },
  ], [gerir]);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">O hodômetro é atualizado ao concluir uma ordem de serviço e pode ser corrigido aqui. Reduzir o valor pede confirmação e fica na auditoria.</p>
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && <DataTable columns={colunas} data={carga.dados} emptyText="Nenhum veículo cadastrado." exportable exportFileName="transporte-quilometragem" exportTitle="Transporte Escolar — Quilometragem" />}
      </CardContent>
      {alvo && <KmModal veiculo={alvo} aoFechar={() => setAlvo(null)} aoSalvar={() => { setAlvo(null); avisar({ type: 'success', title: 'Quilometragem', message: 'Quilometragem registrada.' }); void carga.recarregar(); }} />}
    </Card>
  );
};

const KmModal: React.FC<{ veiculo: Veiculo; aoFechar: () => void; aoSalvar: () => void }> = ({ veiculo, aoFechar, aoSalvar }) => {
  const [km, setKm] = useState(veiculo.km_atual !== null ? String(veiculo.km_atual) : '');
  const [reduzindo, setReduzindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const valor = numeroOuNulo(km);
  const reducao = valor !== null && veiculo.km_atual !== null && valor < veiculo.km_atual;

  const salvar = async () => {
    setErro(null);
    if (valor === null || !Number.isInteger(valor) || valor < 0) { setErro('Informe a quilometragem em km, com números inteiros.'); return; }
    setSalvando(true);
    try { await transporteApi.registrarQuilometragem(veiculo.id, valor, reducao && reduzindo); aoSalvar(); } catch (e) { setErro(mensagemDeErro(e)); } finally { setSalvando(false); }
  };
  return (
    <Modal open onClose={aoFechar} title={`Quilometragem de ${veiculo.placa}`} size="md"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      <div className="space-y-3">
        <Input label="Quilometragem atual (km) *" inputMode="numeric" value={km} className="font-mono tabular-nums" onChange={(e) => setKm(e.target.value)} />
        {reducao && (
          <label className="flex items-start gap-2 text-sm">
            <Switch checked={reduzindo} onCheckedChange={setReduzindo} aria-label="Confirmar correção do hodômetro" />
            <span>O valor é menor que o atual ({veiculo.km_atual?.toLocaleString('pt-BR')} km). Confirmo que é uma <strong>correção do hodômetro</strong>.</span>
          </label>
        )}
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ Fornecedores */

const Fornecedores: React.FC<{ opcoes: Opcoes; gerir: boolean; avisar: Toast }> = ({ opcoes, gerir, avisar }) => {
  const carga = useCarga(() => transporteApi.fornecedores(), []);
  const [editando, setEditando] = useState<Fornecedor | 'novo' | null>(null);
  const [excluindo, setExcluindo] = useState<Fornecedor | null>(null);

  const colunas = useMemo<ColumnDef<Fornecedor>[]>(() => [
    {
      id: 'acoes', header: '', size: 56, enableSorting: false,
      cell: ({ row }) => gerir ? (
        <ActionsMenu triggerLabel={`Ações do fornecedor ${row.original.nome}`} items={[
          { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEditando(row.original) },
          { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setExcluindo(row.original) },
        ]} />
      ) : null,
    },
    { id: 'nome', header: 'Fornecedor', accessorKey: 'nome', cell: ({ row }) => <span className="font-medium">{row.original.nome}</span>, meta: { exportHeader: 'Fornecedor', exportValue: (f: Fornecedor) => f.nome } },
    { id: 'cnpj', header: 'CNPJ', accessorFn: (f) => f.cnpj_mascarado ?? '', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.cnpj_mascarado}</span>, meta: { exportHeader: 'CNPJ', exportValue: (f: Fornecedor) => f.cnpj_mascarado ?? '' } },
    { id: 'ramos', header: 'Ramos', accessorFn: (f) => f.ramos_rotulos.join(', '), meta: { exportHeader: 'Ramos', exportValue: (f: Fornecedor) => f.ramos_rotulos.join(', ') } },
    { id: 'contato', header: 'Contato', accessorFn: (f) => f.contato ?? '', meta: { exportHeader: 'Contato', exportValue: (f: Fornecedor) => f.contato ?? '' } },
    { id: 'ativo', header: 'Situação', accessorFn: (f) => (f.ativo ? 'Ativo' : 'Inativo'), cell: ({ row }) => (row.original.ativo ? <Badge variant="outline">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>), meta: { exportHeader: 'Situação', exportValue: (f: Fornecedor) => (f.ativo ? 'Ativo' : 'Inativo') } },
  ], [gerir]);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {gerir && <div className="flex justify-end"><Button onClick={() => setEditando('novo')}><Plus className="mr-1 h-4 w-4" />Novo fornecedor</Button></div>}
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && <DataTable columns={colunas} data={carga.dados} emptyText="Nenhum fornecedor cadastrado." exportable exportFileName="transporte-fornecedores" exportTitle="Transporte Escolar — Fornecedores" />}
      </CardContent>
      {editando && <FornecedorModal opcoes={opcoes} fornecedor={editando === 'novo' ? null : editando} aoFechar={() => setEditando(null)} aoSalvar={() => { setEditando(null); avisar({ type: 'success', title: 'Fornecedor', message: 'Fornecedor salvo.' }); void carga.recarregar(); }} />}
      <ConfirmDialog open={excluindo !== null} onClose={() => setExcluindo(null)} title="Excluir fornecedor"
        description={`Excluir ${excluindo?.nome ?? ''}? Fornecedor com ordens de serviço não pode ser excluído: inative-o.`} confirmLabel="Excluir" requireReason={false}
        onConfirm={() => { const alvo = excluindo; setExcluindo(null); if (alvo) void transporteApi.excluirFornecedor(alvo.id).then(() => void carga.recarregar()).catch((e) => avisar({ type: 'error', title: 'Fornecedor', message: mensagemDeErro(e) })); }} />
    </Card>
  );
};

const FornecedorModal: React.FC<{ opcoes: Opcoes; fornecedor: Fornecedor | null; aoFechar: () => void; aoSalvar: () => void }> = ({ opcoes, fornecedor, aoFechar, aoSalvar }) => {
  const [d, setD] = useState({
    cnpj: '', razao_social: '', nome_fantasia: '', ramos: fornecedor?.ramos ?? ([] as string[]), contato: fornecedor?.contato ?? '', ativo: fornecedor?.ativo ?? true, observacoes: fornecedor?.observacoes ?? '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const campo = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));

  const salvar = async () => {
    setErro(null);
    const faltando: [string, string][] = [];
    if (!fornecedor && !d.cnpj.trim()) faltando.push(['CNPJ', 'Informe o CNPJ.']);
    if (!fornecedor && !d.razao_social.trim()) faltando.push(['Razão social', 'Informe a razão social.']);
    if (d.ramos.length === 0) faltando.push(['Ramos', 'Marque ao menos um ramo de atuação.']);
    if (faltando.length > 0) return invalidar(faltando);
    setSalvando(true);
    try {
      await transporteApi.salvarFornecedor(fornecedor?.id ?? null, {
        ...(fornecedor ? {} : { cnpj: d.cnpj, razao_social: d.razao_social.trim(), nome_fantasia: d.nome_fantasia.trim() || null }),
        ramos: d.ramos, contato: d.contato.trim() || null, ativo: d.ativo, observacoes: d.observacoes.trim() || null,
      });
      aoSalvar();
    } catch (e) { if (!tratarErro(e)) setErro(mensagemDeErro(e)); } finally { setSalvando(false); }
  };

  return (
    <Modal open onClose={aoFechar} title={fornecedor ? `Editar ${fornecedor.nome}` : 'Novo fornecedor'} size="lg"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-4">
        {fornecedor ? <p className="text-sm">CNPJ <span className="font-mono tabular-nums">{fornecedor.cnpj_mascarado}</span> — razão social e CNPJ vêm do Cadastro de Pessoas.</p> : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="CNPJ *" value={d.cnpj} inputMode="numeric" maxLength={18} className="font-mono tabular-nums" onChange={(e) => campo('cnpj', e.target.value)} />
            <Input label="Razão social *" value={d.razao_social} maxLength={200} onChange={(e) => campo('razao_social', e.target.value)} />
            <Input label="Nome fantasia" value={d.nome_fantasia} maxLength={200} onChange={(e) => campo('nome_fantasia', e.target.value)} />
            <p className="self-end text-xs text-muted-foreground">Se o CNPJ já estiver no Cadastro de Pessoas, o fornecedor é ligado a essa pessoa jurídica.</p>
          </div>
        )}
        <fieldset className="space-y-1">
          <legend className="text-sm font-semibold">Ramos de atuação *</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {opcoes.ramos_fornecedor.map((r) => (
              <label key={r.valor} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={d.ramos.includes(r.valor)} onChange={() => campo('ramos', d.ramos.includes(r.valor) ? d.ramos.filter((x) => x !== r.valor) : [...d.ramos, r.valor])} />{r.rotulo}
              </label>
            ))}
          </div>
        </fieldset>
        <Input label="Contato" value={d.contato} maxLength={150} onChange={(e) => campo('contato', e.target.value)} />
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">Observações</span>
          <Textarea value={d.observacoes} rows={2} maxLength={2000} onChange={(e) => campo('observacoes', e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={d.ativo} onCheckedChange={(v) => campo('ativo', v)} aria-label="Fornecedor ativo" />Fornecedor ativo</label>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ Gastos */

const Gastos: React.FC<{ opcoes: Opcoes; avisar: Toast }> = ({ opcoes, avisar }) => {
  const [ano, setAno] = useState(String(opcoes.anos_letivos[0] ?? new Date().getFullYear()));
  const carga = useCarga(() => transporteApi.gastosManutencao(Number(ano)), [ano]);
  const [ocupado, setOcupado] = useState(false);
  const r = carga.dados;

  const baixar = async () => {
    setOcupado(true);
    try { const a = await transporteApi.baixarManutencao(Number(ano)); entregar(a.blob, a.nome); } catch (e) { avisar({ type: 'error', title: 'Manutenção', message: mensagemDeErro(e) }); } finally { setOcupado(false); }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-40"><Select label="Ano" value={ano} onChange={setAno} options={Array.from(new Set([...opcoes.anos_letivos, new Date().getFullYear()])).sort().reverse().map((a) => ({ value: String(a), label: String(a) }))} /></div>
          <Button variant="outline" onClick={() => void baixar()} disabled={ocupado}><Download className="mr-1 h-4 w-4" />Baixar CSV das ordens</Button>
        </div>
        <EstadoCarga carregando={carga.carregando && !r} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {r && (
          <>
            <ul className="grid gap-2 sm:grid-cols-2">
              <li className="rounded border border-border p-2 text-sm">Gasto no ano (ordens concluídas)<strong className="block font-mono text-lg tabular-nums">{reais(r.total)}</strong></li>
              <li className="rounded border border-border p-2 text-sm">Ordens concluídas<strong className="block font-mono text-lg tabular-nums">{r.ordens}</strong></li>
            </ul>
            <TabelaGastos titulo="Por veículo" grupos={r.por_veiculo} />
            <TabelaGastos titulo="Por fornecedor" grupos={r.por_fornecedor} />
            <TabelaGastos titulo="Por tipo de serviço" grupos={r.por_tipo} />
          </>
        )}
      </CardContent>
    </Card>
  );
};

const TabelaGastos: React.FC<{ titulo: string; grupos: GrupoGasto[] }> = ({ titulo, grupos }) => (
  <div className="overflow-auto rounded border border-border">
    <table className="w-full text-sm">
      <caption className="p-2 text-left font-semibold">{titulo}</caption>
      <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="px-2 py-1">Nome</th><th className="px-2 py-1 text-right">Ordens</th><th className="px-2 py-1 text-right">Valor</th></tr></thead>
      <tbody>
        {grupos.length === 0 && <tr><td colSpan={3} className="px-2 py-2 text-muted-foreground">Sem ordens concluídas neste ano.</td></tr>}
        {grupos.map((g) => <tr key={g.nome} className="border-t border-border"><td className="px-2 py-1">{g.nome}</td><td className="px-2 py-1 text-right font-mono tabular-nums">{g.ordens}</td><td className="px-2 py-1 text-right font-mono tabular-nums">{reais(g.valor)}</td></tr>)}
      </tbody>
    </table>
  </div>
);
