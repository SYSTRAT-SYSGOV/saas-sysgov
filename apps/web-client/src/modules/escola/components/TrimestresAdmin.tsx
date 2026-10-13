import React, { useState } from 'react';
import { CalendarPlus, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { escolaApi, erroApi, type Trimestre as PeriodoTrimestre, type SituacaoPeriodo } from '../api';
import { useCarga } from '../useCarga';
import AdminModal, { inputCls, labelCls, btnPrimary, btnSecondary, EstadoCarga, type Toast } from './AdminModal';
import { ConfirmModal } from './AlunoModals';


type ModalState =
  | { kind: 'form'; trimestre: PeriodoTrimestre | null }
  | { kind: 'excluir'; trimestre: PeriodoTrimestre }
  | null;

const formatarData = (iso: string) => {
  const [a, m, d] = iso.split('-');
  return a && m && d ? `${d}/${m}/${a}` : '-';
};

// Situação calculada pela API (mesma regra do sistema original)
const SITUACAO: Record<SituacaoPeriodo, { label: string; cls: string }> = {
  arquivo: { label: 'Arquivo', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  agendado: { label: 'Agendado', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  em_andamento: { label: 'Em Andamento', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  encerrado: { label: 'Encerrado', cls: 'bg-red-50 text-red-600 border-red-200' },
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3">Ano</th>
              <th className="px-4 py-3">Trimestre</th>
              <th className="px-4 py-3">Início</th>
              <th className="px-4 py-3">Fim</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carga.carregando || carga.erro ? (
              <tr><td colSpan={6}><EstadoCarga carregando={carga.carregando} erro={carga.erro} onTentar={carga.recarregar} /></td></tr>
            ) : trimestres.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Nenhum trimestre cadastrado.
                </td>
              </tr>
            ) : trimestres.map(t => {
              const st = SITUACAO[t.situacao];
              return (
                <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-4 font-bold text-base text-slate-900 dark:text-white font-mono">{t.ano_letivo}</td>
                  <td className="px-4 py-4 text-base text-slate-800 dark:text-slate-200">{t.numero}º Trimestre</td>
                  <td className="px-4 py-4 text-base text-slate-700 dark:text-slate-300 font-mono">{formatarData(t.data_inicio)}</td>
                  <td className="px-4 py-4 text-base text-slate-700 dark:text-slate-300 font-mono">{formatarData(t.data_fim)}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full border text-xs font-semibold ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setModal({ kind: 'form', trimestre: t })}
                        title="Editar"
                        aria-label={`Editar ${t.numero}º Trimestre de ${t.ano_letivo}`}
                        className="w-11 h-8 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setModal({ kind: 'excluir', trimestre: t })}
                        title="Excluir"
                        aria-label={`Excluir ${t.numero}º Trimestre de ${t.ano_letivo}`}
                        className="w-11 h-8 rounded-lg flex items-center justify-center bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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

  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const anoNum = parseInt(ano, 10);
    if (Number.isNaN(anoNum) || anoNum < 2020 || anoNum > 2100) return setErro('Informe um ano letivo entre 2020 e 2100.');
    if (!inicio || !fim) return setErro('Informe as datas de início e fim.');
    if (fim < inicio) return setErro('A data de fim deve ser igual ou posterior à data de início.');
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
      setErro(erroApi(e).mensagem);
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
      <form id="form-trimestre" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="tri-ano">Ano Letivo</label>
          <input id="tri-ano" type="number" min={2020} max={2100} className={`${inputCls} font-mono`} value={ano} onChange={e => { setAno(e.target.value); setErro(''); }} required />
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
            <input id="tri-inicio" type="date" className={inputCls} value={inicio} onChange={e => { setInicio(e.target.value); setErro(''); }} required />
          </div>
          <div>
            <label className={labelCls} htmlFor="tri-fim">Data de Fim</label>
            <input id="tri-fim" type="date" min={inicio || undefined} className={inputCls} value={fim} onChange={e => { setFim(e.target.value); setErro(''); }} required />
          </div>
        </div>
        {erro && <p className="text-sm font-medium text-red-600">{erro}</p>}
      </form>
    </AdminModal>
  );
};

export default TrimestresAdmin;
