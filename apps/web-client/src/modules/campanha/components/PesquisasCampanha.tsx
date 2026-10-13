import React, { useState } from 'react';
import { BarChart3, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Modal, Select, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type MunicipioLinha, type Pesquisa } from '../api';
import { formatarData, formatarDecimos, paraDecimos } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { SelectMunicipio, nomeDoMunicipio, useMunicipiosDaCampanha, vazioParaNulo } from './Comuns';

/** Linha editável de resultado (percentual como texto até salvar). */
interface LinhaResultado { nome: string; partido: string; percentual: string; da_campanha: boolean }

/** Soma dos percentuais em décimos e a primeira linha inválida (para avisar antes de enviar). */
export function conferirResultados(linhas: LinhaResultado[]): { soma: number; erro: string | null } {
  let soma = 0;
  for (const l of linhas) {
    if (!l.nome.trim()) return { soma, erro: 'Informe o nome de cada candidato.' };
    const d = paraDecimos(l.percentual);
    if (d === null) return { soma, erro: `Percentual inválido para ${l.nome}.` };
    soma += d;
  }
  if (linhas.length === 0) return { soma, erro: 'Informe ao menos um candidato.' };
  if (soma > 1000) return { soma, erro: `A soma dos percentuais (${formatarDecimos(soma)}) passa de 100%.` };
  if (linhas.filter((l) => l.da_campanha).length > 1) return { soma, erro: 'Marque só um candidato como o da campanha.' };
  return { soma, erro: null };
}

/** Pesquisas eleitorais com resultados estruturados e a evolução do candidato (spec: Pesquisas eleitorais). */
export const PesquisasCampanha: React.FC<PropsAba> = ({ campanha, permissoes, avisar, alterou, versao }) => {
  const municipios = useMunicipiosDaCampanha(campanha.id);
  const [abrangencia, setAbrangencia] = useState<number | null>(null);
  const lista = useCarga(() => campanhaApi.pesquisas(), [campanha.id, versao]);
  const evolucao = useCarga(() => campanhaApi.evolucaoPesquisas(abrangencia ?? undefined), [campanha.id, versao, abrangencia]);
  const [editando, setEditando] = useState<Pesquisa | 'nova' | null>(null);
  const [excluir, setExcluir] = useState<Pesquisa | null>(null);
  const nosso = (p: Pesquisa) => p.resultados.find((r) => r.da_campanha);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Evolução de {campanha.candidato?.nome_urna ?? 'nosso candidato'}</CardTitle>
          <div className="w-64"><SelectMunicipio label="Abrangência" municipios={municipios.dados} value={abrangencia} onChange={setAbrangencia} opcional rotuloVazio="Estadual" /></div>
        </CardHeader>
        <CardContent className="h-64 text-xs">
          {evolucao.erro ? <p className="text-sm text-destructive">{evolucao.erro}</p> : !evolucao.dados ? <Skeleton className="h-full w-full" />
            : evolucao.dados.length === 0 ? <p className="text-sm text-muted-foreground">{abrangencia ? 'Sem pesquisas neste município com o candidato da campanha marcado.' : 'Sem pesquisas estaduais com o candidato da campanha marcado. ("Nenhum" = estadual.)'}</p>
              : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucao.dados.map((p) => ({ ...p, data: formatarData(p.divulgada_em), pct: p.percentual_decimos / 10 }))} margin={{ left: 8, right: 16, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" width={48} />
                    <Tooltip formatter={(v) => `${String(v).replace('.', ',')}%`} labelFormatter={(l, itens) => `${l} — ${itens?.[0]?.payload?.instituto ?? ''}`} contentStyle={{ fontSize: 12 }} />
                    <Line type="monotone" isAnimationActive={false} dataKey="pct" name="Intenção de voto" stroke="#1351b4" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-4">
          {permissoes.pesquisas && <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditando('nova')}>Cadastrar pesquisa</Button></div>}
          {lista.erro ? <AlertCard priority="danger" title="Não foi possível carregar as pesquisas" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />
            : !lista.dados ? <Skeleton className="h-48 w-full" />
              : lista.dados.length === 0 ? <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="Nenhuma pesquisa" description="Registre as pesquisas internas e as divulgadas pelos institutos." />
                : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Divulgação</TableHead><TableHead>Tipo</TableHead><TableHead>Instituto</TableHead><TableHead>Abrangência</TableHead><TableHead className="text-right">Margem</TableHead><TableHead className="text-right">Nosso candidato</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {lista.dados.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-sm tabular-nums">{formatarData(p.divulgada_em)}</TableCell>
                          <TableCell><StatusChip variant={p.tipo === 'externa' ? 'info' : 'neutral'} label={p.tipo === 'externa' ? 'Externa' : 'Interna'} /></TableCell>
                          <TableCell className="font-medium">{p.instituto}{p.registro_tse && <p className="font-mono text-xs tabular-nums text-muted-foreground">TSE {p.registro_tse}</p>}</TableCell>
                          <TableCell className="text-sm">{p.codigo_ibge ? nomeDoMunicipio(municipios.dados, p.codigo_ibge) : 'Estadual'}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">±{formatarDecimos(p.margem_erro_decimos)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{formatarDecimos(nosso(p)?.percentual_decimos)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            <Button size="icon-sm" variant="ghost" aria-label={`Abrir pesquisa ${p.instituto}`} onClick={() => setEditando(p)}><Pencil /></Button>
                            {permissoes.pesquisas && <Button size="icon-sm" variant="ghost" aria-label={`Excluir pesquisa ${p.instituto}`} onClick={() => setExcluir(p)}><Trash2 /></Button>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
        </CardContent>
      </Card>
      <PesquisaModal registro={editando} municipios={municipios.dados} candidato={campanha.candidato?.nome_urna ?? ''} partido={campanha.candidato?.partido ?? ''} somenteLeitura={!permissoes.pesquisas}
        onFechar={() => setEditando(null)} onSalva={() => { setEditando(null); avisar({ type: 'success', title: 'Pesquisa salva', message: 'O gráfico foi atualizado.' }); alterou(); }} />
      <ConfirmarModal aberto={excluir !== null} titulo="Excluir pesquisa" perigo rotuloConfirmar="Excluir" mensagem={<>Excluir a pesquisa de <strong>{excluir?.instituto}</strong>?</>} onFechar={() => setExcluir(null)}
        onConfirmar={async () => {
          if (!excluir) return;
          try { await campanhaApi.excluirPesquisa(excluir.id); alterou(); } catch (e) { avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem }); }
        }} />
    </div>
  );
};

const PesquisaModal: React.FC<{ registro: Pesquisa | 'nova' | null; municipios: MunicipioLinha[] | null; candidato: string; partido: string; somenteLeitura: boolean; onFechar: () => void; onSalva: () => void }> = ({ registro, municipios, candidato, partido, somenteLeitura, onFechar, onSalva }) => {
  const hoje = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ tipo: 'externa', instituto: '', divulgada_em: hoje, codigo_ibge: null as number | null, margem: '', amostra: '', registro_tse: '', observacoes: '' });
  const [linhas, setLinhas] = useState<LinhaResultado[]>([]);
  const [atual, setAtual] = useState<Pesquisa | 'nova' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if (registro !== atual) {
    setAtual(registro);
    const p = registro && registro !== 'nova' ? registro : null;
    setForm({ tipo: p?.tipo ?? 'externa', instituto: p?.instituto ?? '', divulgada_em: p?.divulgada_em ?? hoje, codigo_ibge: p?.codigo_ibge ?? null,
      margem: p ? formatarDecimos(p.margem_erro_decimos).replace('%', '') : '', amostra: p?.amostra ? String(p.amostra) : '', registro_tse: p?.registro_tse ?? '', observacoes: p?.observacoes ?? '' });
    setLinhas(p ? p.resultados.map((r) => ({ nome: r.nome, partido: r.partido ?? '', percentual: formatarDecimos(r.percentual_decimos).replace('%', ''), da_campanha: r.da_campanha }))
      : [{ nome: candidato, partido, percentual: '', da_campanha: true }, { nome: '', partido: '', percentual: '', da_campanha: false }]);
    setErro(null);
  }
  const ro = somenteLeitura;
  const conferido = conferirResultados(linhas);
  const mudarLinha = (i: number, parcial: Partial<LinhaResultado>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...parcial } : parcial.da_campanha ? { ...l, da_campanha: false } : l)));

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (conferido.erro) { setErro(conferido.erro); return; }
    const margem = form.margem.trim() === '' ? 0 : paraDecimos(form.margem);
    if (margem === null) { setErro('Margem de erro inválida (ex.: 2,5).'); return; }
    setSalvando(true);
    setErro(null);
    try {
      await campanhaApi.salvarPesquisa(registro && registro !== 'nova' ? registro.id : null, {
        tipo: form.tipo as Pesquisa['tipo'], instituto: form.instituto.trim(), divulgada_em: form.divulgada_em, codigo_ibge: form.codigo_ibge, margem_erro_decimos: margem,
        amostra: form.amostra ? Number(form.amostra) : null, registro_tse: vazioParaNulo(form.registro_tse), observacoes: vazioParaNulo(form.observacoes),
        resultados: linhas.map((l) => ({ nome: l.nome.trim(), partido: vazioParaNulo(l.partido), percentual_decimos: paraDecimos(l.percentual) ?? 0, da_campanha: l.da_campanha })),
      });
      onSalva();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={registro !== null} onClose={onFechar} title={registro === 'nova' ? 'Cadastrar pesquisa' : 'Pesquisa eleitoral'} icon={<BarChart3 className="h-5 w-5" />} size="xl"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>{ro ? 'Fechar' : 'Cancelar'}</Button>{!ro && <Button type="submit" form="form-pesquisa" isLoading={salvando}>Salvar</Button>}</>}>
      <form id="form-pesquisa" onSubmit={salvar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <Select label="Tipo *" value={form.tipo} disabled={ro} onChange={(v) => setForm((f) => ({ ...f, tipo: String(v) }))} options={[{ value: 'externa', label: 'Externa (instituto)' }, { value: 'interna', label: 'Interna' }]} />
          <Input label="Instituto *" value={form.instituto} onChange={(e) => setForm((f) => ({ ...f, instituto: e.target.value }))} required maxLength={200} disabled={ro} className="sm:col-span-2" />
          <Input label="Divulgação *" type="date" value={form.divulgada_em} onChange={(e) => setForm((f) => ({ ...f, divulgada_em: e.target.value }))} required disabled={ro} />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <SelectMunicipio label="Abrangência" rotuloVazio="Estadual" municipios={municipios} value={form.codigo_ibge} onChange={(v) => setForm((f) => ({ ...f, codigo_ibge: v }))} opcional disabled={ro} />
          <Input label="Margem de erro (%)" value={form.margem} onChange={(e) => setForm((f) => ({ ...f, margem: e.target.value }))} inputMode="decimal" disabled={ro} className="font-mono tabular-nums" />
          <Input label="Amostra (entrevistas)" type="number" min={1} value={form.amostra} onChange={(e) => setForm((f) => ({ ...f, amostra: e.target.value }))} disabled={ro} className="font-mono tabular-nums" />
          <Input label="Registro no TSE" value={form.registro_tse} onChange={(e) => setForm((f) => ({ ...f, registro_tse: e.target.value }))} maxLength={30} disabled={ro} className="font-mono tabular-nums" placeholder="PR-00000/2026" />
        </div>
        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Resultados</p>
            <p className={`font-mono text-xs tabular-nums ${conferido.soma > 1000 ? 'text-destructive' : 'text-muted-foreground'}`}>Soma: {formatarDecimos(conferido.soma)}</p>
          </div>
          {linhas.map((l, i) => (
            <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_8rem_7rem_auto_auto]">
              <Input label={i === 0 ? 'Candidato' : undefined} aria-label="Candidato" value={l.nome} onChange={(e) => mudarLinha(i, { nome: e.target.value })} disabled={ro} />
              <Input label={i === 0 ? 'Partido' : undefined} aria-label="Partido" value={l.partido} onChange={(e) => mudarLinha(i, { partido: e.target.value })} disabled={ro} />
              <Input label={i === 0 ? '%' : undefined} aria-label={`Percentual de ${l.nome || 'candidato'}`} value={l.percentual} onChange={(e) => mudarLinha(i, { percentual: e.target.value })} inputMode="decimal" disabled={ro} className="font-mono tabular-nums" />
              <label className="flex items-center gap-1.5 pb-2 text-xs"><Checkbox checked={l.da_campanha} disabled={ro} onCheckedChange={(v) => mudarLinha(i, { da_campanha: v === true })} aria-label={`${l.nome || 'Candidato'} é o da campanha`} />Nosso</label>
              {!ro && <Button type="button" size="icon-sm" variant="ghost" aria-label="Remover candidato" onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}><Trash2 /></Button>}
            </div>
          ))}
          {!ro && <Button type="button" size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setLinhas((ls) => [...ls, { nome: '', partido: '', percentual: '', da_campanha: false }])}>Adicionar candidato</Button>}
          {conferido.erro && linhas.some((l) => l.percentual) && <p className="text-xs text-destructive">{conferido.erro}</p>}
        </div>
        <label className="block space-y-1 text-sm font-medium">Observações<Textarea rows={2} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} disabled={ro} /></label>
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};
