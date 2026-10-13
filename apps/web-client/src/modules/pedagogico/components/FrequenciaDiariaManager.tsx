import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  Check,
  X,
  ChevronRight,
  ArrowLeft,
  Printer,
  Download,
  HelpCircle,
  Sun,
  CloudSun,
  Moon,
  Plus,
  FileText,
  Sparkles,
  ChevronLeft,
  CheckSquare,
  Pencil
} from 'lucide-react';
import { AlunoPedagogico, TurmaPedagogica } from '../types/pedagogico';
import type { Presenca } from '../api';
import { erroApi } from '../../escola/api';
import { pedagogicoService } from '../services/pedagogicoService';

type Marca = 'C' | 'F' | 'J';
const PARA_API: Record<Marca, Presenca> = { C: 'presente', F: 'falta', J: 'falta_justificada' };
const DA_API: Record<Presenca, Marca> = { presente: 'C', falta: 'F', falta_justificada: 'J' };
const MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hojeIso = () => iso(new Date());
/** "2026-09-24" → "24/09". */
const diaMes = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

interface FrequenciaDiariaManagerProps {
  alunos: AlunoPedagogico[];
  turmas: TurmaPedagogica[];
  onToast: (toast: { type: string; title: string; message: string }) => void;
}

export const FrequenciaDiariaManager: React.FC<FrequenciaDiariaManagerProps> = ({
  alunos,
  turmas,
  onToast,
}) => {
  // Navigation Flow State
  const [step, setStep] = useState<'turnos' | 'turmas' | 'chamada'>('turnos');
  const [selectedTurno, setSelectedTurno] = useState<'Manhã' | 'Tarde' | 'Noite' | null>(null);
  const [selectedTurma, setSelectedTurma] = useState<TurmaPedagogica | null>(null);

  // Chamada Screen State
  const [consultaTab, setConsultaTab] = useState<'alunos' | 'aulas'>('alunos');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>(() => {
    const hoje = hojeIso();
    const atual = pedagogicoService.getTrimestres().find(t => t.data_inicio <= hoje && hoje <= t.data_fim);
    return `${atual?.trimestre ?? 1}º Trimestre`;
  });
  const [mesExibido, setMesExibido] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState<string>(hojeIso);

  // Chamadas do mês exibido: data -> { alunoId: marca } e data -> aulas
  const [attendanceHistory, setAttendanceHistory] = useState<Record<string, Record<number, Marca>>>({});
  const [aulasPorDia, setAulasPorDia] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Marcas do dia selecionado
  const [attendanceMap, setAttendanceMap] = useState<Record<number, Marca>>({});

  // Faltas (aulas perdidas) por aluno no trimestre selecionado
  const [faltasMap, setFaltasMap] = useState<Record<number, number>>({});

  // Modal Confirmar Frequência
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [multiplicador, setMultiplicador] = useState<number>(5);

  // Modal Relatório de Faltas
  const [isRelatorioFaltasOpen, setIsRelatorioFaltasOpen] = useState<boolean>(false);
  const [faltasRelatorio, setFaltasRelatorio] = useState<Record<number, number>>({});

  const savedAttendanceDays = Object.keys(attendanceHistory).sort();

  /** Datas do trimestre escolhido no ano corrente (sem cadastro, o ano inteiro). */
  const periodoSelecionado = useCallback((): { inicio: string; fim: string } => {
    const ano = new Date().getFullYear();
    const numero = Number(selectedPeriodo.charAt(0));
    const t = pedagogicoService.getTrimestres().find(x => x.ano === ano && x.trimestre === numero);
    return t ? { inicio: t.data_inicio, fim: t.data_fim } : { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
  }, [selectedPeriodo]);

  const avisarErro = useCallback((titulo: string, e: unknown) => {
    onToast({ type: 'error', title: titulo, message: erroApi(e).mensagem });
  }, [onToast]);

  /** Busca as chamadas do mês exibido e as faltas do trimestre da turma selecionada. */
  const carregarTurma = useCallback(async () => {
    if (!selectedTurma) return;
    const inicio = iso(mesExibido);
    const fim = iso(new Date(mesExibido.getFullYear(), mesExibido.getMonth() + 1, 0));
    const periodo = periodoSelecionado();
    setCarregando(true);
    try {
      const [registros, totais] = await Promise.all([
        pedagogicoService.frequenciasPeriodo(selectedTurma.id, inicio, fim),
        pedagogicoService.totaisFaltas(periodo.inicio, periodo.fim, selectedTurma.id),
      ]);
      const historico: Record<string, Record<number, Marca>> = {};
      const aulas: Record<string, number> = {};
      registros.forEach(r => {
        const data = r.data.slice(0, 10);
        historico[data] = { ...historico[data], [r.aluno_id]: DA_API[r.presenca] };
        aulas[data] = r.aulas;
      });
      setAttendanceHistory(historico);
      setAulasPorDia(aulas);
      setFaltasMap(Object.fromEntries(totais.map(t => [t.aluno_id, t.faltas])));
    } catch (e) {
      avisarErro('Frequência não carregada', e);
    } finally {
      setCarregando(false);
    }
  }, [selectedTurma, mesExibido, periodoSelecionado, avisarErro]);

  useEffect(() => {
    void carregarTurma();
  }, [carregarTurma]);

  // Relatório geral: faltas de todos os alunos visíveis no trimestre
  useEffect(() => {
    if (!isRelatorioFaltasOpen) return;
    const periodo = periodoSelecionado();
    pedagogicoService.totaisFaltas(periodo.inicio, periodo.fim)
      .then(totais => setFaltasRelatorio(Object.fromEntries(totais.map(t => [t.aluno_id, t.faltas]))))
      .catch(e => avisarErro('Relatório não carregado', e));
  }, [isRelatorioFaltasOpen, periodoSelecionado, avisarErro]);

  // Helper counts by shift
  const turmasManha = turmas.filter(t => t.turno_nome === 'Manhã');
  const turmasTarde = turmas.filter(t => t.turno_nome === 'Tarde');
  const turmasNoite = turmas.filter(t => t.turno_nome === 'Noite');

  const alunosManha = alunos.filter(a => {
    const t = turmas.find(t => t.id === a.turma_id || t.nome === a.turma_nome);
    return t ? t.turno_nome === 'Manhã' : false;
  });

  const alunosTarde = alunos.filter(a => {
    const t = turmas.find(t => t.id === a.turma_id || t.nome === a.turma_nome);
    return t ? t.turno_nome === 'Tarde' : false;
  });

  const alunosNoite = alunos.filter(a => {
    const t = turmas.find(t => t.id === a.turma_id || t.nome === a.turma_nome);
    return t ? t.turno_nome === 'Noite' : false;
  });

  // Filtered turmas for Step 2
  const currentTurnoTurmas = selectedTurno
    ? turmas.filter(t => t.turno_nome === selectedTurno)
    : [];

  // Students for selected Turma in Step 3
  const currentTurmaAlunos = selectedTurma
    ? alunos.filter(a => a.turma_id === selectedTurma.id)
    : [];

  // Marcas do dia selecionado: as gravadas ou todos presentes
  useEffect(() => {
    const salvo = attendanceHistory[selectedDate];
    const mapa: Record<number, Marca> = {};
    currentTurmaAlunos.forEach(a => { mapa[a.id] = salvo?.[a.id] ?? 'C'; });
    setAttendanceMap(mapa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, attendanceHistory, selectedTurma]);

  const handleSelectCalendarDate = (data: string) => {
    if (data > hojeIso()) {
      onToast({ type: 'warning', title: 'Data futura', message: 'Não é possível lançar chamada de um dia que ainda não chegou.' });
      return;
    }
    setSelectedDate(data);
  };

  // Click edit icon on a date column in Alunos tab
  const handleEditDayAttendance = (data: string) => {
    setSelectedDate(data);
    setConsultaTab('aulas');
  };

  const handleToggleAttendance = (alunoId: number, status: Marca) => {
    setAttendanceMap(prev => ({ ...prev, [alunoId]: status }));
  };

  const mudarMes = (delta: number) => {
    setMesExibido(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleOpenConfirmSave = () => {
    setMultiplicador(aulasPorDia[selectedDate] ?? 5);
    setIsConfirmModalOpen(true);
  };

  // Grava a chamada do dia com a quantidade de aulas (cada falta vale essa quantidade)
  const handleConfirmSaveAttendance = async () => {
    if (!selectedTurma || salvando) return;
    if (!currentTurmaAlunos.length) {
      onToast({ type: 'warning', title: 'Turma sem alunos', message: 'Não há alunos nesta turma para registrar a chamada.' });
      return;
    }
    const presencas: Record<number, Presenca> = {};
    currentTurmaAlunos.forEach(a => { presencas[a.id] = PARA_API[attendanceMap[a.id] ?? 'C']; });

    setSalvando(true);
    try {
      await pedagogicoService.registrarChamada(selectedTurma.id, selectedDate, multiplicador, presencas);
      setIsConfirmModalOpen(false);
      onToast({
        type: 'success',
        title: 'Frequência Salva!',
        message: `Chamada de ${diaMes(selectedDate)} da turma ${selectedTurma.nome} registrada (${multiplicador} aula(s) no dia).`
      });
      await carregarTurma();
    } catch (e) {
      avisarErro('Chamada não salva', e);
    } finally {
      setSalvando(false);
    }
  };

  // Dias do mês exibido para o calendário
  const primeiroDiaSemana = mesExibido.getDay();
  const diasNoMes = new Date(mesExibido.getFullYear(), mesExibido.getMonth() + 1, 0).getDate();
  const dataDoDia = (dia: number) => iso(new Date(mesExibido.getFullYear(), mesExibido.getMonth(), dia));

  return (
    <div className="space-y-6 pb-12">
      {/* STEP 1: SELEÇÃO DE TURNO */}
      {step === 'turnos' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
                <CheckSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                Frequência Diária
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Selecione um turno para ver as turmas e fazer a chamada diária.
              </p>
            </div>

            <button
              onClick={() => setIsRelatorioFaltasOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
            >
              <FileText className="w-4 h-4" />
              Relatório de Faltas
            </button>
          </div>

          {/* 3 Turnos Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                nome: 'Manhã' as const,
                gradient: 'from-[#FACC15] to-[#EAB308]',
                textColor: 'text-slate-900',
                pillBg: 'bg-white/40 text-slate-900',
                hoverBg: 'group-hover:bg-[#FACC15] group-hover:text-slate-950',
                icon: Sun,
                countTurmas: turmasManha.length,
                countAlunos: alunosManha.length
              },
              {
                nome: 'Tarde' as const,
                gradient: 'from-[#F97316] to-[#EA580C]',
                textColor: 'text-white',
                pillBg: 'bg-white/20 text-white',
                hoverBg: 'group-hover:bg-[#F97316] group-hover:text-white',
                icon: CloudSun,
                countTurmas: turmasTarde.length,
                countAlunos: alunosTarde.length
              },
              {
                nome: 'Noite' as const,
                gradient: 'from-[#7C3AED] to-[#6D28D9]',
                textColor: 'text-white',
                pillBg: 'bg-white/20 text-white',
                hoverBg: 'group-hover:bg-[#7C3AED] group-hover:text-white',
                icon: Moon,
                countTurmas: turmasNoite.length,
                countAlunos: alunosNoite.length
              }
            ].map(t => (
              <div
                key={t.nome}
                onClick={() => {
                  setSelectedTurno(t.nome);
                  setStep('turmas');
                }}
                className="group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div className={`bg-gradient-to-br ${t.gradient} p-6 ${t.textColor} relative`}>
                  <div className="flex items-center justify-between relative z-10">
                    <h2 className={`text-3xl font-black tracking-tight ${t.textColor}`}>{t.nome}</h2>
                    <t.icon className={`w-16 h-16 opacity-30 ${t.textColor} group-hover:scale-110 transition-transform`} />
                  </div>
                  <div className="flex items-center gap-2 mt-4 relative z-10">
                    <span className={`px-3 py-1 rounded-full ${t.pillBg} text-xs font-bold backdrop-blur-md`}>
                      {t.countTurmas} Turmas
                    </span>
                    <span className={`px-3 py-1 rounded-full ${t.pillBg} text-xs font-bold backdrop-blur-md`}>
                      {t.countAlunos} Alunos
                    </span>
                  </div>
                </div>

                <div className="p-5 flex items-center justify-between bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Acessar as Turmas
                  </span>
                  <div className={`p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ${t.hoverBg} transition-colors`}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: SELEÇÃO DE TURMA DO TURNO */}
      {step === 'turmas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
                <CheckSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                Frequência Diária
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Selecione a turma em <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{selectedTurno}</strong> para realizar a chamada.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRelatorioFaltasOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <FileText className="w-4 h-4" />
                Relatório de Faltas
              </button>

              <button
                onClick={() => setStep('turnos')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            </div>
          </div>

          {/* Grid of Class Cards with Green Header matching Screenshot 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {currentTurnoTurmas.map(turma => {
              const countMatriculados = alunos.filter(a => a.turma_id === turma.id).length;

              return (
                <div
                  key={turma.id}
                  onClick={() => {
                    setSelectedTurma(turma);
                    setStep('chamada');
                    setConsultaTab('alunos');
                  }}
                  className="group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="bg-gradient-to-r from-[#10B981] to-[#059669] p-6 text-white relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-black text-white">{turma.nome}</h2>
                        <span className="text-xs font-semibold text-emerald-100 opacity-90 mt-1 block">
                          {countMatriculados} Alunos matriculados
                        </span>
                      </div>
                      <Users className="w-12 h-12 opacity-30 text-white group-hover:scale-110 transition-transform" />
                    </div>
                  </div>

                  <div className="p-5 flex items-center justify-between bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Fazer a Chamada
                    </span>
                    <div className="p-2.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: VISUALIZAÇÃO DA FREQUÊNCIA (ALUNOS E AULAS) */}
      {step === 'chamada' && selectedTurma && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Frequência Diária
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Turma: <strong className="text-purple-600 dark:text-purple-400 font-extrabold">{selectedTurma.nome}</strong> | Turno: <strong className="text-slate-700 dark:text-slate-200 font-bold">{selectedTurno}</strong>
              </p>
            </div>

            <button
              onClick={() => setStep('turmas')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </div>

          {/* Subtabs Controls & Trimestre Dropdown matching Screenshot 3 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
              <button
                onClick={() => setConsultaTab('alunos')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  consultaTab === 'alunos'
                    ? 'bg-[#7C3AED] text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🎓 Alunos
              </button>
              <button
                onClick={() => setConsultaTab('aulas')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  consultaTab === 'aulas'
                    ? 'bg-[#7C3AED] text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📅 Aulas
              </button>
            </div>

            <select
              value={selectedPeriodo}
              onChange={e => setSelectedPeriodo(e.target.value)}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-purple-700 dark:text-purple-300 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="1º Trimestre">1º Trimestre</option>
              <option value="2º Trimestre">2º Trimestre</option>
              <option value="3º Trimestre">3º Trimestre</option>
            </select>
          </div>

          {/* CONSULTA 1: ALUNOS TAB (List of students, status, attendance by saved dates, and total absences count) */}
          {consultaTab === 'alunos' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-purple-500/80 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-4 px-6 w-16 text-center">Nº</th>
                      <th className="py-4 px-6">NOME</th>
                      <th className="py-4 px-6 text-center">SITUAÇÃO</th>
                      {savedAttendanceDays.map(day => (
                        <th key={day} className="py-2.5 px-4 text-center min-w-[75px]" title={`${aulasPorDia[day] ?? 1} aula(s)`}>
                          <div className="flex flex-col items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditDayAttendance(day)}
                              title={`Editar chamada de ${diaMes(day)}`}
                              className="w-7 h-7 rounded-xl bg-sky-50 dark:bg-sky-950 border border-sky-300 dark:border-sky-800 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-600 dark:hover:text-white transition-all flex items-center justify-center shadow-xs cursor-pointer group"
                            >
                              <Pencil className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            </button>
                            <div className="text-center leading-tight">
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 block font-mono">{day.slice(8, 10)}</span>
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">{MESES[Number(day.slice(5, 7)) - 1].slice(0, 3)}.</span>
                            </div>
                          </div>
                        </th>
                      ))}
                      <th className="py-4 px-6 text-center" title="Aulas perdidas no trimestre selecionado (faltas justificadas não contam)">FALTAS*</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {currentTurmaAlunos.map((aluno, idx) => (
                      <tr key={aluno.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-6 text-center font-bold text-slate-400 font-mono">
                          {aluno.numero ?? idx + 1}
                        </td>
                        <td className="py-4 px-6 font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                          {aluno.nome}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
                            {aluno.status || 'ATIVO'}
                          </span>
                        </td>
                        {savedAttendanceDays.map(day => {
                          const status = attendanceHistory[day]?.[aluno.id] || 'C';
                          return (
                            <td key={day} className="py-4 px-4 text-center">
                              {status === 'C' ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#00D0B6] dark:bg-[#06B6D4] text-white font-black text-xs shadow-xs" title="Presente">
                                  C
                                </span>
                              ) : status === 'J' ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500 text-white font-black text-xs shadow-xs" title="Falta justificada">
                                  J
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#EF4444] text-white font-black text-xs shadow-xs" title="Falta">
                                  F
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-4 px-6 text-center font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                          {faltasMap[aluno.id] || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONSULTA 2: AULAS TAB (Interactive Month Calendar & Attendance Grid matching Screenshots 4 & 5) */}
          {consultaTab === 'aulas' && (
            <div className="space-y-6">
              {/* Interactive Calendar Box matching Screenshot 4 */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    Selecione o dia no calendário abaixo
                  </div>

                  <div className="flex items-center gap-3 font-black text-sm text-slate-900 dark:text-white">
                    <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>{MESES[mesExibido.getMonth()]} {mesExibido.getFullYear()}{carregando ? ' …' : ''}</span>
                    <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Calendar Days Grid */}
                <div>
                  <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span>Dom</span>
                    <span>Seg</span>
                    <span>Ter</span>
                    <span>Qua</span>
                    <span>Qui</span>
                    <span>Sex</span>
                    <span>Sáb</span>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: primeiroDiaSemana }, (_, i) => <div key={`vazio-${i}`} />)}

                    {Array.from({ length: diasNoMes }, (_, i) => dataDoDia(i + 1)).map(day => {
                      const isSelected = selectedDate === day;
                      const isSaved = savedAttendanceDays.includes(day);
                      const isFuture = day > hojeIso();

                      let dayStyle = 'bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300';

                      if (isSelected) {
                        dayStyle = 'bg-[#E0E7FF] text-purple-900 font-black border-2 border-[#7C3AED] shadow-sm';
                      } else if (isSaved) {
                        dayStyle = 'bg-[#FEE2E2] text-rose-900 font-bold border border-rose-300';
                      }

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleSelectCalendarDate(day)}
                          disabled={isFuture}
                          className={`h-11 rounded-xl font-bold text-xs border transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${dayStyle}`}
                        >
                          {Number(day.slice(8, 10))}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Legend matching Screenshot 4 */}
                  <div className="flex items-center justify-end gap-5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded border border-slate-300 bg-white dark:bg-slate-800" />
                      Sem Lançamento
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded border border-rose-300 bg-[#FEE2E2]" />
                      Chamada Salva
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded border-2 border-[#7C3AED] bg-[#E0E7FF]" />
                      Dia Selecionado
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Attendance Controls for Selected Day */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-purple-500/80 overflow-hidden shadow-xl space-y-4 p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                      <tr>
                        <th className="py-3 px-4 w-16 text-center">Nº</th>
                        <th className="py-3 px-4">ALUNO</th>
                        <th className="py-3 px-4 text-right">SITUAÇÃO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {currentTurmaAlunos.map((aluno, idx) => {
                        const status = attendanceMap[aluno.id] || 'C';

                        return (
                          <tr key={aluno.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 text-center font-bold text-slate-400 font-mono">
                              {(aluno.numero ?? idx + 1).toString().padStart(2, '0')}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white uppercase">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300 shrink-0">
                                  {aluno.nome.charAt(0)}
                                </div>
                                <span>{aluno.nome}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(aluno.id, 'C')}
                                  className={`px-3 py-1 rounded-lg font-black text-xs transition-all flex items-center gap-1 ${
                                    status === 'C'
                                      ? 'bg-[#10B981] text-white shadow-sm'
                                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                  }`}
                                >
                                  ✓ C
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(aluno.id, 'F')}
                                  className={`px-3 py-1 rounded-lg font-black text-xs transition-all flex items-center gap-1 ${
                                    status === 'F'
                                      ? 'bg-[#EF4444] text-white shadow-sm'
                                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                  }`}
                                >
                                  ✕ F
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttendance(aluno.id, 'J')}
                                  title="Falta justificada (não entra no total de faltas)"
                                  className={`px-3 py-1 rounded-lg font-black text-xs transition-all flex items-center gap-1 ${
                                    status === 'J'
                                      ? 'bg-amber-500 text-white shadow-sm'
                                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                  }`}
                                >
                                  J
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleOpenConfirmSave}
                    className="px-6 py-3 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all active:scale-95"
                  >
                    💾 Salvar Chamada de {diaMes(selectedDate)}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: CONFIRMAR FREQUÊNCIA MODAL (MULTIPLIER POPUP matching Screenshot 5) */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-200">
            {/* Big Question Mark Icon */}
            <div className="w-20 h-20 rounded-full border-4 border-sky-400 text-sky-500 flex items-center justify-center mx-auto">
              <HelpCircle className="w-12 h-12 stroke-[1.5]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Confirmar Frequência
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Verifique a quantidade de aulas que este dia representa. O padrão é 5 faltas para cada aluno ausente.
              </p>
            </div>

            <div className="space-y-2 text-left">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 text-center">
                Multiplicador (Faltas por ausência):
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={multiplicador}
                onChange={e => setMultiplicador(parseInt(e.target.value) || 1)}
                className="w-28 mx-auto block px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-center font-black text-lg text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => void handleConfirmSaveAttendance()}
                disabled={salvando}
                className="px-6 py-3 rounded-2xl bg-[#4C1D95] hover:bg-[#3B0764] text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
              >
                {salvando ? 'Salvando…' : 'Sim, Salvar Chamada'}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-5 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RELATÓRIO DE FALTAS */}
      {isRelatorioFaltasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Relatório Geral de Faltas Escolar
              </h3>
              <button
                onClick={() => setIsRelatorioFaltasOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/30 flex items-center justify-between text-xs">
                <span className="font-bold text-purple-900 dark:text-purple-300">Resumo de Faltas Registradas</span>
                <span className="font-black text-purple-700 dark:text-purple-400">{selectedPeriodo} / {new Date().getFullYear()}</span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">ALUNO</th>
                    <th className="py-2.5 px-3">TURMA</th>
                    <th className="py-2.5 px-3 text-center">FALTAS ACUMULADAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {alunos.map(a => (
                    <tr key={a.id}>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{a.nome}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-500">{a.turma_nome}</td>
                      <td className="py-2.5 px-3 text-center font-black font-mono text-purple-600 dark:text-purple-400">
                        {faltasRelatorio[a.id] ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimir Relatório
              </button>
              <button
                onClick={() => setIsRelatorioFaltasOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrequenciaDiariaManager;
