import React, { useState } from 'react';
import { ClipboardList, Download, MapPin, QrCode, Search, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, KpiCard, Modal, Select, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type CategoriaDemanda, type Eleitor, type FiltrosEleitores, type IndicadoresEleitores, type Prioridade } from '../api';
import { ROTULO_CATEGORIA, ROTULO_PRIORIDADE, formatarData, formatarDataHora, formatarNumero } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { SelectMunicipio, useMunicipiosDaCampanha } from './Comuns';

/**
 * Eleitores captados (spec: Base de eleitores com acesso restrito). Quem não tem campanha.eleitores.view vê só os
 * totais — a lista nem é pedida (o servidor responderia 403).
 */
export const EleitoresCampanha: React.FC<PropsAba> = (props) => {
  const { campanha, permissoes, versao } = props;
  const indicadores = useCarga(() => campanhaApi.indicadoresEleitores(), [campanha.id, versao]);

  return (
    <div className="space-y-4">
      {indicadores.erro && <AlertCard priority="danger" title="Não foi possível carregar os totais" description={indicadores.erro} actionLabel="Tentar novamente" onAction={() => void indicadores.recarregar()} />}
      {indicadores.dados ? <Indicadores dados={indicadores.dados} detalhado={!permissoes.eleitoresVer} /> : !indicadores.erro && <Skeleton className="h-28 w-full" />}
      {permissoes.eleitoresVer ? <ListaEleitores {...props} /> : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" />Os dados pessoais dos eleitores ficam restritos à coordenação (LGPD).</p>
      )}
    </div>
  );
};

const Indicadores: React.FC<{ dados: IndicadoresEleitores; detalhado: boolean }> = ({ dados, detalhado }) => (
  <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Eleitores captados" value={formatarNumero(dados.total)} icon={<UserRound className="h-5 w-5" />} className="font-mono tabular-nums" />
      <KpiCard title="Últimos 7 dias" value={formatarNumero(dados.ultimos_7_dias)} icon={<QrCode className="h-5 w-5" />} className="font-mono tabular-nums" />
      <KpiCard title="Com localização" value={formatarNumero(dados.com_localizacao)} subtitle="aparecem no mapa de calor" icon={<MapPin className="h-5 w-5" />} className="font-mono tabular-nums" />
      <KpiCard title="Anonimizados" value={formatarNumero(dados.anonimizados)} subtitle="após o prazo de retenção" icon={<ShieldCheck className="h-5 w-5" />} className="font-mono tabular-nums" />
    </div>
    {detalhado && (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Por município</CardTitle></CardHeader>
          <CardContent>
            {dados.por_municipio.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum cadastro ainda.</p> : (
              <Table><TableBody>{dados.por_municipio.map((m) => <TableRow key={m.codigo_ibge}><TableCell>{m.municipio}</TableCell><TableCell className="text-right font-mono tabular-nums">{formatarNumero(m.total)}</TableCell></TableRow>)}</TableBody></Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Por responsável</CardTitle></CardHeader>
          <CardContent>
            {dados.por_responsavel.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum cadastro ainda.</p> : (
              <Table><TableBody>{dados.por_responsavel.map((r) => <TableRow key={`${r.tipo}-${r.id}`}><TableCell>{r.nome}</TableCell><TableCell className="text-right font-mono tabular-nums">{formatarNumero(r.total)}</TableCell></TableRow>)}</TableBody></Table>
            )}
          </CardContent>
        </Card>
      </div>
    )}
  </>
);

const ListaEleitores: React.FC<PropsAba> = ({ campanha, permissoes, avisar, alterou, versao }) => {
  const municipios = useMunicipiosDaCampanha(campanha.id);
  const [filtros, setFiltros] = useState<FiltrosEleitores>({ pagina: 1 });
  const [rascunho, setRascunho] = useState({ busca: '', bairro: '', de: '', ate: '' });
  const lista = useCarga(() => campanhaApi.eleitores(filtros), [campanha.id, versao, JSON.stringify(filtros)]);
  const [ficha, setFicha] = useState<Eleitor | null>(null);
  const [exportando, setExportando] = useState(false);

  const aplicar = (ev?: React.FormEvent) => {
    ev?.preventDefault();
    setFiltros((f) => ({ codigo_ibge: f.codigo_ibge, busca: rascunho.busca.trim() || undefined, bairro: rascunho.bairro.trim() || undefined, de: rascunho.de || undefined, ate: rascunho.ate || undefined, pagina: 1 }));
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const arquivo = await campanhaApi.exportarEleitores({ ...filtros, pagina: undefined });
      const url = URL.createObjectURL(arquivo);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eleitores-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      avisar({ type: 'error', title: 'Não foi possível exportar', message: erroApi(e).mensagem });
    } finally {
      setExportando(false);
    }
  };

  const pagina = lista.dados?.pagina ?? 1;
  const paginas = lista.dados ? Math.max(1, Math.ceil(lista.dados.total / lista.dados.por_pagina)) : 1;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <form onSubmit={aplicar} className="grid items-end gap-2 md:grid-cols-[1fr_14rem_10rem_9rem_9rem_auto]">
          <Input label="Buscar" placeholder="Nome ou WhatsApp" value={rascunho.busca} onChange={(e) => setRascunho((r) => ({ ...r, busca: e.target.value }))} leftIcon={<Search className="h-4 w-4" />} />
          <SelectMunicipio label="Município" municipios={municipios.dados} value={filtros.codigo_ibge ?? null} onChange={(v) => setFiltros((f) => ({ ...f, codigo_ibge: v ?? undefined, pagina: 1 }))} opcional />
          <Input label="Bairro" value={rascunho.bairro} onChange={(e) => setRascunho((r) => ({ ...r, bairro: e.target.value }))} />
          <Input label="De" type="date" value={rascunho.de} onChange={(e) => setRascunho((r) => ({ ...r, de: e.target.value }))} />
          <Input label="Até" type="date" value={rascunho.ate} onChange={(e) => setRascunho((r) => ({ ...r, ate: e.target.value }))} />
          <div className="flex gap-2">
            <Button type="submit" variant="outline">Filtrar</Button>
            {permissoes.eleitoresGerir && <Button type="button" leftIcon={<Download className="h-4 w-4" />} isLoading={exportando} onClick={() => void exportar()}>Exportar CSV</Button>}
          </div>
        </form>
        {lista.erro ? <AlertCard priority="danger" title="Não foi possível carregar os eleitores" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />
          : !lista.dados ? <Skeleton className="h-64 w-full" />
            : lista.dados.total === 0 ? <EmptyState icon={<UserRound className="h-8 w-8" />} title="Nenhum eleitor" description="Os cadastros feitos pelos links de captação aparecem aqui." />
              : (
                <>
                  <Table>
                    <TableHeader><TableRow><TableHead>Cadastro</TableHead><TableHead>Nome</TableHead><TableHead>Município / bairro</TableHead><TableHead>WhatsApp</TableHead><TableHead>Indicado por</TableHead><TableHead>Local</TableHead><TableHead className="text-right">Ficha</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {lista.dados.eleitores.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono text-sm tabular-nums">{formatarData(e.created_at)}</TableCell>
                          <TableCell className="font-medium">{e.anonimizado_em ? <span className="text-muted-foreground">Anonimizado</span> : e.nome}</TableCell>
                          <TableCell className="text-sm">{e.municipio}{e.bairro ? ` — ${e.bairro}` : ''}</TableCell>
                          <TableCell className="font-mono text-sm tabular-nums">{e.whatsapp ?? '—'}</TableCell>
                          <TableCell className="text-sm">{e.responsavel ?? '—'}</TableCell>
                          <TableCell>{e.latitude !== null ? <MapPin className="h-4 w-4 text-primary" aria-label="Com localização" /> : '—'}</TableCell>
                          <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setFicha(e)}>Abrir</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="font-mono tabular-nums">{formatarNumero(lista.dados.total)} eleitor(es)</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" disabled={pagina <= 1} onClick={() => setFiltros((f) => ({ ...f, pagina: pagina - 1 }))}>Anterior</Button>
                      <span className="font-mono tabular-nums">{pagina} / {paginas}</span>
                      <Button size="sm" variant="outline" disabled={pagina >= paginas} onClick={() => setFiltros((f) => ({ ...f, pagina: pagina + 1 }))}>Próxima</Button>
                    </div>
                  </div>
                </>
              )}
      </CardContent>
      <FichaEleitor eleitor={ficha} {...{ permissoes, avisar }} onFechar={() => setFicha(null)} onAlterado={() => { setFicha(null); alterou(); }} />
    </Card>
  );
};

const FichaEleitor: React.FC<Pick<PropsAba, 'permissoes' | 'avisar'> & { eleitor: Eleitor | null; onFechar: () => void; onAlterado: () => void }> = ({ eleitor, permissoes, avisar, onFechar, onAlterado }) => {
  const [excluir, setExcluir] = useState(false);
  const [demanda, setDemanda] = useState(false);
  const campo = (rotulo: string, valor: React.ReactNode, mono = false) => (
    <p><span className="block text-xs text-muted-foreground">{rotulo}</span><span className={mono ? 'font-mono tabular-nums' : ''}>{valor ?? '—'}</span></p>
  );
  const e = eleitor;

  return (
    <>
      <Modal open={e !== null && !excluir && !demanda} onClose={onFechar} title={e?.nome ?? 'Eleitor anonimizado'} icon={<UserRound className="h-5 w-5" />} size="lg"
        footer={<>
          {e && permissoes.eleitoresGerir && <Button variant="outline" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setExcluir(true)}>Excluir a pedido do titular</Button>}
          {e && permissoes.demandas && e.demanda && !e.anonimizado_em && <Button variant="outline" leftIcon={<ClipboardList className="h-4 w-4" />} onClick={() => setDemanda(true)}>Transformar em demanda</Button>}
          <Button onClick={onFechar}>Fechar</Button>
        </>}>
        {e && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              {campo('Município', e.municipio)}
              {campo('Bairro', e.bairro)}
              {campo('Zona / seção', e.zona || e.secao ? `${e.zona ?? '—'} / ${e.secao ?? '—'}` : null, true)}
              {campo('WhatsApp', e.whatsapp, true)}
              {campo('Nascimento', e.data_nascimento ? formatarData(e.data_nascimento) : null, true)}
              {campo('Indicado por', e.responsavel)}
            </div>
            {campo('Principal demanda', e.demanda)}
            {campo('Localização', e.latitude !== null ? `${e.latitude}, ${e.longitude}${e.precisao_m ? ` (±${e.precisao_m} m)` : ''}` : null, true)}
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Prova do consentimento</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {campo('Termo aceito', `versão ${e.consentimento_versao}`, true)}
                {campo('Data e hora', formatarDataHora(e.consentido_em), true)}
                {campo('IP', e.ip, true)}
              </div>
              {e.user_agent && <p className="mt-2 break-all text-xs text-muted-foreground">{e.user_agent}</p>}
              {e.anonimizado_em && <p className="mt-2 text-xs text-muted-foreground">Anonimizado em {formatarDataHora(e.anonimizado_em)}.</p>}
            </div>
          </div>
        )}
      </Modal>
      <ConfirmarModal aberto={excluir} titulo="Excluir eleitor a pedido do titular" perigo rotuloConfirmar="Excluir definitivamente"
        mensagem={<>Os dados de <strong>{e?.nome}</strong> serão apagados definitivamente e ele sai do mapa de calor. Não há como desfazer.</>}
        onFechar={() => setExcluir(false)}
        onConfirmar={async () => {
          if (!e) return;
          try { await campanhaApi.excluirEleitor(e.id); avisar({ type: 'success', title: 'Eleitor excluído', message: 'A exclusão ficou registrada na auditoria.' }); onAlterado(); } catch (err) { avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(err).mensagem }); }
        }} />
      <DemandaDoEleitorModal eleitor={demanda ? e : null} onFechar={() => setDemanda(false)} onCriada={() => { setDemanda(false); avisar({ type: 'success', title: 'Demanda criada', message: e?.municipio ?? '' }); onAlterado(); }} />
    </>
  );
};

const DemandaDoEleitorModal: React.FC<{ eleitor: Eleitor | null; onFechar: () => void; onCriada: () => void }> = ({ eleitor, onFechar, onCriada }) => {
  const responsaveis = useCarga(async () => (eleitor ? campanhaApi.responsaveisDemanda() : []), [eleitor?.id]);
  const [categoria, setCategoria] = useState<CategoriaDemanda>('outra');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [responsavel, setResponsavel] = useState<number | null>(null);
  const [prazo, setPrazo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!eleitor) return;
    setSalvando(true);
    setErro(null);
    try {
      await campanhaApi.demandaDoEleitor(eleitor.id, { categoria, prioridade, responsavel_id: responsavel, prazo: prazo || null });
      onCriada();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={eleitor !== null} onClose={onFechar} title="Transformar em demanda" icon={<ClipboardList className="h-5 w-5" />}
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-demanda-eleitor" isLoading={salvando}>Criar demanda</Button></>}>
      <form id="form-demanda-eleitor" onSubmit={salvar} className="space-y-3 text-sm">
        <p className="rounded-md border border-border bg-muted/40 p-3">{eleitor?.demanda}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Categoria" value={categoria} onChange={(v) => setCategoria(v as CategoriaDemanda)} options={Object.entries(ROTULO_CATEGORIA).map(([value, label]) => ({ value, label }))} />
          <Select label="Prioridade" value={prioridade} onChange={(v) => setPrioridade(v as Prioridade)} options={Object.entries(ROTULO_PRIORIDADE).map(([value, label]) => ({ value, label }))} />
          <Select label="Responsável" value={responsavel ?? 'nenhum'} loading={responsaveis.dados === null} onChange={(v) => setResponsavel(v === 'nenhum' ? null : Number(v))} options={[{ value: 'nenhum', label: 'Sem responsável' }, ...(responsaveis.dados ?? []).map((u) => ({ value: u.id, label: u.name }))]} />
          <Input label="Prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};
