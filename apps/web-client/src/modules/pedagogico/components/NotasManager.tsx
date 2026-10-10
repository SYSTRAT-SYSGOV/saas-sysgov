import React, { useState } from 'react';
import { pedagogicoService } from '../services/pedagogicoService';
import { erroApi } from '../../escola/api';
import {
  Calculator,
  Save,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sun,
  CloudSun,
  Moon,
  ChevronRight,
  ArrowLeft,
  Users,
  BookOpen,
  Printer,
  FileSpreadsheet,
  FileUp
} from 'lucide-react';
import type { ResultadoImportacaoNotas } from '../api';
import ImportarNotasModal from './ImportarNotasModal';
import { TurmaPedagogica, Materia, AlunoPedagogico } from '../types/pedagogico';

interface NotasManagerProps {
  turmas: TurmaPedagogica[];
  materias: Materia[];
  alunos: AlunoPedagogico[];
  /** Grava as notas alteradas; devolve true quando deu certo. */
  onSaveNotas: (turmaId: number, materiaId: number, notas: Record<number, Partial<Record<1 | 2 | 3, number>>>) => Promise<boolean>;
  /** Importa notas de um CSV; devolve null quando a API recusou o arquivo. */
  onImportarNotas: (arquivo: File) => Promise<ResultadoImportacaoNotas | null>;
  onToast: (toast: { type: string; title: string; message: string }) => void;
}

export const NotasManager: React.FC<NotasManagerProps> = ({
  turmas,
  materias,
  alunos,
  onSaveNotas,
  onImportarNotas,
  onToast,
}) => {
  // Navigation Flow State: turnos -> turmas -> materias -> notas
  const [step, setStep] = useState<'turnos' | 'turmas' | 'materias' | 'notas'>('turnos');
  const [selectedTurno, setSelectedTurno] = useState<'Manhã' | 'Tarde' | 'Noite' | null>(null);
  const [selectedTurma, setSelectedTurma] = useState<TurmaPedagogica | null>(null);
  const [selectedMateria, setSelectedMateria] = useState<Materia | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  type Linha = { tri1: string; tri2: string; tri3: string };
  // Notas digitadas por aluno e o que veio do servidor (para enviar só o que mudou)
  const [studentGrades, setStudentGrades] = useState<Record<number, Linha>>({});
  const [gradesServidor, setGradesServidor] = useState<Record<number, Linha>>({});
  const [carregandoNotas, setCarregandoNotas] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);

  const formatarNota = (valor: string | number): string => Number(valor).toFixed(1).replace('.', ',');

  /** Abre a matéria da turma e busca as notas já lançadas no ano. */
  const abrirMateria = async (materia: Materia) => {
    setSelectedMateria(materia);
    setStep('notas');
    if (!selectedTurma) return;
    setCarregandoNotas(true);
    setStudentGrades({});
    setGradesServidor({});
    try {
      const notas = await pedagogicoService.notasDaTurma(selectedTurma.id, materia.id);
      const mapa: Record<number, Linha> = {};
      notas.forEach(n => {
        const linha = mapa[n.aluno_id] ?? { tri1: '', tri2: '', tri3: '' };
        // Quando há recuperação maior, é ela que vale para a média
        const valor = n.nota_recuperacao !== null && Number(n.nota_recuperacao) > Number(n.nota) ? n.nota_recuperacao : n.nota;
        linha[`tri${n.trimestre}` as keyof Linha] = formatarNota(valor);
        mapa[n.aluno_id] = linha;
      });
      setStudentGrades(mapa);
      setGradesServidor(mapa);
    } catch (e) {
      onToast({ type: 'error', title: 'Notas não carregadas', message: erroApi(e).mensagem });
    } finally {
      setCarregandoNotas(false);
    }
  };

  // Matérias da turma (vínculos do cadastro); sem vínculos, todas as matérias
  const materiasDaTurma = selectedTurma?.materias?.length
    ? materias.filter(m => selectedTurma.materias!.some(v => v.materia_id === m.id))
    : materias;

  // Helper counts by shift
  const turmasManha = turmas.filter(t => t.turno_nome === 'Manhã');
  const turmasTarde = turmas.filter(t => t.turno_nome === 'Tarde');
  const turmasNoite = turmas.filter(t => t.turno_nome === 'Noite');

  const alunosManha = alunos.filter(a => {
    const t = turmas.find(tObj => tObj.id === a.turma_id);
    return t ? t.turno_nome === 'Manhã' : false;
  });

  const alunosTarde = alunos.filter(a => {
    const t = turmas.find(tObj => tObj.id === a.turma_id);
    return t ? t.turno_nome === 'Tarde' : false;
  });

  const alunosNoite = alunos.filter(a => {
    const t = turmas.find(tObj => tObj.id === a.turma_id);
    return t ? t.turno_nome === 'Noite' : false;
  });

  // Filtered turmas for Step 2
  const currentTurnoTurmas = selectedTurno
    ? turmas.filter(t => t.turno_nome === selectedTurno)
    : [];

  // Filtered alunos for selected Turma in Step 4
  const currentTurmaAlunos = selectedTurma
    ? alunos.filter(a =>
        a.turma_id === selectedTurma.id &&
        a.nome.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Auto-format and validate grade input (> 10 converts to decimal, e.g. 20 -> 2,0; max 10.0; round to 1 decimal place)
  const handleGradeInputChange = (alunoId: number, field: 'tri1' | 'tri2' | 'tri3', rawVal: string) => {
    let val = rawVal.trim();

    // Check if user entered a number without comma/dot that is > 10 (e.g. "20", "68", "85", "100")
    const normalized = val.replace(',', '.');
    const num = parseFloat(normalized);

    if (!isNaN(num)) {
      if (num > 10) {
        if (num >= 100) {
          val = '10,0';
        } else if (!val.includes(',') && !val.includes('.')) {
          // Automatically divide by 10 (e.g. 20 -> 2,0; 68 -> 6,8; 85 -> 8,5)
          val = (Math.round((num / 10) * 10) / 10).toFixed(1).replace('.', ',');
        } else {
          // Clamp to 10.0 if user typed e.g. 10.5
          val = '10,0';
        }
      } else if (val.includes(',') || val.includes('.')) {
        // Ensure strictly 1 decimal place if user typed multiple decimal digits
        const parts = val.split(/[,.]/);
        if (parts.length === 2 && parts[1].length > 1) {
          const rounded = Math.round(num * 10) / 10;
          val = rounded.toFixed(1).replace('.', ',');
        }
      }
    }

    setStudentGrades(prev => ({
      ...prev,
      [alunoId]: {
        ...(prev[alunoId] || { tri1: '', tri2: '', tri3: '' }),
        [field]: val
      }
    }));
  };

  // Increment (+0,1) or Decrement (-0,1) grade for a student
  const handleStepGrade = (alunoId: number, field: 'tri1' | 'tri2' | 'tri3', delta: number) => {
    const currentStr = studentGrades[alunoId]?.[field] || '0,0';
    let currentNum = parseInputValue(currentStr);
    if (isNaN(currentNum)) currentNum = 0.0;

    let newNum = Math.round((currentNum + delta) * 10) / 10;
    if (newNum > 10.0) newNum = 10.0;
    if (newNum < 0.0) newNum = 0.0;

    const newStr = newNum.toFixed(1).replace('.', ',');
    handleGradeInputChange(alunoId, field, newStr);
  };

  // Helper decimal parser
  const parseInputValue = (val: string) => {
    if (!val) return NaN;
    return parseFloat(val.replace(',', '.'));
  };

  // Compute calculated final average for student (truncating/flooring to 1 decimal place without rounding up)
  const getAlunoMediaCalculada = (alunoId: number) => {
    const g = studentGrades[alunoId] || { tri1: '', tri2: '', tri3: '' };
    const v1 = parseInputValue(g.tri1);
    const v2 = parseInputValue(g.tri2);
    const v3 = parseInputValue(g.tri3);

    const validVals = [v1, v2, v3].filter(v => !isNaN(v));
    if (validVals.length === 0) return 0;
    const sum = validVals.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / validVals.length;

    // Truncate to 1 decimal place without rounding up (e.g. 17.9 / 3 = 5.966... -> 5.9)
    return Math.floor(parseFloat(avg.toFixed(6)) * 10) / 10;
  };

  // Compute remaining points needed to reach passing grade (18.0 pts total for 3 trimesters, strictly rounded to 1 decimal place)
  const getAlunoFaltamPontos = (alunoId: number) => {
    const g = studentGrades[alunoId] || { tri1: '', tri2: '', tri3: '' };
    const v1 = parseInputValue(g.tri1) || 0;
    const v2 = parseInputValue(g.tri2) || 0;
    const v3 = parseInputValue(g.tri3) || 0;

    const totalSum = Math.round((v1 + v2 + v3) * 10) / 10;
    const targetTotal = 18.0; // 6.0 average * 3 trimesters
    const diff = Math.max(0, targetTotal - totalSum);
    return Math.round(diff * 10) / 10;
  };

  // Save all grades for the current class & subject
  const handleSaveAllGrades = async () => {
    if (!selectedTurma || !selectedMateria || salvando) return;
    const alteradas: Record<number, Partial<Record<1 | 2 | 3, number>>> = {};
    let apagadas = 0;
    currentTurmaAlunos.forEach(aluno => {
      const atual = studentGrades[aluno.id];
      const antes = gradesServidor[aluno.id];
      ([1, 2, 3] as const).forEach(tri => {
        const campo = `tri${tri}` as keyof Linha;
        const valor = atual?.[campo] ?? '';
        if (valor === (antes?.[campo] ?? '')) return;
        const numero = parseInputValue(valor);
        if (isNaN(numero)) { apagadas++; return; }
        alteradas[aluno.id] = { ...alteradas[aluno.id], [tri]: numero };
      });
    });
    if (apagadas) {
      onToast({ type: 'warning', title: 'Nota em branco', message: 'Uma nota já lançada não pode ficar em branco. Informe 0,0 ou outro valor.' });
      return;
    }
    if (!Object.keys(alteradas).length) {
      onToast({ type: 'info', title: 'Nada a salvar', message: 'Nenhuma nota foi alterada.' });
      return;
    }

    setSalvando(true);
    const ok = await onSaveNotas(selectedTurma.id, selectedMateria.id, alteradas);
    setSalvando(false);
    if (!ok) return;
    setGradesServidor(studentGrades);
    onToast({
      type: 'success',
      title: 'Lançamentos Salvos com Sucesso!',
      message: `Notas de ${selectedMateria.nome} da turma ${selectedTurma.nome} gravadas.`
    });
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const headers = ['Nº', 'NOME DO ALUNO', '1º TRI', '2º TRI', '3º TRI', 'MÉDIA', 'STATUS'];
    const rows = currentTurmaAlunos.map((aluno, idx) => {
      const g = studentGrades[aluno.id] || { tri1: '', tri2: '', tri3: '' };
      const media = getAlunoMediaCalculada(aluno.id);
      const faltam = getAlunoFaltamPontos(aluno.id);
      const statusText = faltam === 0 ? 'Aprovado' : `Faltam ${faltam.toFixed(1)} pts`;
      return [
        aluno.numero || idx + 1,
        aluno.nome,
        g.tri1 || '-',
        g.tri2 || '-',
        g.tri3 || '-',
        media.toFixed(1),
        statusText
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Notas_${selectedTurma?.nome}_${selectedMateria?.nome}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onToast({
      type: 'success',
      title: 'Excel Exportado',
      message: `Planilha de notas da turma ${selectedTurma?.nome} baixada com sucesso.`
    });
  };

  const importarNotas = async (arquivo: File) => {
    const resultado = await onImportarNotas(arquivo);
    if (resultado && resultado.importadas > 0 && step === 'notas' && selectedMateria) {
      // Recarrega a tabela aberta; notas digitadas e não salvas são mantidas
      if (JSON.stringify(studentGrades) === JSON.stringify(gradesServidor)) void abrirMateria(selectedMateria);
      else onToast({ type: 'info', title: 'Notas importadas', message: 'Salve ou saia desta tela para ver as notas importadas.' });
    }
    return resultado;
  };

  const botaoImportar = (
    <button
      type="button"
      onClick={() => setImportando(true)}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
    >
      <FileUp className="w-4 h-4" />
      Importar CSV
    </button>
  );

  return (
    <div className="space-y-6 pb-12">
      {importando && (
        <ImportarNotasModal
          turmas={turmas}
          materias={materias}
          alunos={alunos}
          turmaInicial={selectedTurma}
          materiaInicial={step === 'notas' ? selectedMateria : null}
          onImportar={importarNotas}
          onClose={() => setImportando(false)}
        />
      )}
      {/* STEP 1: SELEÇÃO DE TURNO */}
      {step === 'turnos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
                <Calculator className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                Lançamento de Notas
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Selecione um turno para visualizar as turmas e realizar o lançamento de notas.
              </p>
            </div>
            {botaoImportar}
          </div>

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
                <Calculator className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                Lançamento de Notas
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Selecione a turma em <strong className="text-teal-600 dark:text-teal-400 font-extrabold">{selectedTurno}</strong> para lançar as notas.
              </p>
            </div>

            <button
              onClick={() => setStep('turnos')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar aos Turnos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {currentTurnoTurmas.map(turma => {
              const countMatriculados = alunos.filter(a => a.turma_id === turma.id).length;

              return (
                <div
                  key={turma.id}
                  onClick={() => {
                    setSelectedTurma(turma);
                    setStep('materias');
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
                      Selecionar Disciplina
                    </span>
                    <div className="p-2.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: SELEÇÃO DA DISCIPLINA / COMPONENTE CURRICULAR */}
      {step === 'materias' && selectedTurma && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
                <BookOpen className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                Selecione a Disciplina
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Turma: <strong className="text-teal-600 dark:text-teal-400 font-extrabold">{selectedTurma.nome}</strong> | Turno: <strong className="text-slate-700 dark:text-slate-200 font-bold">{selectedTurno}</strong>
              </p>
            </div>

            <button
              onClick={() => setStep('turmas')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar às Turmas
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {materiasDaTurma.map(materia => (
              <div
                key={materia.id}
                onClick={() => void abrirMateria(materia)}
                className="group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                        {materia.codigo || 'Disciplina'}{materia.carga_horaria ? ` • ${materia.carga_horaria}h` : ''}
                      </span>
                      <h2 className="text-xl font-black text-white mt-2">{materia.nome}</h2>
                    </div>
                    <BookOpen className="w-10 h-10 opacity-30 text-white group-hover:scale-110 transition-transform" />
                  </div>
                </div>

                <div className="p-5 flex items-center justify-between bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Lançar Notas da Matéria
                  </span>
                  <div className="p-2.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <Calculator className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: TELA DE LANÇAMENTO DE NOTAS MATCHING USER SCREENSHOT */}
      {step === 'notas' && selectedTurma && selectedMateria && (
        <div className="space-y-6">
          {/* Header matching User Screenshot */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Lançamento de Notas
              </h1>
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1.5">
                <span>{selectedMateria.nome}</span>
                <span className="text-slate-400 font-normal">&gt;</span>
                <span className="text-slate-600 dark:text-slate-300 font-bold">{selectedTurma.nome} ({selectedTurno})</span>
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {botaoImportar}
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>

              <button
                type="button"
                onClick={() => setStep('materias')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            </div>
          </div>

          {/* Grades Table Box matching User Screenshot */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider pb-3">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Nº</th>
                    <th className="py-3 px-4">NOME DO ALUNO</th>
                    <th className="py-3 px-4 text-center w-28">1º TRI</th>
                    <th className="py-3 px-4 text-center w-28">2º TRI</th>
                    <th className="py-3 px-4 text-center w-28">3º TRI</th>
                    <th className="py-3 px-4 text-center w-28 font-extrabold text-slate-700 dark:text-slate-200">MÉDIA</th>
                    <th className="py-3 px-4 text-center w-36">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {currentTurmaAlunos.map((aluno, index) => {
                    const grades = studentGrades[aluno.id] || { tri1: '', tri2: '', tri3: '' };
                    const mediaCalculada = getAlunoMediaCalculada(aluno.id);
                    const faltamPts = getAlunoFaltamPontos(aluno.id);

                    // Check if all trimesters have been filled (including 3º TRI)
                    const isAllFilled =
                      grades.tri1.trim() !== '' &&
                      grades.tri2.trim() !== '' &&
                      grades.tri3.trim() !== '';

                    let statusContent;
                    if (isAllFilled) {
                      if (mediaCalculada >= 6.0) {
                        statusContent = <span className="text-[#10B981] font-extrabold">Aprovado</span>;
                      } else {
                        statusContent = <span className="text-[#EF4444] font-extrabold">Reprovado</span>;
                      }
                    } else {
                      if (faltamPts === 0) {
                        statusContent = <span className="text-[#10B981] font-extrabold">Aprovado</span>;
                      } else {
                        statusContent = (
                          <span className="text-slate-500 dark:text-slate-400 font-semibold">
                            Faltam <strong className="text-[#EF4444] font-black">{faltamPts.toFixed(1).replace('.', ',')}</strong> pts
                          </span>
                        );
                      }
                    }

                    return (
                      <tr key={aluno.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-4 text-center font-bold text-slate-400 font-mono">
                          {aluno.numero || index + 1}
                        </td>
                        <td className="py-4 px-4 font-black text-slate-900 dark:text-white uppercase tracking-wide">
                          {aluno.nome}
                        </td>

                        {/* 1º Tri Input */}
                        <td className="py-4 px-3 text-center">
                          <div className="inline-flex items-center relative group">
                            <input
                              type="text"
                              value={grades.tri1}
                              onChange={e => handleGradeInputChange(aluno.id, 'tri1', e.target.value)}
                              placeholder="0,0"
                              className="w-24 text-center font-bold pl-2 pr-6 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 text-xs shadow-xs"
                            />
                            <div className="absolute right-1 top-1 bottom-1 flex flex-col justify-center border-l border-slate-200 dark:border-slate-700 pl-0.5">
                              <button
                                type="button"
                                onClick={() => handleStepGrade(aluno.id, 'tri1', 0.1)}
                                title="Acrescentar 0,1 (+0.1)"
                                className="h-3 w-4 flex items-center justify-center text-[8px] text-slate-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950 rounded-t transition-colors font-black"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStepGrade(aluno.id, 'tri1', -0.1)}
                                title="Descontar 0,1 (-0.1)"
                                className="h-3 w-4 flex items-center justify-center text-[8px] text-slate-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950 rounded-b transition-colors font-black border-t border-slate-100 dark:border-slate-700"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 2º Tri Input */}
                        <td className="py-4 px-3 text-center">
                          <div className="inline-flex items-center relative group">
                            <input
                              type="text"
                              value={grades.tri2}
                              onChange={e => handleGradeInputChange(aluno.id, 'tri2', e.target.value)}
                              placeholder="0,0"
                              className="w-24 text-center font-bold pl-2 pr-6 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 text-xs shadow-xs"
                            />
                            <div className="absolute right-1 top-1 bottom-1 flex flex-col justify-center border-l border-slate-200 dark:border-slate-700 pl-0.5">
                              <button
                                type="button"
                                onClick={() => handleStepGrade(aluno.id, 'tri2', 0.1)}
                                title="Acrescentar 0,1 (+0.1)"
                                className="h-3 w-4 flex items-center justify-center text-[8px] text-slate-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950 rounded-t transition-colors font-black"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStepGrade(aluno.id, 'tri2', -0.1)}
                                title="Descontar 0,1 (-0.1)"
                                className="h-3 w-4 flex items-center justify-center text-[8px] text-slate-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950 rounded-b transition-colors font-black border-t border-slate-100 dark:border-slate-700"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 3º Tri Input */}
                        <td className="py-4 px-3 text-center">
                          <div className="inline-flex items-center relative group">
                            <input
                              type="text"
                              value={grades.tri3}
                              onChange={e => handleGradeInputChange(aluno.id, 'tri3', e.target.value)}
                              placeholder="0,0"
                              className="w-24 text-center font-bold pl-2 pr-6 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 text-xs shadow-xs"
                            />
                            <div className="absolute right-1 top-1 bottom-1 flex flex-col justify-center border-l border-slate-200 dark:border-slate-700 pl-0.5">
                              <button
                                type="button"
                                onClick={() => handleStepGrade(aluno.id, 'tri3', 0.1)}
                                title="Acrescentar 0,1 (+0.1)"
                                className="h-3 w-4 flex items-center justify-center text-[8px] text-slate-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950 rounded-t transition-colors font-black"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStepGrade(aluno.id, 'tri3', -0.1)}
                                title="Descontar 0,1 (-0.1)"
                                className="h-3 w-4 flex items-center justify-center text-[8px] text-slate-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950 rounded-b transition-colors font-black border-t border-slate-100 dark:border-slate-700"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Calculated Average */}
                        <td className="py-4 px-4 text-center">
                          <span className={`font-black text-sm font-mono ${
                            mediaCalculada >= 6.0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                          }`}>
                            {mediaCalculada.toFixed(1).replace('.', ',')}
                          </span>
                        </td>

                        {/* STATUS column */}
                        <td className="py-4 px-4 text-center font-medium text-xs">
                          {statusContent}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Action Button matching User Screenshot */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => void handleSaveAllGrades()}
                disabled={salvando || carregandoNotas}
                className="px-8 py-3.5 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white font-extrabold text-xs shadow-xl flex items-center gap-2 transition-all active:scale-95"
              >
                {salvando ? 'Salvando…' : carregandoNotas ? 'Carregando notas…' : '💾 Salvar Todas as Notas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotasManager;
