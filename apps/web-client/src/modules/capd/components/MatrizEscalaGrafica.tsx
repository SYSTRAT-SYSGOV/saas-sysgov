import React from 'react';
import { Badge } from '@sysgov/ui';
import { BookOpen } from 'lucide-react';
import type { ApiDiarioBordo } from '@sysgov/sdk';

export interface FatorItem {
  id?: number;
  codigo: string;
  nome: string;
  descricao: string;
  criterios?: [string, string, string, string, string] | string[];
}

export const FATORES_CANONICOS: FatorItem[] = [
  {
    codigo: 'F1',
    nome: 'Assiduidade e Pontualidade',
    descricao: 'Cumprimento de horários, assiduidade e permanência no posto de trabalho.',
    criterios: [
      'Frequentes faltas ou atrasos sem justificativa',
      'Ocasionalmente descumpre horários',
      'Pontual e assíduo conforme escala',
      'Pontualidade exemplar e sem ausências',
      'Disponibilidade excepcional e pontualidade plena',
    ],
  },
  {
    codigo: 'F2',
    nome: 'Qualidade e Exatidão',
    descricao: 'Precisão técnica, atenção aos detalhes e ausência de retrabalho.',
    criterios: [
      'Erros sistemáticos que comprometem processos',
      'Erros recorrentes com necessidade de revisão',
      'Executa tarefas com rigor e qualidade padrão',
      'Trabalho minucioso, quase isento de falhas',
      'Padrão de excelência e referência para o setor',
    ],
  },
  {
    codigo: 'F3',
    nome: 'Disciplina e Normas',
    descricao: 'Respeito à hierarquia, regulamentos internos e sigilo documental.',
    criterios: [
      'Desrespeito grave ou reiterado às normas',
      'Necessita de admoestações para seguir rotinas',
      'Atende às normas e instruções superiores',
      'Conduta disciplinar ilibada e proativa',
      'Exemplo de ética e zelador ativo dos procedimentos',
    ],
  },
  {
    codigo: 'F4',
    nome: 'Produtividade e Rendimento',
    descricao: 'Volume de trabalho executado em relação ao tempo disponível.',
    criterios: [
      'Volume manifestamente insuficiente',
      'Rendimento oscilante abaixo do setor',
      'Atinge consistentemente o volume exigido',
      'Produz acima da média sem prejuízo da exatidão',
      'Volume notório e extraordinário com inovação',
    ],
  },
  {
    codigo: 'F5',
    nome: 'Trabalho em Equipe',
    descricao: 'Disposição para cooperar, empatia e facilidade de relacionamento.',
    criterios: [
      'Provoca atritos constantes e recusa cooperação',
      'Dificuldade de integração com os colegas',
      'Bom relacionamento e cooperação adequada',
      'Favorece clima harmônico e apoia ativamente',
      'Líder natural, articulador e integrador do setor',
    ],
  },
  {
    codigo: 'F6',
    nome: 'Iniciativa e Autonomia',
    descricao: 'Capacidade de agir com independência para resolver situações imprevistas.',
    criterios: [
      'Inércia total diante de situações rotineiras',
      'Depende de supervisão para qualquer desvio simples',
      'Resolve questões comuns com bom senso',
      'Propõe soluções eficientes e antecipa gargalos',
      'Autonomia plena com geração de melhorias estruturais',
    ],
  },
  {
    codigo: 'F7',
    nome: 'Zelo pelo Patrimônio',
    descricao: 'Cuidado com equipamentos, materiais de consumo e economia de recursos.',
    criterios: [
      'Descaso manifesto resultando em perdas ou danos',
      'Descuido frequente no manuseio de bens',
      'Utiliza bens públicos com zelo e responsabilidade',
      'Orientador do uso consciente e econômico',
      'Implementa práticas sustentáveis e conservação máxima',
    ],
  },
  {
    codigo: 'F8',
    nome: 'Atendimento ao Cidadão',
    descricao: 'Urbanidade, clareza nas orientações e respeito aos direitos do usuário.',
    criterios: [
      'Grosseria ou recusa imotivada de auxílio',
      'Falta de paciência ou orientações confusas',
      'Atende com presteza, cordialidade e clareza',
      'Elogiado por resolutividade e empatia notável',
      'Humanização excepcional com reconhecimento formal',
    ],
  },
];

export const COLUNAS_GRAU = [
  { valor: 1, rotulo: '1 - Insatisfatório', title: 'Desempenho significativamente abaixo do padrão exigido (Exige justificativa no CIT)' },
  { valor: 2, rotulo: '2 - Regular', title: 'Abaixo do padrão, necessita correções frequentes (Exige justificativa no CIT)' },
  { valor: 3, rotulo: '3 - Bom', title: 'Atende plenamente aos requisitos e padrões do cargo (Sem justificativa)' },
  { valor: 4, rotulo: '4 - Ótimo', title: 'Supera consistentemente o padrão esperado (Sem justificativa)' },
  { valor: 5, rotulo: '5 - Excelente', title: 'Desempenho de excelência com impacto excepcional (Exige justificativa no CIT)' },
];

export interface RespostaItem {
  grau?: number;
  justificativa?: string;
  diario_bordo_id?: number;
  incidente_tipo?: 'positivo' | 'negativo';
}

export interface MatrizEscalaGraficaProps {
  fatores?: FatorItem[];
  respostas?: Record<string, RespostaItem>;
  onSelectGrau?: (fator: FatorItem, grau: number) => void;
  anotacoesPorFator?: Record<string | number, ApiDiarioBordo[]>;
  onVerIncidentes?: (fator: FatorItem) => void;
  onVisualizarIncidente?: (fator: FatorItem, diarioBordoId?: number) => void;
  disabled?: boolean;
}

export const MatrizEscalaGrafica: React.FC<MatrizEscalaGraficaProps> = ({
  fatores = FATORES_CANONICOS,
  respostas = {},
  onSelectGrau,
  anotacoesPorFator = {},
  onVerIncidentes,
  onVisualizarIncidente,
  disabled = false,
}) => {
  // Garante que os fatores exibidos possuam critérios e títulos canônicos
  const listaFatores = fatores.map((f) => {
    const canonico = FATORES_CANONICOS.find((c) => c.codigo === f.codigo);
    return {
      ...f,
      nome: f.nome || canonico?.nome || f.codigo,
      descricao: f.descricao || canonico?.descricao || '',
      criterios: f.criterios || canonico?.criterios || [
        'Desempenho insatisfatório',
        'Desempenho regular',
        'Desempenho bom',
        'Desempenho ótimo',
        'Desempenho de excelência',
      ],
    };
  });

  return (
    <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      {/* Cabeçalho do Card */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#0f4c81] shrink-0"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
          </svg>
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            Matriz de Escala Gráfica — Fatores Obrigatórios (F1 a F8)
          </h3>
        </div>
      </div>

      {/* Tabela de Dupla Entrada da Escala Gráfica */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#0f4c81] text-white border-b border-[#1e3a8a]">
              <th className="w-[30%] sm:w-[32%] text-left px-3.5 py-3 font-semibold text-xs border border-[#1e3a8a]">
                Fatores de Avaliação
              </th>
              {COLUNAS_GRAU.map((col) => (
                <th
                  key={col.valor}
                  title={col.title}
                  className="text-center px-2 py-3 font-semibold text-xs border border-[#1e3a8a] text-white"
                >
                  {col.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {listaFatores.map((fator) => {
              const resposta = respostas[fator.codigo];
              const grauSelecionado = resposta?.grau;
              const justificativa = (resposta?.justificativa || '').trim();
              const temIncidente = !!resposta?.diario_bordo_id;
              const temJustificativa = justificativa.length >= 50;
              const anotacoes: ApiDiarioBordo[] = (
                (anotacoesPorFator[fator.codigo] as ApiDiarioBordo[]) ||
                (fator.id ? (anotacoesPorFator[fator.id] as ApiDiarioBordo[]) : undefined) ||
                (anotacoesPorFator[fator.nome] as ApiDiarioBordo[]) ||
                []
              );

              // Localiza o incidente vinculado no histórico do fator ou do servidor
              const incidenteVinculado = resposta?.diario_bordo_id
                ? anotacoes.find((a) => a.id === resposta.diario_bordo_id) ||
                  Object.values(anotacoesPorFator)
                    .flat()
                    .find((a) => a && a.id === resposta.diario_bordo_id)
                : undefined;

              // Cor do incidente segue a polaridade (negativo = vermelho, positivo = verde)
              const isIncidenteNegativo =
                incidenteVinculado?.tipo === 'negativo' ||
                resposta?.incidente_tipo === 'negativo' ||
                (!incidenteVinculado && !resposta?.incidente_tipo && (grauSelecionado ?? 0) <= 2);

              return (
                <tr key={fator.codigo} className="transition-colors">
                  {/* Célula Descritiva do Fator */}
                  <td className="bg-[#fafbfc] dark:bg-slate-900/40 p-3 border border-slate-200 dark:border-slate-800 align-top">
                    <div>
                      <strong className="text-xs sm:text-sm text-foreground font-bold">
                        {fator.codigo}. {fator.nome}
                      </strong>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {fator.descricao}
                    </div>

                    {/* Tags e Badges de Justificativa / Incidentes */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {temIncidente && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onVisualizarIncidente) {
                              onVisualizarIncidente(fator, resposta?.diario_bordo_id);
                            } else if (onVerIncidentes) {
                              onVerIncidentes(fator);
                            }
                          }}
                          title="Clique para visualizar o incidente registrado no Diário de Bordo (somente leitura)"
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide border cursor-pointer hover:opacity-80 active:scale-95 transition-all ${
                            isIncidenteNegativo
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isIncidenteNegativo
                                ? 'bg-rose-600 dark:bg-rose-400'
                                : 'bg-emerald-600 dark:bg-emerald-400'
                            }`}
                          />
                          INCIDENTE VINCULADO (NOTA {grauSelecionado ?? '—'})
                        </button>
                      )}

                      {!temIncidente && temJustificativa && (grauSelecionado === 1 || grauSelecionado === 2) && (
                        <button
                          type="button"
                          onClick={() => onVisualizarIncidente?.(fator)}
                          title="Clique para visualizar a justificativa salva (somente leitura)"
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide bg-amber-100 text-amber-800 border border-amber-300 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          JUSTIFICATIVA SALVA (NOTA {grauSelecionado})
                        </button>
                      )}

                      {!temIncidente && temJustificativa && grauSelecionado === 5 && (
                        <button
                          type="button"
                          onClick={() => onVisualizarIncidente?.(fator)}
                          title="Clique para visualizar a justificativa salva (somente leitura)"
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          JUSTIFICATIVA SALVA (NOTA 5)
                        </button>
                      )}

                      {anotacoes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onVisualizarIncidente) {
                              onVisualizarIncidente(fator, resposta?.diario_bordo_id || anotacoes[0]?.id);
                            } else if (onVerIncidentes) {
                              onVerIncidentes(fator);
                            }
                          }}
                          title="Clique para visualizar os incidentes no Diário de Bordo (somente leitura)"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-card hover:bg-muted text-[10px] font-mono text-muted-foreground transition-colors cursor-pointer"
                        >
                          <BookOpen className="h-3 w-3 text-primary" />
                          <span>{anotacoes.length} no Diário</span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Colunas dos Graus 1 a 5 */}
                  {COLUNAS_GRAU.map((col) => {
                    const grau = col.valor;
                    const isSelected = grauSelecionado === grau;
                    const criterioTexto = fator.criterios?.[grau - 1] || '';

                    // Cores específicas por grau selecionado
                    let cellBg = 'hover:bg-[#f0f9ff] dark:hover:bg-slate-800/60';
                    let pillStyle = 'border-2 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800';

                    if (isSelected) {
                      if (grau === 1 || grau === 2) {
                        cellBg = 'bg-[#fef2f2] dark:bg-red-950/40 border-[#ef4444]';
                        pillStyle = 'bg-[#dc2626] border-2 border-[#dc2626] text-white shadow-xs';
                      } else if (grau === 5) {
                        cellBg = 'bg-[#ecfdf5] dark:bg-emerald-950/40 border-[#10b981]';
                        pillStyle = 'bg-[#059669] border-2 border-[#059669] text-white shadow-xs';
                      } else {
                        cellBg = 'bg-[#e0f2fe] dark:bg-sky-950/40 border-[#0284c7]';
                        pillStyle = 'bg-[#0f4c81] border-2 border-[#0f4c81] text-white shadow-xs';
                      }
                    }

                    return (
                      <td
                        key={grau}
                        onClick={() => {
                          if (!disabled && onSelectGrau) {
                            onSelectGrau(fator, grau);
                          }
                        }}
                        className={`p-2 sm:p-2.5 border border-slate-200 dark:border-slate-800 align-middle text-center transition-colors ${cellBg} ${
                          disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center gap-1 min-h-[72px]">
                          {/* Pílula circular com número do grau */}
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono font-bold transition-transform ${pillStyle} ${
                              !disabled && 'group-hover:scale-105'
                            }`}
                          >
                            {grau}
                          </span>

                          {/* Critério comportamental do grau */}
                          <span
                            className={`text-[11px] leading-tight text-center max-w-[135px] mt-0.5 transition-colors ${
                              isSelected
                                ? 'font-medium text-foreground'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {criterioTexto}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MatrizEscalaGrafica;
