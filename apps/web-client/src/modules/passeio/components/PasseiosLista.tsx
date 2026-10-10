import React, { useMemo, useState } from 'react';
import { Compass, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, Input, Modal, Select, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { formatarCentavos, formatarData } from '@/lib/formatacao';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import type { Toast } from '../../escola/components/AdminModal';
import { passeioApi, type Passeio } from '../api';
import { FORM_VAZIO, OPCOES_STATUS, STATUS, dadosDoForm, formDoPasseio, periodoDoPasseio, type FormPasseio } from '../formato';
import type { Permissoes } from '../ModuloPasseioMain';

interface Props {
  passeios: Passeio[];
  ativoId: number | null;
  permissoes: Permissoes;
  avisar: Toast;
  recarregar: () => Promise<void>;
  selecionar: (p: Passeio) => void;
}

/** Cadastro dos passeios da escola: busca, criar/editar em Modal e excluir com confirmação. */
export const PasseiosLista: React.FC<Props> = ({ passeios, ativoId, permissoes, avisar, recarregar, selecionar }) => {
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Passeio | 'novo' | null>(null);
  const [excluir, setExcluir] = useState<Passeio | null>(null);

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return t ? passeios.filter((p) => `${p.nome} ${p.destino} ${p.cidade} ${p.responsavel}`.toLowerCase().includes(t)) : passeios;
  }, [passeios, busca]);

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <Input label="Buscar" placeholder="Nome, destino, cidade ou responsável" value={busca} onChange={(e) => setBusca(e.target.value)} leftIcon={<Search className="h-4 w-4" />} className="md:w-96" />
          {permissoes.passeios && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditando('novo')}>Novo passeio</Button>}
        </div>
        {visiveis.length === 0 ? (
          <EmptyState icon={<Compass className="h-8 w-8" />} title={passeios.length === 0 ? 'Nenhum passeio cadastrado' : 'Nenhum passeio encontrado'} description={passeios.length === 0 ? 'Cadastre o primeiro passeio da escola.' : 'Ajuste a busca.'} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Passeio</TableHead><TableHead>Data</TableHead><TableHead>Destino</TableHead>
                <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Inscritos</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((p) => (
                <TableRow key={p.id} data-state={p.id === ativoId ? 'selected' : undefined}>
                  <TableCell>
                    <Button variant="link" className="h-auto p-0 font-medium" onClick={() => selecionar(p)} aria-label={`Trabalhar no passeio ${p.nome}`}>{p.nome}</Button>
                    <p className="text-xs text-muted-foreground">{p.responsavel}</p>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">{formatarData(p.data_passeio)}<p className="text-xs text-muted-foreground">{periodoDoPasseio(p)}</p></TableCell>
                  <TableCell>{p.destino}<p className="text-xs text-muted-foreground">{p.cidade}</p></TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(p.valor_centavos)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{p.inscricoes_count ?? 0}</TableCell>
                  <TableCell><StatusChip label={STATUS[p.status].rotulo} variant={STATUS[p.status].variante} /></TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {permissoes.passeios && (
                      <>
                        <Button size="icon-sm" variant="ghost" aria-label={`Editar ${p.nome}`} onClick={() => setEditando(p)}><Pencil /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${p.nome}`} onClick={() => setExcluir(p)}><Trash2 /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <PasseioFormModal
        passeio={editando}
        onFechar={() => setEditando(null)}
        onSalvo={async (p, novo) => {
          setEditando(null);
          avisar({ type: 'success', title: novo ? 'Passeio cadastrado' : 'Passeio atualizado', message: p.nome });
          await recarregar();
          if (novo) selecionar(p);
        }}
      />
      <ConfirmarModal
        aberto={excluir !== null}
        titulo="Excluir passeio"
        mensagem={<>Excluir <strong>{excluir?.nome}</strong>? As inscrições, os veículos e os assentos dele também saem.</>}
        rotuloConfirmar="Excluir"
        perigo
        onFechar={() => setExcluir(null)}
        onConfirmar={async () => {
          if (!excluir) return;
          try {
            await passeioApi.excluirPasseio(excluir.id);
            avisar({ type: 'success', title: 'Passeio excluído', message: excluir.nome });
            await recarregar();
          } catch (e) {
            avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem });
          }
        }}
      />
    </Card>
  );
};

/** Formulário do passeio (criar ou editar). */
export const PasseioFormModal: React.FC<{ passeio: Passeio | 'novo' | null; onFechar: () => void; onSalvo: (p: Passeio, novo: boolean) => Promise<void> }> = ({ passeio, onFechar, onSalvo }) => {
  const [form, setForm] = useState<FormPasseio>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState<Passeio | 'novo' | null>(null);

  // Ao abrir, preenche com o passeio escolhido (ou vazio).
  if (passeio !== aberto) {
    setAberto(passeio);
    setForm(passeio && passeio !== 'novo' ? formDoPasseio(passeio) : FORM_VAZIO);
    setErro(null);
  }

  const definir = (campo: keyof FormPasseio) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const dados = dadosDoForm(form);
    if (typeof dados === 'string') {
      setErro(dados);
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const novo = passeio === 'novo';
      const salvo = novo ? await passeioApi.criarPasseio(dados) : await passeioApi.atualizarPasseio((passeio as Passeio).id, dados);
      await onSalvo(salvo, novo);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open={passeio !== null}
      onClose={onFechar}
      title={passeio === 'novo' ? 'Novo passeio' : 'Editar passeio'}
      icon={<Compass className="h-5 w-5" />}
      size="xl"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-passeio" isLoading={salvando}>Salvar</Button></>}
    >
      <form id="form-passeio" onSubmit={salvar} className="space-y-3">
        <Input label="Nome do passeio ou evento *" value={form.nome} onChange={definir('nome')} required maxLength={250} />
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Data do passeio *" type="date" value={form.data_passeio} onChange={definir('data_passeio')} required className="font-mono tabular-nums" />
          <Input label="Prazo dos termos" type="date" value={form.data_limite_autorizacao} onChange={definir('data_limite_autorizacao')} max={form.data_passeio || undefined} className="font-mono tabular-nums" />
          <Input label="Saída *" type="time" value={form.horario_saida} onChange={definir('horario_saida')} required className="font-mono tabular-nums" />
          <Input label="Retorno previsto" type="time" value={form.horario_retorno} onChange={definir('horario_retorno')} className="font-mono tabular-nums" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Local de saída *" value={form.local_saida} onChange={definir('local_saida')} required maxLength={250} />
          <Input label="Destino *" value={form.destino} onChange={definir('destino')} required maxLength={250} />
          <Input label="Cidade *" value={form.cidade} onChange={definir('cidade')} required maxLength={150} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Responsável *" value={form.responsavel} onChange={definir('responsavel')} required maxLength={200} />
          <Input label="Valor por aluno (R$)" value={form.valor} onChange={definir('valor')} inputMode="decimal" className="font-mono tabular-nums" />
          <Select label="Status" value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v as FormPasseio['status'] }))} options={OPCOES_STATUS} />
        </div>
        <label className="block space-y-1 text-sm font-medium">
          Atividade / observações (sai no termo de autorização)
          <Textarea rows={3} value={form.observacoes} onChange={definir('observacoes')} maxLength={5000} placeholder="O que os alunos vão fazer no passeio" />
        </label>
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};
