import React, { useState } from 'react';
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, Input, Modal, Select, Skeleton, StatusChip, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type CategoriaDemanda, type Demanda, type MunicipioLinha, type Prioridade, type StatusDemanda } from '../api';
import { ROTULO_CATEGORIA, ROTULO_PRIORIDADE, ROTULO_STATUS_DEMANDA, VARIANTE_PRIORIDADE, VARIANTE_STATUS_DEMANDA, formatarData, formatarDataHora } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { SelectMunicipio, nomeDoMunicipio, useMunicipiosDaCampanha, vazioParaNulo } from './Comuns';

const opcoes = <T extends string>(rotulos: Record<T, string>) => (Object.entries(rotulos) as [T, string][]).map(([value, label]) => ({ value, label }));

interface Filtros { codigo_ibge?: number; status?: StatusDemanda; prioridade?: Prioridade; responsavel_id?: number; atrasadas?: boolean }

/** Demandas por município, com responsável, prazo, situação e histórico (spec: Demandas da campanha). */
export const DemandasCampanha: React.FC<PropsAba> = ({ campanha, permissoes, avisar, alterou, versao }) => {
  const municipios = useMunicipiosDaCampanha(campanha.id);
  const responsaveis = useCarga(() => campanhaApi.responsaveisDemanda(), [campanha.id]);
  const [filtros, setFiltros] = useState<Filtros>({});
  const lista = useCarga(() => campanhaApi.demandas(filtros), [campanha.id, versao, JSON.stringify(filtros)]);
  const [editando, setEditando] = useState<Demanda | 'nova' | null>(null);
  const [excluir, setExcluir] = useState<Demanda | null>(null);
  const todos = (rotulo: string) => [{ value: 'todos', label: rotulo }];

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="grid items-end gap-2 md:grid-cols-[14rem_10rem_10rem_14rem_auto_1fr]">
          <SelectMunicipio label="Município" municipios={municipios.dados} value={filtros.codigo_ibge ?? null} onChange={(v) => setFiltros((f) => ({ ...f, codigo_ibge: v ?? undefined }))} opcional />
          <Select label="Situação" value={filtros.status ?? 'todos'} onChange={(v) => setFiltros((f) => ({ ...f, status: v === 'todos' ? undefined : (v as StatusDemanda) }))} options={[...todos('Todas'), ...opcoes(ROTULO_STATUS_DEMANDA)]} />
          <Select label="Prioridade" value={filtros.prioridade ?? 'todos'} onChange={(v) => setFiltros((f) => ({ ...f, prioridade: v === 'todos' ? undefined : (v as Prioridade) }))} options={[...todos('Todas'), ...opcoes(ROTULO_PRIORIDADE)]} />
          <Select label="Responsável" value={filtros.responsavel_id ?? 'todos'} onChange={(v) => setFiltros((f) => ({ ...f, responsavel_id: v === 'todos' ? undefined : Number(v) }))} options={[...todos('Todos'), ...(responsaveis.dados ?? []).map((u) => ({ value: u.id, label: u.name }))]} />
          <div className="flex items-center gap-2 pb-2"><Switch checked={!!filtros.atrasadas} onCheckedChange={(v) => setFiltros((f) => ({ ...f, atrasadas: v || undefined }))} label="Só atrasadas" /><span className="text-sm">Só atrasadas</span></div>
          {permissoes.demandas && <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditando('nova')}>Nova demanda</Button></div>}
        </div>
        {lista.erro ? <AlertCard priority="danger" title="Não foi possível carregar as demandas" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />
          : !lista.dados ? <Skeleton className="h-64 w-full" />
            : lista.dados.length === 0 ? <EmptyState icon={<ClipboardList className="h-8 w-8" />} title="Nenhuma demanda" description="Registre os pedidos dos municípios ou transforme o pedido de um eleitor em demanda." />
              : (
                <Table>
                  <TableHeader><TableRow><TableHead>Município</TableHead><TableHead>Solicitante</TableHead><TableHead>Categoria</TableHead><TableHead>Prioridade</TableHead><TableHead>Responsável</TableHead><TableHead>Prazo</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {lista.dados.map((d) => (
                      <TableRow key={d.id} className={d.atrasada ? 'bg-destructive/5' : undefined}>
                        <TableCell className="text-sm">{nomeDoMunicipio(municipios.dados, d.codigo_ibge)}</TableCell>
                        <TableCell className="font-medium">{d.solicitante}<p className="line-clamp-1 text-xs text-muted-foreground">{d.descricao}</p></TableCell>
                        <TableCell className="text-sm">{ROTULO_CATEGORIA[d.categoria]}</TableCell>
                        <TableCell><StatusChip variant={VARIANTE_PRIORIDADE[d.prioridade]} label={ROTULO_PRIORIDADE[d.prioridade]} /></TableCell>
                        <TableCell className="text-sm">{d.responsavel?.name ?? '—'}</TableCell>
                        <TableCell className="font-mono text-sm tabular-nums">{formatarData(d.prazo)}{d.atrasada && <span className="ml-1 font-sans text-xs font-semibold text-destructive">atrasada</span>}</TableCell>
                        <TableCell><StatusChip variant={VARIANTE_STATUS_DEMANDA[d.status]} label={ROTULO_STATUS_DEMANDA[d.status]} /></TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button size="icon-sm" variant="ghost" aria-label={`Abrir demanda de ${d.solicitante}`} onClick={() => setEditando(d)}><Pencil /></Button>
                          {permissoes.demandas && <Button size="icon-sm" variant="ghost" aria-label={`Excluir demanda de ${d.solicitante}`} onClick={() => setExcluir(d)}><Trash2 /></Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
      </CardContent>
      <DemandaModal registro={editando} municipios={municipios.dados} responsaveis={responsaveis.dados ?? []} somenteLeitura={!permissoes.demandas} onFechar={() => setEditando(null)}
        onSalva={(d) => { setEditando(null); avisar({ type: 'success', title: 'Demanda salva', message: d.solicitante }); alterou(); }} />
      <ConfirmarModal aberto={excluir !== null} titulo="Excluir demanda" mensagem={<>Excluir a demanda de <strong>{excluir?.solicitante}</strong>?</>} rotuloConfirmar="Excluir" perigo onFechar={() => setExcluir(null)}
        onConfirmar={async () => {
          if (!excluir) return;
          try { await campanhaApi.excluirDemanda(excluir.id); alterou(); } catch (e) { avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem }); }
        }} />
    </Card>
  );
};

const VAZIO = { codigo_ibge: null as number | null, solicitante: '', categoria: 'outra' as CategoriaDemanda, prioridade: 'media' as Prioridade, responsavel_id: null as number | null, prazo: '', status: 'pendente' as StatusDemanda, descricao: '', comentario: '' };

const DemandaModal: React.FC<{ registro: Demanda | 'nova' | null; municipios: MunicipioLinha[] | null; responsaveis: { id: number; name: string }[]; somenteLeitura: boolean; onFechar: () => void; onSalva: (d: Demanda) => void }> = ({ registro, municipios, responsaveis, somenteLeitura, onFechar, onSalva }) => {
  const [form, setForm] = useState(VAZIO);
  const [atual, setAtual] = useState<Demanda | 'nova' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if (registro !== atual) {
    setAtual(registro);
    setForm(registro && registro !== 'nova' ? { codigo_ibge: registro.codigo_ibge, solicitante: registro.solicitante, categoria: registro.categoria, prioridade: registro.prioridade, responsavel_id: registro.responsavel_id, prazo: registro.prazo ?? '', status: registro.status, descricao: registro.descricao, comentario: '' } : VAZIO);
    setErro(null);
  }
  const ro = somenteLeitura;

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (form.codigo_ibge === null) { setErro('Escolha o município.'); return; }
    setSalvando(true);
    setErro(null);
    try {
      const salva = await campanhaApi.salvarDemanda(registro && registro !== 'nova' ? registro.id : null, {
        codigo_ibge: form.codigo_ibge, solicitante: form.solicitante.trim(), categoria: form.categoria, prioridade: form.prioridade, responsavel_id: form.responsavel_id,
        prazo: form.prazo || null, status: form.status, descricao: form.descricao.trim(), comentario: vazioParaNulo(form.comentario),
      });
      onSalva(salva);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const historico = registro && registro !== 'nova' ? registro.historico ?? [] : [];

  return (
    <Modal open={registro !== null} onClose={onFechar} title={registro === 'nova' ? 'Nova demanda' : 'Demanda'} icon={<ClipboardList className="h-5 w-5" />} size="lg"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>{ro ? 'Fechar' : 'Cancelar'}</Button>{!ro && <Button type="submit" form="form-demanda" isLoading={salvando}>Salvar</Button>}</>}>
      <form id="form-demanda" onSubmit={salvar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectMunicipio label="Município *" municipios={municipios} value={form.codigo_ibge} onChange={(v) => setForm((f) => ({ ...f, codigo_ibge: v }))} disabled={ro} />
          <Input label="Solicitante *" value={form.solicitante} onChange={(e) => setForm((f) => ({ ...f, solicitante: e.target.value }))} required maxLength={200} disabled={ro} />
          <Select label="Categoria" value={form.categoria} onChange={(v) => setForm((f) => ({ ...f, categoria: v as CategoriaDemanda }))} options={opcoes(ROTULO_CATEGORIA)} disabled={ro} />
          <Select label="Prioridade" value={form.prioridade} onChange={(v) => setForm((f) => ({ ...f, prioridade: v as Prioridade }))} options={opcoes(ROTULO_PRIORIDADE)} disabled={ro} />
          <Select label="Responsável" value={form.responsavel_id ?? 'nenhum'} onChange={(v) => setForm((f) => ({ ...f, responsavel_id: v === 'nenhum' ? null : Number(v) }))} options={[{ value: 'nenhum', label: 'Sem responsável' }, ...responsaveis.map((u) => ({ value: u.id, label: u.name }))]} disabled={ro} />
          <Input label="Prazo" type="date" value={form.prazo} onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))} disabled={ro} />
          <Select label="Situação" value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v as StatusDemanda }))} options={opcoes(ROTULO_STATUS_DEMANDA)} disabled={ro} />
        </div>
        <label className="block space-y-1 text-sm font-medium">Descrição *<Textarea rows={3} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} required maxLength={5000} disabled={ro} /></label>
        {registro !== 'nova' && !ro && <label className="block space-y-1 text-sm font-medium">Acrescentar ao histórico<Textarea rows={2} value={form.comentario} onChange={(e) => setForm((f) => ({ ...f, comentario: e.target.value }))} maxLength={2000} placeholder="Ex.: ofício enviado à secretaria" /></label>}
        {historico.length > 0 && (
          <div className="space-y-1 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p className="font-semibold">Histórico</p>
            {historico.map((h, i) => (
              <p key={i}><span className="font-mono text-xs tabular-nums text-muted-foreground">{formatarDataHora(h.em)}</span>{h.por ? <span className="text-xs text-muted-foreground"> · {h.por}</span> : null} — {h.texto}</p>
            ))}
          </div>
        )}
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};
