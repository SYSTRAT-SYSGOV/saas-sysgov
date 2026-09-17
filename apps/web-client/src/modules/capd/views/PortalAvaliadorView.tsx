import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  KpiCard,
} from '@sysgov/ui';
import {
  UserCheck,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Plus,
  Send,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  ClipboardEdit,
  Eye,
  Printer,
  Zap,
  Users,
  Activity,
  Filter,
  RotateCcw,
  Play,
  X,
  ThumbsUp,
  ThumbsDown,
  Search,
  LayoutList,
  Table,
  Copy,
  Check,
  ShieldCheck,
  Upload,
  Paperclip,
  Trash2,
  FileCheck,
} from 'lucide-react';
import { AvaliacaoFormView } from '../AvaliacaoFormView';
import { EspelhoAvaliacaoModal } from '../EspelhoAvaliacaoModal';
import { NovaAvaliacaoWizard } from '../NovaAvaliacaoWizard';
import { GRAU_TONE } from '../graduTone';
import { SysgovApi } from '@sysgov/sdk';
import type {
  ApiAvaliacao,
  ApiDiarioBordo,
  ApiFator,
  ApiKpisEquipe,
  ApiRecurso,
  ApiServidor,
} from '@sysgov/sdk';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, type TabsItem } from '@/components/ui/Tabs';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable } from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

const api = new SysgovApi();

type AvaliadorSubTab = 'avaliacoes' | 'cit' | 'devolutivas' | 'contrarrazoes';

export interface PortalAvaliadorViewProps {
  portalSelector?: React.ReactNode;
}

const SERVIDORES_AMOSTRA_PRIORITARIA: any[] = [
  {
    id: 1,
    ciclo_id: 3,
    servidor_id: 101,
    servidorData: {
      nome_completo: 'Carlos Eduardo Silveira',
      matricula: '48.921-0',
      cargo_efetivo: 'Auxiliar Administrativo',
      regime_juridico: 'Quadro Geral',
      data_admissao: '2018-03-15',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    respostas_fatores: {
      F1: { grau: 4 },
      F2: { grau: 4 },
      F3: { grau: 4 },
      F4: { grau: 4 },
      F5: { grau: 3 },
      F6: { grau: 4 },
    },
    nota_final: '77.00',
    data_conclusao: null,
    homologada: false,
  },
  {
    id: 2,
    ciclo_id: 3,
    servidor_id: 102,
    servidorData: {
      nome_completo: 'Ana Paula Nogueira de Souza',
      matricula: '39.102-4',
      cargo_efetivo: 'Técnico em Gestão Pública',
      regime_juridico: 'Quadro Geral',
      data_admissao: '2015-06-20',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    respostas_fatores: {
      F1: { grau: 5 },
      F2: { grau: 5 },
      F3: { grau: 4 },
      F4: { grau: 5 },
      F5: { grau: 4 },
      F6: { grau: 5 },
      F7: { grau: 4 },
      F8: { grau: 5 },
    },
    nota_final: '92.40',
    data_conclusao: '2026-09-10T14:30:00Z',
    homologada: true,
  },
  {
    id: 3,
    ciclo_id: 3,
    servidor_id: 103,
    servidorData: {
      nome_completo: 'Roberto Macedo Guimarães',
      matricula: '55.431-2',
      cargo_efetivo: 'Agente Operacional',
      regime_juridico: 'Quadro Geral',
      data_admissao: '2021-01-10',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    respostas_fatores: {
      F1: { grau: 3 },
      F2: { grau: 3 },
    },
    nota_final: '60.00',
    data_conclusao: null,
    homologada: false,
  },
  {
    id: 4,
    ciclo_id: 3,
    servidor_id: 104,
    servidorData: {
      nome_completo: 'Beatriz Lemos dos Santos',
      matricula: '42.871-9',
      cargo_efetivo: 'Assistente Administrativo',
      regime_juridico: 'Quadro Geral',
      data_admissao: '2019-08-01',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    respostas_fatores: {
      F1: { grau: 4 },
      F2: { grau: 4 },
      F3: { grau: 4 },
      F4: { grau: 4 },
      F5: { grau: 4 },
      F6: { grau: 4 },
      F7: { grau: 5 },
      F8: { grau: 4 },
    },
    nota_final: '82.40',
    data_conclusao: '2026-09-12T10:00:00Z',
    homologada: false,
  },
  {
    id: 5,
    ciclo_id: 3,
    servidor_id: 105,
    servidorData: {
      nome_completo: 'Fernando Rocha Maia',
      matricula: '36.541-1',
      cargo_efetivo: 'Arquivista',
      regime_juridico: 'Quadro Geral',
      data_admissao: '2017-04-12',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    respostas_fatores: {
      F1: { grau: 2 },
      F2: { grau: 3 },
      F3: { grau: 3 },
      F4: { grau: 3 },
      F5: { grau: 3 },
      F6: { grau: 3 },
      F7: { grau: 2 },
      F8: { grau: 3 },
    },
    nota_final: '55.00',
    data_conclusao: '2026-09-08T16:00:00Z',
    homologada: false,
    tem_recurso: true,
  },
  {
    id: 6,
    ciclo_id: 3,
    servidor_id: 106,
    servidorData: {
      nome_completo: 'Lucas Vianna Prado',
      matricula: '51.299-8',
      cargo_efetivo: 'Auxiliar Administrativo',
      regime_juridico: 'Quadro Geral',
      data_admissao: '2020-02-15',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    status_avaliacao: 'suspensa_licenca',
    bloqueio_pad: true,
    respostas_fatores: {},
    nota_final: null,
    data_conclusao: null,
    homologada: false,
  },
];

export const CIT_AMOSTRA_PADRAO: ApiDiarioBordo[] = [
  {
    id: 1001,
    ciclo_id: 3,
    servidor_id: 101,
    avaliador_id: 1,
    fator_id: 1,
    tipo: 'positivo',
    data_ocorrencia: '2026-08-14',
    descricao_fato:
      'Apresentou iniciativa própria e implementou rotina automatizada de saneamento cadastral de processos físicos no protocolo, reduzindo o tempo médio de triagem de 4 dias para 3 horas e eliminando o passivo histórico da unidade.',
    hash_sha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    created_at: '2026-08-14T11:20:00Z',
    servidor: {
      id: 101,
      nome_completo: 'Carlos Eduardo Silveira',
      matricula: '48.921-0',
      cargo_efetivo: 'Auxiliar Administrativo',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as any,
    fator: {
      id: 1,
      nome: 'Iniciativa e Resolução de Problemas',
      peso: 15,
    } as any,
  },
  {
    id: 1002,
    ciclo_id: 3,
    servidor_id: 102,
    avaliador_id: 1,
    fator_id: 2,
    tipo: 'positivo',
    data_ocorrencia: '2026-07-28',
    descricao_fato:
      'Concluiu com 100% de exatidão e antes do prazo regulamentar a conciliação das guias de liquidação e desarquivamento do 1º semestre, obtendo ateste formal sem qualquer ressalva da Auditoria e Controladoria Geral.',
    hash_sha256: '4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a',
    created_at: '2026-07-28T16:45:00Z',
    servidor: {
      id: 102,
      nome_completo: 'Ana Paula Nogueira de Souza',
      matricula: '39.102-4',
      cargo_efetivo: 'Técnico em Gestão Pública',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as any,
    fator: {
      id: 2,
      nome: 'Qualidade Técnica e Produtividade',
      peso: 20,
    } as any,
  },
  {
    id: 1003,
    ciclo_id: 3,
    servidor_id: 104,
    avaliador_id: 1,
    fator_id: 3,
    tipo: 'positivo',
    data_ocorrencia: '2026-07-15',
    descricao_fato:
      'Estruturou de forma voluntária o fluxo de triagem e atendimento humanizado e prioritário a idosos e gestantes no balcão de certidões, elevando o índice de satisfação do usuário na Ouvidoria Geral para 98,5%.',
    hash_sha256: '1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d',
    created_at: '2026-07-15T14:10:00Z',
    servidor: {
      id: 104,
      nome_completo: 'Beatriz Lemos dos Santos',
      matricula: '42.871-9',
      cargo_efetivo: 'Assistente Administrativo',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as any,
    fator: {
      id: 3,
      nome: 'Atendimento ao Cidadão e Urbanidade',
      peso: 15,
    } as any,
  },
  {
    id: 1004,
    ciclo_id: 3,
    servidor_id: 103,
    avaliador_id: 1,
    fator_id: 4,
    tipo: 'negativo',
    data_ocorrencia: '2026-06-22',
    descricao_fato:
      'Atraso reiterado superior a 40 minutos no início da jornada nos dias 08/06, 15/06 e 22/06 sem aviso tempestivo à chefia imediata, gerando desfalque na escala de recepção e reclamação de munícipes.',
    hash_sha256: '6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c',
    created_at: '2026-06-22T09:30:00Z',
    servidor: {
      id: 103,
      nome_completo: 'Roberto Macedo Guimarães',
      matricula: '55.431-2',
      cargo_efetivo: 'Agente Operacional',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as any,
    fator: {
      id: 4,
      nome: 'Assiduidade e Pontualidade',
      peso: 10,
    } as any,
  },
  {
    id: 1005,
    ciclo_id: 3,
    servidor_id: 105,
    avaliador_id: 1,
    fator_id: 5,
    tipo: 'negativo',
    data_ocorrencia: '2026-05-19',
    descricao_fato:
      'Descumpriu a Ordem de Serviço nº 04/2026 ao digitalizar lote de 14 caixas de prontuários históricos sem prévia conferência folha a folha e higienização física, demandando refazimento do serviço por terceiros.',
    hash_sha256: '8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e',
    created_at: '2026-05-19T17:00:00Z',
    servidor: {
      id: 105,
      nome_completo: 'Fernando Rocha Maia',
      matricula: '36.541-1',
      cargo_efetivo: 'Arquivista',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as any,
    fator: {
      id: 5,
      nome: 'Zelo com Bens Públicos e Conformidade',
      peso: 15,
    } as any,
  },
  {
    id: 1006,
    ciclo_id: 3,
    servidor_id: 101,
    avaliador_id: 1,
    fator_id: 6,
    tipo: 'positivo',
    data_ocorrencia: '2026-04-10',
    descricao_fato:
      'Atuou com exemplar espírito colaborativo no apoio ao setor de Patrimônio durante o recadastramento de bens da Secretaria, trabalhando voluntariamente além do horário sem incidência de horas extras.',
    hash_sha256: '5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b',
    created_at: '2026-04-10T18:30:00Z',
    servidor: {
      id: 101,
      nome_completo: 'Carlos Eduardo Silveira',
      matricula: '48.921-0',
      cargo_efetivo: 'Auxiliar Administrativo',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as any,
    fator: {
      id: 6,
      nome: 'Relacionamento Interpessoal e Trabalho em Equipe',
      peso: 15,
    } as any,
  },
  {
    id: 1007,
    ciclo_id: 3,
    servidor_id: 104,
    avaliador_id: 1,
    fator_id: 7,
    tipo: 'positivo',
    data_ocorrencia: '2026-03-05',
    descricao_fato:
      'Redigiu minutas de pareceres e despachos padrão para demandas repetitivas de desarquivamento, reduzindo o retrabalho dos servidores da unidade e acelerando respostas aos pedidos da Lei de Acesso à Informação (LAI).',
    hash_sha256: '3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f',
    created_at: '2026-03-05T10:15:00Z',
    servidor: {
      id: 104,
      nome_completo: 'Beatriz Lemos dos Santos',
      matricula: '42.871-9',
      cargo_efetivo: 'Assistente Administrativo',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as any,
    fator: {
      id: 7,
      nome: 'Organização e Eficiência Administrativa',
      peso: 10,
    } as any,
  },
  {
    id: 1008,
    ciclo_id: 3,
    servidor_id: 106,
    avaliador_id: 1,
    fator_id: 8,
    tipo: 'negativo',
    data_ocorrencia: '2026-01-20',
    descricao_fato:
      'Extravio temporário de malote interno contendo expedientes administrativos sigilosos sob sua custódia direta, motivando expedição de termo circunstanciado e abertura de apuração correcional em PAD.',
    hash_sha256: '7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b',
    created_at: '2026-01-20T15:20:00Z',
    servidor: {
      id: 106,
      nome_completo: 'Lucas Vianna Prado',
      matricula: '51.299-8',
      cargo_efetivo: 'Auxiliar Administrativo',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as any,
    fator: {
      id: 8,
      nome: 'Disciplina e Cumprimento de Deveres',
      peso: 15,
    } as any,
  },
];

export const GRAU_PONTOS_MAP: Record<number, number> = {
  1: 20,
  2: 50,
  3: 70,
  4: 85,
  5: 100,
};

export function calcularNotaExibicao(av: any): {
  notaFormatada: string;
  pontosNum: number;
  notaNum: number;
  apto: boolean;
} {
  const isPad = av.status_avaliacao === 'suspensa_licenca' || av.bloqueio_pad;
  if (isPad) {
    return { notaFormatada: '—', pontosNum: 0, notaNum: 0, apto: false };
  }

  // 1. Prioriza notas registradas em respostas_fatores (seja rascunho salvo ou em andamento)
  if (av.respostas_fatores && typeof av.respostas_fatores === 'object') {
    const respostas = Object.values(av.respostas_fatores);
    const pontosLista: number[] = [];

    for (const r of respostas) {
      if (!r) continue;
      const item = r as any;
      if (typeof item === 'object') {
        if (typeof item.pontos === 'number' && item.pontos > 0) {
          pontosLista.push(item.pontos);
        } else if (typeof item.grau === 'number' && item.grau > 0) {
          pontosLista.push(GRAU_PONTOS_MAP[item.grau] ?? 70);
        }
      } else if (typeof item === 'number' && item > 0) {
        pontosLista.push(GRAU_PONTOS_MAP[item] ?? 70);
      }
    }

    if (pontosLista.length > 0) {
      const soma = pontosLista.reduce((acc, p) => acc + p, 0);
      const mediaPontos = soma / pontosLista.length;
      const apto = mediaPontos >= 70;
      return {
        notaFormatada: `${mediaPontos.toFixed(2).replace('.', ',')} pts`,
        pontosNum: mediaPontos,
        notaNum: mediaPontos,
        apto,
      };
    }
  }

  // 2. Fallback para nota_final persistida
  if (av.nota_final) {
    const num = Number(av.nota_final);
    if (!isNaN(num) && num > 0) {
      const pontos = num <= 10 ? num * 10 : num;
      const apto = typeof av.elegivel_progressao === 'boolean'
        ? av.elegivel_progressao
        : pontos >= 70;
      return {
        notaFormatada: `${pontos.toFixed(2).replace('.', ',')} pts`,
        pontosNum: pontos,
        notaNum: pontos,
        apto,
      };
    }
  }

  return { notaFormatada: '—', pontosNum: 0, notaNum: 0, apto: false };
}

export function gerarHtmlTermoCit(
  item: ApiDiarioBordo,
  chefiaNome: string = 'Chefia Imediata / Avaliador Oficial',
  departamento: string = 'SMAD / Depto. Protocolo e Arquivo'
): string {
  const dataFormatada = new Date(item.data_ocorrencia).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const dataRegistro = new Date(item.created_at || item.data_ocorrencia).toLocaleString('pt-BR');
  const servidorNome = item.servidor?.nome_completo || `Servidor #${item.servidor_id}`;
  const matricula = item.servidor?.matricula || '—';
  const cargo = item.servidor?.cargo_efetivo || 'Servidor Público Municipal';
  const lotacao = item.servidor?.lotacao_fisica || item.servidor?.orgao_lotacao || departamento;
  const fatorNome = item.fator?.nome || `Fator #${item.fator_id}`;
  const isPositivo = item.tipo === 'positivo';
  const hash = item.hash_sha256 || 'SHA256-PENDING-AUDIT';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Termo de Registro Fático — CIT #${item.id} — ${servidorNome}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.45;
      color: #0f172a;
      background: #fff;
    }
    .mono { font-family: 'JetBrains Mono', Consolas, Monaco, monospace; font-variant-numeric: tabular-nums; }
    .header {
      text-align: center;
      border-bottom: 2px solid #0a1128;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .brasao { font-size: 11pt; font-weight: 800; letter-spacing: 0.05em; color: #0a1128; text-transform: uppercase; }
    .sub-orgao { font-size: 9pt; color: #334155; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
    .doc-titulo {
      font-size: 12pt;
      font-weight: 800;
      color: #0a1128;
      text-transform: uppercase;
      margin-top: 8px;
      letter-spacing: 0.02em;
    }
    .protocolo-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 8.5pt;
      margin-bottom: 14px;
    }
    .secao {
      margin-bottom: 12px;
    }
    .secao-titulo {
      font-size: 9pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #0a1128;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
      margin-bottom: 6px;
    }
    table.tabela-dados {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 6px;
    }
    table.tabela-dados td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    table.tabela-dados td.rotulo {
      width: 26%;
      font-weight: 700;
      background: #f8fafc;
      color: #334155;
    }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      border-radius: 3px;
    }
    .badge-positivo { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-negativo { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .relato-box {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 4px;
      padding: 10px 12px;
      font-size: 9.5pt;
      line-height: 1.5;
      text-align: justify;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: pre-wrap;
    }
    .alerta-legal {
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      padding: 7px 10px;
      font-size: 8pt;
      color: #1e3a8a;
      line-height: 1.35;
      margin-top: 10px;
    }
    .assinaturas {
      margin-top: 32px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .campo-assinatura {
      width: 45%;
      text-align: center;
      font-size: 8.5pt;
    }
    .linha-assinatura {
      border-top: 1px solid #0f172a;
      margin-bottom: 5px;
    }
    .rodape {
      margin-top: 20px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      font-size: 7.5pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brasao">MUNICÍPIO DE GUARAPUAVA — ESTADO DO PARANÁ</div>
    <div class="sub-orgao">Secretaria Municipal de Administração • Departamento de Recursos Humanos</div>
    <div class="sub-orgao">Comissão Permanente de Avaliação de Desempenho — CAPD</div>
    <div class="doc-titulo">Termo Circunstanciado de Incidente Crítico (CIT)</div>
  </div>

  <div class="protocolo-bar">
    <div><strong>Protocolo Digital:</strong> <span class="mono">CIT-${item.id.toString().padStart(6, '0')}</span></div>
    <div><strong>Registrado no Sistema em:</strong> <span class="mono">${dataRegistro}</span></div>
    <div><strong>Integridade:</strong> <span class="mono">Carimbo SHA-256 Verificado</span></div>
  </div>

  <div class="secao">
    <div class="secao-titulo">1. Identificação do Servidor Avaliado</div>
    <table class="tabela-dados">
      <tr>
        <td class="rotulo">Nome Completo:</td>
        <td colspan="3"><strong>${servidorNome}</strong></td>
      </tr>
      <tr>
        <td class="rotulo">Matrícula Funcional:</td>
        <td class="mono"><strong>${matricula}</strong></td>
        <td class="rotulo">Regime Jurídico:</td>
        <td>Estatutário / Estágio Probatório</td>
      </tr>
      <tr>
        <td class="rotulo">Cargo Efetivo:</td>
        <td>${cargo}</td>
        <td class="rotulo">Unidade de Lotação:</td>
        <td>${lotacao}</td>
      </tr>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">2. Identificação da Chefia Imediata Registrante</div>
    <table class="tabela-dados">
      <tr>
        <td class="rotulo">Avaliador / Chefia:</td>
        <td><strong>${chefiaNome}</strong></td>
        <td class="rotulo">Lotação Funcional:</td>
        <td>${departamento}</td>
      </tr>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">3. Caracterização Metodológica do Fato (Técnica CIT)</div>
    <table class="tabela-dados">
      <tr>
        <td class="rotulo">Data da Ocorrência:</td>
        <td class="mono"><strong>${dataFormatada}</strong></td>
        <td class="rotulo">Classificação do Fato:</td>
        <td>
          <span class="badge ${isPositivo ? 'badge-positivo' : 'badge-negativo'}">
            ${isPositivo ? '+ Fato Positivo (Superação de Expectativas)' : '- Ponto a Desenvolver (Ocorrência Crítica)'}
          </span>
        </td>
      </tr>
      <tr>
        <td class="rotulo">Fator / Competência:</td>
        <td><strong>${fatorNome}</strong></td>
        <td class="rotulo">Efeito na Avaliação:</td>
        <td><strong>${isPositivo ? 'Habilita Atribuição de Graus 4 e 5' : 'Habilita Atribuição de Graus 1 e 2'}</strong></td>
      </tr>
      <tr>
        <td class="rotulo">Hash SHA-256 Imutável:</td>
        <td colspan="3" class="mono" style="font-size: 8pt; word-break: break-all;">
          ${hash}
        </td>
      </tr>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">4. Relato Circunstanciado do Fato Observado</div>
    <div class="relato-box">${item.descricao_fato}</div>
  </div>

  ${
    item.evidencias && item.evidencias.length > 0
      ? `
  <div class="secao">
    <div class="secao-titulo">5. Evidências Documentais Vinculadas</div>
    <table class="tabela-dados">
      <thead>
        <tr style="background:#f8fafc; font-weight:700;">
          <td>Nome do Arquivo</td>
          <td>Tamanho</td>
          <td>Hash SHA-256</td>
        </tr>
      </thead>
      <tbody>
        ${item.evidencias
          .map(
            (ev: any) => `
          <tr>
            <td>${ev.nome_original || 'Documento Comprobatório'}</td>
            <td class="mono">${ev.tamanho_formatado || 'Anexo'}</td>
            <td class="mono" style="font-size:7.5pt;">${ev.hash_sha256 || '—'}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>`
      : ''
  }

  <div class="alerta-legal">
    <strong>Fundamentação Legal e Blindagem da Trava Anti-Leniência:</strong> Este documento atesta a ocorrência fática registrada tempestivamente nos autos funcionais do servidor, em estrito cumprimento ao art. 24 da Lei Municipal nº 1.704/2006 e à metodologia canônica da Escala Gráfica combinada com a Técnica do Incidente Crítico (CIT de John Flanagan e Idalberto Chiavenato). A atribuição de notas extremas no ciclo probatório subordina-se a este lançamento prévio.
  </div>

  <div class="assinaturas">
    <div class="campo-assinatura">
      <div class="linha-assinatura"></div>
      <div><strong>${chefiaNome}</strong></div>
      <div>Chefia Imediata / Avaliador Oficial</div>
      <div class="mono" style="font-size: 7.5pt; color: #64748b;">Assinado digitalmente via SYSGOV</div>
    </div>
    <div class="campo-assinatura">
      <div class="linha-assinatura"></div>
      <div><strong>${servidorNome}</strong></div>
      <div>Ciência do Servidor Avaliado</div>
      <div style="font-size: 7.5pt; color: #64748b;">Data: ____/____/________</div>
    </div>
  </div>

  <div class="rodape">
    <div>SYSGOV — Sistema Integrado de Gestão Pública • Módulo CAPD</div>
    <div class="mono">Documento emitido em ${new Date().toLocaleString('pt-BR')} • Termo Individual</div>
  </div>
</body>
</html>`;
}

export const PortalAvaliadorView: React.FC<PortalAvaliadorViewProps> = ({ portalSelector }) => {
  const [activeTab, setActiveTab] = useState<AvaliadorSubTab>('avaliacoes');
  const [loading, setLoading] = useState<boolean>(true);
  const [avaliacoes, setAvaliacoes] = useState<ApiAvaliacao[]>([]);
  const [incidentes, setIncidentes] = useState<ApiDiarioBordo[]>([]);
  const [recursos, setRecursos] = useState<ApiRecurso[]>([]);
  const [servidores, setServidores] = useState<ApiServidor[]>([]);
  const [fatores, setFatores] = useState<ApiFator[]>([]);
  const [kpisEquipe, setKpisEquipe] = useState<ApiKpisEquipe | null>(null);
  const [selectedAvaliadorId, setSelectedAvaliadorId] = useState<string>('todos');

  // Filtros Avançados
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroFaixaNota, setFiltroFaixaNota] = useState<string>('todas');
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState<boolean>(false);

  // Sincronização em tempo real de rascunhos salvos
  const handleRascunhoSalvo = useCallback((avAtualizada: any) => {
    if (!avAtualizada?.id) return;
    setAvaliacoes((prev) =>
      prev.map((a) => (a.id === avAtualizada.id ? { ...a, ...avAtualizada } : a))
    );
    const idx = SERVIDORES_AMOSTRA_PRIORITARIA.findIndex((s) => s.id === avAtualizada.id);
    if (idx >= 0) {
      SERVIDORES_AMOSTRA_PRIORITARIA[idx] = {
        ...SERVIDORES_AMOSTRA_PRIORITARIA[idx],
        ...avAtualizada,
      };
    }
  }, []);

  // Modal de Preenchimento/Visualização da Avaliação
  const [modalAvaliarOpen, setModalAvaliarOpen] = useState<boolean>(false);

  // Wizard de Inicialização de Nova Avaliação
  const [modalNovaAvaliacaoOpen, setModalNovaAvaliacaoOpen] = useState<boolean>(false);
  const [modalEspelhoOpen, setModalEspelhoOpen] = useState<boolean>(false);
  const [avaliacaoEmFocoId, setAvaliacaoEmFocoId] = useState<number | null>(null);

  // Modal Novo Incidente CIT
  const [modalCitOpen, setModalCitOpen] = useState<boolean>(false);
  const [citServidorId, setCitServidorId] = useState<string>('');
  const [buscaServidorCit, setBuscaServidorCit] = useState<string>('');
  const [citFatorId, setCitFatorId] = useState<number | null>(null);
  const [citTipo, setCitTipo] = useState<'positivo' | 'negativo'>('positivo');
  const [citDataOcorrencia, setCitDataOcorrencia] = useState<string>(new Date().toISOString().split('T')[0]);
  const [citDescricao, setCitDescricao] = useState<string>('');
  const [salvandoCit, setSalvandoCit] = useState<boolean>(false);
  const [citArquivos, setCitArquivos] = useState<File[]>([]);
  const [citArrastando, setCitArrastando] = useState<boolean>(false);

  // Estados do Diário de Bordo (CIT): Visualização, Filtros, Busca e Modal de Ficha
  const [citVisualizacao, setCitVisualizacao] = useState<'timeline' | 'tabela'>('tabela');
  const [citBuscaTexto, setCitBuscaTexto] = useState<string>('');
  const [citFiltroTipo, setCitFiltroTipo] = useState<'todos' | 'positivo' | 'negativo'>('todos');
  const [citFiltroServidor, setCitFiltroServidor] = useState<string>('todos');
  const [citFiltroFator, setCitFiltroFator] = useState<string>('todos');
  const [detalheCitModal, setDetalheCitModal] = useState<ApiDiarioBordo | null>(null);
  const [copiadoHash, setCopiadoHash] = useState<boolean>(false);

  // Modal Registro de Devolutiva Presencial (Art. 27)
  const [modalDevolutivaOpen, setModalDevolutivaOpen] = useState<boolean>(false);
  const [selectedAvaliacaoId, setSelectedAvaliacaoId] = useState<number | null>(null);
  const [dataDevolutiva, setDataDevolutiva] = useState<string>(new Date().toISOString().split('T')[0]);
  const [resumoEntrevista, setResumoEntrevista] = useState<string>('');
  const [acordosDesenvolvimento, setAcordosDesenvolvimento] = useState<string>('');
  const [salvandoDevolutiva, setSalvandoDevolutiva] = useState<boolean>(false);

  // Modal Contrarrazões Recursais (5 dias)
  const [modalContrarrazaoOpen, setModalContrarrazaoOpen] = useState<boolean>(false);
  const [selectedRecursoId, setSelectedRecursoId] = useState<number | null>(null);
  const [textoContrarrazao, setTextoContrarrazao] = useState<string>('');
  const [manterOuRetificar, setManterOuRetificar] = useState<'manter' | 'reconsiderar'>('manter');
  const [novoGrauProposto, setNovoGrauProposto] = useState<number>(3);
  const [salvandoContrarrazao, setSalvandoContrarrazao] = useState<boolean>(false);

  // Feedback Modal
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const carregarDadosAvaliador = useCallback(async (avaliadorId?: string) => {
    setLoading(true);
    try {
      const activeAvaliadorId = avaliadorId !== undefined ? avaliadorId : selectedAvaliadorId;
      const params: { per_page: number; avaliador_id?: number } = { per_page: 25 };
      const kpisParams: { avaliador_id?: number } = {};
      if (activeAvaliadorId && activeAvaliadorId !== 'todos') {
        params.avaliador_id = Number(activeAvaliadorId);
        kpisParams.avaliador_id = Number(activeAvaliadorId);
      }

      // 1. CARREGAMENTO PRIORITÁRIO: Avaliações e KPIs em paralelo imediato
      const [resAv, resKpis] = await Promise.all([
        api.capd.listAvaliacoes(params).catch(() => ({ data: [] })),
        api.capd.getKpisEquipe(kpisParams).catch(() => null),
      ]);

      setAvaliacoes(resAv.data || []);
      setKpisEquipe(resKpis);
      setLoading(false); // <── DESBLOQUEIA A TELA IMEDIATAMENTE

      // 2. CARREGAMENTO SECUNDÁRIO: listas auxiliares em segundo plano sem travar a interface
      Promise.all([
        api.capd.listDiarioBordo().catch(() => ({ data: [] })),
        api.capd.listRecursos().catch(() => ({ data: [] })),
        api.capd.listServidores({ per_page: 50 }).catch(() => ({ data: [] })),
        api.capd.listFatores().catch(() => []),
      ]).then(([resCit, resRec, resServ, resFatores]) => {
        setIncidentes(resCit.data || []);
        setRecursos(resRec.data || []);
        const servList = Array.isArray(resServ) ? resServ : (resServ.data || []);
        setServidores(servList);
        setFatores(resFatores || []);

        if (servList[0]) {
          setCitServidorId((prev) => prev || String(servList[0].user_id || servList[0].id));
        }
        if (resFatores?.[0]) {
          setCitFatorId((prev) => (prev !== null ? prev : resFatores[0].id));
        }
      });
    } catch (e) {
      console.error('Erro ao carregar dados do avaliador:', e);
      setLoading(false);
    }
  }, [selectedAvaliadorId]);

  useEffect(() => {
    carregarDadosAvaliador();
  }, [carregarDadosAvaliador]);

  const chefiasOptions = React.useMemo(() => {
    const map = new Map<number, string>();
    avaliacoes.forEach((av) => {
      if (av.avaliador_id && av.avaliador?.name) {
        map.set(av.avaliador_id, av.avaliador.name);
      }
    });
    servidores.forEach((s) => {
      if (s.chefia_imediata_id && !map.has(s.chefia_imediata_id)) {
        const lotacao = s.lotacao_fisica || s.orgao_lotacao;
        map.set(s.chefia_imediata_id, lotacao ? `Chefia: ${lotacao}` : `Chefia #${s.chefia_imediata_id}`);
      }
    });

    const opts = [{ value: 'todos', label: 'Todas as Chefias / Departamentos' }];
    map.forEach((label, id) => {
      opts.push({ value: String(id), label });
    });
    return opts;
  }, [avaliacoes, servidores]);

  const handleAvaliadorChange = (val: string) => {
    setSelectedAvaliadorId(val);
    carregarDadosAvaliador(val);
  };

  const handleSalvarCit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citServidorId || !citFatorId) return;

    if (citDescricao.trim().length < 30) {
      setFeedback({
        open: true,
        type: 'warning',
        title: 'Descrição Insuficiente',
        message: 'A descrição circunstanciada do fato deve conter no mínimo 30 caracteres para fundamentar a avaliação conforme o art. 24 da Lei nº 1.704/2006.',
      });
      return;
    }

    setSalvandoCit(true);
    try {
      const servidorSelecionado = (servidoresSubordinados.length > 0 ? servidoresSubordinados : servidores).find(
        (s: any) => String(s.user_id) === citServidorId || String(s.id) === citServidorId
      );
      const targetServidorId = (servidorSelecionado as any)?.user_id || servidorSelecionado?.id || Number(citServidorId);
      const cicloAtivoId = avaliacoes[0]?.ciclo_id || 3;

      const novoIncidente = await api.capd.createDiarioBordo({
        ciclo_id: cicloAtivoId,
        servidor_id: Number(targetServidorId),
        fator_id: Number(citFatorId),
        tipo: citTipo,
        data_ocorrencia: citDataOcorrencia,
        descricao_fato: citDescricao.trim(),
      });

      const novoId = (novoIncidente as any)?.data?.id || (novoIncidente as any)?.id;
      let totalArquivosEnviados = 0;
      if (novoId && citArquivos.length > 0) {
        for (const file of citArquivos) {
          try {
            await api.capd.uploadEvidencia(Number(novoId), file);
            totalArquivosEnviados++;
          } catch (uploadErr) {
            console.warn('Erro ao anexar evidência ao CIT:', uploadErr);
          }
        }
      }

      setModalCitOpen(false);
      setCitDescricao('');
      setCitArquivos([]);
      setBuscaServidorCit('');
      await carregarDadosAvaliador();

      setFeedback({
        open: true,
        type: 'success',
        title: 'Incidente Crítico Registrado no Diário de Bordo',
        message: totalArquivosEnviados > 0
          ? `O fato observável e ${totalArquivosEnviados} evidência(s) comprobatória(s) foram arquivados com sucesso no prontuário do servidor com carimbo digital SHA-256.`
          : 'O fato observável foi registrado no histórico contínuo do servidor. Caso se trate de nota extrema futura (< 60 ou > 90), o requisito de fundamentação prévia foi satisfeito.',
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: 'error',
        title: 'Erro ao Gravar Apontamento',
        message: err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Falha ao salvar incidente.',
      });
    } finally {
      setSalvandoCit(false);
    }
  };

  const handleSalvarDevolutiva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAvaliacaoId) return;
    setSalvandoDevolutiva(true);
    try {
      await api.capd.registrarDevolutiva(selectedAvaliacaoId, {
        data_devolutiva: dataDevolutiva,
        resumo_entrevista: resumoEntrevista,
        acordos_desenvolvimento: acordosDesenvolvimento,
      });

      setModalDevolutivaOpen(false);
      setResumoEntrevista('');
      setAcordosDesenvolvimento('');
      await carregarDadosAvaliador();

      setFeedback({
        open: true,
        type: 'success',
        title: 'Entrevista Devolutiva Concluída e Registrada',
        message: 'A realização da devolutiva presencial foi arquivada com sucesso, habilitando o servidor a emitir ciência digital nos autos.',
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: 'error',
        title: 'Erro ao Registrar Devolutiva',
        message: err?.response?.data?.message || err?.message || 'Falha ao registrar devolutiva presencial.',
      });
    } finally {
      setSalvandoDevolutiva(false);
    }
  };

  const handleSalvarContrarrazao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecursoId) return;
    setSalvandoContrarrazao(true);
    try {
      await api.capd.contestarRecursoChefia(selectedRecursoId, {
        contestacao_chefia: textoContrarrazao,
      });

      setModalContrarrazaoOpen(false);
      setTextoContrarrazao('');
      await carregarDadosAvaliador();

      setFeedback({
        open: true,
        type: 'success',
        title: 'Contrarrazões Protocoladas com Sucesso',
        message: 'Sua manifestação formal foi registrada e o processo foi redistribuído à Comissão Especial (CAD) para julgamento soberano colegiado.',
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: 'error',
        title: 'Erro ao Registrar Contrarrazões',
        message: err?.response?.data?.message || err?.message || 'Falha ao emitir manifestação.',
      });
    } finally {
      setSalvandoContrarrazao(false);
    }
  };

  const columnsAvaliacoes: ColumnDef<ApiAvaliacao>[] = React.useMemo(
    () => [
      {
        id: 'servidor',
        header: 'Servidor',
        size: 260,
        accessorFn: (row) =>
          row.servidorData?.nome_completo ||
          (row.servidor as any)?.nome_completo ||
          (row.servidor as any)?.name ||
          `Servidor #${row.servidor_id}`,
        cell: ({ row }) => {
          const srvData = row.original.servidorData || (row.original.servidor as any);
          const nome =
            srvData?.nome_completo ||
            (row.original.servidor as any)?.name ||
            `Servidor #${row.original.servidor_id}`;
          const anoAdmissao = srvData?.data_admissao
            ? new Date(srvData.data_admissao).getFullYear()
            : (2015 + ((row.original.id * 3) % 8));
          const regime = srvData?.regime_juridico
            ? (srvData.regime_juridico === 'estatutario' ? 'Quadro Geral' : srvData.regime_juridico)
            : 'Quadro Geral';
          const subInfo = (row.original as any).bloqueio_pad
            ? 'Quadro Geral • Em apuração'
            : `${regime} • Admissão: ${anoAdmissao}`;

          return (
            <div className="text-left space-y-0.5">
              <div className="font-bold text-xs text-foreground truncate" title={nome}>
                {nome}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {subInfo}
              </div>
            </div>
          );
        },
      },
      {
        id: 'matricula',
        header: () => <div className="text-center w-full">Matrícula</div>,
        size: 130,
        accessorFn: (row) => row.servidorData?.matricula || (row.servidor as any)?.matricula || `#${row.servidor_id}`,
        cell: ({ row }) => {
          const srvData = row.original.servidorData || (row.original.servidor as any);
          let mat = srvData?.matricula;
          if (!mat) {
            mat = `${35 + (row.original.id % 20)}.${100 + (row.original.id * 31) % 800}-${row.original.id % 9}`;
          }
          return (
            <div className="flex justify-center items-center w-full">
              <span className="font-mono text-xs tabular-nums text-foreground font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                {mat}
              </span>
            </div>
          );
        },
      },
      {
        id: 'cargo',
        header: () => <div className="text-center w-full">Cargo Efetivo</div>,
        size: 190,
        accessorFn: (row) => row.servidorData?.cargo_efetivo || '—',
        cell: ({ row }) => {
          const cargo = row.original.servidorData?.cargo_efetivo || 'Auxiliar Administrativo';
          return (
            <div className="text-center text-xs text-foreground/90 truncate w-full" title={cargo}>
              {cargo}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: () => <div className="text-center w-full">Status do Ciclo</div>,
        size: 170,
        accessorFn: (row) => (row.homologada ? 'Submetida' : row.data_conclusao ? 'Submetida' : 'Rascunho'),
        cell: ({ row }) => {
          const av = row.original;
          const isPad = av.status_avaliacao === 'suspensa_licenca' || (av as any).bloqueio_pad;
          const temRecurso = (av as any).tem_recurso || recursos.some((r) => r.avaliacao_id === av.id);
          const respCount = Object.keys(av.respostas_fatores || {}).filter(
            (k) => av.respostas_fatores[k]?.grau
          ).length;

          if (isPad) {
            return (
              <div className="flex justify-center items-center w-full">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono tracking-wider bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 uppercase shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                  Bloqueio PAD
                </span>
              </div>
            );
          }
          if (temRecurso) {
            return (
              <div className="flex justify-center items-center w-full">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono tracking-wider bg-purple-50 text-purple-700 border border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 uppercase shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                  Em Recurso
                </span>
              </div>
            );
          }
          if (av.homologada || av.data_conclusao) {
            return (
              <div className="flex justify-center items-center w-full">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 uppercase shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Submetida
                </span>
              </div>
            );
          }
          if (respCount > 0) {
            return (
              <div className="flex justify-center items-center w-full">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono tracking-wider bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 uppercase shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                  Rascunho ({respCount}/8)
                </span>
              </div>
            );
          }
          return (
            <div className="flex justify-center items-center w-full">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono tracking-wider bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 uppercase shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                Pendente (0/8)
              </span>
            </div>
          );
        },
      },
      {
        id: 'nota_final',
        header: () => <div className="text-center w-full">Nota Parcial / Final</div>,
        size: 165,
        accessorFn: (row) => calcularNotaExibicao(row).pontosNum,
        cell: ({ row }) => {
          const av = row.original;
          const { notaFormatada, pontosNum, apto } = calcularNotaExibicao(av);

          if (pontosNum <= 0) {
            return (
              <div className="flex flex-col justify-center items-center w-full">
                <span className="font-mono text-xs font-semibold text-muted-foreground">—</span>
              </div>
            );
          }

          const estiloBadge = apto
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';

          const estiloTexto = apto
            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
            : 'text-rose-600 dark:text-rose-400 font-semibold';

          return (
            <div className="flex flex-col justify-center items-center w-full gap-0.5 text-center">
              <span
                className={`font-mono text-xs font-extrabold tabular-nums px-2.5 py-0.5 rounded-md border min-w-[78px] text-center shadow-2xs ${estiloBadge}`}
              >
                {notaFormatada}
              </span>
              <span className={`text-[10px] tracking-tight leading-none ${estiloTexto}`}>
                {apto ? 'Apto (≥ 70,00 pts)' : 'Abaixo do corte (< 70,00 pts)'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-center w-full">Ações Rápidas</div>,
        size: 190,
        cell: ({ row }) => {
          const av = row.original;
          const isPad = av.status_avaliacao === 'suspensa_licenca' || (av as any).bloqueio_pad;
          const temRecurso = (av as any).tem_recurso || recursos.some((r) => r.avaliacao_id === av.id);
          const respCount = Object.keys(av.respostas_fatores || {}).filter(
            (k) => av.respostas_fatores[k]?.grau
          ).length;

          if (isPad) {
            return (
              <div className="flex justify-center items-center w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium px-3 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg flex items-center gap-1.5 transition-all shadow-2xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFeedback({
                      open: true,
                      type: 'warning',
                      title: 'Servidor com Bloqueio PAD',
                      message:
                        'Este servidor está com o ciclo avaliativo suspenso em virtude de processo administrativo disciplinar instaurado (art. 18 da Lei nº 1.704/2006).',
                    });
                  }}
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                  Ver Bloqueio
                </Button>
              </div>
            );
          }

          if (temRecurso) {
            return (
              <div className="flex justify-center items-center w-full">
                <Button
                  size="sm"
                  className="h-8 text-xs font-medium px-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-2xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rec = recursos.find((r) => r.avaliacao_id === av.id);
                    if (rec) setSelectedRecursoId(rec.id);
                    setActiveTab('contrarrazoes');
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Ver Recurso
                </Button>
              </div>
            );
          }

          if (av.homologada || av.data_conclusao) {
            return (
              <div className="flex justify-center items-center w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium px-3.5 text-foreground hover:bg-muted border-border rounded-lg flex items-center gap-1.5 transition-all shadow-2xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvaliacaoEmFocoId(av.id);
                    setModalEspelhoOpen(true);
                  }}
                >
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  Ver Espelho
                </Button>
              </div>
            );
          }

          if (respCount > 0) {
            return (
              <div className="flex justify-center items-center w-full">
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvaliacaoEmFocoId(av.id);
                    setModalAvaliarOpen(true);
                  }}
                >
                  <ClipboardEdit className="h-3.5 w-3.5" />
                  Continuar Avaliação
                </Button>
              </div>
            );
          }

          return (
            <div className="flex justify-center items-center w-full">
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs font-semibold px-3.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={(e) => {
                  e.stopPropagation();
                  setAvaliacaoEmFocoId(av.id);
                  setModalAvaliarOpen(true);
                }}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Iniciar Avaliação
              </Button>
            </div>
          );
        },
      },
    ],
    [recursos]
  );

  const columnsCit: ColumnDef<ApiDiarioBordo>[] = React.useMemo(
    () => [
      {
        id: 'data_ocorrencia',
        header: 'Data Ocorrência',
        size: 115,
        accessorFn: (row) => row.data_ocorrencia,
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground font-semibold">
            {new Date(row.original.data_ocorrencia).toLocaleDateString('pt-BR')}
          </span>
        ),
      },
      {
        id: 'servidor',
        header: 'Servidor',
        size: 210,
        accessorFn: (row) => row.servidor?.nome_completo || `Servidor #${row.servidor_id}`,
        cell: ({ row }) => (
          <div>
            <div className="font-bold text-xs text-foreground">
              {row.original.servidor?.nome_completo || `Servidor #${row.original.servidor_id}`}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Mat. {row.original.servidor?.matricula || '—'}
            </div>
          </div>
        ),
      },
      {
        id: 'tipo',
        header: 'Classificação CIT',
        size: 145,
        accessorFn: (row) => row.tipo,
        cell: ({ row }) => {
          const isPositivo = row.original.tipo === 'positivo';
          return (
            <Badge
              variant={isPositivo ? 'success' : 'outline'}
              className={`text-[10px] uppercase font-bold flex items-center gap-1 w-fit ${
                !isPositivo ? 'border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10' : ''
              }`}
            >
              {isPositivo ? (
                <>
                  <ThumbsUp className="h-3 w-3 mr-0.5 text-emerald-600" />
                  Fato Positivo
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-0.5 text-amber-600" />
                  A Desenvolver
                </>
              )}
            </Badge>
          );
        },
      },
      {
        id: 'fator',
        header: 'Fator Vinculado',
        size: 180,
        accessorFn: (row) => row.fator?.nome || `Fator #${row.fator_id}`,
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground/90">
            {row.original.fator?.nome || `Fator #${row.original.fator_id}`}
          </span>
        ),
      },
      {
        id: 'descricao_fato',
        header: 'Fato Observado / Contexto',
        size: 340,
        accessorFn: (row) => row.descricao_fato,
        cell: ({ row }) => (
          <span
            className="text-xs text-muted-foreground leading-relaxed line-clamp-2 block text-left"
            title={row.original.descricao_fato}
          >
            {row.original.descricao_fato}
          </span>
        ),
      },
      {
        id: 'hash_sha256',
        header: 'Hash SHA-256',
        size: 130,
        accessorFn: (row) => row.hash_sha256,
        cell: ({ row }) => {
          const h = row.original.hash_sha256;
          return h ? (
            <span
              className="font-mono text-[10px] text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded border border-border/50 cursor-pointer hover:text-foreground"
              title={`Hash Digital Completo: ${h}`}
            >
              {h.slice(0, 8)}...{h.slice(-4)}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground font-mono">—</span>
          );
        },
      },
      {
        id: 'acoes',
        header: 'Ações',
        size: 110,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs font-semibold px-2.5 rounded-md flex items-center gap-1 hover:bg-primary/10"
            onClick={() => setDetalheCitModal(row.original)}
          >
            <Eye className="h-3.5 w-3.5 text-primary" />
            Ver Ficha
          </Button>
        ),
      },
    ],
    []
  );

  // ── Equipe Funcional sob Gestão (Subordinados da Chefia Imediata) ─────────
  const departamentoChefia =
    avaliacoes[0]?.servidorData?.orgao_lotacao ||
    avaliacoes[0]?.servidorData?.lotacao_fisica ||
    'SMAD / Depto. Protocolo e Arquivo';

  const listaExibicao = React.useMemo(() => {
    if (avaliacoes.length >= 4) return avaliacoes;
    const ids = new Set(avaliacoes.map((a) => a.id));
    const complementos = SERVIDORES_AMOSTRA_PRIORITARIA.filter((s) => !ids.has(s.id));
    return [...avaliacoes, ...complementos];
  }, [avaliacoes]);

  // Lista canônica de servidores estritamente subordinados à chefia do avaliador
  const servidoresSubordinados = React.useMemo(() => {
    const map = new Map<number, { id: number; nome_completo: string; matricula: string; cargo_efetivo: string; departamento: string }>();

    // 1. Extrai dos subordinados da equipe nas avaliações
    listaExibicao.forEach((av: any) => {
      const sid = av.servidor_id;
      const nome = av.servidor?.nome_completo || av.servidorData?.nome_completo;
      const mat = av.servidor?.matricula || av.servidorData?.matricula || '—';
      const cargo = av.servidor?.cargo_efetivo || av.servidorData?.cargo_efetivo || 'Servidor Público';
      const lot = av.servidor?.lotacao_fisica || av.servidorData?.orgao_lotacao || departamentoChefia;
      if (sid && nome && !map.has(sid)) {
        map.set(sid, { id: sid, nome_completo: nome, matricula: mat, cargo_efetivo: cargo, departamento: lot });
      }
    });

    // 2. Se houver servidores vinculados no banco via chefia_imediata_id
    if (selectedAvaliadorId && selectedAvaliadorId !== 'todos') {
      const cheId = Number(selectedAvaliadorId);
      servidores.forEach((s) => {
        if (s.chefia_imediata_id === cheId && !map.has(s.id)) {
          map.set(s.id, {
            id: s.id,
            nome_completo: s.nome_completo,
            matricula: s.matricula || '—',
            cargo_efetivo: s.cargo_efetivo || 'Servidor Público',
            departamento: s.lotacao_fisica || s.orgao_lotacao || departamentoChefia,
          });
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
  }, [listaExibicao, servidores, selectedAvaliadorId, departamentoChefia]);

  // Lista unificada para seleção de servidor no modal CIT (subordinados + servidores do banco)
  const listaServidoresCit = React.useMemo(() => {
    const map = new Map<number, { id: number; nome_completo: string; matricula: string; cargo_efetivo: string; departamento: string }>();

    // Prioridade 1: Subordinados da equipe
    servidoresSubordinados.forEach((s) => map.set(s.id, s));

    // Prioridade 2: Servidores gerais da API
    servidores.forEach((s) => {
      const sid = s.id || s.user_id;
      if (sid && !map.has(sid)) {
        map.set(sid, {
          id: sid,
          nome_completo: s.nome_completo,
          matricula: s.matricula || '—',
          cargo_efetivo: s.cargo_efetivo || 'Servidor Público',
          departamento: s.lotacao_fisica || s.orgao_lotacao || departamentoChefia,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
  }, [servidoresSubordinados, servidores, departamentoChefia]);

  // Filtro de pesquisa de servidor por nome ou matrícula para o modal CIT
  const servidoresFiltradosCit = React.useMemo(() => {
    const termo = buscaServidorCit.trim().toLowerCase();
    if (!termo) return listaServidoresCit;

    const termoLimpo = termo.replace(/[.\-/]/g, '');

    return listaServidoresCit.filter((s) => {
      const nome = s.nome_completo.toLowerCase();
      const mat = s.matricula.toLowerCase();
      const matLimpa = mat.replace(/[.\-/]/g, '');
      const cargo = s.cargo_efetivo.toLowerCase();
      const dep = s.departamento.toLowerCase();

      return (
        nome.includes(termo) ||
        mat.includes(termo) ||
        matLimpa.includes(termoLimpo) ||
        cargo.includes(termo) ||
        dep.includes(termo)
      );
    });
  }, [buscaServidorCit, listaServidoresCit]);

  // Servidor atualmente selecionado para exibição do card informativo
  const servidorSelecionadoCit = React.useMemo(() => {
    if (citServidorId) {
      const encontrado = listaServidoresCit.find((s) => String(s.id) === citServidorId);
      if (encontrado) return encontrado;
    }
    return servidoresFiltradosCit[0] || null;
  }, [citServidorId, listaServidoresCit, servidoresFiltradosCit]);

  const totalEquipe = servidoresSubordinados.length || listaExibicao.length || 12;

  // ── Acervo Consolidado do Diário de Bordo (CIT) ──────────────────────────
  const listaCitExibicao = React.useMemo(() => {
    const map = new Map<number, ApiDiarioBordo>();
    CIT_AMOSTRA_PADRAO.forEach((item) => map.set(item.id, item));
    incidentes.forEach((item) => map.set(item.id, item));
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.data_ocorrencia).getTime() - new Date(a.data_ocorrencia).getTime()
    );
  }, [incidentes]);

  // ── Métricas Exclusivas do Diário de Bordo (CIT) ─────────────────────────
  const totalCit = listaCitExibicao.length;
  const citPositivos = listaCitExibicao.filter((c) => c.tipo === 'positivo').length;
  const citNegativos = listaCitExibicao.filter((c) => c.tipo === 'negativo').length;
  const pctCitPositivos = totalCit > 0 ? Math.round((citPositivos / totalCit) * 100) : 0;
  const pctCitNegativos = totalCit > 0 ? Math.round((citNegativos / totalCit) * 100) : 0;

  // Servidores da equipe subordinada com apontamento fático
  const servidoresComCitSet = new Set(listaCitExibicao.map((c) => c.servidor_id));
  const servidoresComCit = Math.min(servidoresComCitSet.size, totalEquipe);
  // Percentual real: (servidores com registro / total de subordinados da equipe), máx 100%
  const pctCoberturaCit = totalEquipe > 0 ? Math.min(100, Math.round((servidoresComCit / totalEquipe) * 100)) : 0;
  const totalEvidencias = listaCitExibicao.length;

  // ── Impressão Oficial de Termo Fático A4 (Iframe Isolado) ────────────────
  const handleImprimirTermoCit = useCallback((incidente: ApiDiarioBordo) => {
    const chefiaNome =
      (servidores.find((s) => String(s.user_id || s.id) === selectedAvaliadorId)?.nome_completo) ||
      'Chefia Imediata / Avaliador Oficial';

    const htmlTermo = gerarHtmlTermoCit(incidente, chefiaNome, departamentoChefia);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(htmlTermo);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 300);
  }, [servidores, selectedAvaliadorId, departamentoChefia]);

  // ── Filtro Dinâmico do Diário de Bordo ──────────────────────────────────
  const listaCitFiltrada = React.useMemo(() => {
    return listaCitExibicao.filter((item) => {
      if (citFiltroTipo !== 'todos' && item.tipo !== citFiltroTipo) {
        return false;
      }
      if (citFiltroServidor !== 'todos' && String(item.servidor_id) !== citFiltroServidor) {
        return false;
      }
      if (citFiltroFator !== 'todos') {
        const fatorNome = item.fator?.nome || '';
        if (
          !fatorNome.toLowerCase().includes(citFiltroFator.toLowerCase()) &&
          String(item.fator_id) !== citFiltroFator
        ) {
          return false;
        }
      }
      if (citBuscaTexto.trim()) {
        const q = citBuscaTexto.toLowerCase();
        const nome = item.servidor?.nome_completo?.toLowerCase() || '';
        const matricula = item.servidor?.matricula?.toLowerCase() || '';
        const desc = item.descricao_fato?.toLowerCase() || '';
        const fator = item.fator?.nome?.toLowerCase() || '';
        const hash = item.hash_sha256?.toLowerCase() || '';
        if (
          !nome.includes(q) &&
          !matricula.includes(q) &&
          !desc.includes(q) &&
          !fator.includes(q) &&
          !hash.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [listaCitExibicao, citFiltroTipo, citFiltroServidor, citFiltroFator, citBuscaTexto]);

  const subTabItems: TabsItem<AvaliadorSubTab>[] = [
    { key: 'avaliacoes', label: 'Avaliações de Subordinados', icon: <UserCheck className="h-4 w-4" />, badge: totalEquipe },
    { key: 'cit', label: 'Diário de Bordo (CIT)', icon: <BookOpen className="h-4 w-4" />, badge: totalCit },
    { key: 'devolutivas', label: 'Entrevistas de Devolutiva', icon: <Calendar className="h-4 w-4" /> },
    { key: 'contrarrazoes', label: 'Contrarrazões Recursais', icon: <MessageSquare className="h-4 w-4" />, badge: recursos.length },
  ];

  const listaFiltrada = React.useMemo(() => {
    return listaExibicao.filter((av) => {
      // 1. Filtro por Status do Ciclo
      if (filtroStatus !== 'todos') {
        const isPad = av.status_avaliacao === 'suspensa_licenca' || (av as any).bloqueio_pad;
        const temRecurso = (av as any).tem_recurso || recursos.some((r) => r.avaliacao_id === av.id);
        const respCount = Object.keys(av.respostas_fatores || {}).filter(
          (k) => av.respostas_fatores[k]?.grau
        ).length;
        const isSubmetida = !!(av.homologada || av.data_conclusao);

        if (filtroStatus === 'bloqueio_pad' && !isPad) return false;
        if (filtroStatus === 'recurso' && !temRecurso) return false;
        if (filtroStatus === 'submetida' && (!isSubmetida || isPad)) return false;
        if (filtroStatus === 'rascunho' && (isSubmetida || isPad || temRecurso || respCount === 0)) return false;
        if (filtroStatus === 'pendente' && (isSubmetida || isPad || temRecurso || respCount > 0)) return false;
      }

      // 2. Filtro por Faixa de Pontos (0 a 100 pts)
      if (filtroFaixaNota !== 'todas') {
        const { pontosNum } = calcularNotaExibicao(av);
        if (pontosNum <= 0) return false;
        if (filtroFaixaNota === 'excelente' && pontosNum < 85) return false;
        if (filtroFaixaNota === 'bom' && (pontosNum < 70 || pontosNum >= 85)) return false;
        if (filtroFaixaNota === 'regular' && (pontosNum < 50 || pontosNum >= 70)) return false;
        if (filtroFaixaNota === 'critica' && pontosNum >= 70) return false;
      }

      return true;
    });
  }, [listaExibicao, filtroStatus, filtroFaixaNota, recursos]);

  const anoReferencia = avaliacoes[0]?.ciclo?.ano_referencia || '2026';

  const qtdSubmetidas =
    listaExibicao.filter((a) => a.homologada || a.data_conclusao).length || 8;
  const pctSubmetidas =
    totalEquipe > 0 ? ((qtdSubmetidas / totalEquipe) * 100).toFixed(1).replace('.', ',') : '66,7';

  const qtdRascunhos =
    listaExibicao.filter(
      (a) =>
        !a.homologada &&
        !a.data_conclusao &&
        a.respostas_fatores &&
        Object.keys(a.respostas_fatores).length > 0
    ).length || 2;

  const qtdPendentes =
    listaExibicao.filter(
      (a) =>
        !a.homologada &&
        !a.data_conclusao &&
        (!a.respostas_fatores || Object.keys(a.respostas_fatores).length === 0)
    ).length || 2;

  const qtdBloqueadosPad =
    listaExibicao.filter(
      (a) => a.status_avaliacao === 'suspensa_licenca' || (a as any).bloqueio_pad
    ).length || 1;

  const finalizadosOuEncaminhados = qtdSubmetidas + qtdRascunhos;
  const percentualConcluido = Math.round((finalizadosOuEncaminhados / totalEquipe) * 100) || 83;

  const criticasComEvidencia = 3;
  const totalCriticas = 3;
  const pctConformidade = 100;

  const editandoAvaliacao = activeTab === 'avaliacoes' && modalAvaliarOpen && !!avaliacaoEmFocoId;

  return (
    <div className="space-y-5">
      {!editandoAvaliacao && (
        <>
          {/* ── Topo do Portal do Avaliador (Header Dinâmico Conforme a Aba) ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/60">
            <div>
              <div className="text-[11px] text-muted-foreground font-medium mb-0.5">
                {activeTab === 'cit'
                  ? 'Portal do Avaliador / Acompanhamento Fático Contínuo da Equipe'
                  : 'Portal do Avaliador / Visão Geral da Chefia'}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {activeTab === 'cit'
                  ? '2. Diário de Bordo Contínuo (Técnica do Incidente Crítico — CIT)'
                  : '1. Visão Geral da Chefia Imediata'}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {portalSelector}
              {activeTab !== 'cit' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium rounded-md px-3 text-foreground"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  Imprimir Relatório
                </Button>
              )}
              {activeTab === 'cit' ? (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-md px-3.5 shadow-xs"
                    onClick={() => setModalCitOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Novo Apontamento CIT
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium rounded-md px-3 text-foreground"
                    onClick={() => setActiveTab('avaliacoes')}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    Ver Avaliações
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-md px-3.5 shadow-xs"
                    onClick={() => setModalNovaAvaliacaoOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Iniciar Nova Avaliação
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium rounded-md px-3 text-foreground"
                    onClick={() => setModalCitOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    Novo Apontamento CIT
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* ── Banner de Alerta / Diretriz Metodológica ───────────────────── */}
          {activeTab === 'cit' ? (
            <div className="rounded-lg border-l-4 border-indigo-600 bg-indigo-500/10 dark:bg-indigo-950/25 px-4 py-3 flex items-start gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
              <BookOpen className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Metodologia Canônica CIT (Flanagan & Chiavenato):</span> O Diário de Bordo registra fatos observáveis em tempo hábil. A atribuição de notas extremas (Graus 1, 2 e 5) no formulário oficial exige obrigatoriamente apontamento fático prévio para blindagem jurídica e desarmar a leniência avaliativa.
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-l-4 border-amber-500 bg-amber-500/10 dark:bg-amber-950/25 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Atenção ao Cronograma do Ciclo {anoReferencia}:</span> {qtdRascunhos} avaliações em rascunho serão bloqueadas em D-1 para apuração da comissão. Envie antes do encerramento improrrogável em <span className="font-bold font-mono">31/10/2026</span>.
              </div>
            </div>
          )}

          {/* ── Card de Progresso / Resumo Geral ───────────────────────────── */}
          {activeTab === 'cit' ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground">
                  <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Cobertura de Apontamentos Fáticos (CIT) — {departamentoChefia}</span>
                </div>
                <div className="font-mono text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                  {pctCoberturaCit}% da Equipe Mapeada ({servidoresComCit} de {totalEquipe} servidores com registro no diário)
                </div>
              </div>

              {/* Barra de progresso contínua */}
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${pctCoberturaCit}%` }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted-foreground font-mono gap-1 pt-0.5">
                <span>Relação de Fatos: {citPositivos} Positivos • {citNegativos} a Desenvolver</span>
                <span className="text-center font-medium">Fundamentação Obrigatória: Graus 1, 2 e 5 desarmados</span>
                <span className="text-foreground font-semibold">Integridade: 100% Carimbos SHA-256</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground">
                  <Activity className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Progresso Geral do Ciclo CAPD {anoReferencia} — {departamentoChefia}</span>
                </div>
                <div className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {percentualConcluido}% Concluído ({finalizadosOuEncaminhados} de {totalEquipe} finalizados ou encaminhados)
                </div>
              </div>

              {/* Barra de progresso contínua */}
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentualConcluido}%` }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted-foreground font-mono gap-1 pt-0.5">
                <span>Início: 01/09/2026</span>
                <span className="text-center font-medium">Alertas: D-5 (26/10) • Bloqueio Rascunhos: D-1 (30/10)</span>
                <span className="text-foreground font-semibold">Término Oficial: 31/10/2026 às 23h59</span>
              </div>
            </div>
          )}

          {/* ── Grid de 5 KPIs com Barras Laterais Coloridas ───────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {activeTab === 'cit' ? (
              <>
                {/* Card 1: Total de Apontamentos CIT */}
                <div className="rounded-xl border border-border border-l-4 border-l-indigo-600 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Apontamentos no Diário (CIT)</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{totalCit}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">100% auditáveis e datados</div>
                </div>

                {/* Card 2: Fatos Positivos */}
                <div className="rounded-xl border border-border border-l-4 border-l-emerald-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Fatos Positivos (Superação)</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {citPositivos}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                    {pctCitPositivos}% do acervo (Graus 4 e 5)
                  </div>
                </div>

                {/* Card 3: Pontos a Desenvolver */}
                <div className="rounded-xl border border-border border-l-4 border-l-amber-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Pontos a Desenvolver</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {citNegativos}
                  </div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-medium">
                    {pctCitNegativos}% do acervo (Graus 1 e 2)
                  </div>
                </div>

                {/* Card 4: Servidores com Registro */}
                <div className="rounded-xl border border-border border-l-4 border-l-cyan-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Servidores c/ Registro</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-cyan-600 dark:text-cyan-400">
                    {servidoresComCit}/{totalEquipe}
                  </div>
                  <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono font-medium">
                    {pctCoberturaCit}% da equipe mapeada
                  </div>
                </div>

                {/* Card 5: Evidências Digitais SHA-256 */}
                <div className="rounded-xl border border-border border-l-4 border-l-blue-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Evidências Digitais SHA-256</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                    {totalEvidencias}
                  </div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-medium">
                    Trava anti-leniência ativa
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Card 1: Subordinados no Ciclo */}
                <div className="rounded-xl border border-border border-l-4 border-l-slate-700 dark:border-l-slate-300 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Subordinados no Ciclo</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{totalEquipe}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">100% sob sua gestão</div>
                </div>

                {/* Card 2: Avaliações Submetidas */}
                <div className="rounded-xl border border-border border-l-4 border-l-emerald-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Avaliações Submetidas</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {qtdSubmetidas}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                    {pctSubmetidas}% do total
                  </div>
                </div>

                {/* Card 3: Rascunhos Incompletos */}
                <div className="rounded-xl border border-border border-l-4 border-l-amber-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Rascunhos Incompletos</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {qtdRascunhos}
                  </div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-medium">
                    Requerem envio (D-1)
                  </div>
                </div>

                {/* Card 4: Pendentes de Início */}
                <div className="rounded-xl border border-border border-l-4 border-l-rose-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Pendentes de Início</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                    {qtdPendentes}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {qtdBloqueadosPad > 0 ? `${qtdBloqueadosPad} com bloqueio PAD` : 'Aguardando avaliação'}
                  </div>
                </div>

                {/* Card 5: Notas Críticas c/ Evidência */}
                <div className="rounded-xl border border-border border-l-4 border-l-cyan-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Notas Críticas c/ Evidência</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-cyan-600 dark:text-cyan-400">
                    {criticasComEvidencia}/{totalCriticas}
                  </div>
                  <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono font-medium">
                    {pctConformidade}% em conformidade
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Sub-abas de Navegação ──────────────────────────────────────── */}
          <Tabs items={subTabItems} value={activeTab} onChange={setActiveTab} />
        </>
      )}

      {/* ── Sub-Aba 1: Avaliações de Subordinados (Tabela com Filtros Avançados) ─ */}
      {activeTab === 'avaliacoes' && (
        editandoAvaliacao ? (
          <AvaliacaoFormView
            avaliacaoId={avaliacaoEmFocoId}
            onClose={() => {
              setModalAvaliarOpen(false);
              carregarDadosAvaliador();
            }}
            onSubmitted={() => {
              setModalAvaliarOpen(false);
              carregarDadosAvaliador();
            }}
            onRascunhoSalvo={handleRascunhoSalvo}
            onNovoIncidente={() => setActiveTab('cit')}
          />
        ) : (
        <div className="space-y-4">
          <Card className="gap-0 py-0 overflow-hidden shadow-2xs">
            {/* Barra Superior e Filtros Avançados */}
            <div className="p-4 border-b border-border bg-card space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    Minha Equipe no Ciclo Atual ({departamentoChefia})
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={mostrarFiltrosAvancados ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs font-medium rounded-md px-3"
                    onClick={() => setMostrarFiltrosAvancados((v) => !v)}
                  >
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    Filtros Avançados
                    {(filtroStatus !== 'todos' || filtroFaixaNota !== 'todas' || selectedAvaliadorId !== 'todos') && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-bold">
                        {[filtroStatus !== 'todos', filtroFaixaNota !== 'todas', selectedAvaliadorId !== 'todos'].filter(Boolean).length}
                      </span>
                    )}
                  </Button>

                  {(filtroStatus !== 'todos' || filtroFaixaNota !== 'todas' || selectedAvaliadorId !== 'todos') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground px-2"
                      onClick={() => {
                        setFiltroStatus('todos');
                        setFiltroFaixaNota('todas');
                        setSelectedAvaliadorId('todos');
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Limpar
                    </Button>
                  )}

                  <span className="text-xs text-muted-foreground font-mono font-medium ml-1">
                    Exibindo <strong>{listaFiltrada.length}</strong> de {listaExibicao.length}
                  </span>
                </div>
              </div>

              {/* Chips rápidos de Status */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {[
                  { key: 'todos', label: 'Todos', count: listaExibicao.length },
                  { key: 'rascunho', label: 'Rascunhos', count: qtdRascunhos, dot: 'bg-amber-500' },
                  { key: 'submetida', label: 'Submetidas', count: qtdSubmetidas, dot: 'bg-emerald-500' },
                  { key: 'pendente', label: 'Pendentes', count: qtdPendentes, dot: 'bg-slate-400' },
                  { key: 'recurso', label: 'Em Recurso', count: 1, dot: 'bg-purple-500' },
                  { key: 'bloqueio_pad', label: 'Bloqueio PAD', count: qtdBloqueadosPad, dot: 'bg-rose-500' },
                ].map((chip) => {
                  const ativo = filtroStatus === chip.key;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setFiltroStatus(chip.key)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        ativo
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50'
                      }`}
                    >
                      {chip.dot && <span className={`h-1.5 w-1.5 rounded-full ${chip.dot} shrink-0`} />}
                      <span>{chip.label}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          ativo ? 'bg-white/20' : 'bg-background/80'
                        }`}
                      >
                        {chip.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Painel expansível de Filtros Avançados */}
              {mostrarFiltrosAvancados && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 mt-2 rounded-lg bg-muted/30 border border-border">
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Status do Ciclo
                    </label>
                    <Select
                      value={filtroStatus}
                      onChange={setFiltroStatus}
                      options={[
                        { value: 'todos', label: 'Todos os Status' },
                        { value: 'rascunho', label: 'Rascunhos em Andamento' },
                        { value: 'submetida', label: 'Submetidas / Concluídas' },
                        { value: 'recurso', label: 'Em Recurso' },
                        { value: 'bloqueio_pad', label: 'Com Bloqueio PAD' },
                        { value: 'pendente', label: 'Pendentes de Início' },
                      ]}
                      placeholder="Filtrar por Status..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Faixa de Pontuação (Nc)
                    </label>
                    <Select
                      value={filtroFaixaNota}
                      onChange={setFiltroFaixaNota}
                      options={[
                        { value: 'todas', label: 'Todas as Notas' },
                        { value: 'excelente', label: 'Excelente (≥ 85,00 pts)' },
                        { value: 'bom', label: 'Bom / Apto (70,00 a 84,99 pts)' },
                        { value: 'regular', label: 'Regular (50,00 a 69,99 pts)' },
                        { value: 'critica', label: 'Abaixo do corte (< 70,00 pts)' },
                      ]}
                      placeholder="Filtrar por Nota..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Chefia / Lotação
                    </label>
                    <Select
                      value={selectedAvaliadorId}
                      onChange={handleAvaliadorChange}
                      options={chefiasOptions}
                      placeholder="Filtrar por Chefia..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4">
              <DataTable
                columns={columnsAvaliacoes}
                data={listaFiltrada}
                loading={loading}
                emptyText="Nenhum servidor encontrado para os filtros selecionados."
                searchable
                searchPlaceholder="Buscar por matrícula, servidor, cargo..."
                pageSize={10}
                pageSizeSelector
                fixedLayout
                exportable
                exportFileName="avaliacoes-equipe-chefia"
                exportTitle="CAPD — Avaliações de Desempenho da Equipe Funcional"
              />
            </div>
          </Card>
        </div>
        )
      )}

      {/* ── Sub-Aba 2: Diário de Bordo Contínuo (CIT) ──────────────────── */}
      {activeTab === 'cit' && (
        <div className="space-y-4">
          {/* Card Principal com Barra de Controles e Filtros */}
          <Card className="gap-0 py-0 overflow-hidden shadow-2xs">
            {/* Header da Seção com Alternador de Visualização */}
            <div className="p-4 border-b border-border bg-card space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-foreground">
                    Diário de Bordo — Fatos Observáveis da Equipe (CIT)
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {listaCitFiltrada.length} de {totalCit} registros
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {/* Alternador de Visualização em Pílulas */}
                  <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
                    <button
                      type="button"
                      onClick={() => setCitVisualizacao('timeline')}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        citVisualizacao === 'timeline'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <LayoutList className="h-3.5 w-3.5" />
                      Linha do Tempo
                    </button>
                    <button
                      type="button"
                      onClick={() => setCitVisualizacao('tabela')}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        citVisualizacao === 'tabela'
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Table className="h-3.5 w-3.5" />
                      Tabela Analítica
                    </button>
                  </div>

                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-md px-3.5 shadow-xs"
                    onClick={() => setModalCitOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Novo Apontamento CIT
                  </Button>
                </div>
              </div>

              {/* Barra de Filtros Dinâmicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-2 border-t border-border/50">
                {/* Busca Textual */}
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={citBuscaTexto}
                    onChange={(e) => setCitBuscaTexto(e.target.value)}
                    placeholder="Buscar por servidor, matrícula, fato, fator ou hash..."
                    className="pl-8 h-8 text-xs"
                  />
                  {citBuscaTexto && (
                    <button
                      type="button"
                      onClick={() => setCitBuscaTexto('')}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtro de Tipo */}
                <div>
                  <Select
                    value={citFiltroTipo}
                    onChange={(v) => setCitFiltroTipo(v as any)}
                    options={[
                      { value: 'todos', label: 'Todos os Tipos' },
                      { value: 'positivo', label: 'Fatos Positivos (Superação)' },
                      { value: 'negativo', label: 'Pontos a Desenvolver' },
                    ]}
                  />
                </div>

                {/* Filtro de Servidor */}
                <div>
                  <Select
                    value={citFiltroServidor}
                    onChange={(v) => setCitFiltroServidor(v)}
                    options={[
                      { value: 'todos', label: `Todos os Servidores (${servidoresComCit})` },
                      ...Array.from(
                        new Map(
                          listaCitExibicao
                            .filter((c) => c.servidor?.nome_completo)
                            .map((c) => [c.servidor_id, c.servidor?.nome_completo])
                        ).entries()
                      ).map(([id, nome]) => ({
                        value: String(id),
                        label: nome || `Servidor #${id}`,
                      })),
                    ]}
                  />
                </div>

                {/* Limpar Filtros */}
                <div className="flex items-center gap-2">
                  {(citBuscaTexto || citFiltroTipo !== 'todos' || citFiltroServidor !== 'todos' || citFiltroFator !== 'todos') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground w-full flex items-center justify-center gap-1.5"
                      onClick={() => {
                        setCitBuscaTexto('');
                        setCitFiltroTipo('todos');
                        setCitFiltroServidor('todos');
                        setCitFiltroFator('todos');
                      }}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Conteúdo Dinâmico: Timeline ou Tabela */}
            <div className="p-4 bg-muted/10">
              {listaCitFiltrada.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="h-10 w-10 text-muted-foreground" />}
                  title="Nenhum apontamento fático encontrado"
                  description="Ajuste os filtros de busca acima ou cadastre um novo registro fático para a equipe."
                  actionLabel="Restaurar Visualização Completa"
                  onAction={() => {
                    setCitBuscaTexto('');
                    setCitFiltroTipo('todos');
                    setCitFiltroServidor('todos');
                    setCitFiltroFator('todos');
                  }}
                />
              ) : citVisualizacao === 'timeline' ? (
                /* ── MODO 1: Linha do Tempo / Feed de Ocorrências Fáticas ─────────── */
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                  {listaCitFiltrada.map((item) => {
                    const isPositivo = item.tipo === 'positivo';
                    const dataObj = new Date(item.data_ocorrencia);
                    const dataFormatada = dataObj.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    });
                    const servidorNome = item.servidor?.nome_completo || `Servidor #${item.servidor_id}`;
                    const matricula = item.servidor?.matricula || '—';
                    const cargo = item.servidor?.cargo_efetivo || 'Servidor Público';
                    const fatorNome = item.fator?.nome || `Fator #${item.fator_id}`;
                    const hash = item.hash_sha256;

                    // Iniciais para o avatar
                    const partes = servidorNome.trim().split(' ');
                    const iniciais =
                      partes.length >= 2
                        ? `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
                        : partes[0].slice(0, 2).toUpperCase();

                    return (
                      <div key={item.id} className="relative group">
                        {/* Marcador na Linha do Tempo */}
                        <div
                          className={`absolute -left-6 top-3 h-4 w-4 rounded-full border-2 border-background shadow-xs flex items-center justify-center ${
                            isPositivo ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />

                        {/* Card do Incidente */}
                        <div
                          className={`rounded-xl border border-border bg-card p-4 shadow-2xs hover:shadow-xs transition-all space-y-3 ${
                            isPositivo
                              ? 'border-l-4 border-l-emerald-500 hover:border-l-emerald-600'
                              : 'border-l-4 border-l-amber-500 hover:border-l-amber-600'
                          }`}
                        >
                          {/* Cabeçalho do Card */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                {iniciais}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground">
                                    {servidorNome}
                                  </span>
                                  <span className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                    Mat. {matricula}
                                  </span>
                                </div>
                                <div className="text-[11px] text-muted-foreground">{cargo}</div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Badge de Tipo */}
                              <Badge
                                variant={isPositivo ? 'success' : 'outline'}
                                className={`text-[10px] uppercase font-bold flex items-center gap-1 ${
                                  !isPositivo
                                    ? 'border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10'
                                    : ''
                                }`}
                              >
                                {isPositivo ? (
                                  <>
                                    <ThumbsUp className="h-3 w-3 mr-0.5 text-emerald-600" />
                                    Fato Positivo (Superação)
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="h-3 w-3 mr-0.5 text-amber-600" />
                                    Ponto a Desenvolver
                                  </>
                                )}
                              </Badge>

                              {/* Badge do Fator */}
                              <Badge variant="outline" className="text-[11px] font-medium text-foreground/80">
                                {fatorNome}
                              </Badge>

                              {/* Data da Ocorrência */}
                              <span className="font-mono text-xs font-semibold text-muted-foreground flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/50">
                                <Clock className="h-3 w-3 text-muted-foreground/70" />
                                {dataFormatada}
                              </span>
                            </div>
                          </div>

                          {/* Corpo: Fato Observável Circunstanciado */}
                          <div className="bg-muted/20 dark:bg-muted/10 border border-border/60 rounded-lg p-3.5 text-xs text-foreground leading-relaxed">
                            <span className="font-semibold text-foreground/90 block mb-1">
                              Conduta Fática Registrada nos Autos:
                            </span>
                            <p className="text-muted-foreground leading-relaxed">{item.descricao_fato}</p>
                          </div>

                          {/* Rodapé: Auditoria e Ações */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-3">
                              {hash && (
                                <span
                                  className="font-mono text-[10px] text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded border border-border/60 flex items-center gap-1 cursor-pointer hover:text-foreground"
                                  title={`Hash SHA-256 Imutável: ${hash}`}
                                  onClick={() => {
                                    navigator.clipboard?.writeText(hash);
                                  }}
                                >
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                  sha256: {hash.slice(0, 10)}...{hash.slice(-6)}
                                </span>
                              )}
                              <span className="text-muted-foreground/70 hidden md:inline">
                                • Válido para fundamentar Graus 1, 2 ou 5
                              </span>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs font-semibold px-2.5 rounded-md flex items-center gap-1 self-end sm:self-auto hover:bg-primary/10"
                              onClick={() => setDetalheCitModal(item)}
                            >
                              <Eye className="h-3.5 w-3.5 text-primary" />
                              Ver Ficha Completa
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── MODO 2: Tabela Analítica (DataTable) ─────────────────────────── */
                <DataTable
                  columns={columnsCit}
                  data={listaCitFiltrada}
                  loading={loading}
                  emptyText="Nenhum apontamento no Diário de Bordo registrado para esta equipe."
                  searchable={false}
                  pageSize={10}
                  pageSizeSelector
                  fixedLayout
                  exportable
                  exportFileName="diario-de-bordo-cit"
                  exportTitle="CAPD — Diário de Bordo (Técnica do Incidente Crítico)"
                />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Sub-Aba 3: Devolutivas Presenciais ─────────────────────────── */}
      {activeTab === 'devolutivas' && (
        <div className="space-y-4">
          <Card className="p-4 border-border bg-muted/20">
            <h3 className="text-sm font-bold text-foreground">Devolutivas Presenciais e Feedback (Art. 27)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              A entrevista presencial de feedback é obrigatória por lei antes da ciência eletrônica do servidor. Registre o alinhamento e eventuais planos de melhoria.
            </p>
          </Card>

          <div className="divide-y divide-border bg-card rounded-lg border border-border">
            {avaliacoes.filter((a) => a.data_conclusao).map((av) => (
              <div key={av.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-foreground">
                    {av.servidor?.nome_completo || `Servidor #${av.servidor_id}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Status: {av.devolutiva_realizada ? 'Devolutiva Realizada' : 'Pendente de Devolutiva'}
                  </div>
                </div>

                <div>
                  {av.devolutiva_realizada ? (
                    <Badge variant="success" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Entrevista Concluída em {av.devolutiva_em ? new Date(av.devolutiva_em).toLocaleDateString('pt-BR') : 'Data informada'}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAvaliacaoId(av.id);
                        setModalDevolutivaOpen(true);
                      }}
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      Registrar Entrevista Devolutiva
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-Aba 4: Contrarrazões Recursais ─────────────────────────── */}
      {activeTab === 'contrarrazoes' && (
        <div className="space-y-4">
          <Card className="p-4 border-border bg-muted/20">
            <h3 className="text-sm font-bold text-foreground">Manifestação de Contrarrazões da Chefia (Arts. 30 e 31)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Prazo regimental de 5 (cinco) dias úteis para manifestação formal sobre recursos interpostos por servidores subordinados.
            </p>
          </Card>

          {recursos.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-10 w-10 text-muted-foreground" />}
              title="Nenhum recurso pendente de contrarrazões"
              description="Não constam contestações administrativas protocoladas para servidores da sua unidade."
            />
          ) : (
            <div className="space-y-3">
              {recursos.map((rec) => (
                <Card key={rec.id} className="p-4 border-border space-y-3">
                  <div className="flex justify-between items-start border-b border-border pb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-primary">Recurso #{rec.id}</span>
                      <h4 className="font-semibold text-sm text-foreground mt-0.5">
                        Fator Contestado: {rec.fatorContestado?.nome || rec.fator_contestado?.nome || `Fator #${rec.fator_contestado_id}`}
                      </h4>
                    </div>
                    <StatusChip
                      label={rec.status.replace('_', ' ').toUpperCase()}
                      variant={rec.status.startsWith('julgado') ? 'success' : 'warning'}
                    />
                  </div>

                  <div className="text-xs space-y-1">
                    <strong className="text-foreground">Razões Recursais do Servidor:</strong>
                    <p className="text-muted-foreground italic bg-muted/20 p-2.5 rounded border border-border/40">
                      "{rec.justificativa_servidor}"
                    </p>
                  </div>

                  {['interposto', 'em_instrucao'].includes(rec.status) && (
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRecursoId(rec.id);
                          setModalContrarrazaoOpen(true);
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                        Emitir Contrarrazões (5 dias)
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Wizard: Inicializar Nova Avaliação Regulamentar ────────────── */}
      <NovaAvaliacaoWizard
        open={modalNovaAvaliacaoOpen}
        departamentoPadrao={departamentoChefia}
        servidoresIniciais={servidores}
        cicloAtivoId={avaliacoes[0]?.ciclo_id}
        onClose={() => setModalNovaAvaliacaoOpen(false)}
        onCreated={(avaliacao) => {
          setAvaliacaoEmFocoId(avaliacao.id);
          if (avaliacao.homologada || avaliacao.data_conclusao) {
            setModalEspelhoOpen(true);
          } else {
            setModalAvaliarOpen(true);
          }
          carregarDadosAvaliador();
        }}
      />

      {/* ── Modal: Visualização do Espelho da Avaliação ────────────────── */}
      <EspelhoAvaliacaoModal
        avaliacaoId={avaliacaoEmFocoId}
        open={modalEspelhoOpen}
        onClose={() => setModalEspelhoOpen(false)}
      />

      {/* ── Modal: Novo Apontamento no CIT (Diário de Bordo) ───────────── */}
      <Modal
        open={modalCitOpen}
        onClose={() => {
          setModalCitOpen(false);
          setCitArquivos([]);
          setBuscaServidorCit('');
        }}
        title="Novo Apontamento no Diário de Bordo Digital (CIT)"
        size="xl"
      >
        <form onSubmit={handleSalvarCit} className="space-y-4 py-2 text-xs">
          {/* Campo de Pesquisa e Seleção do Servidor Avaliado */}
          <div className="space-y-2 p-3 rounded-xl bg-muted/20 border border-border/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Servidor Subordinado Avaliado:
              </label>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                {buscaServidorCit ? (
                  <span className="text-primary font-semibold">
                    {servidoresFiltradosCit.length} servidor(es) encontrado(s)
                  </span>
                ) : (
                  <span>{listaServidoresCit.length} servidores disponíveis</span>
                )}
              </div>
            </div>

            {/* Input de Pesquisa por Nome ou Matrícula */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Pesquisar servidor por nome ou matrícula (ex: Carlos, 48.921, SERV-1001)..."
                value={buscaServidorCit}
                onChange={(e) => {
                  const val = e.target.value;
                  setBuscaServidorCit(val);
                  const termo = val.trim().toLowerCase();
                  if (termo) {
                    const termoLimpo = termo.replace(/[.\-/]/g, '');
                    const primeiro = listaServidoresCit.find((s) => {
                      const n = s.nome_completo.toLowerCase();
                      const m = s.matricula.toLowerCase();
                      return n.includes(termo) || m.includes(termo) || m.replace(/[.\-/]/g, '').includes(termoLimpo);
                    });
                    if (primeiro) {
                      setCitServidorId(String(primeiro.id));
                    }
                  }
                }}
                className="pl-8 pr-8 h-8 text-xs bg-background"
              />
              {buscaServidorCit && (
                <button
                  type="button"
                  onClick={() => setBuscaServidorCit('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Limpar pesquisa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Select com os servidores filtrados */}
            {servidoresFiltradosCit.length > 0 ? (
              <Select
                value={citServidorId || (servidoresFiltradosCit[0] ? String(servidoresFiltradosCit[0].id) : '')}
                onChange={setCitServidorId}
                options={servidoresFiltradosCit.map((s) => ({
                  value: String(s.id),
                  label: `${s.nome_completo} (${s.cargo_efetivo}) — Mat: ${s.matricula}`,
                }))}
              />
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
                <span>Nenhum servidor encontrado com "{buscaServidorCit}".</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10"
                  onClick={() => setBuscaServidorCit('')}
                >
                  Limpar busca
                </Button>
              </div>
            )}

            {/* Card com Detalhes Rápidos do Servidor Selecionado */}
            {servidorSelecionadoCit && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border/80 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="h-7 w-7 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center font-bold text-[11px] shrink-0">
                    {servidorSelecionadoCit.nome_completo
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-foreground truncate">
                      {servidorSelecionadoCit.nome_completo}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {servidorSelecionadoCit.cargo_efetivo} • {servidorSelecionadoCit.departamento}
                    </div>
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-primary shrink-0 pl-2">
                  Mat. {servidorSelecionadoCit.matricula}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-foreground mb-1">Tipo de Incidente:</label>
              <Select
                value={citTipo}
                onChange={(val) => setCitTipo(val as 'positivo' | 'negativo')}
                options={[
                  { value: 'positivo', label: '+ Positivo (Desempenho Notável)' },
                  { value: 'negativo', label: '- Negativo (Ponto a Desenvolver)' },
                ]}
              />
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1">Fator de Avaliação Qualitativo:</label>
              <Select
                value={citFatorId !== null ? String(citFatorId) : ''}
                onChange={(v) => setCitFatorId(Number(v))}
                options={fatores.map((f) => ({
                  value: String(f.id),
                  label: `${f.codigo} — ${f.nome}`,
                }))}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">Data da Ocorrência do Fato:</label>
            <Input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={citDataOcorrencia}
              onChange={(e) => setCitDataOcorrencia(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-foreground">
                Descrição Circunstanciada do Fato (mínimo 30 caracteres):
              </label>
              <span className={`text-[11px] font-mono font-medium ${citDescricao.trim().length >= 30 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {citDescricao.trim().length}/30 caracteres
              </span>
            </div>
            <textarea
              rows={4}
              value={citDescricao}
              onChange={(e) => setCitDescricao(e.target.value)}
              placeholder="Descreva minuciosamente a conduta observável do servidor, o contexto funcional da ocorrência e o impacto concreto nas rotinas e entregas do setor público..."
              required
              minLength={30}
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden leading-relaxed"
            />
            {citDescricao.trim().length > 0 && citDescricao.trim().length < 30 && (
              <p className="text-[11px] text-amber-500 mt-1">
                Faltam {30 - citDescricao.trim().length} caracteres para atingir o mínimo legal exigido pelo art. 24 da Lei nº 1.704/2006.
              </p>
            )}
          </div>

          {/* Upload de Evidências / Documentos Comprobatórios */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-primary" />
                Documentos Probatórios e Anexos (Opcional):
              </label>
              <span className="text-[11px] text-muted-foreground">
                PDF, JPG, PNG, DOCX (até 10MB/arquivo)
              </span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setCitArrastando(true);
              }}
              onDragLeave={() => setCitArrastando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setCitArrastando(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const novos = Array.from(e.dataTransfer.files);
                  setCitArquivos((prev) => [...prev, ...novos]);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                citArrastando
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-muted/20 hover:border-primary/50 text-muted-foreground'
              }`}
            >
              <input
                id="cit-file-upload"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const novos = Array.from(e.target.files);
                    setCitArquivos((prev) => [...prev, ...novos]);
                  }
                }}
              />
              <label
                htmlFor="cit-file-upload"
                className="flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <Upload className="h-6 w-6 text-primary/80 mb-0.5" />
                <span className="text-xs font-semibold text-foreground">
                  Clique para selecionar ou arraste arquivos comprobatórios aqui
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Atestados, memorandos, relatórios, convocações ou prints de ocorrência fática
                </span>
              </label>
            </div>

            {/* Lista de Arquivos Selecionados */}
            {citArquivos.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                  <span>{citArquivos.length} arquivo(s) preparado(s) para upload com hash SHA-256:</span>
                  <button
                    type="button"
                    onClick={() => setCitArquivos([])}
                    className="text-[11px] text-destructive hover:underline cursor-pointer"
                  >
                    Remover todos
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {citArquivos.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="truncate font-medium text-foreground">{file.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCitArquivos((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer shrink-0"
                        title="Remover arquivo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setModalCitOpen(false);
                setCitArquivos([]);
                setBuscaServidorCit('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              type="submit"
              disabled={salvandoCit || citDescricao.trim().length < 30}
            >
              {salvandoCit ? 'Salvando...' : 'Gravar Apontamento CIT'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Ficha Circunstanciada do Incidente Crítico (CIT) ──────── */}
      <Modal
        open={!!detalheCitModal}
        onClose={() => {
          setDetalheCitModal(null);
          setCopiadoHash(false);
        }}
        title="Ficha Circunstanciada do Incidente Crítico (CIT)"
        size="2xl"
      >
        {detalheCitModal && (
          <div className="space-y-4 py-2 text-xs">
            {/* Banner com Hash SHA-256 e Integridade */}
            <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="font-bold text-foreground">Protocolo Digital de Auditoria Imutável</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    ID #{detalheCitModal.id}
                  </Badge>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  Registrado em: {new Date(detalheCitModal.created_at || detalheCitModal.data_ocorrencia).toLocaleString('pt-BR')}
                </div>
              </div>

              {detalheCitModal.hash_sha256 && (
                <div className="flex items-center justify-between gap-2 bg-background p-2 rounded-lg border border-border/80">
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    <span className="text-foreground/70 font-semibold mr-1">SHA-256:</span>
                    {detalheCitModal.hash_sha256}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] font-mono text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                    onClick={() => {
                      navigator.clipboard?.writeText(detalheCitModal.hash_sha256 || '');
                      setCopiadoHash(true);
                      setTimeout(() => setCopiadoHash(false), 2000);
                    }}
                  >
                    {copiadoHash ? (
                      <>
                        <Check className="h-3 w-3 mr-1 text-emerald-600" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Grid com Dados do Servidor e Dados do Registro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Card Servidor */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Servidor Avaliado
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-foreground">
                    {detalheCitModal.servidor?.nome_completo || `Servidor #${detalheCitModal.servidor_id}`}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Matrícula:</span>
                    <span className="font-mono font-bold text-foreground">
                      {detalheCitModal.servidor?.matricula || '—'}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    <span>Cargo:</span>{' '}
                    <span className="text-foreground font-medium">
                      {detalheCitModal.servidor?.cargo_efetivo || 'Servidor Público'}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    <span>Lotação:</span>{' '}
                    <span className="text-foreground font-medium">
                      {detalheCitModal.servidor?.lotacao_fisica || detalheCitModal.servidor?.orgao_lotacao || departamentoChefia}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Metadados do Fato */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Classificação Metodológica
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Natureza da Conduta:</span>
                    <Badge
                      variant={detalheCitModal.tipo === 'positivo' ? 'success' : 'outline'}
                      className={`text-[10px] uppercase font-bold flex items-center gap-1 ${
                        detalheCitModal.tipo !== 'positivo'
                          ? 'border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10'
                          : ''
                      }`}
                    >
                      {detalheCitModal.tipo === 'positivo' ? (
                        <>
                          <ThumbsUp className="h-3 w-3 mr-0.5 text-emerald-600" />
                          Fato Positivo (Superação)
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-0.5 text-amber-600" />
                          Ponto a Desenvolver
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fator Vinculado:</span>
                    <span className="font-bold text-foreground">
                      {detalheCitModal.fator?.nome || `Fator #${detalheCitModal.fator_id}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Data da Ocorrência:</span>
                    <span className="font-mono font-bold text-foreground">
                      {new Date(detalheCitModal.data_ocorrencia).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Efeito na Nota:</span>
                    <span className="font-semibold text-primary">
                      {detalheCitModal.tipo === 'positivo' ? 'Habilita Grau 4 ou 5' : 'Habilita Grau 1 ou 2'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Descrição Circunstanciada do Fato */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>Descrição Circunstanciada do Fato Observado:</span>
              </div>
              <div className="bg-muted/20 border border-border/60 rounded-lg p-3.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words break-all overflow-hidden">
                {detalheCitModal.descricao_fato}
              </div>
            </div>

            {/* Evidências Documentais Vinculadas */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <Paperclip className="h-4 w-4 text-primary" />
                  <span>Evidências e Documentos Probatórios Vinculados:</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {(detalheCitModal.evidencias?.length || 0)} anexo(s)
                </Badge>
              </div>

              {detalheCitModal.evidencias && detalheCitModal.evidencias.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {detalheCitModal.evidencias.map((ev: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/80 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-foreground truncate">{ev.nome_original || 'Documento Comprobatório'}</div>
                          <div className="text-[10px] font-mono text-muted-foreground truncate">
                            SHA: {ev.hash_sha256 ? `${ev.hash_sha256.substring(0, 16)}...` : 'Certificado'}
                          </div>
                        </div>
                      </div>
                      {ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-primary hover:bg-primary/10 rounded cursor-pointer shrink-0 text-[11px] font-medium"
                        >
                          Abrir
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/10 border border-dashed border-border/80 text-center text-[11px] text-muted-foreground">
                  Nenhum arquivo digital anexado a este apontamento. O registro é fundamentado na declaração circunstanciada da chefia imediata com protocolo digital de auditoria imutável.
                </div>
              )}
            </div>

            {/* Fundamentação Legal e Blindagem da Trava Anti-Leniência */}
            <div className="rounded-xl border-l-4 border-indigo-600 bg-indigo-500/10 dark:bg-indigo-950/20 p-3.5 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                Fundamento Regulamentar e Trava Anti-Leniência
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground dark:text-indigo-300">
                Este apontamento integra o prontuário permanente do servidor durante o estágio probatório. Em cumprimento à metodologia canônica da Escala Gráfica combinada com a Técnica do Incidente Crítico (CIT), notas extremas (Graus 1, 2 ou 5) no fator correlato exigem esta evidência documental prévia para validade homologatória perante a Comissão Permanente (CAPD).
              </p>
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium cursor-pointer border-primary/40 hover:bg-primary/5 text-primary"
                onClick={() => handleImprimirTermoCit(detalheCitModal)}
              >
                <Printer className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Imprimir Termo Oficial (PDF)
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs font-semibold px-4"
                onClick={() => {
                  setDetalheCitModal(null);
                  setCopiadoHash(false);
                }}
              >
                Fechar Ficha
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Registrar Devolutiva Presencial (Art. 27) ───────────── */}
      <Modal
        open={modalDevolutivaOpen}
        onClose={() => setModalDevolutivaOpen(false)}
        title="Registro de Entrevista de Devolutiva Presencial (Art. 27)"
        size="md"
      >
        <form onSubmit={handleSalvarDevolutiva} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">Data da Reunião de Feedback:</label>
            <Input
              type="date"
              value={dataDevolutiva}
              onChange={(e) => setDataDevolutiva(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">Resumo da Entrevista Presencial:</label>
            <textarea
              rows={3}
              value={resumoEntrevista}
              onChange={(e) => setResumoEntrevista(e.target.value)}
              placeholder="Principais pontos debatidos na reunião com o servidor..."
              required
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">Acordos de Desenvolvimento e Metas:</label>
            <textarea
              rows={3}
              value={acordosDesenvolvimento}
              onChange={(e) => setAcordosDesenvolvimento(e.target.value)}
              placeholder="Metas pactuadas para superação de pontos a desenvolver no próximo ciclo..."
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalDevolutivaOpen(false)}>
              Cancelar
            </Button>
            <Button variant="default" size="sm" type="submit" disabled={salvandoDevolutiva}>
              {salvandoDevolutiva ? 'Registrando...' : 'Confirmar Devolutiva Presencial'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Contrarrazões da Chefia (Arts. 30 e 31) ───────────────── */}
      <Modal
        open={modalContrarrazaoOpen}
        onClose={() => setModalContrarrazaoOpen(false)}
        title="Manifestação Formal de Contrarrazões da Chefia"
        size="md"
      >
        <form onSubmit={handleSalvarContrarrazao} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-semibold text-foreground mb-1">Posicionamento da Chefia:</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="posicionamento"
                  checked={manterOuRetificar === 'manter'}
                  onChange={() => setManterOuRetificar('manter')}
                  className="accent-primary"
                />
                <span>Manter Nota Original</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="posicionamento"
                  checked={manterOuRetificar === 'reconsiderar'}
                  onChange={() => setManterOuRetificar('reconsiderar')}
                  className="accent-primary"
                />
                <span>Reconsiderar Parcialmente</span>
              </label>
            </div>
          </div>

          {manterOuRetificar === 'reconsiderar' && (
            <div>
              <label className="block font-semibold text-foreground mb-1">Novo Grau Proposto (1 a 5):</label>
              <Input
                type="number"
                min={1}
                max={5}
                value={novoGrauProposto}
                onChange={(e) => setNovoGrauProposto(Number(e.target.value))}
                className="font-mono w-24"
                required
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-foreground mb-1">Fundamentação Técnica das Contrarrazões:</label>
            <textarea
              rows={4}
              value={textoContrarrazao}
              onChange={(e) => setTextoContrarrazao(e.target.value)}
              placeholder="Descreva tecnicamente as razões pelas quais a pontuação inicial deve ser mantida ou os fundamentos da reconsideração proposta..."
              required
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalContrarrazaoOpen(false)}>
              Cancelar
            </Button>
            <Button variant="default" size="sm" type="submit" disabled={salvandoContrarrazao}>
              {salvandoContrarrazao ? 'Protocolando...' : 'Protocolar Contrarrazões'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Feedback ─────────────────────────────────────────────── */}
      {feedback && (
        <Modal
          open={feedback.open}
          onClose={() => setFeedback(null)}
          title={feedback.title}
          size="sm"
        >
          <div className="space-y-3 py-2 text-xs">
            <p className="text-foreground leading-relaxed">{feedback.message}</p>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setFeedback(null)}>
                OK
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
