import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  ArrowRight,
  ShieldCheck,
  Building2,
  DollarSign,
  FileCheck2,
  Lock
} from 'lucide-react';
import { Button, StatusChip, Card, Badge } from '@/components/ui';
import { LicitacaoProcesso, TipoArtefato } from '../types';

interface FaseInternaTabProps {
  licitacao: LicitacaoProcesso;
  onApproveArtifact?: (tipo: TipoArtefato) => void;
  onRejectArtifact?: (tipo: TipoArtefato) => void;
  onSelectTab?: (tabKey: string) => void;
}

export const FaseInternaTab: React.FC<FaseInternaTabProps> = ({
  licitacao,
  onApproveArtifact,
  onRejectArtifact,
  onSelectTab,
}) => {
  const getArtifactStatus = (tipo: TipoArtefato) => {
    const art = licitacao.artefatos?.find(a => a.tipo === tipo);
    return art ? art.status : 'rascunho';
  };

  const steps = [
    {
      id: 'dfd',
      title: '1. DFD (Formalização da Demanda)',
      description: 'Justificativa da necessidade, alinhamento ao PCA e estimativa preliminar.',
      icon: <Building2 className="w-5 h-5 text-indigo-400" />,
      tipo: 'dfd' as TipoArtefato,
      status: getArtifactStatus('dfd'),
      locked: false,
      tabLink: 'visao_geral',
    },
    {
      id: 'etp',
      title: '2. ETP (Estudo Técnico Preliminar)',
      description: 'Levantamento de mercado, comparativo de soluções e viabilidade técnica.',
      icon: <FileText className="w-5 h-5 text-sky-400" />,
      tipo: 'etp' as TipoArtefato,
      status: getArtifactStatus('etp'),
      locked: getArtifactStatus('dfd') !== 'aprovado',
      lockReason: 'RN-002: Exige DFD aprovado.',
      tabLink: 'etp',
    },
    {
      id: 'matriz_riscos',
      title: '3. Matriz e Mapa de Riscos',
      description: 'Identificação de riscos (Probabilidade x Impacto) e alocação de responsabilidades.',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      tipo: 'matriz_riscos' as TipoArtefato,
      status: getArtifactStatus('matriz_riscos'),
      locked: getArtifactStatus('etp') !== 'aprovado',
      lockReason: 'Requer ETP aprovado.',
      tabLink: 'riscos',
    },
    {
      id: 'pesquisa_mercado',
      title: '4. Mapa de Preços & Cotações',
      description: 'Mínimo 3 fontes válidas e expurgo estatístico de outliers > 25% da média.',
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      tipo: 'pesquisa_mercado' as TipoArtefato,
      status: (licitacao.precos && licitacao.precos.filter(p => p.status === 'valida').length >= 3) ? 'aprovado' : 'em_analise',
      locked: getArtifactStatus('etp') !== 'aprovado',
      lockReason: 'Requer ETP elaborado.',
      tabLink: 'precos',
    },
    {
      id: 'tr',
      title: '5. Termo de Referência (TR)',
      description: 'Especificação do objeto, modelo de execução, critérios de medição e pagamento.',
      icon: <FileCheck2 className="w-5 h-5 text-cyan-400" />,
      tipo: 'tr' as TipoArtefato,
      status: getArtifactStatus('tr'),
      locked: (licitacao.precos?.filter(p => p.status === 'valida').length ?? 0) < 3,
      lockReason: 'RN-002: Exige Mapa de Preços homologado com mín. 3 fontes válidas.',
      tabLink: 'tr',
    },
    {
      id: 'parecer',
      title: '6. Parecer Jurídico & Controle',
      description: 'Análise de legalidade formal conforme Art. 53 da Lei nº 14.133/2021.',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      tipo: 'parecer' as TipoArtefato,
      status: getArtifactStatus('parecer'),
      locked: getArtifactStatus('tr') !== 'aprovado',
      lockReason: 'Exige Termo de Referência aprovado.',
      tabLink: 'pareceres',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header com Banner de Conformidade Legal */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-700/50 rounded-lg text-emerald-400 mt-0.5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Esteira de Governança e Fase Preparatória
                <Badge variant="primary">Lei 14.133/2021</Badge>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Validação sequencial de artefatos com bloqueios rígidos (RN-002) e segregação de funções (RN-005).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-slate-400 font-mono tracking-wider">
              Status Geral:
            </span>
            <StatusChip
              label={licitacao.status.replace('_', ' ').toUpperCase()}
              variant={licitacao.status === 'publicada' ? 'info' : licitacao.status === 'homologada' ? 'success' : 'neutral'}
            />
          </div>
        </div>
      </div>

      {/* Grid de Etapas Sequenciais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((step, index) => {
          const isDone = step.status === 'aprovado';
          const isPending = step.status === 'em_analise';
          const isLocked = step.locked;

          return (
            <Card
              key={step.id}
              className={`relative overflow-hidden transition duration-200 !p-5 ${
                isLocked 
                  ? 'opacity-60 bg-slate-950/40 border-slate-800/60' 
                  : isDone 
                    ? 'border-emerald-700/40 bg-slate-900/90' 
                    : 'border-slate-800 bg-slate-900'
              }`}
            >
              {/* Header do Card */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/60">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      {step.title}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      Etapa 0{index + 1}
                    </span>
                  </div>
                </div>

                {isLocked ? (
                  <div className="p-1 rounded bg-slate-800 text-slate-500" title={step.lockReason}>
                    <Lock className="w-4 h-4" />
                  </div>
                ) : isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : isPending ? (
                  <Clock className="w-5 h-5 text-amber-400" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                )}
              </div>

              <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                {step.description}
              </p>

              {/* Status do Artefato */}
              {isLocked ? (
                <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-300 font-medium mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>{step.lockReason}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between py-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 font-medium">Situação:</span>
                  <StatusChip
                    label={isDone ? 'APROVADO' : isPending ? 'EM ANÁLISE' : 'RASCUNHO'}
                    variant={isDone ? 'success' : isPending ? 'warning' : 'neutral'}
                  />
                </div>
              )}

              {/* Ações */}
              {!isLocked && (
                <div className="flex items-center gap-2 mt-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-xs"
                    onClick={() => onSelectTab?.(step.tabLink)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Abrir Artefato
                  </Button>

                  {!isDone && onApproveArtifact && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs whitespace-nowrap !bg-emerald-600 hover:!bg-emerald-500"
                      onClick={() => onApproveArtifact(step.tipo)}
                    >
                      Aprovar
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
