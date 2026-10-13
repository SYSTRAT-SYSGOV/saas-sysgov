import React, { useMemo, useState } from 'react';
import { Sun, CloudSun, Moon, Clock, Plus, ChevronLeft, Users, GraduationCap, FileText, Copy, Pencil, Trash2, Printer } from 'lucide-react';

import { useArquivoAutenticado } from '@/hooks/useArquivoAutenticado';

import { escolaApi, erroApi, type Aluno as AlunoPedagogico, type Professor, type Turma as TurmaPedagogica, type Turno } from '../api';
import { pedagogicoApi } from '../../pedagogico/api';
import { useCarga } from '../useCarga';
import AdminModal, { inputCls, labelCls, btnPrimary, btnSecondary, EstadoCarga, type Toast } from './AdminModal';
import { ConfirmModal } from './AlunoModals';

type TurnoView = number | 'all' | null;

// Ícone e cor por nome de turno (turnos vêm do cadastro; outros nomes usam o relógio)
const VISUAL_TURNO: Record<string, { icon: React.ElementType; box: string }> = {
  'manhã': { icon: Sun, box: 'bg-amber-100 text-amber-500 dark:bg-amber-950/40' },
  tarde: { icon: CloudSun, box: 'bg-orange-100 text-orange-600 dark:bg-orange-950/40' },
  noite: { icon: Moon, box: 'bg-slate-200 text-indigo-950 dark:bg-slate-800 dark:text-indigo-200' },
};
const visualDoTurno = (nome: string) => VISUAL_TURNO[nome.toLowerCase()] ?? { icon: Clock, box: 'bg-sky-100 text-sky-600 dark:bg-sky-950/40' };

type TurmaEmEdicao = Partial<TurmaPedagogica> & { turno_id?: number };

type ModalState =
  | { kind: 'form'; turma: TurmaEmEdicao | null }
  | { kind: 'relatorio'; turma: TurmaPedagogica }
  | { kind: 'excluir'; ids: number[]; label: string }
  | null;

interface TurmasAdminProps {
  onToast: Toast;
}

export const TurmasAdmin: React.FC<TurmasAdminProps> = ({ onToast }) => {
  const [view, setView] = useState<TurnoView>(null);
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);

  const turnosCarga = useCarga(escolaApi.turnos);
  const turmasCarga = useCarga(() => escolaApi.turmas());
  const turnos = turnosCarga.dados ?? [];
  const turmas = turmasCarga.dados ?? [];

  // Progresso do pré-conselho no período vigente (módulo Pedagógico; se indisponível, fica zerado).
  const progresso = useCarga(async () => {
    try {
      const vigente = await pedagogicoApi.cronogramaVigente();
      const lista = await pedagogicoApi.progresso(vigente?.ano_letivo ?? new Date().getFullYear(), vigente?.periodo ?? 1);
      return Object.fromEntries(lista.map((p) => [p.turma_id, p.entregues])) as Record<number, number>;
    } catch {
      return {} as Record<number, number>;
    }
  });

  const turmasVisiveis = view === 'all' ? turmas : turmas.filter(t => t.turno?.id === view);
  const turnoAtual = typeof view === 'number' ? turnos.find(t => t.id === view) : undefined;

  const recarregar = async () => {
    await Promise.all([turmasCarga.recarregar(), turnosCarga.recarregar(), progresso.recarregar()]);
  };

  const abrirTurno = (v: TurnoView) => {
    setView(v);
    setSelecionadas(new Set());
  };

  const toggle = (id: number) => {
    const next = new Set(selecionadas);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelecionadas(next);
  };

  const duplicar = async (turma: TurmaPedagogica) => {
    try {
      const copia = await escolaApi.duplicarTurma(turma.id);
      await recarregar();
      onToast({ type: 'success', title: 'Turma duplicada!', message: 'Agora você pode ajustar os detalhes da cópia.' });
      setModal({ kind: 'form', turma: copia });
    } catch (e) {
      onToast({ type: 'error', title: 'Não foi possível duplicar', message: erroApi(e).mensagem });
    }
  };

  const excluir = async (ids: number[]) => {
    const resultados = await Promise.allSettled(ids.map((id) => escolaApi.excluirTurma(id)));
    const falhas = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    setSelecionadas(new Set());
    setModal(null);
    await recarregar();
    if (falhas.length > 0) {
      onToast({ type: 'error', title: 'Exclusão incompleta', message: erroApi(falhas[0].reason).mensagem });
    } else {
      onToast({ type: 'success', title: 'Exclusão concluída', message: `${ids.length} turma(s) excluída(s). Os alunos vinculados ficaram sem turma.` });
    }
  };

  const novaTurmaBtn = (
    <button
      onClick={() => setModal({ kind: 'form', turma: typeof view === 'number' ? { turno_id: view } : null })}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
    >
      <Plus className="w-4 h-4" /> Nova Turma
    </button>
  );

  const carregando = turnosCarga.carregando || turmasCarga.carregando;
  const erro = turnosCarga.erro || turmasCarga.erro;

  return (
    <div className="space-y-6">
      {carregando || erro ? (
        <EstadoCarga carregando={carregando} erro={erro} onTentar={recarregar} />
      ) : view === null ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Gerenciar Turmas</h2>
            {novaTurmaBtn}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {turnos.map((turno) => {
              const { icon: Icon, box } = visualDoTurno(turno.nome);
              return (
                <button
                  key={turno.id}
                  onClick={() => abrirTurno(turno.id)}
                  className="flex items-center gap-5 p-6 text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${box}`}>
                    <Icon className="w-6 h-6" />
                  </span>
                  <span>
                    <span className="block text-xl font-bold text-slate-900 dark:text-white">{turno.nome}</span>
                    <span className="block text-sm font-semibold text-slate-500">
                      {turmas.filter(t => t.turno?.id === turno.id).length} turmas cadastradas
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-center">
            <button onClick={() => abrirTurno('all')} className="text-sm text-slate-500 hover:text-indigo-600 hover:underline">
              Ver todas as turmas de uma vez
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => abrirTurno(null)}
                title="Voltar"
                aria-label="Voltar para turnos"
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Turmas: {view === 'all' ? 'Todas as Turmas' : turnoAtual?.nome}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {selecionadas.size > 0 && (
                <button
                  onClick={() => setModal({ kind: 'excluir', ids: [...selecionadas], label: `${selecionadas.size} turmas selecionadas` })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200"
                >
                  <Trash2 className="w-4 h-4" /> Excluir Selecionadas ({selecionadas.size})
                </button>
              )}
              {novaTurmaBtn}
            </div>
          </div>

          {turmasVisiveis.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-slate-500">
              <Users className="w-10 h-10 text-slate-300" />
              <p className="text-sm">Nenhuma turma cadastrada neste turno.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {turmasVisiveis.map(t => (
                <TurmaCard
                  key={t.id}
                  turma={t}
                  fichas={progresso.dados?.[t.id] ?? 0}
                  selecionada={selecionadas.has(t.id)}
                  onToggle={() => toggle(t.id)}
                  onRelatorio={() => setModal({ kind: 'relatorio', turma: t })}
                  onDuplicar={() => duplicar(t)}
                  onEditar={() => setModal({ kind: 'form', turma: t })}
                  onExcluir={() => setModal({ kind: 'excluir', ids: [t.id], label: `a turma ${t.nome}` })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {modal?.kind === 'form' && (
        <TurmaFormModal
          turma={modal.turma}
          turnos={turnos}
          onClose={() => setModal(null)}
          onSaved={async () => { setModal(null); await recarregar(); }}
          onToast={onToast}
        />
      )}
      {modal?.kind === 'relatorio' && (
        <RelatorioTurmaModal turma={modal.turma} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'excluir' && (
        <ConfirmModal
          title={modal.ids.length > 1 ? 'Excluir Turmas?' : 'Excluir turma?'}
          message={`Excluir ${modal.label}? Os vínculos com as matérias serão removidos e os alunos ficarão sem turma. Esta ação não pode ser desfeita.`}
          confirmLabel="Sim, excluir"
          onConfirm={() => excluir(modal.ids)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

// ─── Card da turma ─────────────────────────────────────────────────────

interface TurmaCardProps {
  turma: TurmaPedagogica;
  fichas: number;
  selecionada: boolean;
  onToggle: () => void;
  onRelatorio: () => void;
  onDuplicar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}

const TurmaCard: React.FC<TurmaCardProps> = ({
  turma, fichas, selecionada, onToggle, onRelatorio, onDuplicar, onEditar, onExcluir,
}) => {
  const nomesMaterias = (turma.materias || [])
    .map(tm => tm.materia)
    .filter((n): n is string => !!n);
  const totalAlunos = turma.total_alunos ?? 0;
  const totalMaterias = nomesMaterias.length;
  const pct = totalMaterias > 0 ? Math.min(100, (fichas / totalMaterias) * 100) : 0;
  const barColor = pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-300';

  const acao = 'w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105';

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all ${
        selecionada ? 'ring-2 ring-indigo-400' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={selecionada}
        onChange={onToggle}
        aria-label={`Selecionar ${turma.nome}`}
        className="absolute top-4 left-4 z-10 w-5 h-5 accent-indigo-600 cursor-pointer"
      />

      <div className="relative bg-gradient-to-br from-indigo-600 to-blue-500 text-white pl-14 pr-6 py-6">
        <Users className="absolute right-4 bottom-2 w-16 h-16 opacity-15" />
        <h3 className="text-2xl font-extrabold">{turma.nome}</h3>
        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-bold">{turma.turno?.nome ?? '—'} · <span className="font-mono">{turma.ano_letivo}</span></span>
      </div>

      <div className="flex-1 flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-500">Estudantes</span>
          <span className="flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <strong className="text-lg text-indigo-950 dark:text-white">{totalAlunos}</strong>
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-slate-500">Pré-Conselho</span>
            <span className="text-xs font-bold text-indigo-600 font-mono">{fichas} / {totalMaterias}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {totalMaterias > 0 && (
          <div className="flex flex-wrap gap-1">
            {nomesMaterias.slice(0, 4).map(n => (
              <span key={n} className="px-2 py-0.5 rounded-md text-[11px] bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">{n}</span>
            ))}
            {totalMaterias > 4 && (
              <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">+{totalMaterias - 4}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800">
        <button onClick={onRelatorio} title="Relatório" aria-label="Relatório" className={`${acao} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`}>
          <FileText className="w-4 h-4" />
        </button>
        <button onClick={onDuplicar} title="Duplicar" aria-label="Duplicar" className={`${acao} bg-white text-slate-500 border border-slate-200 dark:bg-slate-900 dark:border-slate-700`}>
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={onEditar} title="Editar" aria-label="Editar" className={`${acao} bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300`}>
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onExcluir} title="Excluir" aria-label="Excluir" className={`${acao} bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Nova / Editar Turma ───────────────────────────────────────────────

interface TurmaFormModalProps {
  turma: TurmaEmEdicao | null;
  turnos: Turno[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onToast: Toast;
}

type Vinculo = { materia_id: number; professor_user_id: number | null };

const TurmaFormModal: React.FC<TurmaFormModalProps> = ({ turma, turnos, onClose, onSaved, onToast }) => {
  const isEdit = !!turma?.id;
  const [nome, setNome] = useState(turma?.nome || '');
  const [turnoId, setTurnoId] = useState<number | ''>(turma?.turno?.id ?? turma?.turno_id ?? turnos[0]?.id ?? '');
  const [ano, setAno] = useState(String(turma?.ano_letivo ?? new Date().getFullYear()));
  const [pedagogaId, setPedagogaId] = useState<number | ''>(turma?.pedagoga?.id ?? '');
  const [vinculos, setVinculos] = useState<Record<number, Vinculo>>(() => {
    const init: Record<number, Vinculo> = {};
    (turma?.materias || []).forEach(m => { init[m.materia_id] = { materia_id: m.materia_id, professor_user_id: m.professor_user_id }; });
    return init;
  });
  const materias = useCarga(escolaApi.materias);
  const professores = useCarga<Professor[]>(escolaApi.professores);
  const equipe = useCarga(escolaApi.equipe);
  const pedagogas = (equipe.dados ?? []).filter(m => m.cargo === 'pedagoga');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const toggleMateria = (id: number) => {
    const next = { ...vinculos };
    if (next[id]) delete next[id];
    else next[id] = { materia_id: id, professor_user_id: null };
    setVinculos(next);
  };

  // Escolher um professor já marca a matéria
  const setProfessor = (materiaId: number, profId: string) =>
    setVinculos({ ...vinculos, [materiaId]: { materia_id: materiaId, professor_user_id: profId ? Number(profId) : null } });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const anoNum = parseInt(ano, 10);
    if (!nome.trim()) return setErro('Informe o nome da turma.');
    if (turnoId === '') return setErro('Selecione o turno.');
    if (Number.isNaN(anoNum)) return setErro('Informe o ano letivo.');
    setSalvando(true);
    setErro('');
    try {
      const dados = { nome: nome.trim(), turno_id: turnoId, ano_letivo: anoNum, pedagoga_id: pedagogaId === '' ? null : pedagogaId };
      const salva = turma?.id ? await escolaApi.atualizarTurma(turma.id, dados) : await escolaApi.criarTurma(dados);
      await escolaApi.vincularMaterias(salva.id, Object.values(vinculos));
      onToast({ type: 'success', title: isEdit ? 'Turma atualizada' : 'Turma cadastrada', message: `${nome.trim()} salva com sucesso.` });
      await onSaved();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AdminModal
      title={isEdit ? 'Editar Turma' : 'Nova Turma'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" form="form-turma" className={btnPrimary} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </>
      }
    >
      <form id="form-turma" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="turma-nome">Nome</label>
          <input id="turma-nome" className={inputCls} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: 6º A" autoFocus required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="turma-turno">Turno</label>
            <select id="turma-turno" className={inputCls} value={turnoId} onChange={e => setTurnoId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Selecione…</option>
              {turnos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="turma-ano">Ano letivo</label>
            <input id="turma-ano" type="number" min={2000} max={2100} className={`${inputCls} font-mono`} value={ano} onChange={e => setAno(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="turma-pedagoga">Pedagoga</label>
          <select
            id="turma-pedagoga"
            className={inputCls}
            value={pedagogaId}
            onChange={e => setPedagogaId(e.target.value ? Number(e.target.value) : '')}
            disabled={equipe.carregando}
          >
            <option value="">{equipe.carregando ? 'Carregando…' : 'Sem pedagoga'}</option>
            {pedagogas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          {!equipe.carregando && !equipe.erro && pedagogas.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">Nenhuma pedagoga cadastrada. Cadastre em Corpo Docente › Pedagogas.</p>
          )}
          {equipe.erro && <p className="mt-1 text-xs text-red-600">Não foi possível carregar as pedagogas.</p>}
        </div>
        <div>
          <label className={labelCls}>
            Matérias e Professores <span className="font-normal text-slate-400">({Object.keys(vinculos).length} selecionadas)</span>
          </label>
          {materias.carregando || materias.erro ? (
            <EstadoCarga carregando={materias.carregando} erro={materias.erro} onTentar={materias.recarregar} />
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              {(materias.dados ?? []).length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-500">Nenhuma matéria cadastrada. Cadastre na aba Matérias.</p>
              )}
              {(materias.dados ?? []).map(m => {
                const v = vinculos[m.id];
                return (
                  <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2">
                    <label className="flex items-center gap-2 flex-1 text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input type="checkbox" checked={!!v} onChange={() => toggleMateria(m.id)} className="w-4 h-4 accent-indigo-600" />
                      {m.nome}
                    </label>
                    <select
                      className={`${inputCls} sm:w-52 !py-1 text-xs`}
                      value={v?.professor_user_id ?? ''}
                      onChange={e => setProfessor(m.id, e.target.value)}
                      aria-label={`Professor de ${m.nome}`}
                    >
                      <option value="">Sem professor</option>
                      {(professores.dados ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {erro && <p role="alert" className="text-sm font-medium text-red-600">{erro}</p>}
      </form>
    </AdminModal>
  );
};

// ─── Relatório: Raio-X Coletivo / Conselho de Classe ──────────────────

interface RelatorioTurmaModalProps {
  turma: TurmaPedagogica;
  onClose: () => void;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const iniciais = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const badgeOcorrencias = (n: number) =>
  n >= 5 ? 'bg-red-100 text-red-700' : n > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500';

const RelatorioTurmaModal: React.FC<RelatorioTurmaModalProps> = ({ turma, onClose }) => {
  const [minOc, setMinOc] = useState(0);
  const hoje = new Date().toLocaleDateString('pt-BR');
  const unidade = useCarga(escolaApi.unidade);
  const { src: escolaLogo } = useArquivoAutenticado(unidade.dados?.tem_logo ? escolaApi.urlLogo : null);
  const escolaNome = unidade.dados?.nome ?? '';
  const dados = useCarga(async () => {
    const [alunos, totais] = await Promise.all([
      escolaApi.todosAlunos({ turma_id: turma.id }),
      // Ocorrências vêm do módulo Pedagógico; sem ele o relatório mostra zero.
      pedagogicoApi.totaisOcorrencias(turma.id).catch(() => [] as { aluno_id: number; total: number }[]),
    ]);
    return { alunos, totais: Object.fromEntries(totais.map(t => [t.aluno_id, t.total])) as Record<number, number> };
  }, [turma.id]);

  const linhas = useMemo(() => {
    const cont = dados.dados?.totais ?? {};
    return (dados.dados?.alunos ?? [])
      .map((a: AlunoPedagogico) => ({ aluno: a, total: cont[a.id] || 0 }))
      .filter(l => l.total >= minOc)
      .sort((a, b) => (a.aluno.numero || 0) - (b.aluno.numero || 0) || a.aluno.nome.localeCompare(b.aluno.nome));
  }, [dados.dados, minOc]);

  // Imprime numa janela própria para não levar junto o layout do painel
  const imprimir = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const cor = (n: number) => (n >= 5 ? 'background:#fee2e2;color:#b91c1c' : n > 0 ? 'background:#fef3c7;color:#92400e' : 'background:#f1f5f9;color:#64748b');
    const rows = linhas.map(({ aluno, total }) => `
      <tr>
        <td style="text-align:center">${aluno.numero ?? '-'}</td>
        <td><div class="cell"><span class="thumb ini">${iniciais(aluno.nome)}</span><strong>${escapeHtml(aluno.nome.toUpperCase())}</strong></div></td>
        <td style="text-align:center"><span class="badge" style="${cor(total)}">${total} ocorrências</span></td>
        <td>____________________</td>
      </tr>`).join('');
    w.document.write(`<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Relatório Coletivo - ${escapeHtml(turma.nome)}</title>
      <style>
        body{font-family:Inter,system-ui,sans-serif;color:#333;margin:0;padding:40px;line-height:1.6}
        .header{text-align:center;border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:30px}
        .header h1{margin:0;font-size:24px;color:#1e1b4b}.header p{margin:5px 0;color:#666}
        .info{background:#f8fafc;padding:15px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:30px;display:flex;justify-content:space-between}
        table{width:100%;border-collapse:collapse}th{text-align:left;background:#f1f5f9;padding:12px;border:1px solid #cbd5e1;font-size:14px}
        td{padding:12px;border:1px solid #cbd5e1;font-size:14px}.cell{display:flex;align-items:center;gap:10px}
        .thumb{width:40px;height:40px;border-radius:4px;object-fit:cover}.ini{display:inline-flex;align-items:center;justify-content:center;background:#e2e8f0;font-size:16px}
        .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:bold}
        @page{margin:1.5cm}@media print{body{padding:0}}
      </style></head><body>
      <div class="header">${escolaLogo ? `<img src="${escolaLogo}" style="max-width:100px;max-height:100px;margin-bottom:15px">` : ''}<h1>${escapeHtml(escolaNome)}</h1><p>Raio-X Coletivo / Conselho de Classe</p></div>
      <div class="info"><div><strong>Turma:</strong> ${escapeHtml(turma.nome)}</div><div><strong>Turno:</strong> ${escapeHtml(turma.turno?.nome ?? '—')}</div><div><strong>Data:</strong> ${hoje}</div></div>
      <h3>Resumo de Acompanhamento - ${linhas.length} Alunos</h3>
      <table><thead><tr><th style="width:50px">Nº</th><th>Aluno</th><th style="text-align:center">Total de Ocorrências</th><th style="width:200px">Assinatura do Conselho</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div style="margin-top:50px;font-size:12px;color:#666;text-align:center">Este documento é de uso interno para fins pedagógicos e conselho de classe.</div>
      </body></html>`);
    w.document.close();
    w.focus();
    w.onload = () => w.print();
  };

  return (
    <AdminModal
      title="Relatório Coletivo da Turma"
      onClose={onClose}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className={btnSecondary}>Fechar</button>
          <button onClick={imprimir} className={`${btnPrimary} inline-flex items-center gap-2`}>
            <Printer className="w-4 h-4" /> Imprimir Relatório
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-5 text-sm text-slate-600 dark:text-slate-300">
        <label htmlFor="min-oc">Filtrar alunos com pelo menos</label>
        <input id="min-oc" type="number" min={0} value={minOc} onChange={e => setMinOc(Math.max(0, Number(e.target.value) || 0))} className={`${inputCls} !w-20 font-mono`} />
        <span>ocorrências</span>
      </div>

      <div className="text-center border-b-2 border-slate-800 dark:border-slate-300 pb-4 mb-5">
        {escolaLogo && <img src={escolaLogo} alt="" className="mx-auto mb-3 max-w-[100px] max-h-[100px] object-contain" />}
        <h2 className="text-2xl font-bold text-indigo-950 dark:text-white">{escolaNome}</h2>
        <p className="text-slate-500">Raio-X Coletivo / Conselho de Classe</p>
      </div>

      <div className="flex flex-wrap justify-between gap-2 p-4 mb-5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm">
        <span><strong>Turma:</strong> {turma.nome}</span>
        <span><strong>Turno:</strong> {turma.turno?.nome ?? '—'}</span>
        <span><strong>Data:</strong> <span className="font-mono">{hoje}</span></span>
      </div>

      <h3 className="font-bold text-slate-900 dark:text-white mb-3">Resumo de Acompanhamento - {linhas.length} Alunos</h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-left">
              <th className="border border-slate-300 dark:border-slate-700 p-3 w-12">Nº</th>
              <th className="border border-slate-300 dark:border-slate-700 p-3">Aluno</th>
              <th className="border border-slate-300 dark:border-slate-700 p-3 text-center">Total de Ocorrências</th>
              <th className="border border-slate-300 dark:border-slate-700 p-3 w-48">Assinatura do Conselho</th>
            </tr>
          </thead>
          <tbody>
            {dados.carregando || dados.erro ? (
              <tr><td colSpan={4}><EstadoCarga carregando={dados.carregando} erro={dados.erro} onTentar={dados.recarregar} /></td></tr>
            ) : linhas.length === 0 ? (
              <tr><td colSpan={4} className="border border-slate-300 dark:border-slate-700 p-6 text-center text-slate-500">Nenhum aluno para os filtros informados.</td></tr>
            ) : linhas.map(({ aluno, total }) => (
              <tr key={aluno.id}>
                <td className="border border-slate-300 dark:border-slate-700 p-3 text-center font-mono">{aluno.numero ?? '-'}</td>
                <td className="border border-slate-300 dark:border-slate-700 p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200">{iniciais(aluno.nome)}</span>
                    <strong className="uppercase text-slate-800 dark:text-slate-100">{aluno.nome}</strong>
                  </div>
                </td>
                <td className="border border-slate-300 dark:border-slate-700 p-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${badgeOcorrencias(total)}`}>{total} ocorrências</span>
                </td>
                <td className="border border-slate-300 dark:border-slate-700 p-3 text-slate-400">____________________</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminModal>
  );
};

export default TurmasAdmin;
