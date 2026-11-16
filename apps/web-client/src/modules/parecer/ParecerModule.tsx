import React, { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { Button, PageHeader, Select } from '@sysgov/ui';
import ComEscola, { SeletorEscola } from '../escola/components/ComEscola';
import { parecerApi } from './api';
import { Carga, ParecerContext, useCarga, type Aba, type Impressao, type Rota } from './components/comum';
import Inicio from './components/Inicio';
import TurmaAlunos from './components/TurmaAlunos';
import Avaliar from './components/Avaliar';
import Notas from './components/Notas';
import Frequencia from './components/Frequencia';
import Ocorrencias from './components/Ocorrencias';
import Conteudos from './components/Conteudos';
import Relatorios from './components/Relatorios';
import Configuracoes from './components/Configuracoes';
import Auditoria from './components/Auditoria';
import DialogoImprimir from './components/Impressao';

const ABAS: [Aba, string][] = [
  ['inicio', 'Início'],
  ['notas', 'Notas'],
  ['frequencia', 'Frequência'],
  ['ocorrencias', 'Ocorrências'],
  ['conteudos', 'Conteúdos'],
  ['relatorios', 'Relatórios'],
  ['configuracoes', 'Turmas e funções'],
  ['auditoria', 'Auditoria'],
];

/** Conteúdo do módulo; montado de novo a cada troca de escola de trabalho. */
const ParecerConteudo: React.FC = () => {
  const catalogo = useCarga(() => parecerApi.catalogo(), []);
  const [rota, setRota] = useState<Rota>({ aba: 'inicio' });
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [impressao, setImpressao] = useState<Impressao | null>(null);
  const anos = useMemo(() => {
    const atual = new Date().getFullYear();
    return [atual + 1, atual, atual - 1, atual - 2].map((a) => ({ value: a, label: String(a) }));
  }, []);

  const ir = (r: Rota) => {
    setRota(r);
    window.scrollTo?.({ top: 0 });
  };

  return (
    <Carga carga={catalogo}>
      {(cat) => {
        const abas = ABAS.filter(([a]) => (a !== 'configuracoes' || cat.gestor) && (a !== 'auditoria' || cat.auditoria));
        return (
          <ParecerContext.Provider value={{ catalogo: cat, ano, ir, imprimir: setImpressao }}>
            <div className="space-y-4">
              <nav className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2 print:hidden" aria-label="Seções do parecer">
                {abas.map(([a, rotulo]) => (
                  <Button key={a} size="sm" variant={rota.aba === a ? 'primary' : 'ghost'} onClick={() => ir({ aba: a })} aria-current={rota.aba === a ? 'page' : undefined}>
                    {rotulo}
                  </Button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Ano letivo</span>
                  <div className="w-28">
                    <Select value={ano} onChange={(v) => setAno(Number(v))} options={anos} />
                  </div>
                </div>
              </nav>

              {rota.aba === 'inicio' && rota.tela === 'avaliar' && rota.alunoId ? (
                <Avaliar key={rota.alunoId} alunoId={rota.alunoId} materiaInicial={rota.materia} />
              ) : rota.aba === 'inicio' && rota.tela === 'alunos' && rota.turmaId ? (
                <TurmaAlunos turmaId={rota.turmaId} />
              ) : rota.aba === 'inicio' ? (
                <Inicio turno={rota.turno} />
              ) : null}
              {rota.aba === 'notas' && <Notas turmaId={rota.turmaId} />}
              {rota.aba === 'frequencia' && <Frequencia turmaId={rota.turmaId} />}
              {rota.aba === 'ocorrencias' && <Ocorrencias turmaId={rota.turmaId} alunoId={rota.alunoId} />}
              {rota.aba === 'conteudos' && <Conteudos serieInicial={rota.serie} materiaInicial={rota.materia} />}
              {rota.aba === 'relatorios' && <Relatorios />}
              {rota.aba === 'configuracoes' && cat.gestor && <Configuracoes />}
              {rota.aba === 'auditoria' && cat.auditoria && <Auditoria />}

              {impressao !== null && <DialogoImprimir alvo={impressao} onFechar={() => setImpressao(null)} />}
            </div>
          </ParecerContext.Provider>
        );
      }}
    </Carga>
  );
};

export const ParecerModule: React.FC = () => (
  <div className="space-y-4">
    <div className="print:hidden">
      <PageHeader icon={<FileText className="h-6 w-6" />} title="Parecer Descritivo" subtitle="Anos iniciais (1º ao 5º ano): habilidades, avaliação, parecer, notas e frequência" />
    </div>
    <ComEscola modulo="parecer">
      <div className="print:hidden">
        <SeletorEscola />
      </div>
      <ParecerConteudo />
    </ComEscola>
  </div>
);

export default ParecerModule;
