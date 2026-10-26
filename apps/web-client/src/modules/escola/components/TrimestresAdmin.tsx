import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import { ActionsMenu, DataTable, StatusChip } from '@sysgov/ui';
import { escolaApi, erroApi, type Trimestre as PeriodoTrimestre, type SituacaoPeriodo } from '../api';
import { useCarga } from '../useCarga';
import AdminModal, { inputCls, labelCls, btnPrimary, btnSecondary, EstadoCarga, type Toast } from './AdminModal';
import { ConfirmModal } from './AlunoModals';
import { useFormValidationModal } from '@/lib/useFormValidationModal';


type ModalState =
  | { kind: 'form'; trimestre: PeriodoTrimestre | null }
  | { kind: 'excluir'; trimestre: PeriodoTrimestre }
  | null;

const formatarData = (iso: string) => {
  const [a, m, d] = iso.split('-');
  return a && m && d ? `${d}/${m}/${a}` : '-';
};

// Situação calculada pela API (mesma regra do sistema original)
const SITUACAO: Record<SituacaoPeriodo, { label: string; variant: 'neutral' | 'info' | 'success' | 'danger' }> = {
  arquivo: { label: 'Arquivo', variant: 'neutral' },
  agendado: { label: 'Agendado', variant: 'info' },
  em_andamento: { label: 'Em Andamento', variant: 'success' },
  encerrado: { label: 'Encerrado', variant: 'danger' },
};

interface TrimestresAdminProps {
  onToast: Toast;
}

export const TrimestresAdmin: React.FC<TrimestresAdminProps> = ({ onToast }) => {
  const carga = useCarga(escolaApi.trimestres);
  const trimestres = carga.dados ?? [];
  const [modal, setModal] = useState<ModalState>(null);

  const recarregar = async () => {
    setModal(null);
    await carga.recarregar();
  };

  const excluir = async (t: PeriodoTrimestre) => {
    try {
      await escolaApi.excluirTrimestre(t.id);
      onToast({ type: 'success', title: 'Trimestre excluído', message: `${t.numero}º Trimestre de ${t.ano_letivo} foi removido.` });
      await recarregar();
    } catch (e) {
      setModal(null);
      onToast({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem });
    }
  };

  const colunas = useMemo<ColumnDef<PeriodoTrimestre, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => {
        const rotulo = `${row.original.numero}º Trimestre de ${row.original.ano_letivo}`;
        return (
          <div className="flex justify-center">
            <ActionsMenu
              triggerLabel={`Ações do ${rotulo}`}
              items={[
                { key: 'editar', label: 'Editar', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: () => setModal({ kind: 'form', trimestre: row.original }) },
                { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setModal({ kind: 'excluir', trimestre: row.original }) },
              ]}
            />
          </div>
        );
      },
    },
    {
      id: 'ano',
      header: 'Ano',
      accessorKey: 'ano_letivo',
      cell: ({ row }) => <span className="font-mono font-bold">{row.original.ano_letivo}</span>,
      meta: { exportHeader: 'Ano', exportValue: (t) => t.ano_letivo },
    },
    {
      id: 'trimestre',
      header: 'Trimestre',
      accessorKey: 'numero',
      cell: ({ row }) => `${row.original.numero}º Trimestre`,
      meta: { exportHeader: 'Trimestre', exportValue: (t) => `${t.numero}º Trimestre` },
    },
    {
      id: 'inicio',
      header: 'Início',
      accessorKey: 'data_inicio',
      cell: ({ row }) => <span className="font-mono">{formatarData(row.original.data_inicio)}</span>,
      meta: { exportHeader: 'Início', exportValue: (t) => formatarData(t.data_inicio) },
    },
    {
      id: 'fim',
      header: 'Fim',
      accessorKey: 'data_fim',
      cell: ({ row }) => <span className="font-mono">{formatarData(row.original.data_fim)}</span>,
      meta: { exportHeader: 'Fim', exportValue: (t) => formatarData(t.data_fim) },
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (t) => SITUACAO[t.situacao].label,
      cell: ({ row }) => <StatusChip label={SITUACAO[row.original.situacao].label} variant={SITUACAO[row.original.situacao].variant} />,
      meta: { exportHeader: 'Status', exportValue: (t) => SITUACAO[t.situacao].label },
    },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Períodos Letivos (Trimestres)</h2>
        <button
          onClick={() => setModal({ kind: 'form', trimestre: null })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
        >
          <CalendarPlus className="w-4 h-4" /> Novo Trimestre
        </button>
      </div>

      {carga.carregando || carga.erro ? (
        <EstadoCarga carregando={carga.carregando} erro={carga.erro} onTentar={carga.recarregar} />
      ) : (
        <DataTable
          columns={colunas}
          data={trimestres}
          emptyText="Nenhum trimestre cadastrado."
          exportable
          exportFileName="escola-trimestres"
          exportTitle="Cadastro Escolar — Períodos Letivos (Trimestres)"
        />
      )}

      {modal?.kind === 'form' && (
        <TrimestreFormModal trimestre={modal.trimestre} onClose={() => setModal(null)} onSaved={recarregar} onToast={onToast} />
      )}
      {modal?.kind === 'excluir' && (
        <ConfirmModal
          title="Excluir trimestre?"
          message={`Excluir o ${modal.trimestre.numero}º Trimestre de ${modal.trimestre.ano_letivo}? Esta ação não pode ser desfeita.`}
          confirmLabel="Sim, excluir"
          onConfirm={() => excluir(modal.trimestre)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

// ─── Novo / Editar Trimestre ───────────────────────────────────────────

interface TrimestreFormModalProps {
  trimestre: PeriodoTrimestre | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onToast: Toast;
}

const TrimestreFormModal: React.FC<TrimestreFormModalProps> = ({ trimestre, onClose, onSaved, onToast }) => {
  const [ano, setAno] = useState(String(trimestre?.ano_letivo ?? new Date().getFullYear()));
  const [numero, setNumero] = useState<1 | 2 | 3>(trimestre?.numero ?? 1);
  const [inicio, setInicio] = useState(trimestre?.data_inicio || '');
  const [fim, setFim] = useState(trimestre?.data_fim || '');
  const [erro, setErro] = useState('');
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();

  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const anoNum = parseInt(ano, 10);
    if (Number.isNaN(anoNum) || anoNum < 2020 || anoNum > 2100) return invalidar([['validação', 'Informe um ano letivo entre 2020 e 2100.']]);
    if (!inicio || !fim) return invalidar([['validação', 'Informe as datas de início e fim.']]);
    if (fim < inicio) return invalidar([['validação', 'A data de fim deve ser igual ou posterior à data de início.']]);
    setSalvando(true);
    try {
      await escolaApi.salvarTrimestre({ ano_letivo: anoNum, numero, data_inicio: inicio, data_fim: fim }, trimestre?.id);
      onToast({
        type: 'success',
        title: trimestre ? 'Trimestre atualizado' : 'Trimestre cadastrado',
        message: `${numero}º Trimestre de ${anoNum} salvo com sucesso.`,
      });
      onSaved();
    } catch (e) {
      if (!tratarErro(e)) setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AdminModal
      title={trimestre ? 'Editar Trimestre' : 'Novo Trimestre'}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" form="form-trimestre" className={btnPrimary} disabled={salvando}>
            {trimestre ? 'Salvar Alterações' : 'Cadastrar Trimestre'}
          </button>
        </>
      }
    >
      {modalValidacao}
      <form noValidate id="form-trimestre" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="tri-ano">Ano Letivo</label>
          <input id="tri-ano" type="number" min={2020} max={2100} className={`${inputCls} font-mono`} value={ano} onChange={e => { setAno(e.target.value); setErro(''); }} />
        </div>
        <div>
          <label className={labelCls} htmlFor="tri-num">Trimestre</label>
          <select id="tri-num" className={inputCls} value={numero} onChange={e => { setNumero(Number(e.target.value) as 1 | 2 | 3); setErro(''); }}>
            <option value={1}>1º Trimestre</option>
            <option value={2}>2º Trimestre</option>
            <option value={3}>3º Trimestre</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="tri-inicio">Data de Início</label>
            <input id="tri-inicio" type="date" className={inputCls} value={inicio} onChange={e => { setInicio(e.target.value); setErro(''); }} />
          </div>
          <div>
            <label className={labelCls} htmlFor="tri-fim">Data de Fim</label>
            <input id="tri-fim" type="date" min={inicio || undefined} className={inputCls} value={fim} onChange={e => { setFim(e.target.value); setErro(''); }} />
          </div>
        </div>
        {erro && <p className="text-sm font-medium text-red-600">{erro}</p>}
      </form>
    </AdminModal>
  );
};

export default TrimestresAdmin;
