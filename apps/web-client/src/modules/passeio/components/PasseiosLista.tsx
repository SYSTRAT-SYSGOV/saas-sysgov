import React, { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Compass, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ActionsMenu, Button, Card, CardContent, DataTable, Input, Modal, Select, StatusChip, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { formatarCentavos, formatarData } from '@/lib/formatacao';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import type { Toast } from '../../escola/components/AdminModal';
import { passeioApi, type Passeio } from '../api';
import { FORM_VAZIO, OPCOES_STATUS, STATUS, dadosDoForm, formDoPasseio, periodoDoPasseio, type FormPasseio } from '../formato';
import type { Permissoes } from '../ModuloPasseioMain';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

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
  const { tratarErro } = useFormValidationModal();
  const [editando, setEditando] = useState<Passeio | 'novo' | null>(null);
  const [excluir, setExcluir] = useState<Passeio | null>(null);

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return t ? passeios.filter((p) => `${p.nome} ${p.destino} ${p.cidade} ${p.responsavel}`.toLowerCase().includes(t)) : passeios;
  }, [passeios, busca]);

  // Colunas estáveis; o estado atual (permissão, passeio ativo, callbacks) vem por ref.
  const ctx = useRef({ permissoes, ativoId, selecionar });
  ctx.current = { permissoes, ativoId, selecionar };
  const colunas = useMemo<ColumnDef<Passeio, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel={`Ações de ${row.original.nome}`}
            items={ctx.current.permissoes.passeios ? [
              { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setEditando(row.original) },
              { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setExcluir(row.original) },
            ] : []}
          />
        </div>
      ),
    },
    {
      id: 'passeio',
      header: 'Passeio',
      accessorKey: 'nome',
      cell: ({ row }) => (
        <div>
          <Button variant="link" className="h-auto p-0 font-medium" onClick={() => ctx.current.selecionar(row.original)} aria-label={`Trabalhar no passeio ${row.original.nome}`}>{row.original.nome}</Button>
          {row.original.id === ctx.current.ativoId && <StatusChip label="Em uso" variant="info" className="ml-2" />}
        </div>
      ),
      meta: { exportHeader: 'Passeio', exportValue: (p) => p.nome },
    },
    { id: 'responsavel', header: 'Responsável', accessorKey: 'responsavel', meta: { exportHeader: 'Responsável', exportValue: (p) => p.responsavel } },
    {
      id: 'data',
      header: 'Data',
      accessorKey: 'data_passeio',
      cell: ({ row }) => <span className="font-mono tabular-nums">{formatarData(row.original.data_passeio)}<p className="text-xs text-muted-foreground">{periodoDoPasseio(row.original)}</p></span>,
      meta: { exportHeader: 'Data', exportValue: (p) => `${formatarData(p.data_passeio)} ${periodoDoPasseio(p)}` },
    },
    {
      id: 'destino',
      header: 'Destino',
      accessorKey: 'destino',
      cell: ({ row }) => <span>{row.original.destino}<p className="text-xs text-muted-foreground">{row.original.cidade}</p></span>,
      meta: { exportHeader: 'Destino', exportValue: (p) => `${p.destino} — ${p.cidade}` },
    },
    {
      id: 'valor',
      header: 'Valor',
      accessorKey: 'valor_centavos',
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{formatarCentavos(row.original.valor_centavos)}</span>,
      meta: { exportHeader: 'Valor', exportValue: (p) => formatarCentavos(p.valor_centavos) },
    },
    {
      id: 'inscritos',
      header: 'Inscritos',
      accessorFn: (p) => p.inscricoes_count ?? 0,
      cell: ({ row }) => <span className="block text-right font-mono tabular-nums">{row.original.inscricoes_count ?? 0}</span>,
      meta: { exportHeader: 'Inscritos', exportValue: (p) => p.inscricoes_count ?? 0 },
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (p) => STATUS[p.status].rotulo,
      cell: ({ row }) => <StatusChip label={STATUS[row.original.status].rotulo} variant={STATUS[row.original.status].variante} />,
      meta: { exportHeader: 'Status', exportValue: (p) => STATUS[p.status].rotulo },
    },
  ], []);

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
          <DataTable
            columns={colunas}
            data={visiveis}
            emptyText="Nenhum passeio encontrado."
            exportable
            exportFileName="passeios"
            exportTitle="Passeios"
          />
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
            if (!tratarErro(e)) avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem });
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
  const { modal: modalValidacao, validar, tratarErro } = useFormValidationModal();
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
    if (!validar([['Nome do passeio ou evento', form.nome], ['Data do passeio', form.data_passeio], ['Saída', form.horario_saida], ['Local de saída', form.local_saida], ['Destino', form.destino], ['Cidade', form.cidade], ['Responsável', form.responsavel]])) return;
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
      if (!tratarErro(e)) setErro(erroApi(e).mensagem);
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
      {modalValidacao}
      <form noValidate id="form-passeio" onSubmit={salvar} className="space-y-3">
        <Input label="Nome do passeio ou evento *" value={form.nome} onChange={definir('nome')} maxLength={250} />
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Data do passeio *" type="date" value={form.data_passeio} onChange={definir('data_passeio')} className="font-mono tabular-nums" />
          <Input label="Prazo dos termos" type="date" value={form.data_limite_autorizacao} onChange={definir('data_limite_autorizacao')} max={form.data_passeio || undefined} className="font-mono tabular-nums" />
          <Input label="Saída *" type="time" value={form.horario_saida} onChange={definir('horario_saida')} className="font-mono tabular-nums" />
          <Input label="Retorno previsto" type="time" value={form.horario_retorno} onChange={definir('horario_retorno')} className="font-mono tabular-nums" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Local de saída *" value={form.local_saida} onChange={definir('local_saida')} maxLength={250} />
          <Input label="Destino *" value={form.destino} onChange={definir('destino')} maxLength={250} />
          <Input label="Cidade *" value={form.cidade} onChange={definir('cidade')} maxLength={150} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Responsável *" value={form.responsavel} onChange={definir('responsavel')} maxLength={200} />
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
