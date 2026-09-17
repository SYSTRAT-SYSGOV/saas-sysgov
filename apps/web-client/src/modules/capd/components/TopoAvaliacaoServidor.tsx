import React from 'react';
import { Clock, GraduationCap } from 'lucide-react';

export interface TopoAvaliacaoServidorProps {
  nomeServidor?: string;
  matricula?: string;
  cargo?: string;
  grupoFuncional?: string;
  lotacao?: string;
  statusTexto?: string;
  mediaParcial?: number | null;
  notaCorte?: number;
  progresso?: number;
  pontoDados?: {
    sincronizadoEm?: string;
    faltasInjustificadas?: number;
    atrasosSaidas?: number;
    horasExtras?: string;
  };
  treinamentosDados?: {
    horasValidadas?: string;
    cursos?: Array<{ nome: string; cargaHoraria: string }>;
  };
}

export const TopoAvaliacaoServidor: React.FC<TopoAvaliacaoServidorProps> = ({
  nomeServidor = 'Carlos Eduardo Silveira',
  matricula = '48.921-0',
  cargo = 'Auxiliar Administrativo',
  grupoFuncional = 'Quadro Geral',
  lotacao = 'SMAD — Depto. Protocolo e Arquivo',
  statusTexto = 'RASCUNHO EM EDIÇÃO',
  mediaParcial = 85.0,
  notaCorte = 70.0,
  progresso,
  pontoDados = {
    sincronizadoEm: 'Sincronizado Hoje',
    faltasInjustificadas: 0,
    atrasosSaidas: 2,
    horasExtras: '12h',
  },
  treinamentosDados = {
    horasValidadas: '40h Validadas',
    cursos: [
      { nome: 'Liderança e Inovação no Setor Público', cargaHoraria: '20h' },
      { nome: 'Ética, Cidadania e Lei de Acesso à Informação', cargaHoraria: '20h' },
    ],
  },
}) => {
  // Normaliza para a escala canônica do sistema (0 a 100 pontos)
  const valorPontos =
    mediaParcial !== null && mediaParcial !== undefined
      ? mediaParcial > 0 && mediaParcial <= 10
        ? mediaParcial * 10
        : mediaParcial
      : null;

  const mediaFormatada =
    valorPontos !== null ? valorPontos.toFixed(2).replace('.', ',') : '0,00';

  const apto = valorPontos !== null && valorPontos >= notaCorte;
  const notaCorteFormatada = notaCorte.toFixed(2).replace('.', ',');

  return (
    <div className="space-y-3.5">
      {/* ── Card Principal: Identificação do Servidor e Média Parcial ── */}
      <div className="rounded-lg border border-border border-t-[3px] border-t-[#0f4c81] bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#fef9c3] dark:bg-amber-950/60 text-[#854d0e] dark:text-amber-300 border border-[#fef08a] dark:border-amber-800">
                {statusTexto}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f4c81] dark:text-sky-400 leading-tight">
              {nomeServidor}
            </h2>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#475569] dark:text-slate-400">
              <span>
                <strong>Matrícula:</strong>{' '}
                <span className="font-mono tabular-nums text-foreground">{matricula}</span>
              </span>
              <span>
                <strong>Cargo:</strong> <span className="text-foreground">{cargo}</span>
              </span>
              <span>
                <strong>Grupo Funcional:</strong>{' '}
                <span className="text-foreground">{grupoFuncional}</span>
              </span>
              <span>
                <strong>Lotação:</strong> <span className="text-foreground">{lotacao}</span>
              </span>
            </div>
          </div>

          <div className="text-left md:text-right shrink-0">
            <div className="text-xs text-[#64748b] dark:text-slate-400 font-medium">
              Nota Parcial (Nc) Calculada:
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#0f4c81] dark:text-sky-400 leading-tight tabular-nums mt-0.5">
              {mediaFormatada} <span className="text-base sm:text-lg font-bold text-muted-foreground">pts</span>
            </div>
            <div
              className={`text-xs font-semibold mt-0.5 ${
                apto
                  ? 'text-[#15803d] dark:text-emerald-400'
                  : valorPontos !== null
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-muted-foreground'
              }`}
            >
              {valorPontos !== null
                ? apto
                  ? `Apto (>= ${notaCorteFormatada} pts)`
                  : `Abaixo do corte (< ${notaCorteFormatada} pts)`
                : 'Pendente de Avaliação'}
            </div>
          </div>
        </div>

        {progresso !== undefined && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
            <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
              Progresso do preenchimento
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-[#0f4c81] dark:bg-sky-500 transition-all duration-300"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-semibold text-foreground shrink-0 tabular-nums">
              {progresso}%
            </span>
          </div>
        )}
      </div>

      {/* ── Cards de Apoio: Ponto Eletrônico e Escola de Governo ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Ponto Eletrônico */}
        <div className="rounded-lg border border-[#e2e8f0] dark:border-slate-800 bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <strong className="text-xs sm:text-sm font-bold text-[#1e293b] dark:text-slate-100 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[#0f4c81] dark:text-sky-400" />
              Dados Integrados: Ponto Eletrônico
            </strong>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-border">
              {pontoDados.sincronizadoEm || 'Sincronizado Hoje'}
            </span>
          </div>
          <div className="grid grid-cols-3 text-center divide-x divide-border">
            <div className="px-2">
              <div className="text-[11px] text-[#64748b] dark:text-slate-400">Faltas Injustificadas</div>
              <strong className="font-mono text-base sm:text-lg font-bold text-[#15803d] dark:text-emerald-400 tabular-nums mt-0.5 block">
                {pontoDados.faltasInjustificadas ?? 0}
              </strong>
            </div>
            <div className="px-2">
              <div className="text-[11px] text-[#64748b] dark:text-slate-400">Atrasos / Saídas</div>
              <strong className="font-mono text-base sm:text-lg font-bold text-[#b45309] dark:text-amber-400 tabular-nums mt-0.5 block">
                {pontoDados.atrasosSaidas ?? 0}
              </strong>
            </div>
            <div className="px-2">
              <div className="text-[11px] text-[#64748b] dark:text-slate-400">Horas Extras Aut.</div>
              <strong className="font-mono text-base sm:text-lg font-bold text-[#0369a1] dark:text-sky-400 tabular-nums mt-0.5 block">
                {pontoDados.horasExtras || '0h'}
              </strong>
            </div>
          </div>
        </div>

        {/* RH / Escola de Governo */}
        <div className="rounded-lg border border-[#e2e8f0] dark:border-slate-800 bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <strong className="text-xs sm:text-sm font-bold text-[#1e293b] dark:text-slate-100 flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-[#0f4c81] dark:text-sky-400" />
              RH / Escola de Governo (Araucária)
            </strong>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#dcfce7] dark:bg-emerald-950/60 text-[#15803d] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {treinamentosDados.horasValidadas || '40h Validadas'}
            </span>
          </div>
          <div className="text-xs text-[#475569] dark:text-slate-300 space-y-1 pt-0.5 leading-relaxed">
            {(treinamentosDados.cursos || []).map((curso, idx) => (
              <div key={idx}>
                • Curso:{' '}
                <em className="text-foreground not-italic font-medium">{curso.nome}</em> ({curso.cargaHoraria})
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopoAvaliacaoServidor;
