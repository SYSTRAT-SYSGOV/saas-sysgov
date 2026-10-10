import React, { useState } from 'react';
import { EquipeCargo } from '../../escola/components/EquipeCargo';
import { pedagogicoService } from '../services/pedagogicoService';
import {
  Users,
  Plus,
  Search,
  BookOpen,
  Mail,
  Phone,
  GraduationCap,
  X,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Professor, TurmaPedagogica, Materia } from '../types/pedagogico';

interface ProfessoresManagerProps {
  professores: Professor[];
  turmas: TurmaPedagogica[];
  materias: Materia[];
  onSaveProfessor: (data: Partial<Professor>) => void;
  onDeleteProfessor?: (id: number) => void;
  onToast: (toast: { type: string; title: string; message: string }) => void;
}

export const ProfessoresManager: React.FC<ProfessoresManagerProps> = ({
  professores,
  turmas,
  materias,
  onSaveProfessor,
  onDeleteProfessor,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfId, setEditingProfId] = useState<number | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [especialidade, setEspecialidade] = useState(materias[0]?.nome || 'Matemática');
  const [turno, setTurno] = useState('Manhã');
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>([]);

  const filtered = professores.filter(p =>
    p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.especialidade.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenNewModal = () => {
    setEditingProfId(null);
    setNome('');
    setEmail('');
    setTelefone('');
    setEspecialidade(materias[0]?.nome || 'Matemática');
    setTurno('Manhã');
    setSelectedTurmas([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prof: Professor) => {
    setEditingProfId(prof.id);
    setNome(prof.nome);
    setEmail(prof.email);
    setTelefone(prof.telefone || '');
    setEspecialidade(prof.especialidade);
    setTurno(prof.turno);
    setSelectedTurmas(prof.turmas_atribuidas || []);
    setIsModalOpen(true);
  };

  const handleDelete = (prof: Professor) => {
    if (window.confirm(`Deseja realmente excluir o(a) professor(a) "${prof.nome}"?`)) {
      if (onDeleteProfessor) {
        onDeleteProfessor(prof.id);
      }
      onToast({
        type: 'success',
        title: 'Professor Excluído',
        message: `O(A) professor(a) ${prof.nome} foi removido(a) do corpo docente.`
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTurmas.length === 0) {
      onToast({
        type: 'warning',
        title: 'Atenção',
        message: 'Selecione pelo menos uma turma para atribuir ao professor.'
      });
      return;
    }

    // Helper for robust string comparison (ignoring accents, case, spaces, and 'Ano')
    const normalizeStr = (str: string) =>
      str
        ? str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\bano\b/gi, '')
            .replace(/\s+/g, '')
            .trim()
        : '';

    const isMateriaMatch = (m1: string, m2: string) => normalizeStr(m1) === normalizeStr(m2);
    const isTurmaMatch = (t1: string, t2: string) => normalizeStr(t1) === normalizeStr(t2);

    // Validation: Do not allow two teachers for the same subject in the same class!
    for (const turmaNome of selectedTurmas) {
      const conflictProf = professores.find(p => {
        if (p.id === editingProfId) return false;

        const teachesMateria =
          isMateriaMatch(p.especialidade, especialidade) ||
          (p.materias && p.materias.some(m => isMateriaMatch(m, especialidade)));

        if (!teachesMateria) return false;

        const teachesTurma = p.turmas_atribuidas.some(t => isTurmaMatch(t, turmaNome));
        return teachesTurma;
      });

      if (conflictProf) {
        onToast({
          type: 'warning',
          title: 'Conflito de Atribuição',
          message: `O(A) professor(a) "${conflictProf.nome}" já está cadastrado(a) para lecionar "${especialidade}" na turma "${turmaNome}". Não é permitido cadastrar dois professores para a mesma matéria na mesma turma.`
        });
        return;
      }
    }

    onSaveProfessor({
      ...(editingProfId ? { id: editingProfId } : {}),
      nome,
      email,
      telefone,
      especialidade,
      turno,
      turmas_atribuidas: selectedTurmas,
      materias: [especialidade]
    });

    onToast({
      type: 'success',
      title: editingProfId ? 'Professor Atualizado!' : 'Professor Cadastrado!',
      message: `${nome} foi ${editingProfId ? 'atualizado(a)' : 'adicionado(a)'} no corpo docente.`
    });

    setIsModalOpen(false);
    setEditingProfId(null);
    setNome('');
    setEmail('');
    setTelefone('');
    setSelectedTurmas([]);
  };

  const toggleTurmaSelection = (turmaNome: string) => {
    if (selectedTurmas.includes(turmaNome)) {
      setSelectedTurmas(selectedTurmas.filter(t => t !== turmaNome));
    } else {
      setSelectedTurmas([...selectedTurmas, turmaNome]);
    }
  };

  const [equipe, setEquipe] = useState(pedagogicoService.getEquipe());

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-500" />
            Corpo Docente & Professores
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cadastro de professores, atribuição de turmas e carga horária por disciplina
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Professor
        </button>
      </div>

      {/* Pedagogas cadastradas por nome (D17): a ata do conselho escolhe entre elas. */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <EquipeCargo
          titulo="Pedagogas"
          cargo="pedagoga"
          membros={equipe.filter((m) => m.cargo === 'pedagoga')}
          onToast={onToast}
          onAlterado={async () => { await pedagogicoService.recarregarEquipe(); setEquipe(pedagogicoService.getEquipe()); }}
        />
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar professor por nome, disciplina ou e-mail..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length > 0 ? (
          filtered.map(prof => (
            <div
              key={prof.id}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-teal-500/30 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-base text-slate-900 dark:text-white block">{prof.nome}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 mt-0.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      {prof.especialidade}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {prof.turno}
                    </span>

                    <button
                      onClick={() => handleOpenEditModal(prof)}
                      className="p-1.5 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 hover:bg-teal-100 transition-colors"
                      title="Editar Professor"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(prof)}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                      title="Excluir Professor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {prof.email}
                  </p>
                  {prof.telefone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {prof.telefone}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Turmas Atribuídas ({prof.turmas_atribuidas.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {prof.turmas_atribuidas.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/50 dark:border-teal-900/40"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nenhum professor encontrado.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-teal-500" />
                {editingProfId ? 'Editar Professor' : 'Cadastrar Novo Professor'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Prof. João Gabriel"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">E-mail Institucional</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="joao@escola.gov.br"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={e => setTelefone(e.target.value)}
                    placeholder="(41) 99999-8888"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Especialidade / Disciplina</label>
                  <select
                    value={especialidade}
                    onChange={e => setEspecialidade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    {materias.map(m => (
                      <option key={m.id} value={m.nome}>{m.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1">Turno de Atuação</label>
                  <select
                    value={turno}
                    onChange={e => {
                      const newTurno = e.target.value;
                      setTurno(newTurno);
                      const validTurmasForShift = turmas
                        .filter(t => {
                          if (newTurno === 'Manhã') return t.turno_nome === 'Manhã';
                          if (newTurno === 'Tarde') return t.turno_nome === 'Tarde';
                          if (newTurno === 'Noite') return t.turno_nome === 'Noite';
                          if (newTurno === 'Ambos') return t.turno_nome === 'Manhã' || t.turno_nome === 'Tarde';
                          return true;
                        })
                        .map(t => t.nome);
                      setSelectedTurmas(prev => prev.filter(tName => validTurmasForShift.includes(tName)));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                    <option value="Ambos">Ambos (Manhã / Tarde)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-medium text-xs text-slate-700 dark:text-slate-300">
                    Atribuir Turmas (
                    {
                      turmas.filter(t => {
                        if (turno === 'Manhã') return t.turno_nome === 'Manhã';
                        if (turno === 'Tarde') return t.turno_nome === 'Tarde';
                        if (turno === 'Noite') return t.turno_nome === 'Noite';
                        if (turno === 'Ambos') return t.turno_nome === 'Manhã' || t.turno_nome === 'Tarde';
                        return true;
                      }).length
                    }{' '}
                    disponíveis)
                  </label>
                  {turno === 'Ambos' && (
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Manhã
                      </span>
                      <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-300">
                        <span className="w-2 h-2 rounded-full bg-sky-500" /> Tarde
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 max-h-52 overflow-y-auto">
                  {(() => {
                    const filteredTurmas = turmas.filter(t => {
                      if (turno === 'Manhã') return t.turno_nome === 'Manhã';
                      if (turno === 'Tarde') return t.turno_nome === 'Tarde';
                      if (turno === 'Noite') return t.turno_nome === 'Noite';
                      if (turno === 'Ambos') return t.turno_nome === 'Manhã' || t.turno_nome === 'Tarde';
                      return true;
                    });

                    if (filteredTurmas.length === 0) {
                      return (
                        <p className="col-span-full text-xs text-slate-400 text-center py-4">
                          Nenhuma turma encontrada para o turno selecionado ({turno}).
                        </p>
                      );
                    }

                    return filteredTurmas.map(t => {
                      const isSelected = selectedTurmas.includes(t.nome);
                      const isManha = t.turno_nome === 'Manhã';
                      const isTarde = t.turno_nome === 'Tarde';

                      let btnStyle = '';
                      if (isManha) {
                        btnStyle = isSelected
                          ? 'bg-amber-500 text-white font-bold border-amber-600 shadow-md shadow-amber-500/20'
                          : 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-950/50';
                      } else if (isTarde) {
                        btnStyle = isSelected
                          ? 'bg-sky-600 text-white font-bold border-sky-700 shadow-md shadow-sky-600/20'
                          : 'bg-sky-50/80 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200 border-sky-200/80 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-950/50';
                      } else {
                        btnStyle = isSelected
                          ? 'bg-indigo-600 text-white font-bold border-indigo-700 shadow-md shadow-indigo-600/20'
                          : 'bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 border-indigo-200/80 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-950/50';
                      }

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTurmaSelection(t.nome)}
                          className={`p-2.5 rounded-xl text-xs font-semibold border flex flex-col justify-between transition-all ${btnStyle}`}
                        >
                          <span className="block truncate">{t.nome}</span>
                          <span className="text-[10px] opacity-85 font-medium mt-0.5">
                            {isManha ? '☀️ Manhã' : isTarde ? '🌤️ Tarde' : '🌙 Noite'}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 font-semibold text-white shadow-sm"
                >
                  {editingProfId ? 'Atualizar Professor' : 'Salvar Professor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessoresManager;
