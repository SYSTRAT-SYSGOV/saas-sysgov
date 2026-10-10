import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Package, Plus, Ticket, Trash2 } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, Input, Modal, Select, Skeleton, StatusChip } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/core/auth/useAuth';
import { erroApi } from '../../escola/api';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type BemResumo, type LoteCard, type StatusLote } from '../api';
import { formatarCentavos, formatarData, formatarDataHora, ROTULO_STATUS_LOTE, vazioParaNulo, VARIANTE_STATUS_LOTE } from '../formato';
import type { PropsAba } from '../ModuloInservivelMain';
import { CampoTexto } from './Comuns';
import { ExcluirLoteModal, LoteDetalhe } from './LoteDetalhe';
import { SeletorBens } from './SeletorBens';

/** Lotes e sorteio (spec: Lotes): cards dos lotes, criação e gestão do lote. */
export const LotesSorteio: React.FC<PropsAba> = (props) => {
  const { permissoes, avisar, parametro, limparParametro } = props;
  const [loteAberto, setLoteAberto] = useState<number | null>(null);
  const [criando, setCriando] = useState(false);
  const [excluir, setExcluir] = useState<LoteCard | null>(null);
  const [status, setStatus] = useState('');
  const [versao, setVersao] = useState(0);
  const lista = useCarga(() => inservivelApi.lotes(status ? { status: status as StatusLote } : undefined), [status, versao]);

  useEffect(() => {
    if (parametro('novo')) { setCriando(true); limparParametro('novo'); }
    const lote = parametro('lote');
    if (lote) { setLoteAberto(Number(lote)); limparParametro('lote'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loteAberto !== null) {
    return <LoteDetalhe loteId={loteAberto} avisar={avisar} onVoltar={() => { setLoteAberto(null); setVersao((v) => v + 1); }} />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-end md:justify-between">
          <Select placeholder="Todos" label="Status" value={status} onChange={setStatus} className="md:w-56"
            options={[{ value: '', label: 'Todos' }, ...(Object.keys(ROTULO_STATUS_LOTE) as StatusLote[]).map((s) => ({ value: s, label: ROTULO_STATUS_LOTE[s] }))]} />
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCriando(true)}>Criar lote</Button>
        </CardContent>
      </Card>

      {lista.erro && <AlertCard priority="danger" title="Não foi possível carregar os lotes" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />}
      {!lista.dados && !lista.erro && <Skeleton className="h-64 w-full" />}
      {lista.dados && (lista.dados.lotes.length === 0 ? (
        <EmptyState icon={<Ticket className="h-8 w-8" />} title="Nenhum lote" description="Crie um lote com bens de situação Inservível." actionLabel="Criar lote" onAction={() => setCriando(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.dados.lotes.map((l) => (
            <Card key={l.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Lote</p>
                    <p className="font-mono text-xl font-bold tabular-nums">{l.numero}</p>
                  </div>
                  <StatusChip label={l.status_rotulo} variant={VARIANTE_STATUS_LOTE[l.status]} />
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{l.descricao}</p>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Data</dt><dd className="font-mono tabular-nums">{formatarData(l.data_criacao)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Valor do lote</dt><dd className="font-mono font-semibold tabular-nums">{formatarCentavos(l.valor_cents)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Total de bens</dt><dd className="font-mono tabular-nums">{l.bens_count}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Criado em</dt><dd className="font-mono tabular-nums">{formatarDataHora(l.created_at)}</dd></div>
                </dl>
                {l.data_sorteio_prevista && <p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Sorteio previsto: <span className="font-mono tabular-nums">{formatarDataHora(l.data_sorteio_prevista)}</span></p>}
                <div className="mt-auto flex gap-2 pt-2">
                  <Button className="flex-1" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={() => setLoteAberto(l.id)}>Acessar lote</Button>
                  {permissoes.lotesGestao && !['sorteado', 'entregue', 'baixado'].includes(l.status) && (
                    <Button variant="outline" size="icon" aria-label={`Excluir lote ${l.numero}`} onClick={() => setExcluir(l)}><Trash2 className="text-destructive" /></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      <CriarLoteModal aberto={criando} onFechar={() => setCriando(false)}
        onCriado={(id, numero) => { setCriando(false); avisar({ type: 'success', title: 'Lote criado', message: `Lote ${numero}` }); setLoteAberto(id); }} />
      <ExcluirLoteModal lote={excluir} onFechar={() => setExcluir(null)}
        onExcluido={() => { avisar({ type: 'success', title: 'Lote excluído', message: 'Os bens voltaram à situação Inservível.' }); setExcluir(null); setVersao((v) => v + 1); }} />
    </div>
  );
};

const hoje = () => new Date().toISOString().slice(0, 10);

const CriarLoteModal: React.FC<{ aberto: boolean; onFechar: () => void; onCriado: (id: number, numero: string) => void }> = ({ aberto, onFechar, onCriado }) => {
  const { user } = useAuth();
  const vazio = { numero: '', descricao: '', data_criacao: hoje(), responsavel: user?.name ?? '', data_sorteio_prevista: '', observacoes: '' };
  const [form, setForm] = useState(vazio);
  const [bens, setBens] = useState<Map<number, BemResumo>>(new Map());
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [foiAberto, setFoiAberto] = useState(false);
  if (aberto !== foiAberto) {
    setFoiAberto(aberto);
    if (aberto) { setForm(vazio); setBens(new Map()); setErro(null); }
  }
  const texto = (campo: keyof typeof vazio) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSalvando(true); setErro(null);
    try {
      const lote = await inservivelApi.criarLote({
        numero: form.numero.trim(), descricao: form.descricao.trim(), data_criacao: form.data_criacao, responsavel: form.responsavel.trim(),
        data_sorteio_prevista: vazioParaNulo(form.data_sorteio_prevista), observacoes: vazioParaNulo(form.observacoes), bens: [...bens.keys()],
      });
      onCriado(lote.id, lote.numero);
    } catch (e) { setErro(erroApi(e).mensagem); } finally { setSalvando(false); }
  };

  return (
    <Modal open={aberto} onClose={onFechar} title="Criar lote" icon={<Package className="h-5 w-5" />} size="2xl"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-lote" isLoading={salvando}>Criar lote</Button></>}>
      <form id="form-lote" onSubmit={salvar} className="space-y-3">
        {erro && <AlertCard priority="danger" title="Não foi possível criar o lote" description={erro} />}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Número *" value={form.numero} onChange={texto('numero')} required maxLength={30} placeholder="Ex.: 007 (vira 007/ano)" className="font-mono tabular-nums" />
          <Input label="Data de criação *" type="date" value={form.data_criacao} onChange={texto('data_criacao')} required className="font-mono" />
          <Input label="Sorteio previsto" type="datetime-local" value={form.data_sorteio_prevista} onChange={texto('data_sorteio_prevista')} className="font-mono" />
        </div>
        <Input label="Responsável *" value={form.responsavel} onChange={texto('responsavel')} required maxLength={255} />
        <CampoTexto rotulo="Descrição *" value={form.descricao} onChange={texto('descricao')} required rows={2} maxLength={5000} />
        <CampoTexto rotulo="Observações" value={form.observacoes} onChange={texto('observacoes')} rows={2} maxLength={5000} />
        <div>
          <p className="mb-2 text-sm font-semibold">Bens do lote</p>
          <SeletorBens selecionados={bens} onChange={setBens} />
        </div>
      </form>
    </Modal>
  );
};
