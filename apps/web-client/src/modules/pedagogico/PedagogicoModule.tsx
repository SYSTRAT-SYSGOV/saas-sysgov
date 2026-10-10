import React, { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useTenant } from '@/core/tenant/useTenant';
import { GraduationCap, BookOpen, FileSearch, Award, Calculator, AlertTriangle, Users, Globe, ExternalLink, ShieldCheck, CheckSquare, Loader2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { pedagogicoService } from './services/pedagogicoService';
import { PedagogicoStats, TurmaPedagogica, AlunoPedagogico, PreConselho, OcorrenciaPedagogica, Professor, AtaConselho } from './types/pedagogico';

import PedagogicoDashboard from './components/PedagogicoDashboard';
import FrequenciaDiariaManager from './components/FrequenciaDiariaManager';
import PreConselhoManager from './components/PreConselhoManager';
import ConselhoClasseManager from './components/ConselhoClasseManager';
import NotasManager from './components/NotasManager';
import OcorrenciasManager from './components/OcorrenciasManager';
import ProfessoresManager from './components/ProfessoresManager';
import AlunosManager from './components/AlunosManager';
import AdminPainel from '../escola/components/AdminPainel';
import ComEscola from '../escola/components/ComEscola';
import { erroApi } from '../escola/api';
import type { ResultadoImportacaoNotas } from './api';

/** Conteúdo do módulo; montado de novo a cada troca de escola de trabalho. */
const PedagogicoConteudo: React.FC = () => {
  const { tenant } = useTenant();
  const [currentSubTab, setCurrentSubTab] = useState<string>('modulo_pedagogico_dashboard');

  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [stats, setStats] = useState<PedagogicoStats>(pedagogicoService.getStats());
  const [turmas, setTurmas] = useState<TurmaPedagogica[]>([]);
  const [alunos, setAlunos] = useState<AlunoPedagogico[]>([]);
  const [preConselhos, setPreConselhos] = useState<PreConselho[]>([]);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaPedagogica[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [atas, setAtas] = useState<AtaConselho[]>([]);

  /** Copia o cache do serviço para o estado das telas. */
  const loadData = () => {
    setStats(pedagogicoService.getStats());
    setTurmas(pedagogicoService.getTurmas());
    setAlunos(pedagogicoService.getAlunos());
    setPreConselhos(pedagogicoService.getPreConselhos());
    setOcorrencias(pedagogicoService.getOcorrencias());
    setProfessores(pedagogicoService.getProfessores());
    setAtas(pedagogicoService.getAtas());
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga(null);
    try {
      await pedagogicoService.carregar();
      loadData();
    } catch (e) {
      setErroCarga(erroApi(e).mensagem);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /** Executa uma mutação do serviço, atualiza as telas e avisa em caso de erro. */
  const executar = async (acao: () => Promise<unknown>, falha: string): Promise<boolean> => {
    try {
      await acao();
      loadData();
      return true;
    } catch (e) {
      handleToast({ type: 'error', title: falha, message: e instanceof Error && !isAxiosError(e) ? e.message : erroApi(e).mensagem });
      return false;
    }
  };

  const handleSavePreConselho = (data: Partial<PreConselho>) => {
    void executar(() => pedagogicoService.savePreConselho(data), 'Ficha não salva');
  };

  const handleSaveAta = (data: Partial<AtaConselho>) => {
    void executar(() => pedagogicoService.saveAta(data), 'Ata não salva');
  };

  const handleSaveNotas = (turmaId: number, materiaId: number, notas: Record<number, Partial<Record<1 | 2 | 3, number>>>) =>
    executar(() => pedagogicoService.lancarNotas(turmaId, materiaId, notas), 'Notas não salvas');

  const handleImportarNotas = async (arquivo: File) => {
    let resultado: ResultadoImportacaoNotas | null = null;
    await executar(async () => { resultado = await pedagogicoService.importarNotas(arquivo); }, 'Notas não importadas');
    return resultado;
  };

  const handleSaveOcorrencia = (data: Partial<OcorrenciaPedagogica>) => {
    void executar(() => pedagogicoService.saveOcorrencia(data), 'Ocorrência não salva');
  };

  const handleSaveProfessor = (data: Partial<Professor>) => {
    void executar(() => pedagogicoService.saveProfessor(data), 'Professor não salvo');
  };

  const handleDeleteProfessor = (id: number) => {
    void executar(() => pedagogicoService.deleteProfessor(id), 'Vínculos não removidos');
  };

  const handleSaveAluno = (data: Partial<AlunoPedagogico>) => {
    void executar(() => pedagogicoService.saveAluno(data), 'Aluno não salvo');
  };

  const handleDeleteAluno = (id: number) => {
    void executar(() => pedagogicoService.deleteAluno(id), 'Aluno não excluído');
  };

  const [toasts, setToasts] = useState<{ id: string; type: string; title: string; message: string }[]>([]);

  const handleToast = (toast: { type: string; title: string; message: string }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Carregando dados pedagógicos...</p>
      </div>
    );
  }

  if (erroCarga) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-center space-y-4 max-w-xl mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <div>
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">Falha ao carregar dados do Pedagógico</h3>
          <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">{erroCarga}</p>
        </div>
        <button
          onClick={() => void carregar()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none print:hidden">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 ${
              t.type === 'success'
                ? 'bg-emerald-950/90 text-white border-emerald-500/50'
                : t.type === 'warning'
                ? 'bg-amber-950/90 text-white border-amber-500/50'
                : t.type === 'error'
                ? 'bg-rose-950/90 text-white border-rose-500/50'
                : 'bg-slate-900/90 text-white border-slate-700/50'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {t.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
              {t.type === 'info' && <BookOpen className="w-5 h-5 text-sky-400" />}
            </div>
            <div className="flex-1 space-y-0.5">
              <h4 className="text-xs font-bold leading-tight">{t.title}</h4>
              <p className="text-[11px] text-slate-200 leading-normal">{t.message}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="print:hidden">
        <PageHeader
          icon={<GraduationCap className="h-6 w-6" />}
          title="Módulo Pedagógico & Gestão Escolar"
          badge="Ano Letivo 2026"
          subtitle={`${tenant?.name || 'Rede Municipal'} — Conselho de classe, diagnósticos, lançamento de notas e atas`}
        />
      </div>

      {/* Navigation Subtabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm print:hidden">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCurrentSubTab('modulo_pedagogico_dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
              currentSubTab === 'modulo_pedagogico_dashboard'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Painel Pedagógico
          </button>

          <button
            onClick={() => setCurrentSubTab('modulo_pedagogico_frequencia')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
              currentSubTab === 'modulo_pedagogico_frequencia'
                ? 'bg-[#7C3AED] text-white font-bold shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Frequência Diária
          </button>

          <button
            onClick={() => setCurrentSubTab('modulo_pedagogico_pre_conselho')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
              currentSubTab === 'modulo_pedagogico_pre_conselho'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSearch className="w-4 h-4" />
            Pré-Conselho
          </button>

          <button
            onClick={() => setCurrentSubTab('modulo_pedagogico_conselho')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
              currentSubTab === 'modulo_pedagogico_conselho'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            Conselho & Atas
          </button>

          <button
            onClick={() => setCurrentSubTab('modulo_pedagogico_notas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
              currentSubTab === 'modulo_pedagogico_notas'
                ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Lançamento de Notas
          </button>

          <button
            onClick={() => setCurrentSubTab('modulo_pedagogico_ocorrencias')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
              currentSubTab === 'modulo_pedagogico_ocorrencias'
                ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Ocorrências
          </button>

          <button
            onClick={() => setCurrentSubTab('modulo_pedagogico_alunos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
              currentSubTab === 'modulo_pedagogico_alunos'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Alunos
          </button>

          <button
            onClick={() => setCurrentSubTab('modulo_pedagogico_professores')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
              currentSubTab === 'modulo_pedagogico_professores'
                ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Corpo Docente
          </button>

          <button
            onClick={() => setCurrentSubTab('modulo_pedagogico_admin')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
              currentSubTab === 'modulo_pedagogico_admin'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Administração
          </button>
        </div>
      </div>

      {currentSubTab === 'modulo_pedagogico_dashboard' && (
        <PedagogicoDashboard
          stats={stats}
          turmas={turmas}
          alunos={alunos}
          ocorrencias={ocorrencias}
          categorias={pedagogicoService.getCategorias()}
          onNavigateSubtab={setCurrentSubTab}
        />
      )}

      {currentSubTab === 'modulo_pedagogico_frequencia' && (
        <FrequenciaDiariaManager
          alunos={alunos}
          turmas={turmas}
          onToast={handleToast}
        />
      )}

      {currentSubTab === 'modulo_pedagogico_alunos' && (
        <AlunosManager
          alunos={alunos}
          turmas={turmas}
          ocorrencias={ocorrencias}
          materias={pedagogicoService.getMaterias()}
          onSaveAluno={handleSaveAluno}
          onDeleteAluno={handleDeleteAluno}
          onToast={handleToast}
        />
      )}

      {currentSubTab === 'modulo_pedagogico_pre_conselho' && (
        <PreConselhoManager
          preConselhos={preConselhos}
          turmas={turmas}
          materias={pedagogicoService.getMaterias()}
          alunos={alunos}
          onSave={handleSavePreConselho}
          onToast={handleToast}
        />
      )}

      {currentSubTab === 'modulo_pedagogico_conselho' && (
        <ConselhoClasseManager
          atas={atas}
          turmas={turmas}
          alunos={alunos}
          preConselhos={preConselhos}
          ocorrencias={ocorrencias}
          onSaveAta={handleSaveAta}
          onToast={handleToast}
          onNavigateToPreConselho={() => setCurrentSubTab('modulo_pedagogico_pre_conselho')}
        />
      )}

      {currentSubTab === 'modulo_pedagogico_notas' && (
        <NotasManager
          turmas={turmas}
          materias={pedagogicoService.getMaterias()}
          alunos={alunos}
          onSaveNotas={handleSaveNotas}
          onImportarNotas={handleImportarNotas}
          onToast={handleToast}
        />
      )}

      {currentSubTab === 'modulo_pedagogico_ocorrencias' && (
        <OcorrenciasManager
          ocorrencias={ocorrencias}
          alunos={alunos}
          onSaveOcorrencia={handleSaveOcorrencia}
          onToast={handleToast}
        />
      )}

      {currentSubTab === 'modulo_pedagogico_professores' && (
        <ProfessoresManager
          professores={professores}
          turmas={turmas}
          materias={pedagogicoService.getMaterias()}
          onSaveProfessor={handleSaveProfessor}
          onDeleteProfessor={handleDeleteProfessor}
          onToast={handleToast}
        />
      )}

      {currentSubTab === 'modulo_pedagogico_admin' && (
        <AdminPainel onToast={handleToast} />
      )}
    </div>
  );
};

export const PedagogicoModule: React.FC = () => (
  <ComEscola modulo="pedagogico">
    <PedagogicoConteudo />
  </ComEscola>
);

export default PedagogicoModule;
