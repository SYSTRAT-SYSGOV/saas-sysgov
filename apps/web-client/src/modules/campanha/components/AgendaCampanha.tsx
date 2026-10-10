import React, { useState } from 'react';
import { AlertTriangle, CalendarDays, ClipboardList, Compass, Megaphone, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, Input, Modal, Select, Skeleton, StatusChip, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type Evento, type ItemAgenda, type MunicipioLinha, type Reuniao, type TipoAgenda, type Visita } from '../api';
import { formatarData, formatarDataHora } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { SelectMunicipio, useMunicipiosDaCampanha, vazioParaNulo } from './Comuns';

export const ROTULO_AGENDA: Record<TipoAgenda, string> = { evento: 'Evento', reuniao: 'Reunião', visita: 'Visita' };
const TITULO_NOVO: Record<TipoAgenda, string> = { evento: 'Novo evento', reuniao: 'Nova reunião', visita: 'Nova visita' };
const SALVO: Record<TipoAgenda, string> = { evento: 'Evento salvo', reuniao: 'Reunião salva', visita: 'Visita salva' };
export const ICONE_AGENDA: Record<TipoAgenda, React.ElementType> = { evento: Megaphone, reuniao: Users, visita: Compass };

const somarDias = (dias: number): string => { const d = new Date(); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };
/** "2026-09-11T19:00:00-03:00" → valor de <input type="datetime-local">. */
const paraCampoDataHora = (iso: string): string => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

type Abertura = { tipo: TipoAgenda; registro: Evento | Reuniao | Visita | null } | null;

/** Agenda: eventos, reuniões e visitas por período (spec: Agenda de eventos, reuniões e visitas). */
export const AgendaCampanha: React.FC<PropsAba> = ({ campanha, permissoes, avisar, alterou, versao }) => {
  const municipios = useMunicipiosDaCampanha(campanha.id);
  const responsaveis = useCarga(() => campanhaApi.responsaveisDemanda(), [campanha.id]);
  const [filtros, setFiltros] = useState<{ de: string; ate: string; tipo?: TipoAgenda; codigo_ibge?: number }>({ de: somarDias(-30), ate: somarDias(60) });
  const lista = useCarga(() => campanhaApi.agenda(filtros), [campanha.id, versao, JSON.stringify(filtros)]);
  const [aberto, setAberto] = useState<Abertura>(null);
  const [excluir, setExcluir] = useState<ItemAgenda | null>(null);

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="grid items-end gap-2 md:grid-cols-[9rem_9rem_10rem_14rem_1fr]">
          <Input label="De" type="date" value={filtros.de} onChange={(e) => setFiltros((f) => ({ ...f, de: e.target.value }))} />
          <Input label="Até" type="date" value={filtros.ate} onChange={(e) => setFiltros((f) => ({ ...f, ate: e.target.value }))} />
          <Select label="Tipo" value={filtros.tipo ?? 'todos'} onChange={(v) => setFiltros((f) => ({ ...f, tipo: v === 'todos' ? undefined : (v as TipoAgenda) }))} options={[{ value: 'todos', label: 'Todos' }, { value: 'evento', label: 'Eventos' }, { value: 'reuniao', label: 'Reuniões' }, { value: 'visita', label: 'Visitas' }]} />
          <SelectMunicipio label="Município" municipios={municipios.dados} value={filtros.codigo_ibge ?? null} onChange={(v) => setFiltros((f) => ({ ...f, codigo_ibge: v ?? undefined }))} opcional />
          {permissoes.agenda && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAberto({ tipo: 'evento', registro: null })}>Evento</Button>
              <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAberto({ tipo: 'reuniao', registro: null })}>Reunião</Button>
              <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAberto({ tipo: 'visita', registro: null })}>Visita</Button>
            </div>
          )}
        </div>
        {lista.erro ? <AlertCard priority="danger" title="Não foi possível carregar a agenda" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />
          : !lista.dados ? <Skeleton className="h-64 w-full" />
            : lista.dados.length === 0 ? <EmptyState icon={<CalendarDays className="h-8 w-8" />} title="Nada na agenda" description="Nenhum compromisso no período escolhido." />
              : (
                <Table>
                  <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Tipo</TableHead><TableHead>Compromisso</TableHead><TableHead>Município</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {lista.dados.map((i) => {
                      const Icone = ICONE_AGENDA[i.tipo];
                      return (
                        <TableRow key={`${i.tipo}-${i.id}`}>
                          <TableCell className="whitespace-nowrap font-mono text-sm tabular-nums">{i.dia_inteiro ? formatarData(i.inicio) : formatarDataHora(i.inicio)}</TableCell>
                          <TableCell><span className="inline-flex items-center gap-1.5 text-sm"><Icone className="h-4 w-4 text-primary" />{ROTULO_AGENDA[i.tipo]}</span></TableCell>
                          <TableCell className="font-medium">{i.titulo}{i.alerta && <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-destructive"><AlertTriangle className="h-3.5 w-3.5" />pendência vencida</span>}
                            {i.tipo === 'visita' && (i.registro as Visita | undefined)?.demanda_id && <StatusChip variant="info" label="Virou demanda" className="ml-2" />}</TableCell>
                          <TableCell className="text-sm">{i.municipio}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            <Button size="icon-sm" variant="ghost" aria-label={`Abrir ${i.titulo}`} onClick={() => setAberto({ tipo: i.tipo, registro: i.registro ?? null })}><Pencil /></Button>
                            {permissoes.agenda && <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${i.titulo}`} onClick={() => setExcluir(i)}><Trash2 /></Button>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
      </CardContent>
      <CompromissoModal aberto={aberto} municipios={municipios.dados} responsaveis={responsaveis.dados ?? []} somenteLeitura={!permissoes.agenda} podeDemanda={permissoes.agenda && permissoes.demandas}
        avisar={avisar} onFechar={() => setAberto(null)} onSalvo={(m) => { setAberto(null); avisar({ type: 'success', title: m, message: 'A agenda foi atualizada.' }); alterou(); }} />
      <ConfirmarModal aberto={excluir !== null} titulo="Excluir da agenda" perigo rotuloConfirmar="Excluir" mensagem={<>Excluir <strong>{excluir?.titulo}</strong>?</>} onFechar={() => setExcluir(null)}
        onConfirmar={async () => {
          if (!excluir) return;
          try { await campanhaApi.excluirDaAgenda(excluir.tipo, excluir.id); alterou(); } catch (e) { avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem }); }
        }} />
    </Card>
  );
};

type Form = Record<string, string | number | boolean | null>;

const CompromissoModal: React.FC<{
  aberto: Abertura; municipios: MunicipioLinha[] | null; responsaveis: { id: number; name: string }[]; somenteLeitura: boolean; podeDemanda: boolean;
  avisar: PropsAba['avisar']; onFechar: () => void; onSalvo: (mensagem: string) => void;
}> = ({ aberto, municipios, responsaveis, somenteLeitura, podeDemanda, avisar, onFechar, onSalvo }) => {
  const [form, setForm] = useState<Form>({});
  const [atual, setAtual] = useState<Abertura>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if (aberto !== atual) {
    setAtual(aberto);
    const r = aberto?.registro as (Partial<Evento & Reuniao & Visita> | null | undefined);
    setForm({
      nome: r?.nome ?? '', titulo: r?.titulo ?? '', lideranca: r?.lideranca ?? '', codigo_ibge: r?.codigo_ibge ?? null, local: r?.local ?? '', bairro: r?.bairro ?? '',
      inicio: r?.inicio ? paraCampoDataHora(r.inicio) : '', data: r?.data ?? new Date().toISOString().slice(0, 10), responsavel_id: r?.responsavel_id ?? null,
      publico_estimado: r?.publico_estimado ?? 0, publico_presente: r?.publico_presente ?? 0, observacoes: r?.observacoes ?? '', participantes: r?.participantes ?? '',
      ata: r?.ata ?? '', pendencias: r?.pendencias ?? '', prazo_pendencias: r?.prazo_pendencias ?? '', pendencias_resolvidas: r?.pendencias_resolvidas ?? false,
      assunto: r?.assunto ?? '', resultado: r?.resultado ?? '', encaminhamento: r?.encaminhamento ?? '',
    });
    setErro(null);
  }
  if (!aberto) return null;
  const { tipo, registro } = aberto;
  const ro = somenteLeitura;
  const s = (k: string) => String(form[k] ?? '');
  const texto = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const responsavel = (
    <Select label="Responsável" value={(form.responsavel_id as number | null) ?? 'nenhum'} disabled={ro} onChange={(v) => setForm((f) => ({ ...f, responsavel_id: v === 'nenhum' ? null : Number(v) }))}
      options={[{ value: 'nenhum', label: 'Sem responsável' }, ...responsaveis.map((u) => ({ value: u.id, label: u.name }))]} />
  );

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.codigo_ibge) { setErro('Escolha o município.'); return; }
    setSalvando(true);
    setErro(null);
    try {
      const id = registro?.id ?? null;
      const ibge = Number(form.codigo_ibge);
      if (tipo === 'evento') {
        await campanhaApi.salvarEvento(id, { nome: s('nome').trim(), codigo_ibge: ibge, local: s('local').trim(), inicio: s('inicio'), responsavel_id: form.responsavel_id as number | null,
          publico_estimado: Number(form.publico_estimado) || 0, publico_presente: Number(form.publico_presente) || 0, observacoes: vazioParaNulo(s('observacoes')) });
      } else if (tipo === 'reuniao') {
        await campanhaApi.salvarReuniao(id, { titulo: s('titulo').trim(), codigo_ibge: ibge, local: vazioParaNulo(s('local')), inicio: s('inicio'), participantes: vazioParaNulo(s('participantes')),
          ata: vazioParaNulo(s('ata')), pendencias: vazioParaNulo(s('pendencias')), responsavel_id: form.responsavel_id as number | null, prazo_pendencias: s('prazo_pendencias') || null,
          pendencias_resolvidas: Boolean(form.pendencias_resolvidas) });
      } else {
        await campanhaApi.salvarVisita(id, { lideranca: s('lideranca').trim(), codigo_ibge: ibge, bairro: vazioParaNulo(s('bairro')), data: s('data'), assunto: s('assunto').trim(),
          resultado: vazioParaNulo(s('resultado')), encaminhamento: vazioParaNulo(s('encaminhamento')) });
      }
      onSalvo(SALVO[tipo]);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const virarDemanda = async () => {
    if (!registro) return;
    try { await campanhaApi.demandaDaVisita(registro.id); onSalvo('Demanda criada'); } catch (e) { avisar({ type: 'error', title: 'Não foi possível criar a demanda', message: erroApi(e).mensagem }); }
  };
  const visita = registro as Visita | null;

  return (
    <Modal open onClose={onFechar} title={registro ? ROTULO_AGENDA[tipo] : TITULO_NOVO[tipo]} icon={React.createElement(ICONE_AGENDA[tipo], { className: 'h-5 w-5' })} size="lg"
      footer={<>
        {tipo === 'visita' && visita && podeDemanda && !visita.demanda_id && s('encaminhamento').trim() && <Button variant="outline" leftIcon={<ClipboardList className="h-4 w-4" />} onClick={() => void virarDemanda()}>Transformar em demanda</Button>}
        <Button variant="outline" onClick={onFechar} disabled={salvando}>{ro ? 'Fechar' : 'Cancelar'}</Button>
        {!ro && <Button type="submit" form="form-compromisso" isLoading={salvando}>Salvar</Button>}
      </>}>
      <form id="form-compromisso" onSubmit={salvar} className="space-y-3">
        {tipo === 'evento' && (<>
          <Input label="Nome do evento (comício, carreata…) *" value={s('nome')} onChange={texto('nome')} required maxLength={200} disabled={ro} />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectMunicipio label="Município *" municipios={municipios} value={(form.codigo_ibge as number | null) ?? null} onChange={(v) => setForm((f) => ({ ...f, codigo_ibge: v }))} disabled={ro} />
            <Input label="Data e hora *" type="datetime-local" value={s('inicio')} onChange={texto('inicio')} required disabled={ro} />
          </div>
          <Input label="Local / ponto de encontro *" value={s('local')} onChange={texto('local')} required maxLength={255} disabled={ro} />
          <div className="grid gap-3 sm:grid-cols-3">
            {responsavel}
            <Input label="Público estimado" type="number" min={0} value={s('publico_estimado')} onChange={texto('publico_estimado')} disabled={ro} className="font-mono tabular-nums" />
            <Input label="Público presente" type="number" min={0} value={s('publico_presente')} onChange={texto('publico_presente')} disabled={ro} className="font-mono tabular-nums" />
          </div>
          <label className="block space-y-1 text-sm font-medium">Observações e checklist<Textarea rows={3} value={s('observacoes')} onChange={texto('observacoes')} disabled={ro} /></label>
        </>)}
        {tipo === 'reuniao' && (<>
          <Input label="Título *" value={s('titulo')} onChange={texto('titulo')} required maxLength={200} disabled={ro} />
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectMunicipio label="Município *" municipios={municipios} value={(form.codigo_ibge as number | null) ?? null} onChange={(v) => setForm((f) => ({ ...f, codigo_ibge: v }))} disabled={ro} />
            <Input label="Data e hora *" type="datetime-local" value={s('inicio')} onChange={texto('inicio')} required disabled={ro} />
            <Input label="Local" value={s('local')} onChange={texto('local')} maxLength={255} disabled={ro} />
          </div>
          <label className="block space-y-1 text-sm font-medium">Participantes<Textarea rows={2} value={s('participantes')} onChange={texto('participantes')} disabled={ro} /></label>
          <label className="block space-y-1 text-sm font-medium">Ata / assuntos discutidos<Textarea rows={4} value={s('ata')} onChange={texto('ata')} disabled={ro} /></label>
          <label className="block space-y-1 text-sm font-medium">Pendências e compromissos assumidos<Textarea rows={2} value={s('pendencias')} onChange={texto('pendencias')} disabled={ro} /></label>
          <div className="grid items-end gap-3 sm:grid-cols-3">
            {responsavel}
            <Input label="Prazo das pendências" type="date" value={s('prazo_pendencias')} onChange={texto('prazo_pendencias')} disabled={ro} />
            <div className="flex items-center gap-2 pb-2"><Switch checked={Boolean(form.pendencias_resolvidas)} disabled={ro} onCheckedChange={(v) => setForm((f) => ({ ...f, pendencias_resolvidas: v }))} label="Pendências resolvidas" /><span className="text-sm">Pendências resolvidas</span></div>
          </div>
        </>)}
        {tipo === 'visita' && (<>
          <Input label="Liderança visitada (associação, comerciante…) *" value={s('lideranca')} onChange={texto('lideranca')} required maxLength={200} disabled={ro} />
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectMunicipio label="Município *" municipios={municipios} value={(form.codigo_ibge as number | null) ?? null} onChange={(v) => setForm((f) => ({ ...f, codigo_ibge: v }))} disabled={ro} />
            <Input label="Bairro" value={s('bairro')} onChange={texto('bairro')} maxLength={150} disabled={ro} />
            <Input label="Data *" type="date" value={s('data')} onChange={texto('data')} required disabled={ro} />
          </div>
          <label className="block space-y-1 text-sm font-medium">Assunto principal *<Textarea rows={2} value={s('assunto')} onChange={texto('assunto')} required disabled={ro} /></label>
          <label className="block space-y-1 text-sm font-medium">Resultado / reações<Textarea rows={2} value={s('resultado')} onChange={texto('resultado')} disabled={ro} /></label>
          <label className="block space-y-1 text-sm font-medium">Encaminhamento solicitado (ofício, demanda)<Textarea rows={2} value={s('encaminhamento')} onChange={texto('encaminhamento')} disabled={ro} /></label>
          {visita?.demanda_id && <p className="text-xs text-muted-foreground">Esta visita já virou demanda (aba Demandas).</p>}
        </>)}
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};

/** Próximos compromissos (cartão do painel). */
export const ProximosCompromissos: React.FC<{ campanhaId: number; versao: number }> = ({ campanhaId, versao }) => {
  const itens = useCarga(() => campanhaApi.proximosCompromissos(), [campanhaId, versao]);
  if (itens.erro) return <p className="text-sm text-destructive">{itens.erro}</p>;
  if (!itens.dados) return <Skeleton className="h-32 w-full" />;
  if (itens.dados.length === 0) return <p className="text-sm text-muted-foreground">Nenhum compromisso agendado.</p>;
  return (
    <ul className="divide-y divide-border">
      {itens.dados.map((i) => {
        const Icone = ICONE_AGENDA[i.tipo];
        return (
          <li key={`${i.tipo}-${i.id}`} className="flex items-center gap-3 py-2 text-sm">
            <Icone className="h-4 w-4 shrink-0 text-primary" aria-label={ROTULO_AGENDA[i.tipo]} />
            <span className="w-32 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{i.dia_inteiro ? formatarData(i.inicio) : formatarDataHora(i.inicio)}</span>
            <span className="flex-1 font-medium">{i.titulo}</span>
            <span className="text-xs text-muted-foreground">{i.municipio}</span>
          </li>
        );
      })}
    </ul>
  );
};

