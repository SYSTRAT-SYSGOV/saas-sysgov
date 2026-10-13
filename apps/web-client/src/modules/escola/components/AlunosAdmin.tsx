import React, { useEffect, useState } from 'react';
import {
  FileInput,
  UserMinus,
  GraduationCap,
  UserPlus,
  Search,
  Calendar,
  Phone,
  Pencil,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { useArquivoAutenticado } from '@/hooks/useArquivoAutenticado';

import { escolaApi, erroApi, type Aluno as AlunoPedagogico, type SituacaoAluno } from '../api';
import { useCarga } from '../useCarga';
import { inputCls, EstadoCarga, type Toast } from './AdminModal';
import { AlunoFormModal, NotasAlunoModal, ImportarCSVModal, LimparTurmaModal, ConfirmModal } from './AlunoModals';

const PAGE_SIZE = 20;

type ModalState =
  | { kind: 'form'; aluno: AlunoPedagogico | null }
  | { kind: 'notas'; aluno: AlunoPedagogico }
  | { kind: 'importar'; tipo: 'alunos' | 'notas' }
  | { kind: 'limpar' }
  | { kind: 'excluir'; ids: number[]; label: string }
  | null;

interface AlunosAdminProps {
  onToast: Toast;
}

const SITUACAO: Record<SituacaoAluno, string> = { ativo: 'Ativo', transferido: 'Transferido', remanejado: 'Remanejado' };

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function idade(nascimento?: string | null): string | null {
  if (!nascimento) return null;
  const d = new Date(nascimento + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  const hoje = new Date();
  let anos = hoje.getFullYear() - d.getFullYear();
  if (hoje.getMonth() < d.getMonth() || (hoje.getMonth() === d.getMonth() && hoje.getDate() < d.getDate())) anos--;
  return `${anos} anos`;
}

export const AlunosAdmin: React.FC<AlunosAdminProps> = ({ onToast }) => {
  const [buscaInput, setBuscaInput] = useState('');
  const [turmaInput, setTurmaInput] = useState('');
  const [filtro, setFiltro] = useState({ busca: '', turma: '' });
  const [page, setPage] = useState(1);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);

  const turmasCarga = useCarga(() => escolaApi.turmas());
  const turmas = turmasCarga.dados ?? [];
  const unidade = useCarga(escolaApi.unidade);
  const escolaNome = unidade.dados?.nome ?? '';

  // Busca, filtro, ordenação (número e nome) e paginação feitos pela API.
  const lista = useCarga(
    () => escolaApi.alunos({ busca: filtro.busca || undefined, turma_id: filtro.turma ? Number(filtro.turma) : undefined, page, per_page: PAGE_SIZE }),
    [filtro, page],
  );
  const pagina = lista.dados?.data ?? [];
  const total = lista.dados?.meta.total ?? 0;
  const totalPages = Math.max(1, lista.dados?.meta.last_page ?? 1);
  const todosSelecionados = pagina.length > 0 && pagina.every(a => selecionados.has(a.id));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const aplicarFiltro = (e: React.FormEvent) => {
    e.preventDefault();
    setFiltro({ busca: buscaInput.trim(), turma: turmaInput });
    setPage(1);
  };

  const limparFiltro = () => {
    setBuscaInput('');
    setTurmaInput('');
    setFiltro({ busca: '', turma: '' });
    setPage(1);
  };

  const toggleTodos = () => {
    const next = new Set(selecionados);
    pagina.forEach(a => (todosSelecionados ? next.delete(a.id) : next.add(a.id)));
    setSelecionados(next);
  };

  const toggleUm = (id: number) => {
    const next = new Set(selecionados);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelecionados(next);
  };

  const fecharEAtualizar = async () => {
    setModal(null);
    await Promise.all([lista.recarregar(), turmasCarga.recarregar()]);
  };

  const confirmarExclusao = async (ids: number[]) => {
    try {
      const { excluidos } = await escolaApi.excluirAlunos(ids);
      setSelecionados(new Set());
      onToast({ type: 'success', title: 'Exclusão concluída', message: `${excluidos} aluno(s) excluído(s).` });
    } catch (e) {
      onToast({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem });
    }
    await fecharEAtualizar();
  };

  const filtroAtivo = filtro.busca || filtro.turma;

  return (
    <div className="space-y-6">
      {/* Cabeçalho + ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Gerenciar Alunos</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModal({ kind: 'importar', tipo: 'alunos' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <FileInput className="w-4 h-4" /> Importar Alunos
          </button>
          <button
            onClick={() => setModal({ kind: 'limpar' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 transition-colors"
          >
            <UserMinus className="w-4 h-4" /> Limpar Turma
          </button>
          <button
            onClick={() => setModal({ kind: 'importar', tipo: 'notas' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 transition-colors"
          >
            <GraduationCap className="w-4 h-4" /> Importar Notas
          </button>
          <button
            onClick={() => setModal({ kind: 'form', aluno: null })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Novo Aluno
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        {/* Busca */}
        <form onSubmit={aplicarFiltro} className="flex flex-col md:flex-row gap-3 md:items-center">
          <input
            type="search"
            className={`${inputCls} md:flex-1`}
            placeholder="Buscar por nome, pai ou mãe..."
            value={buscaInput}
            onChange={e => setBuscaInput(e.target.value)}
          />
          <select className={`${inputCls} md:w-52`} value={turmaInput} onChange={e => setTurmaInput(e.target.value)}>
            <option value="">Todas as Turmas</option>
            {turmas.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 flex-1 md:flex-none">
              <Search className="w-4 h-4" /> Pesquisar
            </button>
            {filtroAtivo && (
              <button type="button" onClick={limparFiltro} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">
                Limpar
              </button>
            )}
          </div>
        </form>

        {/* Seleção múltipla */}
        {pagina.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={todosSelecionados} onChange={toggleTodos} className="w-5 h-5 accent-indigo-600 cursor-pointer" />
              Selecionar Todos (Nesta página)
            </label>
            {selecionados.size > 0 && (
              <button
                onClick={() => setModal({ kind: 'excluir', ids: [...selecionados], label: `${selecionados.size} alunos selecionados` })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Excluir Selecionados ({selecionados.size})
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {total} aluno(s) encontrado(s){filtroAtivo ? ' com os filtros aplicados' : ''}.
        </p>

        {/* Lista de alunos */}
        {lista.carregando || lista.erro ? (
          <EstadoCarga carregando={lista.carregando} erro={lista.erro} onTentar={lista.recarregar} />
        ) : pagina.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-slate-500">
            <Users className="w-10 h-10 text-slate-300" />
            <p className="text-sm">Nenhum aluno encontrado.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pagina.map(aluno => (
              <AlunoCard
                key={aluno.id}
                aluno={aluno}
                escolaNome={escolaNome}
                selecionado={selecionados.has(aluno.id)}
                onToggle={() => toggleUm(aluno.id)}
                onNotas={() => setModal({ kind: 'notas', aluno })}
                onEditar={() => setModal({ kind: 'form', aluno })}
                onExcluir={() => setModal({ kind: 'excluir', ids: [aluno.id], label: aluno.nome })}
              />
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modais */}
      {modal?.kind === 'form' && (
        <AlunoFormModal
          aluno={modal.aluno}
          turmas={turmas}
          escolaNome={escolaNome}
          onClose={() => setModal(null)}
          onSaved={fecharEAtualizar}
          onToast={onToast}
        />
      )}
      {modal?.kind === 'notas' && (
        <NotasAlunoModal aluno={modal.aluno} onClose={() => setModal(null)} onSaved={fecharEAtualizar} onToast={onToast} />
      )}
      {modal?.kind === 'importar' && (
        <ImportarCSVModal tipo={modal.tipo} onClose={() => setModal(null)} onImported={() => void fecharEAtualizar()} onToast={onToast} />
      )}
      {modal?.kind === 'limpar' && (
        <LimparTurmaModal turmas={turmas} onClose={() => setModal(null)} onDone={fecharEAtualizar} onToast={onToast} />
      )}
      {modal?.kind === 'excluir' && (
        <ConfirmModal
          title={modal.ids.length > 1 ? 'Excluir Alunos Selecionados?' : 'Excluir aluno?'}
          message={`Excluir permanentemente ${modal.label}? As notas vinculadas também serão removidas. Esta ação não pode ser desfeita.`}
          confirmLabel="Sim, excluir"
          onConfirm={() => confirmarExclusao(modal.ids)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

// ─── Card do aluno ─────────────────────────────────────────────────────

interface AlunoCardProps {
  aluno: AlunoPedagogico;
  escolaNome: string;
  selecionado: boolean;
  onToggle: () => void;
  onNotas: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}

const AlunoCard: React.FC<AlunoCardProps> = ({ aluno, escolaNome, selecionado, onToggle, onNotas, onEditar, onExcluir }) => {
  const contato = aluno.contatos?.[0] ?? null;
  const anos = idade(aluno.nascimento);
  const status = SITUACAO[aluno.situacao];
  const { src: foto } = useArquivoAutenticado(aluno.tem_foto ? escolaApi.urlFoto(aluno.id) : null);
  const numeroFmt = aluno.numero ? String(aluno.numero).padStart(2, '0') : null;

  return (
    <div
      className={`relative bg-white dark:bg-slate-900 rounded-2xl border-l-[6px] border-indigo-600 border-y border-r border-y-slate-200 border-r-slate-200 dark:border-y-slate-800 dark:border-r-slate-800 shadow-sm hover:shadow-md transition-shadow p-5 sm:p-6 ${
        selecionado ? 'ring-2 ring-indigo-400' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={selecionado}
        onChange={onToggle}
        aria-label={`Selecionar ${aluno.nome}`}
        className="absolute top-4 -left-3 w-5 h-5 accent-indigo-600 cursor-pointer bg-white rounded shadow"
      />

      {/* Nome */}
      <div className="flex items-start justify-between gap-3 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-indigo-950 dark:text-white uppercase">
          {numeroFmt && <span className="text-indigo-600/60 dark:text-indigo-400/70 mr-1">{numeroFmt}.</span>}
          {aluno.nome}
        </h3>
        {aluno.situacao !== 'ativo' && (
          <span
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
              aluno.situacao === 'transferido' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {status}
            {aluno.situacao === 'remanejado' && aluno.turma_origem ? ` do ${aluno.turma_origem.nome}` : ''}
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-wrap items-center gap-y-4 gap-x-6">
        {/* Foto + Nº / CGM / idade */}
        <div className="flex items-center gap-4 min-w-[240px]">
          {foto ? (
            <img src={foto} alt="" className="w-[68px] h-[68px] rounded-2xl object-cover border-[3px] border-slate-100" />
          ) : (
            <div className="w-[68px] h-[68px] rounded-2xl border-[3px] border-slate-100 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-2xl text-slate-700 dark:text-slate-200">
              {iniciais(aluno.nome)}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-white text-xs font-bold">
                {aluno.numero ? `Nº ${aluno.numero}` : 'S/N'}
              </span>
              {aluno.cgm && (
                <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 text-xs font-bold font-mono">CGM: {aluno.cgm}</span>
              )}
            </div>
            {anos && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                <Calendar className="w-3.5 h-3.5 opacity-60" /> {anos}
              </span>
            )}
          </div>
        </div>

        {/* Turma / Escola */}
        <div className="flex-1 min-w-[150px] md:border-l border-slate-100 dark:border-slate-800 md:pl-6">
          <span className="block text-[11px] font-bold uppercase text-slate-500">Turma / Escola</span>
          <strong className="block text-base text-indigo-950 dark:text-white">{aluno.turma?.nome || 'Sem Turma'}</strong>
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{escolaNome}</span>
        </div>

        {/* Filiação */}
        <div className="flex-1 min-w-[180px] md:border-l border-slate-100 dark:border-slate-800 md:pl-6 grid grid-cols-2 gap-4">
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-500">Mãe</span>
            <strong className="block text-sm leading-tight text-slate-700 dark:text-slate-200">{aluno.mae || '-'}</strong>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-500">Pai</span>
            <strong className="block text-sm leading-tight text-slate-700 dark:text-slate-200">{aluno.pai || '-'}</strong>
          </div>
        </div>

        {/* Contato */}
        <div className="min-w-[140px] md:border-l border-slate-100 dark:border-slate-800 md:pl-6">
          <span className="block text-[10px] font-bold uppercase text-slate-500">Contato</span>
          <strong className="flex items-center gap-1.5 text-sm text-indigo-950 dark:text-white font-mono">
            <Phone className="w-4 h-4 text-green-500" />
            {contato?.telefone || '-'}
          </strong>
          {contato && <span className="text-[11px] text-slate-500">{contato.descricao || 'Principal'}</span>}
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onNotas} title="Notas" aria-label="Notas" className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 text-green-800 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 transition-colors">
          <GraduationCap className="w-4 h-4" />
        </button>
        <button onClick={onEditar} title="Editar" aria-label="Editar" className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300 transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onExcluir} title="Excluir" aria-label="Excluir" className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AlunosAdmin;
