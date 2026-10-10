import React, { useState } from 'react';
import { FileDown, FileInput, Plus, BookOpen, Pencil, Trash2, FileUp } from 'lucide-react';
import { escolaApi, erroApi, type Materia } from '../api';
import { useCarga } from '../useCarga';
import AdminModal, { inputCls, labelCls, btnPrimary, btnSecondary, EstadoCarga, type Toast } from './AdminModal';
import { ConfirmModal } from './AlunoModals';


type ModalState =
  | { kind: 'form'; materia: Materia | null }
  | { kind: 'importar' }
  | { kind: 'excluir'; ids: number[]; label: string }
  | null;

interface MateriasAdminProps {
  onToast: Toast;
}

export const MateriasAdmin: React.FC<MateriasAdminProps> = ({ onToast }) => {
  const carga = useCarga(escolaApi.materias);
  const materias = carga.dados ?? [];
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);

  const todasSelecionadas = materias.length > 0 && materias.every(m => selecionadas.has(m.id));

  const toggleTodas = () => setSelecionadas(todasSelecionadas ? new Set() : new Set(materias.map(m => m.id)));

  const toggle = (id: number) => {
    const next = new Set(selecionadas);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelecionadas(next);
  };

  const exportarCSV = async () => {
    if (materias.length === 0) {
      onToast({ type: 'info', title: 'Aviso', message: 'Não há matérias para exportar.' });
      return;
    }
    try {
      await escolaApi.exportarMaterias();
    } catch (e) {
      onToast({ type: 'error', title: 'Falha na exportação', message: erroApi(e).mensagem });
    }
  };

  const excluir = async (ids: number[]) => {
    const resultados = await Promise.allSettled(ids.map((id) => escolaApi.excluirMateria(id)));
    const falhas = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    setSelecionadas(new Set());
    setModal(null);
    await carga.recarregar();
    if (falhas.length > 0) {
      onToast({ type: 'error', title: 'Exclusão incompleta', message: `${falhas.length} matéria(s) não foram excluídas: ${erroApi(falhas[0].reason).mensagem}` });
    } else {
      onToast({ type: 'success', title: 'Exclusão concluída', message: `${ids.length} matéria(s) excluída(s).` });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Gerenciar Matérias / Disciplinas</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportarCSV} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600">
            <FileDown className="w-4 h-4" /> Exportar CSV
          </button>
          <button onClick={() => setModal({ kind: 'importar' })} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">
            <FileInput className="w-4 h-4" /> Importar CSV
          </button>
          <button onClick={() => setModal({ kind: 'form', materia: null })} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm">
            <Plus className="w-4 h-4" /> Nova Matéria
          </button>
        </div>
      </div>

      {materias.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={todasSelecionadas} onChange={toggleTodas} className="w-5 h-5 accent-indigo-600 cursor-pointer" />
            Selecionar Todas
          </label>
          {selecionadas.size > 0 && (
            <button
              onClick={() => setModal({ kind: 'excluir', ids: [...selecionadas], label: `${selecionadas.size} matérias` })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 shadow-sm"
            >
              <Trash2 className="w-4 h-4" /> Excluir Selecionadas ({selecionadas.size})
            </button>
          )}
        </div>
      )}

      {carga.carregando || carga.erro ? (
        <EstadoCarga carregando={carga.carregando} erro={carga.erro} onTentar={carga.recarregar} />
      ) : materias.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-slate-500">
          <BookOpen className="w-10 h-10 text-slate-300" />
          <p className="text-sm">Nenhuma matéria cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {materias.map(m => {
            const vinculadas = (m.turmas ?? []).map((t) => t.nome);
            const sel = selecionadas.has(m.id);
            return (
              <div
                key={m.id}
                className={`relative flex flex-col p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all ${sel ? 'ring-2 ring-indigo-400' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => toggle(m.id)}
                  aria-label={`Selecionar ${m.nome}`}
                  className="absolute -top-2.5 -left-2.5 z-10 w-5 h-5 accent-indigo-600 cursor-pointer bg-white rounded shadow"
                />

                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Matéria / Disciplina</span>
                    <h3 className="text-xl font-extrabold text-indigo-950 dark:text-white leading-tight">{m.nome}</h3>
                  </div>
                  <span className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500">
                    <BookOpen className="w-5 h-5" />
                  </span>
                </div>

                <div className="flex-1 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">Turmas Ativas</span>
                    <span className="min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center bg-sky-100 text-sky-700 text-[11px] font-bold font-mono">{vinculadas.length}</span>
                  </div>
                  {vinculadas.length === 0 ? (
                    <p className="text-sm italic text-slate-400">Nenhuma turma vinculada</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {vinculadas.slice(0, 8).map((nome, i) => (
                        <span key={`${nome}-${i}`} className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{nome}</span>
                      ))}
                      {vinculadas.length > 8 && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700">+{vinculadas.length - 8}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setModal({ kind: 'form', materia: m })}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300"
                  >
                    <Pencil className="w-4 h-4" /> Editar
                  </button>
                  <button
                    onClick={() => setModal({ kind: 'excluir', ids: [m.id], label: `a matéria ${m.nome}` })}
                    title="Excluir"
                    aria-label={`Excluir ${m.nome}`}
                    className="w-11 rounded-xl flex items-center justify-center bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal?.kind === 'form' && (
        <MateriaFormModal
          materia={modal.materia}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); void carga.recarregar(); }}
          onToast={onToast}
        />
      )}
      {modal?.kind === 'importar' && (
        <ImportarMateriasModal onClose={() => setModal(null)} onImported={() => void carga.recarregar()} onToast={onToast} />
      )}
      {modal?.kind === 'excluir' && (
        <ConfirmModal
          title={modal.ids.length > 1 ? 'Excluir Selecionadas?' : 'Excluir matéria?'}
          message={`Excluir ${modal.label} permanentemente? Os vínculos com as turmas também serão removidos. Esta ação não pode ser desfeita.`}
          confirmLabel="Sim, excluir"
          onConfirm={() => excluir(modal.ids)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

// ─── Nova / Editar Matéria (apenas o nome) ─────────────────────────────

interface MateriaFormModalProps {
  materia: Materia | null;
  onClose: () => void;
  onSaved: () => void;
  onToast: Toast;
}

const MateriaFormModal: React.FC<MateriaFormModalProps> = ({ materia, onClose, onSaved, onToast }) => {
  const [nome, setNome] = useState(materia?.nome || '');
  const [erro, setErro] = useState('');

  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nome.trim();
    if (!n) return setErro('Informe o nome da matéria.');
    setSalvando(true);
    try {
      await (materia ? escolaApi.atualizarMateria(materia.id, n) : escolaApi.criarMateria(n));
      onToast({ type: 'success', title: materia ? 'Matéria atualizada' : 'Matéria cadastrada', message: `${n} salva com sucesso.` });
      onSaved();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AdminModal
      title={materia ? 'Editar Matéria' : 'Nova Matéria'}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" form="form-materia" className={btnPrimary} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </>
      }
    >
      <form id="form-materia" onSubmit={handleSubmit}>
        <label className={labelCls} htmlFor="materia-nome">Nome</label>
        <input id="materia-nome" className={inputCls} value={nome} onChange={e => { setNome(e.target.value); setErro(''); }} autoFocus required />
        {erro && <p className="mt-2 text-sm font-medium text-red-600">{erro}</p>}
      </form>
    </AdminModal>
  );
};

// ─── Importar Matérias CSV ─────────────────────────────────────────────

interface ImportarMateriasModalProps {
  onClose: () => void;
  onImported: () => void;
  onToast: Toast;
}

const ImportarMateriasModal: React.FC<ImportarMateriasModalProps> = ({ onClose, onImported, onToast }) => {
  const [file, setFile] = useState<File | null>(null);
  const [resultado, setResultado] = useState<{ importadas: number; ignoradas: number } | null>(null);

  const [erro, setErro] = useState('');

  const handleImport = async () => {
    if (!file) return;
    setErro('');
    try {
      const r = await escolaApi.importarMaterias(file);
      setResultado(r);
      onImported();
      onToast({ type: 'success', title: 'Importação concluída', message: `Foram importadas ${r.importadas} matérias com sucesso!` });
    } catch (e) {
      setErro(erroApi(e).mensagem);
    }
  };

  return (
    <AdminModal
      title="Importar Matérias CSV"
      onClose={onClose}
      size="sm"
      footer={
        resultado ? (
          <button onClick={onClose} className={btnPrimary}>Fechar</button>
        ) : (
          <>
            <button onClick={onClose} className={btnSecondary}>Cancelar</button>
            <button onClick={handleImport} disabled={!file} className={btnPrimary}>Importar</button>
          </>
        )
      }
    >
      {resultado ? (
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-slate-800 dark:text-slate-200">{resultado.importadas} matérias importadas.</p>
          <p className="text-slate-500">{resultado.ignoradas} já existiam e foram ignoradas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Use uma coluna <code className="font-mono">Nome</code> (o mesmo formato do Exportar CSV) ou uma lista de nomes na primeira coluna. A primeira linha é o cabeçalho. Matérias já cadastradas são ignoradas.
          </p>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40">
            <FileUp className="w-7 h-7 text-indigo-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{file ? file.name : 'Selecione o arquivo CSV'}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          {erro && <p role="alert" className="text-sm font-medium text-red-600">{erro}</p>}
        </div>
      )}
    </AdminModal>
  );
};

export default MateriasAdmin;
