import React, { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Upload } from 'lucide-react';
import { Badge, Button, Input, Modal, Select, Switch, Textarea } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { abrirBlob, dataHora, mensagemDeErro, multiApi, type Acompanhado, type Opcoes } from '../api';
import { Atendimentos } from './Atendimentos';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

interface Referencia { id: number; papel: string }
interface CondicaoMarcada { id: number; diagnosticado_em: string }

/**
 * Ficha do estudante acompanhado: dados do aluno, profissionais de referência, condições (CID), observações,
 * laudos e histórico de atendimentos. A edição e os dados clínicos dependem de `acompanhar` (D7).
 */
export const FichaAcompanhado: React.FC<{ id: number; opcoes: Opcoes; avisar: Toast; aoFechar: () => void; aoMudar: () => void }> = ({ id, opcoes, avisar, aoFechar, aoMudar }) => {
  const carga = useCarga(() => multiApi.acompanhado(id), [id]);
  const clinico = opcoes.permissoes.acompanhar;
  const a = carga.dados;

  return (
    <Modal open onClose={aoFechar} title={a?.aluno?.nome ?? 'Estudante acompanhado'} size="2xl">
      <EstadoCarga carregando={carga.carregando && !a} erro={carga.erro} onTentar={() => void carga.recarregar()} />
      {a && (
        <div className="space-y-6">
          <section className="grid gap-3 text-sm sm:grid-cols-4">
            <div><span className="font-semibold">Escola</span><br />{a.aluno?.escola ?? '—'}</div>
            <div><span className="font-semibold">Turma</span><br />{a.aluno?.turma ?? '—'}</div>
            <div><span className="font-semibold">CGM</span><br /><span className="font-mono tabular-nums">{a.aluno?.cgm ?? '—'}</span></div>
            <div><span className="font-semibold">Nascimento</span><br /><span className="font-mono tabular-nums">{a.aluno?.nascimento ? dataHora(a.aluno.nascimento) : '—'}</span></div>
            {(a.contatos ?? []).length > 0 && (
              <div className="sm:col-span-4"><span className="font-semibold">Contatos da família</span><br />
                {(a.contatos ?? []).map((c, i) => <span key={i} className="mr-4"><span className="font-mono tabular-nums">{c.telefone}</span>{c.descricao ? ` (${c.descricao})` : ''}</span>)}
              </div>
            )}
          </section>

          {clinico ? (
            <EdicaoAcompanhado a={a} opcoes={opcoes} avisar={avisar} aoSalvar={() => { void carga.recarregar(); aoMudar(); }} />
          ) : (
            <section>
              <h3 className="mb-1 text-sm font-semibold">Profissionais de referência</h3>
              <p className="text-sm">{a.profissionais.map((p) => `${p.nome}${p.papel ? ` (${p.papel})` : ''}`).join(', ') || '—'}</p>
            </section>
          )}

          {clinico && <Laudos a={a} opcoes={opcoes} avisar={avisar} aoMudar={() => void carga.recarregar()} />}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Histórico de atendimentos</h3>
            {a.aluno && <Atendimentos opcoes={opcoes} avisar={avisar} aluno={{ id: a.aluno.id, nome: a.aluno.nome }} />}
          </section>
        </div>
      )}
    </Modal>
  );
};

const EdicaoAcompanhado: React.FC<{ a: Acompanhado; opcoes: Opcoes; avisar: Toast; aoSalvar: () => void }> = ({ a, opcoes, avisar, aoSalvar }) => {
  const [referencias, setReferencias] = useState<Referencia[]>([]);
  const { tratarErro } = useFormValidationModal();
  const [condicoes, setCondicoes] = useState<CondicaoMarcada[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setReferencias(a.profissionais.map((p) => ({ id: p.id, papel: p.papel ?? '' })));
    setCondicoes((a.condicoes ?? []).map((c) => ({ id: c.id, diagnosticado_em: c.diagnosticado_em ?? '' })));
    setObservacoes(a.observacoes ?? '');
    setAtivo(a.ativo);
  }, [a]);

  const nomeProf = (pid: number) => opcoes.profissionais.find((p) => p.id === pid)?.nome ?? a.profissionais.find((p) => p.id === pid)?.nome ?? `#${pid}`;
  const condicao = (cid: number) => opcoes.condicoes.find((c) => c.id === cid) ?? a.condicoes?.find((c) => c.id === cid);
  const livresProf = opcoes.profissionais.filter((p) => !referencias.some((r) => r.id === p.id));
  const livresCond = opcoes.condicoes.filter((c) => !condicoes.some((x) => x.id === c.id));

  const salvar = async () => {
    setSalvando(true);
    try {
      await multiApi.salvarAcompanhado(a.id, {
        observacoes, ativo,
        profissionais: referencias.map((r) => ({ id: r.id, papel: r.papel || null })),
        condicoes: condicoes.map((c) => ({ id: c.id, diagnosticado_em: c.diagnosticado_em || null })),
      });
      avisar({ type: 'success', title: 'Acompanhamento', message: 'Ficha salva.' });
      aoSalvar();
    } catch (e) {
      if (!tratarErro(e)) avisar({ type: 'error', title: 'Acompanhamento', message: mensagemDeErro(e) });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="space-y-4 rounded-md border p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Condições (CID)</h3>
          {condicoes.map((c) => (
            <div key={c.id} className="flex items-end gap-2">
              <span className="flex-1 pb-2 text-sm"><span className="font-mono">{condicao(c.id)?.cid}</span> {condicao(c.id)?.nome}</span>
              <div className="w-40"><Input type="date" aria-label="Data do diagnóstico" value={c.diagnosticado_em}
                onChange={(e) => setCondicoes((l) => l.map((x) => (x.id === c.id ? { ...x, diagnosticado_em: e.target.value } : x)))} /></div>
              <Button variant="ghost" size="sm" aria-label="Remover condição" onClick={() => setCondicoes((l) => l.filter((x) => x.id !== c.id))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {livresCond.length > 0 && (
            <Select value={null} placeholder="Adicionar condição…" onChange={(v) => setCondicoes((l) => [...l, { id: Number(v), diagnosticado_em: '' }])}
              options={livresCond.map((c) => ({ value: c.id, label: c.cid ? `${c.cid} — ${c.nome}` : c.nome }))} />
          )}
          {opcoes.condicoes.length === 0 && <p className="text-xs text-muted-foreground">Cadastre as condições na aba Cadastros.</p>}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Profissionais de referência</h3>
          {referencias.map((r) => (
            <div key={r.id} className="flex items-end gap-2">
              <span className="flex-1 pb-2 text-sm">{nomeProf(r.id)}</span>
              <div className="w-44"><Input placeholder="Papel (opcional)" aria-label={`Papel de ${nomeProf(r.id)}`} value={r.papel}
                onChange={(e) => setReferencias((l) => l.map((x) => (x.id === r.id ? { ...x, papel: e.target.value } : x)))} /></div>
              <Button variant="ghost" size="sm" aria-label="Remover profissional" onClick={() => setReferencias((l) => l.filter((x) => x.id !== r.id))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {livresProf.length > 0 && (
            <Select value={null} placeholder="Adicionar profissional…" onChange={(v) => setReferencias((l) => [...l, { id: Number(v), papel: '' }])}
              options={livresProf.map((p) => ({ value: p.id, label: p.nome }))} />
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="obs-acompanhado" className="text-sm font-semibold">Observações</label>
        <Textarea id="obs-acompanhado" rows={3} maxLength={5000} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm"><Switch checked={ativo} onCheckedChange={setAtivo} aria-label="Acompanhamento ativo" />Acompanhamento ativo</label>
        <Button onClick={() => void salvar()} isLoading={salvando}>Salvar ficha</Button>
      </div>
    </section>
  );
};

const Laudos: React.FC<{ a: Acompanhado; opcoes: Opcoes; avisar: Toast; aoMudar: () => void }> = ({ a, opcoes, avisar, aoMudar }) => {
  const [form, setForm] = useState<{ descricao: string; emitente: string; emitido_em: string; condicao_id: number }>({ descricao: '', emitente: '', emitido_em: '', condicao_id: 0 });
  const { tratarErro } = useFormValidationModal();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState<number | null>(null);

  const enviar = async () => {
    if (!arquivo || !form.descricao.trim()) return;
    const corpo = new FormData();
    corpo.append('arquivo', arquivo);
    corpo.append('descricao', form.descricao.trim());
    if (form.emitente) corpo.append('emitente', form.emitente);
    if (form.emitido_em) corpo.append('emitido_em', form.emitido_em);
    if (form.condicao_id) corpo.append('condicao_id', String(form.condicao_id));
    setEnviando(true);
    try {
      await multiApi.anexarLaudo(a.id, corpo);
      setAberto(false);
      setArquivo(null);
      setForm({ descricao: '', emitente: '', emitido_em: '', condicao_id: 0 });
      avisar({ type: 'success', title: 'Laudo', message: 'Laudo anexado.' });
      aoMudar();
    } catch (e) {
      if (!tratarErro(e)) avisar({ type: 'error', title: 'Laudo', message: mensagemDeErro(e) });
    } finally {
      setEnviando(false);
    }
  };

  const abrir = async (laudo: number) => {
    try {
      abrirBlob(await multiApi.arquivoLaudo(a.id, laudo));
    } catch (e) {
      if (!tratarErro(e)) avisar({ type: 'error', title: 'Laudo', message: mensagemDeErro(e) });
    }
  };

  const remover = async (laudo: number) => {
    try {
      await multiApi.removerLaudo(a.id, laudo);
      setRemovendo(null);
      aoMudar();
    } catch (e) {
      if (!tratarErro(e)) avisar({ type: 'error', title: 'Laudo', message: mensagemDeErro(e) });
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Laudos e documentos</h3>
        <Button variant="outline" size="sm" onClick={() => setAberto((v) => !v)}><Plus className="mr-1 h-4 w-4" />Anexar laudo</Button>
      </div>
      {aberto && (
        <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
          <Input label="Descrição *" value={form.descricao} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          <Input label="Emitente" value={form.emitente} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, emitente: e.target.value }))} />
          <Input label="Data de emissão" type="date" value={form.emitido_em} onChange={(e) => setForm((f) => ({ ...f, emitido_em: e.target.value }))} />
          <Select label="Condição" value={form.condicao_id} onChange={(v) => setForm((f) => ({ ...f, condicao_id: Number(v) }))}
            options={[{ value: 0, label: 'Nenhuma' }, ...(a.condicoes ?? []).map((c) => ({ value: c.id, label: c.cid ? `${c.cid} — ${c.nome}` : c.nome }))]} />
          <Input label="Arquivo (PDF ou imagem, até 10 MB) *" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          <div className="flex items-end justify-end"><Button onClick={() => void enviar()} isLoading={enviando} disabled={!arquivo || !form.descricao.trim()}><Upload className="mr-1 h-4 w-4" />Enviar</Button></div>
        </div>
      )}
      {(a.laudos ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum laudo anexado.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {(a.laudos ?? []).map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={() => void abrir(l.id)}>{l.descricao}</button>
                <span className="block text-xs text-muted-foreground">
                  {[l.emitente, l.emitido_em ? dataHora(l.emitido_em) : null].filter(Boolean).join(' · ')}
                </span>
              </div>
              {l.condicao && <Badge variant="outline"><span className="font-mono">{l.condicao.cid ?? l.condicao.nome}</span></Badge>}
              {removendo === l.id ? (
                <span className="flex gap-1">
                  <Button variant="destructive" size="sm" onClick={() => void remover(l.id)}>Remover</Button>
                  <Button variant="outline" size="sm" onClick={() => setRemovendo(null)}>Cancelar</Button>
                </span>
              ) : (
                <Button variant="ghost" size="sm" aria-label={`Remover ${l.descricao}`} onClick={() => setRemovendo(l.id)}><Trash2 className="h-4 w-4" /></Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Cada abertura de laudo fica registrada na auditoria.</p>
    </section>
  );
};
