import React, { useEffect, useState } from 'react';
import {
  FileSearch,
  Plus,
  ArrowLeft,
  ChevronRight,
  Sun,
  SunMedium,
  Moon,
  Users,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  X,
  FileText,
  Edit,
  Trash2,
  Filter
} from 'lucide-react';
import {
  PreConselho,
  TurmaPedagogica,
  Materia,
  AlunoPedagogico,
  NivelAtencao,
  DesempenhoGeral
} from '../types/pedagogico';

interface PreConselhoManagerProps {
  preConselhos: PreConselho[];
  turmas: TurmaPedagogica[];
  materias: Materia[];
  alunos: AlunoPedagogico[];
  onSave: (data: Partial<PreConselho>) => void;
  onToast: (toast: { type: string; title: string; message: string }) => void;
}

export const PreConselhoManager: React.FC<PreConselhoManagerProps> = ({
  preConselhos,
  turmas,
  materias,
  alunos,
  onSave,
  onToast,
}) => {
  // Step Navigation State:
  // Step 1: Turnos ('step_turnos')
  // Step 2: Turmas do Turno ('step_turmas')
  // Step 3: Matérias da Turma ('step_materias')
  // Step 3.1: Fichas da Matéria ('step_fichas')
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>('3º Trimestre');
  const [selectedTurnoId, setSelectedTurnoId] = useState<number | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<number | null>(null);
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | null>(null);

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingFicha, setEditingFicha] = useState<PreConselho | null>(null);

  // Form Fields State
  const [formAnoLetivo, setFormAnoLetivo] = useState('2026');
  const [formPeriodo, setFormPeriodo] = useState('3º Trimestre');
  const [formTurnoNome, setFormTurnoNome] = useState('Manhã');
  const [formTurmaId, setFormTurmaId] = useState<number>(turmas[0]?.id || 1);
  const [formMateriaId, setFormMateriaId] = useState<number>(materias[0]?.id || 1);
  const [formProfessor, setFormProfessor] = useState('Prof. Carlos Silva');
  const [formDataRegistro, setFormDataRegistro] = useState(new Date().toISOString().split('T')[0]);

  // Section 1
  const [desempenhoGeral, setDesempenhoGeral] = useState<DesempenhoGeral>('Bom');
  const [desempenhoJustificativa, setDesempenhoJustificativa] = useState('');

  // Section 2
  const [conteudos, setConteudos] = useState('');
  const [objetivosAtingidos, setObjetivosAtingidos] = useState<'Totalmente' | 'Parcialmente' | 'Não atingidos'>('Totalmente');
  const [obsPedagogicas, setObsPedagogicas] = useState('');

  // Section 3
  const [metodologiasCheck, setMetodologiasCheck] = useState<string[]>([
    'Aula expositiva dialogada',
    'Resolução de exercícios'
  ]);
  const [metodologiasOutras, setMetodologiasOutras] = useState('');
  const [metodologiasEficacia, setMetodologiasEficacia] = useState('');

  // Section 4
  const [instrumentosCheck, setInstrumentosCheck] = useState<string[]>([
    'Prova escrita',
    'Trabalho em grupo'
  ]);
  const [instrumentosAdequados, setInstrumentosAdequados] = useState<'Sim' | 'Parcialmente' | 'Não'>('Sim');
  const [instrumentosOutros, setInstrumentosOutros] = useState('');
  const [instrumentosObs, setInstrumentosObs] = useState('');

  // Section 5, 6, 7
  const [engajamentoNivel, setEngajamentoNivel] = useState<'Alta participação' | 'Participação moderada' | 'Baixa participação'>('Alta participação');
  const [engajamentoDificuldades, setEngajamentoDificuldades] = useState('');
  const [engajamentoPotencialidades, setEngajamentoPotencialidades] = useState('');

  const [dificuldadesAprendizagem, setDificuldadesAprendizagem] = useState('');
  const [estrategiasSuperacao, setEstrategiasSuperacao] = useState('');

  const [socioemocionalStatus, setSocioemocionalStatus] = useState<'Adequado' | 'Necessita atenção' | 'Crítico'>('Adequado');
  const [socioemocionalDescricao, setSocioemocionalDescricao] = useState('');

  // Section 8: Student evaluation
  const [studentEvaluations, setStudentEvaluations] = useState<
    { alunoId: number; nome: string; nota: number; destaque: boolean; nivelAtencao: NivelAtencao; dificuldade: string; encaminhamento: string }[]
  >([]);

  // Turnos Definition with standardized color design system
  const turnosList = [
    { id: 1, nome: 'Manhã', icon: Sun, bgGradient: 'from-[#FACC15] to-[#EAB308]', textColor: 'text-slate-900', pillBg: 'bg-white/40 text-slate-900', countTurmas: turmas.filter(t => t.turno_nome === 'Manhã').length },
    { id: 2, nome: 'Tarde', icon: SunMedium, bgGradient: 'from-[#F97316] to-[#EA580C]', textColor: 'text-white', pillBg: 'bg-white/20 text-white', countTurmas: turmas.filter(t => t.turno_nome === 'Tarde').length },
    { id: 3, nome: 'Noite', icon: Moon, bgGradient: 'from-[#7C3AED] to-[#6D28D9]', textColor: 'text-white', pillBg: 'bg-white/20 text-white', countTurmas: turmas.filter(t => t.turno_nome === 'Noite').length }
  ];

  // Helper getters
  const selectedTurnoObj = turnosList.find(t => t.id === selectedTurnoId);
  const selectedTurmaObj = turmas.find(t => t.id === selectedTurmaId);
  const selectedMateriaObj = materias.find(m => m.id === selectedMateriaId);

  // Só as matérias vinculadas à turma (cadastro da turma).
  const materiasDaTurma = (turmaId: number | null | undefined) => {
    const ids = new Set((turmas.find(t => t.id === turmaId)?.materias ?? []).map(v => v.materia_id));
    return materias.filter(m => ids.has(m.id));
  };
  const materiasDoForm = materiasDaTurma(formTurmaId);

  useEffect(() => {
    if (materiasDoForm.length && !materiasDoForm.some(m => m.id === Number(formMateriaId))) {
      setFormMateriaId(materiasDoForm[0].id);
    }
  }, [formTurmaId, materiasDoForm, formMateriaId]);

  // Turno Turmas
  const currentTurmasList = selectedTurnoId
    ? turmas.filter(t => t.turno_nome === selectedTurnoObj?.nome)
    : turmas;

  // Handlers for Checkboxes
  const handleToggleMetodologia = (met: string) => {
    setMetodologiasCheck(prev =>
      prev.includes(met) ? prev.filter(m => m !== met) : [...prev, met]
    );
  };

  const handleToggleInstrumento = (ins: string) => {
    setInstrumentosCheck(prev =>
      prev.includes(ins) ? prev.filter(i => i !== ins) : [...prev, ins]
    );
  };

  // Handlers for Wizard Navigation
  const handleSelectTurno = (turnoId: number) => {
    setSelectedTurnoId(turnoId);
    setSelectedTurmaId(null);
    setSelectedMateriaId(null);
  };

  const handleSelectTurma = (turmaId: number) => {
    setSelectedTurmaId(turmaId);
    setSelectedMateriaId(null);
  };

  const handleSelectMateria = (materiaId: number) => {
    setSelectedMateriaId(materiaId);
  };

  const handleOpenNewForm = () => {
    setEditingFicha(null);
    setFormAnoLetivo('2026');
    setFormPeriodo(selectedTrimestre === 'Todos os Períodos' ? '3º Trimestre' : selectedTrimestre);
    setFormTurnoNome(selectedTurnoObj?.nome || 'Manhã');
    const availableFormTurmas = selectedTurnoObj
      ? turmas.filter(t => t.turno_nome === selectedTurnoObj.nome)
      : turmas;
    setFormTurmaId(selectedTurmaId || availableFormTurmas[0]?.id || turmas[0]?.id || 1);
    if (selectedMateriaId) setFormMateriaId(selectedMateriaId);

    // Section 1
    setDesempenhoGeral('Bom');
    setDesempenhoJustificativa('Turma participativa, demonstrando bom engajamento nas atividades.');

    // Section 2
    setConteudos('Definições principais, teoria e exercícios de fixação.');
    setObjetivosAtingidos('Totalmente');
    setObsPedagogicas('Manter ritmo de acompanhamento semanal.');

    // Section 3
    setMetodologiasCheck(['Aula expositiva dialogada', 'Resolução de exercícios']);
    setMetodologiasOutras('');
    setMetodologiasEficacia('As metodologias facilitaram a fixação dos conteúdos.');

    // Section 4
    setInstrumentosCheck(['Prova escrita', 'Trabalho em grupo']);
    setInstrumentosAdequados('Sim');
    setInstrumentosOutros('');
    setInstrumentosObs('Aplicação regular conforme plano de ensino.');

    // Section 5, 6, 7
    setEngajamentoNivel('Alta participação');
    setEngajamentoDificuldades('');
    setEngajamentoPotencialidades('Alunos cooperativos e engajados.');

    setDificuldadesAprendizagem('Ritmo individual heterogêneo.');
    setEstrategiasSuperacao('Atividades de reforço em grupo e plantão de dúvidas.');

    setSocioemocionalStatus('Adequado');
    setSocioemocionalDescricao('Bom relacionamento interpessoal.');

    // Load students for Section 8
    const turmaStudents = alunos.filter(a => a.turma_id === (selectedTurmaId || formTurmaId));
    setStudentEvaluations(
      turmaStudents.map((aluno, idx) => ({
        alunoId: aluno.id,
        nome: aluno.nome,
        nota: aluno.media_geral || 7.5,
        destaque: idx === 0,
        nivelAtencao: idx === 1 ? 'alto' : idx === 2 ? 'medio' : 'baixo',
        dificuldade: idx === 1 ? 'Dificuldade na interpretação de textos longos.' : '',
        encaminhamento: idx === 1 ? 'Reforço escolar no contraturno.' : ''
      }))
    );

    setIsFormOpen(true);
  };

  const handleEditFicha = (ficha: PreConselho) => {
    setEditingFicha(ficha);
    setFormAnoLetivo(ficha.ano_letivo || '2026');
    setFormPeriodo(ficha.periodo || selectedTrimestre);
    setFormTurmaId(ficha.turma_id);
    if (ficha.materia_id) setFormMateriaId(ficha.materia_id);

    setDesempenhoGeral(ficha.desempenho_geral || 'Bom');
    setDesempenhoJustificativa(ficha.desempenho_justificativa || '');
    setConteudos(ficha.conteudos_trabalhados || '');
    setObjetivosAtingidos(ficha.objetivos_atingidos || 'Totalmente');
    setObsPedagogicas(ficha.obs_pedagogicas || '');

    setMetodologiasCheck(ficha.metodologias || ['Aula expositiva dialogada', 'Resolução de exercícios']);
    setMetodologiasOutras(ficha.metodologias_outras || '');
    setMetodologiasEficacia(ficha.metodologias_eficacia || '');

    setInstrumentosCheck(ficha.instrumentos_avaliativos || ['Prova escrita', 'Trabalho em grupo']);
    setInstrumentosAdequados(ficha.instrumentos_adequados || 'Sim');
    setInstrumentosOutros(ficha.instrumentos_outros || '');
    setInstrumentosObs(ficha.instrumentos_obs || '');

    setEngajamentoNivel(ficha.engajamento_nivel || 'Alta participação');
    setEngajamentoDificuldades(ficha.engajamento_dificuldades || '');
    setEngajamentoPotencialidades(ficha.engajamento_potencialidades || '');

    setDificuldadesAprendizagem(ficha.dificuldades_aprendizagem || '');
    setEstrategiasSuperacao(ficha.estrategias_superacao || '');

    setSocioemocionalStatus(ficha.socioemocional_status || 'Adequado');
    setSocioemocionalDescricao(ficha.socioemocional_descricao || '');

    const turmaStudents = alunos.filter(a => a.turma_id === ficha.turma_id);
    setStudentEvaluations(
      turmaStudents.map((aluno) => {
        const found = ficha.alunos_avaliados?.find(av => av.aluno_id === aluno.id);
        return {
          alunoId: aluno.id,
          nome: aluno.nome,
          nota: aluno.media_geral || 7.0,
          destaque: false,
          nivelAtencao: found?.nivel_atencao || 'baixo',
          dificuldade: found?.dificuldade_identificada || '',
          encaminhamento: found?.encaminhamentos_realizados || ''
        };
      })
    );

    setIsFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const turmaObj = turmas.find(t => t.id === Number(formTurmaId));
    const materiaObj = materias.find(m => m.id === Number(formMateriaId));

    const alunosAvaliadosMapped = studentEvaluations
      .filter(s => s.nivelAtencao !== 'baixo' || s.dificuldade || s.destaque)
      .map((s, idx) => ({
        id: Date.now() + idx,
        pre_conselho_id: editingFicha?.id || 0,
        aluno_id: s.alunoId,
        aluno_nome: s.nome,
        nivel_atencao: s.nivelAtencao,
        dificuldade_identificada: s.dificuldade,
        encaminhamentos_realizados: s.encaminhamento
      }));

    onSave({
      id: editingFicha?.id,
      turma_id: Number(formTurmaId),
      turma_nome: turmaObj?.nome || '1º A',
      materia_id: Number(formMateriaId),
      materia_nome: materiaObj?.nome || 'Matemática',
      periodo: formPeriodo,
      ano_letivo: formAnoLetivo,
      data_registro: formDataRegistro,
      desempenho_geral: desempenhoGeral,
      desempenho_justificativa: desempenhoJustificativa,
      conteudos_trabalhados: conteudos,
      objetivos_atingidos: objetivosAtingidos,
      obs_pedagogicas: obsPedagogicas,
      metodologias: metodologiasCheck,
      metodologias_outras: metodologiasOutras,
      metodologias_eficacia: metodologiasEficacia,
      instrumentos_avaliativos: instrumentosCheck,
      instrumentos_adequados: instrumentosAdequados,
      instrumentos_outros: instrumentosOutros,
      instrumentos_obs: instrumentosObs,
      engajamento_nivel: engajamentoNivel,
      engajamento_dificuldades: engajamentoDificuldades,
      engajamento_potencialidades: engajamentoPotencialidades,
      dificuldades_aprendizagem: dificuldadesAprendizagem,
      estrategias_superacao: estrategiasSuperacao,
      socioemocional_status: socioemocionalStatus,
      socioemocional_descricao: socioemocionalDescricao,
      alunos_avaliados: alunosAvaliadosMapped
    });

    onToast({
      type: 'success',
      title: 'Ficha de Pré-Conselho Salva!',
      message: `Ficha da turma ${turmaObj?.nome} registrada com sucesso.`
    });

    setIsFormOpen(false);
  };

  // Filtered fichas for step 3.1
  const currentFichas = preConselhos.filter(p => {
    const matchesPeriodo = selectedTrimestre === 'Todos os Períodos' || p.periodo === selectedTrimestre;
    const matchesTurma = !selectedTurmaId || p.turma_id === selectedTurmaId;
    const matchesMateria = selectedMateriaId === null || selectedMateriaId === 0 || p.materia_id === selectedMateriaId;
    return matchesPeriodo && matchesTurma && matchesMateria;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Pré-Conselho de Classe
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {selectedMateriaId !== null ? (
              <span>Registros de <strong>{selectedMateriaId === 0 ? 'Ficha Geral' : selectedMateriaObj?.nome}</strong> na turma <strong>{selectedTurmaObj?.nome}</strong> ({selectedTurnoObj?.nome})</span>
            ) : selectedTurmaId !== null ? (
              <span>Matérias da turma <strong>{selectedTurmaObj?.nome}</strong> ({selectedTurnoObj?.nome})</span>
            ) : selectedTurnoId !== null ? (
              <span>Turmas do turno <strong>{selectedTurnoObj?.nome}</strong></span>
            ) : (
              <span>Selecione um turno para visualizar as turmas e fichas do pré-conselho.</span>
            )}
          </p>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Trimestre Selector */}
          <div className="relative">
            <select
              value={selectedTrimestre}
              onChange={(e) => setSelectedTrimestre(e.target.value)}
              className="pl-3 pr-8 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 focus:outline-none cursor-pointer"
            >
              <option value="1º Trimestre">1º Trimestre</option>
              <option value="2º Trimestre">2º Trimestre</option>
              <option value="3º Trimestre">3º Trimestre</option>
              <option value="Todos os Períodos">Todos os Períodos</option>
            </select>
          </div>

          {/* Back Buttons */}
          {selectedMateriaId !== null ? (
            <button
              onClick={() => setSelectedMateriaId(null)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar às Matérias
            </button>
          ) : selectedTurmaId !== null ? (
            <button
              onClick={() => setSelectedTurmaId(null)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar às Turmas
            </button>
          ) : selectedTurnoId !== null ? (
            <button
              onClick={() => setSelectedTurnoId(null)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar aos Turnos
            </button>
          ) : null}

          {/* Nova Ficha Button */}
          <button
            onClick={handleOpenNewForm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nova Ficha
          </button>
        </div>
      </div>

      {/* STEP 1: TURNOS */}
      {selectedTurnoId === null && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {turnosList.map((turno) => {
            const IconComp = turno.icon;
            const turnoTurmas = turmas.filter(t => t.turno_nome === turno.nome);
            const countFichas = preConselhos.filter(p => {
              const matchesPeriod = selectedTrimestre === 'Todos os Períodos' || p.periodo === selectedTrimestre;
              const matchesTurno = turnoTurmas.some(t => t.id === p.turma_id);
              return matchesPeriod && matchesTurno;
            }).length;

            return (
              <div
                key={turno.id}
                onClick={() => handleSelectTurno(turno.id)}
                className="group cursor-pointer rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className={`p-6 bg-gradient-to-br ${turno.bgGradient} ${turno.textColor} relative h-40 flex flex-col justify-between overflow-hidden`}>
                  <IconComp className={`w-32 h-32 absolute -right-6 -bottom-6 opacity-30 ${turno.textColor} transform group-hover:scale-110 transition-transform duration-500`} />
                  <div>
                    <h2 className={`text-3xl font-black tracking-tight ${turno.textColor}`}>{turno.nome}</h2>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${turno.pillBg} backdrop-blur-sm`}>
                      {turno.countTurmas} Turmas
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fichas Realizadas</span>
                    <strong className="text-xl font-black text-indigo-600 dark:text-indigo-400">{countFichas}</strong>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STEP 2: TURMAS */}
      {selectedTurnoId !== null && selectedTurmaId === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {currentTurmasList.map((turma) => {
            const totalAlunosMatriculados = alunos.filter(a => a.turma_id === turma.id).length;
            const fichasEntregues = preConselhos.filter(p => p.turma_id === turma.id && (selectedTrimestre === 'Todos os Períodos' || p.periodo === selectedTrimestre)).length;
            const totalMateriasTurma = materiasDaTurma(turma.id).length;

            return (
              <div
                key={turma.id}
                onClick={() => handleSelectTurma(turma.id)}
                className="group cursor-pointer rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div className="p-5 bg-gradient-to-br from-indigo-600 to-blue-600 text-white relative overflow-hidden">
                  <Users className="w-20 h-20 absolute -right-3 -bottom-3 opacity-15" />
                  <h3 className="text-2xl font-black">{turma.nome}</h3>
                  <p className="text-xs text-indigo-100 mt-1">{totalAlunosMatriculados} Alunos matriculados</p>
                </div>

                <div className="p-4 flex items-center justify-between bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Progresso por Matéria</span>
                    <strong className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {fichasEntregues} de {totalMateriasTurma} <span className="text-xs font-normal text-slate-400">entregues</span>
                    </strong>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STEP 3: MATÉRIAS */}
      {selectedTurmaId !== null && selectedMateriaId === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div
            onClick={() => handleSelectMateria(0)}
            className="cursor-pointer p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition flex items-center justify-between border-l-4 border-l-slate-600"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Ficha Geral da Turma</h4>
                <span className="text-[11px] text-slate-400">Observações gerais / Consolidado</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>

          {materiasDaTurma(selectedTurmaId).map((materia) => {
            const jaFeito = preConselhos.some(p => p.turma_id === selectedTurmaId && p.materia_id === materia.id && (selectedTrimestre === 'Todos os Períodos' || p.periodo === selectedTrimestre));
            const statusColor = jaFeito ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-l-emerald-500' : 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-l-blue-500';
            const statusText = jaFeito ? 'ENTREGUE' : 'DISPONÍVEL';

            return (
              <div
                key={materia.id}
                onClick={() => handleSelectMateria(materia.id)}
                className={`cursor-pointer p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition flex items-center justify-between border-l-4 ${statusColor}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{materia.nome}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${jaFeito ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                      <span className={`text-[10px] font-bold tracking-wider ${jaFeito ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {statusText}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            );
          })}
        </div>
      )}

      {/* STEP 3.1: FICHAS */}
      {selectedMateriaId !== null && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">DATA</th>
                    <th className="p-4">OBSERVAÇÃO / TIPO</th>
                    <th className="p-4">PEDAGOGIA / RESPONSÁVEL</th>
                    <th className="p-4 text-center">DESEMPENHO</th>
                    <th className="p-4 text-center">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentFichas.length > 0 ? (
                    currentFichas.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {reg.data_registro}
                        </td>
                        <td className="p-4 font-medium">
                          {reg.periodo} — {reg.materia_nome || 'Geral'}
                        </td>
                        <td className="p-4 text-slate-500">
                          Prof. Carlos Silva / Equipe Pedagógica
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            reg.desempenho_geral === 'Excelente' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            reg.desempenho_geral === 'Bom' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' :
                            reg.desempenho_geral === 'Regular' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {reg.desempenho_geral}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditFicha(reg)}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-400 transition"
                              title="Editar Ficha"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-sm">Nenhum registro encontrado para esta matéria nesta turma.</p>
                        <p className="text-xs mt-1 text-slate-500">Clique em "+ Nova Ficha" acima para criar a primeira ficha do pré-conselho.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-6 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                  {editingFicha ? 'Editar Ficha de Pré-Conselho' : 'Nova Ficha de Pré-Conselho'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Preencha as informações pedagógicas da turma e dos alunos.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="flex flex-col min-h-0 flex-1 mt-4">
              <div className="overflow-y-auto pr-2 space-y-6 text-xs sm:text-sm flex-1">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-2">
                  ℹ Identificação
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Ano Letivo</label>
                    <input
                      type="text"
                      value={formAnoLetivo}
                      onChange={e => setFormAnoLetivo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Período / Trimestre</label>
                    <select
                      value={formPeriodo}
                      onChange={e => setFormPeriodo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                    >
                      <option value="1º Trimestre">1º Trimestre</option>
                      <option value="2º Trimestre">2º Trimestre</option>
                      <option value="3º Trimestre">3º Trimestre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Turno / Período</label>
                    <input
                      type="text"
                      value={formTurnoNome}
                      readOnly
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Turma</label>
                    <select
                      value={formTurmaId}
                      onChange={e => setFormTurmaId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                    >
                      {(selectedTurnoObj ? turmas.filter(t => t.turno_nome === selectedTurnoObj.nome) : turmas).map(t => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Componente Curricular (Matéria)</label>
                    <select
                      value={formMateriaId}
                      onChange={e => setFormMateriaId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                    >
                      {materiasDoForm.map(m => (
                        <option key={m.id} value={m.id}>{m.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Professor Designado</label>
                    <input
                      type="text"
                      value={formProfessor}
                      onChange={e => setFormProfessor(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data do Registro</label>
                    <input
                      type="date"
                      value={formDataRegistro}
                      onChange={e => setFormDataRegistro(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 📈 1. Desempenho Geral da Turma */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-2">
                  📈 1. Desempenho Geral da Turma
                </h4>
                <div className="flex flex-wrap gap-4">
                  {(['Excelente', 'Bom', 'Regular', 'Insatisfatório'] as DesempenhoGeral[]).map(option => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="desempenhoGeral"
                        value={option}
                        checked={desempenhoGeral === option}
                        onChange={() => setDesempenhoGeral(option)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      {option}
                    </label>
                  ))}
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Justificativa:</label>
                  <textarea
                    rows={2}
                    value={desempenhoJustificativa}
                    onChange={e => setDesempenhoJustificativa(e.target.value)}
                    placeholder="Considerar aprendizagem, participação e desenvolvimento das competências..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Grid for Section 2 & 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section 📘 2. Conteúdos e Objetivos */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-2">
                    📘 2. Conteúdos e Objetivos
                  </h4>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Conteúdos trabalhados no período:</label>
                    <textarea
                      rows={3}
                      value={conteudos}
                      onChange={e => setConteudos(e.target.value)}
                      placeholder="Descreva os conteúdos trabalhados..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Objetivos de aprendizagem atingidos?</label>
                    <div className="flex gap-3 mt-1 font-semibold flex-wrap">
                      {(['Totalmente', 'Parcialmente', 'Não atingidos'] as const).map(opt => (
                        <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                          <input
                            type="radio"
                            name="objetivosAtingidos"
                            value={opt}
                            checked={objetivosAtingidos === opt}
                            onChange={() => setObjetivosAtingidos(opt)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Observações Pedagógicas:</label>
                    <textarea
                      rows={2}
                      value={obsPedagogicas}
                      onChange={e => setObsPedagogicas(e.target.value)}
                      placeholder="Observações adicionais do professor..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Section 💡 3. Metodologias Utilizadas */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-2">
                    💡 3. Metodologias Utilizadas
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      'Aula expositiva dialogada',
                      'Resolução de exercícios',
                      'Trabalho em grupo',
                      'Aprendizagem baseada em projetos',
                      'Sala de aula invertida',
                      'Tecnologias digitais',
                      'Atividades práticas',
                      'Metodologias ativas'
                    ].map(met => (
                      <label key={met} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={metodologiasCheck.includes(met)}
                          onChange={() => handleToggleMetodologia(met)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{met}</span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Outras / Detalhes:</label>
                    <input
                      type="text"
                      value={metodologiasOutras}
                      onChange={e => setMetodologiasOutras(e.target.value)}
                      placeholder="Outras metodologias utilizadas..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Avaliação da eficácia das metodologias:</label>
                    <textarea
                      rows={2}
                      value={metodologiasEficacia}
                      onChange={e => setMetodologiasEficacia(e.target.value)}
                      placeholder="Avaliação de resultados..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Grid for Section 4 & Section 5,6,7 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section 📋 4. Instrumentos Avaliativos */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-2">
                    📋 4. Instrumentos Avaliativos
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      'Prova escrita',
                      'Trabalho individual',
                      'Trabalho em grupo',
                      'Seminários',
                      'Produção textual',
                      'Lista de exercícios',
                      'Avaliação oral',
                      'Portfólio',
                      'Autoavaliação'
                    ].map(ins => (
                      <label key={ins} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={instrumentosCheck.includes(ins)}
                          onChange={() => handleToggleInstrumento(ins)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{ins}</span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Os instrumentos foram adequados?</label>
                    <div className="flex gap-3 mt-1 font-semibold flex-wrap">
                      {(['Sim', 'Parcialmente', 'Não'] as const).map(adq => (
                        <label key={adq} className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                          <input
                            type="radio"
                            name="instrumentosAdequados"
                            value={adq}
                            checked={instrumentosAdequados === adq}
                            onChange={() => setInstrumentosAdequados(adq)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          {adq}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Outros Instrumentos:</label>
                    <input
                      type="text"
                      value={instrumentosOutros}
                      onChange={e => setInstrumentosOutros(e.target.value)}
                      placeholder="Ex: Gincana, Debate, etc."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Observações Pedagógicas:</label>
                    <textarea
                      rows={2}
                      value={instrumentosObs}
                      onChange={e => setInstrumentosObs(e.target.value)}
                      placeholder="Comentários sobre a aplicação das avaliações..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Section 👥 5, 6 & 7. Engajamento, Aprendizagem e Socioemocional */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-2">
                    👥 5, 6 & 7. Engajamento, Aprendizagem e Socioemocional
                  </h4>

                  {/* 5. Engajamento */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-xs text-slate-800 dark:text-slate-200">5. Engajamento e Participação:</label>
                    <select
                      value={engajamentoNivel}
                      onChange={e => setEngajamentoNivel(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                    >
                      <option value="Alta participação">Alta participação</option>
                      <option value="Participação moderada">Participação moderada</option>
                      <option value="Baixa participação">Baixa participação</option>
                    </select>
                    <textarea
                      rows={2}
                      value={engajamentoDificuldades}
                      onChange={e => setEngajamentoDificuldades(e.target.value)}
                      placeholder="Dificuldades observadas..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                    />
                    <textarea
                      rows={2}
                      value={engajamentoPotencialidades}
                      onChange={e => setEngajamentoPotencialidades(e.target.value)}
                      placeholder="Potencialidades identificadas..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                    />
                  </div>

                  {/* 6. Dificuldades de Aprendizagem */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-xs text-slate-800 dark:text-slate-200">6. Dificuldades de Aprendizagem:</label>
                    <textarea
                      rows={2}
                      value={dificuldadesAprendizagem}
                      onChange={e => setDificuldadesAprendizagem(e.target.value)}
                      placeholder="Descreva as dificuldades..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                    />
                    <textarea
                      rows={2}
                      value={estrategiasSuperacao}
                      onChange={e => setEstrategiasSuperacao(e.target.value)}
                      placeholder="Estratégias já utilizadas para superação..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                    />
                  </div>

                  {/* 7. Aspectos Socioemocionais */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-xs text-slate-800 dark:text-slate-200">7. Aspectos Socioemocionais:</label>
                    <select
                      value={socioemocionalStatus}
                      onChange={e => setSocioemocionalStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                    >
                      <option value="Adequado">Adequado</option>
                      <option value="Necessita atenção">Necessita atenção</option>
                      <option value="Crítico">Crítico</option>
                    </select>
                    <textarea
                      rows={2}
                      value={socioemocionalDescricao}
                      onChange={e => setSocioemocionalDescricao(e.target.value)}
                      placeholder="Descrição dos comportamentos..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section ⚠️ 8. Estudantes que Demandam Atenção Específica */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                  ⚠️ 8. Estudantes que Demandam Atenção Específica
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500">
                        <th className="p-2">NOME DO ESTUDANTE</th>
                        <th className="p-2 text-center">NOTA</th>
                        <th className="p-2 text-center">DESTAQUE</th>
                        <th className="p-2 text-center">NÍVEL DE ATENÇÃO</th>
                        <th className="p-2">DIFICULDADE IDENTIFICADA</th>
                        <th className="p-2">ENCAMINHAMENTOS REALIZADOS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {studentEvaluations.map((student, idx) => (
                        <tr key={student.alunoId}>
                          <td className="p-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {student.nome}
                          </td>
                          <td className="p-2 text-center font-bold">
                            {student.nota}
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={student.destaque}
                              onChange={e => {
                                const next = [...studentEvaluations];
                                next[idx].destaque = e.target.checked;
                                setStudentEvaluations(next);
                              }}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <select
                              value={student.nivelAtencao}
                              onChange={e => {
                                const next = [...studentEvaluations];
                                next[idx].nivelAtencao = e.target.value as NivelAtencao;
                                setStudentEvaluations(next);
                              }}
                              className={`px-2 py-1 rounded text-xs font-bold ${
                                student.nivelAtencao === 'alto' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                student.nivelAtencao === 'medio' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <option value="baixo">Baixo</option>
                              <option value="medio">Médio</option>
                              <option value="alto">Alto</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={student.dificuldade}
                              onChange={e => {
                                const next = [...studentEvaluations];
                                next[idx].dificuldade = e.target.value;
                                setStudentEvaluations(next);
                              }}
                              placeholder="Descreva..."
                              className="w-full px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={student.encaminhamento}
                              onChange={e => {
                                const next = [...studentEvaluations];
                                next[idx].encaminhamento = e.target.value;
                                setStudentEvaluations(next);
                              }}
                              placeholder="Encaminhamentos..."
                              className="w-full px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 mt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-lg shadow-indigo-500/20 transition active:scale-95"
                >
                  Salvar Ficha de Pré-Conselho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreConselhoManager;
