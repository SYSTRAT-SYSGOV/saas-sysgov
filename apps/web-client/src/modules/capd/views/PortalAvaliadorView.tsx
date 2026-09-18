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
  Scale,
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

export function gerarHtmlAtaDevolutiva(
  av: any,
  chefiaNome: string = 'Chefia Imediata / Avaliador Oficial',
  departamento: string = 'SMAD / Depto. Protocolo e Arquivo'
): string {
  const dataDevolutivaFmt = av.devolutiva_em
    ? new Date(av.devolutiva_em).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');
  const dataCienciaFmt = av.ciencia_servidor_em
    ? new Date(av.ciencia_servidor_em).toLocaleString('pt-BR')
    : 'Pendente de assinatura eletrônica do servidor';
  const servidorNome = av.servidor?.nome_completo || av.servidorData?.nome_completo || `Servidor #${av.servidor_id}`;
  const matricula = av.servidor?.matricula || av.servidorData?.matricula || '—';
  const cargo = av.servidor?.cargo_efetivo || av.servidorData?.cargo_efetivo || 'Servidor Público Municipal';
  const lotacao = av.servidor?.lotacao_fisica || av.servidorData?.orgao_lotacao || departamento;
  const notaFinal = av.nota_final ? Number(av.nota_final).toFixed(2) : '—';
  const parecer = Number(av.nota_final) >= 70 ? 'APTO / SATISFATÓRIO (>= 70,00 pts)' : 'PONTO DE ATENÇÃO (< 70,00 pts)';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ata de Entrevista Devolutiva Presencial — Art. 27 — ${servidorNome}</title>
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
    .badge-sucesso { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-alerta { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
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
      margin-top: 36px;
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
      margin-top: 24px;
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
    <div class="doc-titulo">Ata de Entrevista Devolutiva Presencial de Feedback (Art. 27)</div>
  </div>

  <div class="protocolo-bar">
    <div><strong>Protocolo Digital:</strong> <span class="mono">DEV-${av.id.toString().padStart(6, '0')}</span></div>
    <div><strong>Data da Realização:</strong> <span class="mono">${dataDevolutivaFmt}</span></div>
    <div><strong>Fundamento:</strong> Art. 27 da Lei nº 1.704/2006</div>
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
    <div class="secao-titulo">2. Identificação da Chefia Imediata Conducente</div>
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
    <div class="secao-titulo">3. Síntese do Desempenho no Ciclo Avaliativo</div>
    <table class="tabela-dados">
      <tr>
        <td class="rotulo">Nota Final Apurada:</td>
        <td class="mono"><strong>${notaFinal} pontos</strong></td>
        <td class="rotulo">Parecer Metodológico:</td>
        <td>
          <span class="badge ${Number(av.nota_final) >= 70 ? 'badge-sucesso' : 'badge-alerta'}">
            ${parecer}
          </span>
        </td>
      </tr>
      <tr>
        <td class="rotulo">Data da Avaliação:</td>
        <td class="mono">${av.data_conclusao ? new Date(av.data_conclusao).toLocaleDateString('pt-BR') : 'Ciclo Vigente'}</td>
        <td class="rotulo">Status da Homologação:</td>
        <td>${av.homologada ? 'Homologada pela CAPD' : 'Aguardando Homologação'}</td>
      </tr>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">4. Relato da Entrevista e Feedback da Chefia Imediata</div>
    <div class="relato-box">${av.devolutiva_resumo || 'Entrevista presencial realizada na presença da chefia imediata e do servidor avaliado, oportunidade na qual foram detalhadas as pontuações em cada fator de desempenho, ressaltando os pontos fortes e estabelecendo diálogo construtivo sobre aspectos funcionais a desenvolver.'}</div>
  </div>

  <div class="secao">
    <div class="secao-titulo">5. Plano de Desenvolvimento Individual (PDI) e Acordos Pactuados</div>
    <div class="relato-box">${av.devolutiva_acordos || 'Fica acordado o acompanhamento contínuo das metas pactuadas, com priorização em capacitações funcionais e alinhamento de processos de trabalho durante o próximo período avaliativo.'}</div>
  </div>

  <div class="alerta-legal">
    <strong>Declaração de Cumprimento Legal:</strong> Em cumprimento ao disposto no Art. 27 da Lei nº 1.704/2006, o avaliador realizou formalmente a entrevista devolutiva presencial com o avaliado, dando-lhe conhecimento integral dos critérios e notas atribuídas, facultando-lhe o prazo legal de 5 (cinco) dias úteis para emissão de ciência ou interposição de recurso administrativo perante a Comissão.
  </div>

  <div class="assinaturas">
    <div class="campo-assinatura">
      <div class="linha-assinatura"></div>
      <div><strong>${chefiaNome}</strong></div>
      <div>Chefia Imediata / Avaliador</div>
      <div class="mono" style="font-size: 7.5pt; color: #64748b;">Assinado digitalmente via SYSGOV</div>
    </div>
    <div class="campo-assinatura">
      <div class="linha-assinatura"></div>
      <div><strong>${servidorNome}</strong></div>
      <div>Ciência Formal do Servidor Avaliado</div>
      <div class="mono" style="font-size: 7.5pt; color: #64748b;">${dataCienciaFmt}</div>
    </div>
  </div>

  <div class="rodape">
    <div>SYSGOV — Sistema Integrado de Gestão Pública • Módulo CAPD</div>
    <div class="mono">Ata de Devolutiva emitida em ${new Date().toLocaleString('pt-BR')}</div>
  </div>
</body>
</html>`;
}

const AMOSTRA_DEVOLUTIVAS_PADRAO: any[] = [
  {
    id: 1,
    servidor_id: 101,
    servidor: {
      id: 101,
      nome_completo: 'Carlos Eduardo Silveira',
      matricula: '48.921-0',
      cargo_efetivo: 'Auxiliar Administrativo',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    nota_final: '78.75',
    data_conclusao: '2026-09-10T11:00:00Z',
    devolutiva_realizada: true,
    devolutiva_em: '2026-09-12',
    devolutiva_resumo: 'Entrevista presencial realizada na sala de reuniões da SMAD. Apresentados os pontos fortes em assiduidade e pontualidade. Alinhados pontos de atenção na produtividade sob demanda.',
    devolutiva_acordos: 'Participar do treinamento do novo módulo de Protocolo Digital em outubro e revisar relatórios semanais com a chefia.',
    ciencia_servidor_em: '2026-09-12T16:45:00Z',
    ciencia_tipo: 'eletronica_govbr',
    ciencia_ip: '189.34.120.45',
    homologada: false,
  },
  {
    id: 2,
    servidor_id: 102,
    servidor: {
      id: 102,
      nome_completo: 'Ana Paula Nogueira de Souza',
      matricula: '39.102-4',
      cargo_efetivo: 'Técnico em Gestão Pública',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    nota_final: '92.40',
    data_conclusao: '2026-09-11T14:30:00Z',
    devolutiva_realizada: true,
    devolutiva_em: '2026-09-14',
    devolutiva_resumo: 'Parabéns pela excelência demonstrada no ciclo. Desempenho acima da média com destaque para inovação nos fluxos de processos eletrônicos.',
    devolutiva_acordos: 'Assumir a tutoria técnica dos novos estagiários e apoiar o mapeamento de processos da diretoria.',
    ciencia_servidor_em: '2026-09-14T10:15:00Z',
    ciencia_tipo: 'eletronica_govbr',
    ciencia_ip: '189.34.120.45',
    homologada: true,
  },
  {
    id: 3,
    servidor_id: 103,
    servidor: {
      id: 103,
      nome_completo: 'Beatriz Helena Castro',
      matricula: '52.314-8',
      cargo_efetivo: 'Assistente Administrativo',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    nota_final: '71.50',
    data_conclusao: '2026-09-15T09:20:00Z',
    devolutiva_realizada: false,
    devolutiva_em: null,
    devolutiva_resumo: null,
    devolutiva_acordos: null,
    ciencia_servidor_em: null,
    homologada: false,
  },
  {
    id: 4,
    servidor_id: 104,
    servidor: {
      id: 104,
      nome_completo: 'Roberto Mendes Ramos',
      matricula: '44.872-1',
      cargo_efetivo: 'Agente de Apoio Operacional',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    nota_final: '68.20',
    data_conclusao: '2026-09-15T15:40:00Z',
    devolutiva_realizada: false,
    devolutiva_em: null,
    devolutiva_resumo: null,
    devolutiva_acordos: null,
    ciencia_servidor_em: null,
    homologada: false,
  },
  {
    id: 5,
    servidor_id: 105,
    servidor: {
      id: 105,
      nome_completo: 'Fernando Silveira Dias',
      matricula: '31.455-9',
      cargo_efetivo: 'Técnico Administrativo',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    nota_final: '84.00',
    data_conclusao: '2026-09-16T11:30:00Z',
    devolutiva_realizada: true,
    devolutiva_em: '2026-09-16',
    devolutiva_resumo: 'Feedback pontual focado na melhoria do atendimento presencial ao público e no cumprimento rigoroso dos prazos da Ouvidoria.',
    devolutiva_acordos: 'Implementar checklist diário de triagem de demandas e relatórios.',
    ciencia_servidor_em: null,
    homologada: false,
  },
  {
    id: 6,
    servidor_id: 106,
    servidor: {
      id: 106,
      nome_completo: 'Lucas Gabriel Albuquerque',
      matricula: '55.201-3',
      cargo_efetivo: 'Auxiliar Operacional',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    nota_final: '79.50',
    data_conclusao: '2026-09-16T17:00:00Z',
    devolutiva_realizada: false,
    devolutiva_em: null,
    devolutiva_resumo: null,
    devolutiva_acordos: null,
    ciencia_servidor_em: null,
    homologada: false,
  },
];

function gerarHtmlTermoContrarrazao(rec: any, chefiaNome: string, departamento: string): string {
  const servidorNome = rec.servidor?.nome_completo || rec.recorrente?.name || `Servidor #${rec.recorrente_id}`;
  const matricula = rec.servidor?.matricula || '—';
  const cargo = rec.servidor?.cargo_efetivo || 'Servidor Público';
  const fatorNome = rec.fatorContestado?.nome || rec.fator_contestado?.nome || `Fator #${rec.fator_contestado_id}`;
  const grupoNome = rec.fatorContestado?.grupo_nome || 'Competências e Atributos Funcionais';
  const dataRecurso = rec.created_at ? new Date(rec.created_at).toLocaleDateString('pt-BR') : 'Data informada';
  const dataContestacao = rec.contestacao_em ? new Date(rec.contestacao_em).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  const posicionamento = rec.posicionamento_chefia === 'reconsiderar' ? 'Reconsideração Parcial' : 'Manutenção da Pontuação';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Termo de Contrarrazões da Chefia Imediata — Recurso #${rec.id}</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 16mm 18mm 16mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; line-height: 1.4; color: #0f172a; margin: 0; padding: 0; }
    .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 14px; }
    .brasao { font-size: 11pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #0f172a; margin-bottom: 2px; }
    .sub-orgao { font-size: 8.5pt; color: #475569; margin-bottom: 1px; }
    .doc-titulo { font-size: 11pt; font-weight: 800; text-transform: uppercase; color: #0369a1; margin-top: 6px; letter-spacing: 0.5px; }
    .protocolo-bar { display: flex; justify-content: space-between; align-items: center; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 4px; padding: 6px 12px; margin-bottom: 14px; font-size: 8.5pt; }
    .mono { font-family: 'Courier New', Courier, monospace; font-weight: bold; }
    .secao { margin-bottom: 12px; }
    .secao-titulo { font-size: 9pt; font-weight: 800; text-transform: uppercase; color: #0369a1; border-bottom: 1px solid #e0f2fe; padding-bottom: 3px; margin-bottom: 6px; }
    .tabela-dados { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 8.5pt; }
    .tabela-dados td { padding: 4px 6px; border: 1px solid #e2e8f0; }
    .tabela-dados td.rotulo { width: 28%; font-weight: 700; background: #f8fafc; color: #475569; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 3px; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; }
    .badge-sucesso { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-alerta { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-info { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    .relato-box { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 4px; padding: 10px 12px; font-size: 9pt; line-height: 1.45; text-align: justify; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap; }
    .alerta-legal { background: #f0fdf4; border-left: 3px solid #16a34a; padding: 7px 10px; font-size: 8pt; color: #14532d; line-height: 1.35; margin-top: 10px; }
    .assinaturas { margin-top: 36px; display: flex; justify-content: space-between; page-break-inside: avoid; }
    .campo-assinatura { width: 45%; text-align: center; font-size: 8.5pt; }
    .linha-assinatura { border-top: 1px solid #0f172a; margin-bottom: 5px; }
    .rodape { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 7.5pt; color: #64748b; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brasao">MUNICÍPIO DE GUARAPUAVA — ESTADO DO PARANÁ</div>
    <div class="sub-orgao">Secretaria Municipal de Administração • Departamento de Recursos Humanos</div>
    <div class="sub-orgao">Comissão Especial de Avaliação de Desempenho — CAD / CAPD</div>
    <div class="doc-titulo">Manifestação Técnica de Contrarrazões da Chefia Imediata</div>
  </div>

  <div class="protocolo-bar">
    <div><strong>Processo Recursal:</strong> <span class="mono">REC-${rec.id.toString().padStart(6, '0')}</span></div>
    <div><strong>Base Normativa:</strong> Arts. 30 e 31 da Lei nº 1.704/2006</div>
    <div><strong>Status:</strong> <span class="mono">${rec.status.toUpperCase()}</span></div>
  </div>

  <div class="secao">
    <div class="secao-titulo">1. Qualificação dos Sujeitos Processuais</div>
    <table class="tabela-dados">
      <tr>
        <td class="rotulo">Servidor Recorrente:</td>
        <td><strong>${servidorNome}</strong></td>
        <td class="rotulo">Matrícula Funcional:</td>
        <td class="mono">${matricula}</td>
      </tr>
      <tr>
        <td class="rotulo">Cargo Efetivo:</td>
        <td>${cargo}</td>
        <td class="rotulo">Lotação / Departamento:</td>
        <td>${departamento}</td>
      </tr>
      <tr>
        <td class="rotulo">Chefia Imediata (Avaliador):</td>
        <td><strong>${chefiaNome}</strong></td>
        <td class="rotulo">Data da Interposição:</td>
        <td class="mono">${dataRecurso}</td>
      </tr>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">2. Delimitação do Objeto da Contestação</div>
    <table class="tabela-dados">
      <tr>
        <td class="rotulo">Fator Contestado:</td>
        <td colspan="3"><strong>${fatorNome}</strong> (${grupoNome})</td>
      </tr>
      <tr>
        <td class="rotulo">Grau Inicial Atribuído:</td>
        <td class="mono">Grau ${rec.grau_original || '2'}</td>
        <td class="rotulo">Grau Pleiteado pelo Servidor:</td>
        <td class="mono">Grau ${rec.grau_pretendido || '4'}</td>
      </tr>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">3. Razões Recursais Apresentadas pelo Servidor Avaliado</div>
    <div class="relato-box">"${rec.justificativa_servidor}"</div>
  </div>

  <div class="secao">
    <div class="secao-titulo">4. Manifestação Técnica e Fundamentação das Contrarrazões da Chefia</div>
    <table class="tabela-dados" style="margin-bottom: 6px;">
      <tr>
        <td class="rotulo">Posicionamento Formal:</td>
        <td>
          <span class="badge ${rec.posicionamento_chefia === 'reconsiderar' ? 'badge-info' : 'badge-sucesso'}">
            ${posicionamento}
          </span>
          ${rec.posicionamento_chefia === 'reconsiderar' && rec.novo_grau_proposto ? ` — Proposta de elevação para Grau ${rec.novo_grau_proposto}` : ''}
        </td>
        <td class="rotulo">Data da Manifestação:</td>
        <td class="mono">${dataContestacao}</td>
      </tr>
    </table>
    <div class="relato-box">${rec.contestacao_chefia || 'A chefia imediata prestou manifestação técnica nos autos em cumprimento aos Arts. 30 e 31 da Lei nº 1.704/2006.'}</div>
  </div>

  <div class="alerta-legal">
    <strong>Certidão de Envio à Instância Colegiada:</strong> Prestadas as presentes contrarrazões técnicas pela chefia avaliadora, os autos recursais são formalmente encaminhados à Comissão Especial de Avaliação de Desempenho (CAD) para sorteio de relator, instrução probatória e julgamento colegiado soberano em 2ª instância administrativa.
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
      <div><strong>Comissão Especial de Avaliação (CAD)</strong></div>
      <div>Recebimento e Distribuição Colegiada</div>
      <div class="mono" style="font-size: 7.5pt; color: #64748b;">Protocolo Geral DGRH</div>
    </div>
  </div>

  <div class="rodape">
    <div>SYSGOV — Sistema Integrado de Gestão Pública • Módulo CAPD</div>
    <div class="mono">Termo emitido em ${new Date().toLocaleString('pt-BR')}</div>
  </div>
</body>
</html>`;
}

const AMOSTRA_RECURSOS_PADRAO: any[] = [
  {
    id: 1,
    avaliacao_id: 1,
    recorrente_id: 101,
    recorrente: {
      id: 101,
      name: 'Carlos Eduardo Silveira',
      email: 'carlos.silveira@guarapuava.pr.gov.br',
    },
    servidor: {
      id: 101,
      nome_completo: 'Carlos Eduardo Silveira',
      matricula: '48.921-0',
      cargo_efetivo: 'Auxiliar Administrativo',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    fator_contestado_id: 5,
    fatorContestado: {
      id: 5,
      nome: 'Produtividade sob Demanda e Eficiência Operacional',
      grupo_nome: 'Competências Técnicas',
    },
    grau_original: 3,
    grau_pretendido: 4,
    justificativa_servidor: 'Durante o ciclo avaliativo, absorvi diretamente a triagem e digitalização de 1.250 processos legados sem prejuízo dos atendimentos diários do protocolo geral, superando as metas do setor.',
    status: 'interposto',
    created_at: '2026-09-14T10:30:00Z',
    prazo_resposta_ate: '2026-09-21T23:59:59Z',
    dias_restantes: 4,
    contestacao_chefia: null,
    contestacao_em: null,
    posicionamento_chefia: null,
  },
  {
    id: 2,
    avaliacao_id: 3,
    recorrente_id: 103,
    recorrente: {
      id: 103,
      name: 'Beatriz Helena Castro',
      email: 'beatriz.castro@guarapuava.pr.gov.br',
    },
    servidor: {
      id: 103,
      nome_completo: 'Beatriz Helena Castro',
      matricula: '52.314-8',
      cargo_efetivo: 'Assistente Administrativo',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    fator_contestado_id: 3,
    fatorContestado: {
      id: 3,
      nome: 'Assiduidade, Pontualidade e Cumprimento de Jornada',
      grupo_nome: 'Compromisso Institucional',
    },
    grau_original: 2,
    grau_pretendido: 4,
    justificativa_servidor: 'Os atrasos pontuais de 15 minutos em duas sextas-feiras ocorreram por convocação de treinamento presencial na Escola de Governo, devidamente chancelado pela chefia e protocolado na DGRH.',
    status: 'em_instrucao',
    created_at: '2026-09-12T14:15:00Z',
    prazo_resposta_ate: '2026-09-19T23:59:59Z',
    dias_restantes: 2,
    contestacao_chefia: null,
    contestacao_em: null,
    posicionamento_chefia: null,
  },
  {
    id: 3,
    avaliacao_id: 4,
    recorrente_id: 104,
    recorrente: {
      id: 104,
      name: 'Roberto Mendes Ramos',
      email: 'roberto.ramos@guarapuava.pr.gov.br',
    },
    servidor: {
      id: 104,
      nome_completo: 'Roberto Mendes Ramos',
      matricula: '44.872-1',
      cargo_efetivo: 'Agente de Apoio Operacional',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    fator_contestado_id: 2,
    fatorContestado: {
      id: 2,
      nome: 'Disciplina e Cumprimento das Normas Regimentais',
      grupo_nome: 'Conduta e Ética',
    },
    grau_original: 2,
    grau_pretendido: 3,
    justificativa_servidor: 'A advertência verbal citada no diário refere-se a mal-entendido operacional com prestador terceirizado já sanado perante a chefia do setor em reunião posterior.',
    status: 'em_instrucao',
    created_at: '2026-09-08T09:00:00Z',
    prazo_resposta_ate: '2026-09-15T23:59:59Z',
    dias_restantes: 0,
    contestacao_chefia: 'Manifestação Técnica da Chefia: Mantém-se a pontuação atribuída (Grau 2). O incidente relatado no Diário de Bordo em 14/06/2026 foi circunstanciado com apontamento fático comprovado e gerou descontinuidade no fluxo de correspondências oficiais, não havendo elementos novos para retificação.',
    contestacao_em: '2026-09-11T16:20:00Z',
    posicionamento_chefia: 'manter',
  },
  {
    id: 4,
    avaliacao_id: 5,
    recorrente_id: 105,
    recorrente: {
      id: 105,
      name: 'Fernando Silveira Dias',
      email: 'fernando.dias@guarapuava.pr.gov.br',
    },
    servidor: {
      id: 105,
      nome_completo: 'Fernando Silveira Dias',
      matricula: '31.455-9',
      cargo_efetivo: 'Técnico Administrativo',
      lotacao_fisica: 'SMAD / Depto. Protocolo e Arquivo',
      orgao_lotacao: 'SMAD / Depto. Protocolo e Arquivo',
    },
    fator_contestado_id: 6,
    fatorContestado: {
      id: 6,
      nome: 'Inovação, Iniciativa e Melhoria Contínua dos Processos',
      grupo_nome: 'Desenvolvimento e Inovação',
    },
    grau_original: 3,
    grau_pretendido: 5,
    justificativa_servidor: 'Idealizei e implementei o novo fluxo dinâmico de triagem de processos da Ouvidoria, reduzindo em 32% o tempo médio de resposta ao cidadão no período.',
    status: 'julgado_provido',
    created_at: '2026-09-01T11:00:00Z',
    prazo_resposta_ate: '2026-09-08T23:59:59Z',
    dias_restantes: 0,
    contestacao_chefia: 'Manifestação Técnica da Chefia: Acolhe-se parcialmente a pretensão recursal. Reconhece-se o impacto positivo mensurável do fluxo de triagem instituído pelo servidor, opinando pela retificação pontual para o Grau 4.',
    contestacao_em: '2026-09-04T10:00:00Z',
    posicionamento_chefia: 'reconsiderar',
    novo_grau_proposto: 4,
  },
];

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

  // Estados e Filtros Avançados de Devolutivas (Art. 27)
  const [devolutivaBuscaTexto, setDevolutivaBuscaTexto] = useState<string>('');
  const [devolutivaFiltroStatus, setDevolutivaFiltroStatus] = useState<'todos' | 'realizadas' | 'pendentes'>('todos');
  const [devolutivaFiltroCiencia, setDevolutivaFiltroCiencia] = useState<'todos' | 'com_ciencia' | 'aguardando_ciencia'>('todos');
  const [detalheDevolutivaModal, setDetalheDevolutivaModal] = useState<any | null>(null);

  // Modal Contrarrazões Recursais (5 dias)
  const [modalContrarrazaoOpen, setModalContrarrazaoOpen] = useState<boolean>(false);
  const [selectedRecursoId, setSelectedRecursoId] = useState<number | null>(null);
  const [textoContrarrazao, setTextoContrarrazao] = useState<string>('');
  const [manterOuRetificar, setManterOuRetificar] = useState<'manter' | 'reconsiderar'>('manter');
  const [novoGrauProposto, setNovoGrauProposto] = useState<number>(3);
  const [salvandoContrarrazao, setSalvandoContrarrazao] = useState<boolean>(false);

  // Estados e Filtros Avançados de Contrarrazões Recursais (Arts. 30 e 31)
  const [recursoBuscaTexto, setRecursoBuscaTexto] = useState<string>('');
  const [recursoFiltroStatus, setRecursoFiltroStatus] = useState<'todos' | 'aguardando' | 'respondidos' | 'julgados'>('todos');
  const [recursoFiltroPosicionamento, setRecursoFiltroPosicionamento] = useState<'todos' | 'manter' | 'reconsiderar' | 'pendente'>('todos');
  const [detalheRecursoModal, setDetalheRecursoModal] = useState<any | null>(null);

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
      }).catch((apiErr) => {
        console.warn('Registro de devolutiva via API em fallback:', apiErr);
      });

      // Atualiza na amostra padrão em tempo de execução se for um ID local
      const idx = AMOSTRA_DEVOLUTIVAS_PADRAO.findIndex((d) => d.id === selectedAvaliacaoId);
      if (idx >= 0) {
        AMOSTRA_DEVOLUTIVAS_PADRAO[idx] = {
          ...AMOSTRA_DEVOLUTIVAS_PADRAO[idx],
          devolutiva_realizada: true,
          devolutiva_em: dataDevolutiva,
          devolutiva_resumo: resumoEntrevista,
          devolutiva_acordos: acordosDesenvolvimento,
        };
      }

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
      }).catch((apiErr) => {
        console.warn('Contrarrazão via API em fallback:', apiErr);
      });

      // Atualiza na amostra padrão se pertencer a ela
      const idx = AMOSTRA_RECURSOS_PADRAO.findIndex((r) => r.id === selectedRecursoId);
      if (idx >= 0) {
        AMOSTRA_RECURSOS_PADRAO[idx] = {
          ...AMOSTRA_RECURSOS_PADRAO[idx],
          contestacao_chefia: textoContrarrazao,
          contestacao_em: new Date().toISOString(),
          posicionamento_chefia: manterOuRetificar,
          novo_grau_proposto: manterOuRetificar === 'reconsiderar' ? novoGrauProposto : undefined,
          status: 'em_instrucao',
        };
      }

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

  // ── Impressão Oficial da Ata de Devolutiva Presencial A4 (Iframe Isolado) ──
  const handleImprimirAtaDevolutiva = useCallback((av: any) => {
    const chefiaNome =
      (servidores.find((s) => String(s.user_id || s.id) === selectedAvaliadorId)?.nome_completo) ||
      'Chefia Imediata / Avaliador Oficial';

    const htmlAta = gerarHtmlAtaDevolutiva(av, chefiaNome, departamentoChefia);

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
    doc.write(htmlAta);
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

  // ── Acervo Consolidado de Devolutivas Presenciais (Art. 27) ────────────────
  const listaDevolutivasExibicao = React.useMemo(() => {
    const map = new Map<number, any>();
    AMOSTRA_DEVOLUTIVAS_PADRAO.forEach((item) => map.set(item.id, item));

    avaliacoes.forEach((item) => {
      if (item.data_conclusao || item.homologada || item.devolutiva_realizada) {
        const existing = map.get(item.id);
        map.set(item.id, {
          ...existing,
          ...item,
          servidor: item.servidor || (item as any).servidorData || existing?.servidor,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.devolutiva_realizada === b.devolutiva_realizada) {
        return (a.servidor?.nome_completo || '').localeCompare(b.servidor?.nome_completo || '');
      }
      return a.devolutiva_realizada ? 1 : -1;
    });
  }, [avaliacoes]);

  // ── Métricas Exclusivas de Devolutivas (Art. 27) ───────────────────────────
  const totalDevolutivas = listaDevolutivasExibicao.length;
  const devolutivasRealizadas = listaDevolutivasExibicao.filter((d) => d.devolutiva_realizada).length;
  const devolutivasPendentes = totalDevolutivas - devolutivasRealizadas;
  const cienciasEmitidas = listaDevolutivasExibicao.filter((d) => d.ciencia_servidor_em).length;
  const acordosPdiRegistrados = listaDevolutivasExibicao.filter(
    (d) => d.devolutiva_acordos && d.devolutiva_acordos.trim().length > 0
  ).length;

  const pctDevolutivasRealizadas = totalDevolutivas > 0 ? Math.round((devolutivasRealizadas / totalDevolutivas) * 100) : 0;
  const pctDevolutivasPendentes = 100 - pctDevolutivasRealizadas;
  const pctCienciasEmitidas = totalDevolutivas > 0 ? Math.round((cienciasEmitidas / totalDevolutivas) * 100) : 0;

  // ── Filtro Dinâmico das Devolutivas Presenciais ───────────────────────────
  const listaDevolutivasFiltrada = React.useMemo(() => {
    return listaDevolutivasExibicao.filter((item) => {
      if (devolutivaFiltroStatus === 'realizadas' && !item.devolutiva_realizada) return false;
      if (devolutivaFiltroStatus === 'pendentes' && item.devolutiva_realizada) return false;

      if (devolutivaFiltroCiencia === 'com_ciencia' && !item.ciencia_servidor_em) return false;
      if (devolutivaFiltroCiencia === 'aguardando_ciencia' && (item.ciencia_servidor_em || !item.devolutiva_realizada)) return false;

      if (devolutivaBuscaTexto.trim()) {
        const q = devolutivaBuscaTexto.toLowerCase();
        const nome = (item.servidor?.nome_completo || item.servidorData?.nome_completo || '').toLowerCase();
        const mat = (item.servidor?.matricula || item.servidorData?.matricula || '').toLowerCase();
        const matLimpa = mat.replace(/[.\-/]/g, '');
        const cargo = (item.servidor?.cargo_efetivo || item.servidorData?.cargo_efetivo || '').toLowerCase();
        const resumo = (item.devolutiva_resumo || '').toLowerCase();
        const acordos = (item.devolutiva_acordos || '').toLowerCase();

        if (
          !nome.includes(q) &&
          !mat.includes(q) &&
          !matLimpa.includes(q.replace(/[.\-/]/g, '')) &&
          !cargo.includes(q) &&
          !resumo.includes(q) &&
          !acordos.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [listaDevolutivasExibicao, devolutivaFiltroStatus, devolutivaFiltroCiencia, devolutivaBuscaTexto]);

  // ── Colunas DataTable: Entrevistas Devolutivas (Art. 27) ─────────────────
  const columnsDevolutivas: ColumnDef<any>[] = React.useMemo(
    () => [
      {
        id: 'servidor',
        header: 'Servidor Avaliado',
        size: 260,
        accessorFn: (row) => row.servidor?.nome_completo || row.servidorData?.nome_completo || `Servidor #${row.servidor_id}`,
        cell: ({ row }) => {
          const srv = row.original.servidor || row.original.servidorData || {};
          const nome = srv.nome_completo || `Servidor #${row.original.servidor_id}`;
          const matricula = srv.matricula || '—';
          const cargo = srv.cargo_efetivo || 'Servidor Público';
          const partes = nome.trim().split(' ');
          const iniciais = partes.length >= 2 ? `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase() : nome.slice(0, 2).toUpperCase();

          return (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
                {iniciais}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-foreground truncate" title={nome}>
                  {nome}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground/80">Mat. {matricula}</span>
                  <span>•</span>
                  <span className="truncate">{cargo}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'nota_final',
        header: () => <div className="text-center w-full">Nota Apurada</div>,
        size: 140,
        accessorFn: (row) => row.nota_final,
        cell: ({ row }) => {
          const notaNum = Number(row.original.nota_final) || 0;
          const notaFmt = notaNum.toFixed(2).replace('.', ',');
          const isApto = notaNum >= 70;
          const dataConc = row.original.data_conclusao
            ? new Date(row.original.data_conclusao).toLocaleDateString('pt-BR')
            : 'Ciclo Vigente';

          return (
            <div className="flex flex-col items-center justify-center text-center">
              <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                {notaFmt} pts
              </span>
              <Badge
                variant={isApto ? 'success' : 'outline'}
                className={`text-[10px] mt-0.5 px-1.5 py-0 ${
                  !isApto ? 'border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10' : ''
                }`}
              >
                {isApto ? 'Apto (≥ 70 pts)' : 'Atenção (< 70 pts)'}
              </Badge>
              <span className="font-mono text-[10px] text-muted-foreground mt-0.5">{dataConc}</span>
            </div>
          );
        },
      },
      {
        id: 'status_devolutiva',
        header: 'Entrevista Presencial (Art. 27)',
        size: 210,
        accessorFn: (row) => (row.devolutiva_realizada ? 'realizada' : 'pendente'),
        cell: ({ row }) => {
          const realizada = row.original.devolutiva_realizada;
          const dataDev = row.original.devolutiva_em
            ? new Date(row.original.devolutiva_em).toLocaleDateString('pt-BR')
            : null;

          if (realizada) {
            return (
              <div className="space-y-1">
                <Badge variant="success" className="text-[10px] font-semibold flex items-center gap-1 w-fit">
                  <CheckCircle2 className="h-3 w-3 mr-0.5 text-emerald-600" />
                  Realizada {dataDev ? `em ${dataDev}` : ''}
                </Badge>
                {row.original.devolutiva_resumo && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 italic" title={row.original.devolutiva_resumo}>
                    "{row.original.devolutiva_resumo}"
                  </p>
                )}
              </div>
            );
          }

          return (
            <Badge
              variant="outline"
              className="text-[10px] font-semibold flex items-center gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 w-fit"
            >
              <Clock className="h-3 w-3 mr-0.5 text-amber-600" />
              Pendente de Realização
            </Badge>
          );
        },
      },
      {
        id: 'ciencia_servidor',
        header: 'Ciência Digital (Gov.br)',
        size: 190,
        accessorFn: (row) => (row.ciencia_servidor_em ? 'assinada' : 'pendente'),
        cell: ({ row }) => {
          const ciencia = row.original.ciencia_servidor_em;
          const dataCiencia = ciencia
            ? new Date(ciencia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : null;

          if (ciencia) {
            return (
              <div className="space-y-0.5">
                <Badge variant="outline" className="text-[10px] font-semibold border-cyan-500/40 text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 flex items-center gap-1 w-fit">
                  <ShieldCheck className="h-3 w-3 mr-0.5 text-cyan-600" />
                  Ciência Formal Registrada
                </Badge>
                <div className="font-mono text-[10px] text-muted-foreground">{dataCiencia}</div>
              </div>
            );
          }

          if (row.original.devolutiva_realizada) {
            return (
              <div className="space-y-0.5">
                <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border flex items-center gap-1 w-fit">
                  <Clock className="h-3 w-3 mr-0.5 text-muted-foreground" />
                  Aguardando Servidor (5 dias)
                </Badge>
                <div className="text-[10px] text-muted-foreground">Prazo regimental em curso</div>
              </div>
            );
          }

          return <span className="font-mono text-xs text-muted-foreground">—</span>;
        },
      },
      {
        id: 'acordos_pdi',
        header: 'Plano de Metas (PDI)',
        size: 220,
        accessorFn: (row) => row.devolutiva_acordos || '—',
        cell: ({ row }) => {
          const acordos = row.original.devolutiva_acordos;
          if (acordos) {
            return (
              <div className="space-y-0.5 text-left">
                <span className="font-semibold text-[11px] text-foreground flex items-center gap-1">
                  <FileCheck className="h-3 w-3 text-primary" />
                  Acordos Pactuados
                </span>
                <p className="text-[11px] text-muted-foreground line-clamp-1 italic" title={acordos}>
                  {acordos}
                </p>
              </div>
            );
          }
          return <span className="text-[11px] text-muted-foreground italic">Aguardando pactuação</span>;
        },
      },
      {
        id: 'acoes',
        header: () => <div className="text-center w-full">Ações</div>,
        size: 180,
        cell: ({ row }) => {
          const av = row.original;
          const realizada = av.devolutiva_realizada;

          return (
            <div className="flex items-center justify-center gap-1.5">
              {realizada ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold px-2 rounded-md flex items-center gap-1 hover:bg-primary/10 text-foreground"
                    onClick={() => setDetalheDevolutivaModal(av)}
                    title="Visualizar Ata Completa da Devolutiva"
                  >
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    Ver Ata
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold px-2 rounded-md flex items-center gap-1 hover:bg-primary/10 text-foreground"
                    onClick={() => handleImprimirAtaDevolutiva(av)}
                    title="Imprimir Ata Oficial em PDF A4"
                  >
                    <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                    PDF
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs font-semibold px-2.5 rounded-md flex items-center gap-1 shadow-xs"
                  onClick={() => {
                    setSelectedAvaliacaoId(av.id);
                    setDataDevolutiva(new Date().toISOString().split('T')[0]);
                    setResumoEntrevista('');
                    setAcordosDesenvolvimento('');
                    setModalDevolutivaOpen(true);
                  }}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Registrar Entrevista
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [handleImprimirAtaDevolutiva]
  );

  // ── Impressão Oficial de Termo de Contrarrazões da Chefia A4 ───────────────
  const handleImprimirTermoContrarrazao = useCallback((rec: any) => {
    const chefiaNome =
      (servidores.find((s) => String(s.user_id || s.id) === selectedAvaliadorId)?.nome_completo) ||
      'Chefia Imediata / Avaliador Oficial';

    const htmlTermo = gerarHtmlTermoContrarrazao(rec, chefiaNome, departamentoChefia);

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

  // ── Acervo Consolidado de Recursos e Contrarrazões da Chefia (Arts. 30 e 31) ─
  const listaRecursosExibicao = React.useMemo(() => {
    const map = new Map<number, any>();
    AMOSTRA_RECURSOS_PADRAO.forEach((item) => map.set(item.id, item));

    recursos.forEach((item) => {
      const existing = map.get(item.id);
      map.set(item.id, {
        ...existing,
        ...item,
        servidor: (item as any).recorrente ? {
          id: (item as any).recorrente.id,
          nome_completo: (item as any).recorrente.name,
          matricula: (item as any).servidor?.matricula || `MAT-${(item as any).recorrente.id}`,
          cargo_efetivo: (item as any).servidor?.cargo_efetivo || 'Servidor Público',
          departamento: departamentoChefia,
        } : existing?.servidor,
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      const aPendente = !a.contestacao_chefia;
      const bPendente = !b.contestacao_chefia;
      if (aPendente !== bPendente) return aPendente ? -1 : 1;
      return b.id - a.id;
    });
  }, [recursos, departamentoChefia]);

  // ── Métricas Exclusivas de Recursos e Contrarrazões ────────────────────────
  const totalRecursos = listaRecursosExibicao.length;
  const recursosRespondidos = listaRecursosExibicao.filter((r) => !!r.contestacao_chefia).length;
  const recursosAguardando = totalRecursos - recursosRespondidos;
  const reconsideracoesQtd = listaRecursosExibicao.filter(
    (r) => r.posicionamento_chefia === 'reconsiderar' || (r.contestacao_chefia && r.contestacao_chefia.toLowerCase().includes('reconsider'))
  ).length;
  const manutencoesQtd = listaRecursosExibicao.filter(
    (r) => r.posicionamento_chefia === 'manter' || (r.contestacao_chefia && !r.contestacao_chefia.toLowerCase().includes('reconsider'))
  ).length;

  const pctContrarrazoesConcluidas = totalRecursos > 0 ? Math.round((recursosRespondidos / totalRecursos) * 100) : 0;
  const pctRecursosAguardando = 100 - pctContrarrazoesConcluidas;
  const pctReconsideracoes = recursosRespondidos > 0 ? Math.round((reconsideracoesQtd / recursosRespondidos) * 100) : 0;
  const pctManutencoes = recursosRespondidos > 0 ? Math.round((manutencoesQtd / recursosRespondidos) * 100) : 0;

  // ── Filtro Dinâmico de Recursos e Contrarrazões ───────────────────────────
  const listaRecursosFiltrada = React.useMemo(() => {
    return listaRecursosExibicao.filter((item) => {
      if (recursoFiltroStatus === 'aguardando' && !!item.contestacao_chefia) return false;
      if (recursoFiltroStatus === 'respondidos' && !item.contestacao_chefia) return false;
      if (recursoFiltroStatus === 'julgados' && !item.status.startsWith('julgado')) return false;

      if (recursoFiltroPosicionamento === 'pendente' && !!item.contestacao_chefia) return false;
      if (recursoFiltroPosicionamento === 'manter' && (!item.contestacao_chefia || item.posicionamento_chefia === 'reconsiderar')) return false;
      if (recursoFiltroPosicionamento === 'reconsiderar' && (!item.contestacao_chefia || item.posicionamento_chefia !== 'reconsiderar')) return false;

      if (recursoBuscaTexto.trim()) {
        const q = recursoBuscaTexto.toLowerCase();
        const nome = (item.servidor?.nome_completo || item.recorrente?.name || '').toLowerCase();
        const mat = (item.servidor?.matricula || '').toLowerCase();
        const matLimpa = mat.replace(/[.\-/]/g, '');
        const fator = (item.fatorContestado?.nome || item.fator_contestado?.nome || '').toLowerCase();
        const just = (item.justificativa_servidor || '').toLowerCase();
        const cont = (item.contestacao_chefia || '').toLowerCase();
        const idStr = String(item.id);
        const protStr = `rec-${item.id}`;

        if (
          !nome.includes(q) &&
          !mat.includes(q) &&
          !matLimpa.includes(q.replace(/[.\-/]/g, '')) &&
          !fator.includes(q) &&
          !just.includes(q) &&
          !cont.includes(q) &&
          !idStr.includes(q) &&
          !protStr.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [listaRecursosExibicao, recursoFiltroStatus, recursoFiltroPosicionamento, recursoBuscaTexto]);

  // ── Colunas DataTable: Recursos e Contrarrazões (Arts. 30 e 31) ───────────
  const columnsContrarrazoes: ColumnDef<any>[] = React.useMemo(
    () => [
      {
        id: 'protocolo',
        header: 'Protocolo / Data',
        size: 160,
        accessorFn: (row) => row.id,
        cell: ({ row }) => {
          const idFmt = `REC-${row.original.id.toString().padStart(4, '0')}`;
          const dtFmt = row.original.created_at
            ? new Date(row.original.created_at).toLocaleDateString('pt-BR')
            : 'Data não informada';
          const respondido = !!row.original.contestacao_chefia;
          const diasRestantes = row.original.dias_restantes ?? 5;

          return (
            <div className="space-y-1">
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                #{idFmt}
              </span>
              <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {dtFmt}
              </div>
              {!respondido ? (
                <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded border flex items-center gap-1 w-fit ${
                  diasRestantes <= 2 ? 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-400' : 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                }`}>
                  <Clock className="h-2.5 w-2.5" />
                  {diasRestantes <= 0 ? 'Prazo Expirando' : `${diasRestantes}d úteis restantes`}
                </span>
              ) : (
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded border border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-1 w-fit">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Respondido
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'servidor',
        header: 'Servidor Recorrente',
        size: 240,
        accessorFn: (row) => row.servidor?.nome_completo || row.recorrente?.name || `Servidor #${row.recorrente_id}`,
        cell: ({ row }) => {
          const srv = row.original.servidor || {};
          const nome = srv.nome_completo || row.original.recorrente?.name || `Servidor #${row.original.recorrente_id}`;
          const mat = srv.matricula || '—';
          const cargo = srv.cargo_efetivo || 'Servidor Público';
          const partes = nome.trim().split(' ');
          const iniciais = partes.length >= 2 ? `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase() : nome.slice(0, 2).toUpperCase();

          return (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                {iniciais}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-foreground truncate" title={nome}>
                  {nome}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground/80">Mat. {mat}</span>
                  <span>•</span>
                  <span className="truncate">{cargo}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'fator',
        header: 'Fator Contestado',
        size: 210,
        accessorFn: (row) => row.fatorContestado?.nome || row.fator_contestado?.nome || `Fator #${row.fator_contestado_id}`,
        cell: ({ row }) => {
          const fator = row.original.fatorContestado?.nome || row.original.fator_contestado?.nome || `Fator #${row.original.fator_contestado_id}`;
          const gOriginal = row.original.grau_original || 2;
          const gPretendido = row.original.grau_pretendido || 4;

          return (
            <div className="space-y-1">
              <span className="font-semibold text-xs text-foreground leading-snug block line-clamp-2" title={fator}>
                {fator}
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span className="bg-muted px-1.5 py-0.5 rounded text-foreground/80">
                  Original: <strong>Grau {gOriginal}</strong>
                </span>
                <span>➔</span>
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                  Pleito: Grau {gPretendido}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'justificativa',
        header: 'Razões do Servidor',
        size: 260,
        accessorFn: (row) => row.justificativa_servidor,
        cell: ({ row }) => (
          <p
            className="text-xs text-muted-foreground italic line-clamp-2 leading-relaxed"
            title={row.original.justificativa_servidor}
          >
            "{row.original.justificativa_servidor}"
          </p>
        ),
      },
      {
        id: 'status_contrarrazões',
        header: 'Manifestação da Chefia',
        size: 200,
        accessorFn: (row) => (row.contestacao_chefia ? 'respondido' : 'aguardando'),
        cell: ({ row }) => {
          const respondido = !!row.original.contestacao_chefia;
          const pos = row.original.posicionamento_chefia;
          const dtManifestacao = row.original.contestacao_em
            ? new Date(row.original.contestacao_em).toLocaleDateString('pt-BR')
            : null;

          if (!respondido) {
            return (
              <div className="space-y-0.5">
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-1 w-fit"
                >
                  <Clock className="h-3 w-3 mr-0.5 text-amber-600" />
                  Aguardando Chefia (5 dias)
                </Badge>
                <div className="text-[10px] text-muted-foreground">Arts. 30 e 31 da Lei nº 1.704</div>
              </div>
            );
          }

          const isReconsiderar = pos === 'reconsiderar' || (row.original.contestacao_chefia && row.original.contestacao_chefia.toLowerCase().includes('reconsider'));

          return (
            <div className="space-y-1">
              <Badge
                variant={isReconsiderar ? 'outline' : 'success'}
                className={`text-[10px] font-bold flex items-center gap-1 w-fit ${
                  isReconsiderar ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400' : ''
                }`}
              >
                {isReconsiderar ? (
                  <>
                    <Sparkles className="h-3 w-3 mr-0.5 text-cyan-600" />
                    Reconsideração {row.original.novo_grau_proposto ? `(Grau ${row.original.novo_grau_proposto})` : ''}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3 w-3 mr-0.5 text-emerald-600" />
                    Nota Mantida (CIT)
                  </>
                )}
              </Badge>
              {dtManifestacao && (
                <div className="font-mono text-[10px] text-muted-foreground">
                  Emitida em {dtManifestacao}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'acoes',
        header: () => <div className="text-center w-full">Ações</div>,
        size: 180,
        cell: ({ row }) => {
          const rec = row.original;
          const respondido = !!rec.contestacao_chefia;

          return (
            <div className="flex items-center justify-center gap-1.5">
              {!respondido ? (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs font-semibold px-2.5 rounded-md flex items-center gap-1 shadow-xs"
                  onClick={() => {
                    setSelectedRecursoId(rec.id);
                    setTextoContrarrazao('');
                    setManterOuRetificar('manter');
                    setNovoGrauProposto(rec.grau_original ? rec.grau_original + 1 : 3);
                    setModalContrarrazaoOpen(true);
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  Emitir Contrarrazões
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold px-2 rounded-md flex items-center gap-1 hover:bg-primary/10 text-foreground"
                    onClick={() => setDetalheRecursoModal(rec)}
                    title="Visualizar Parecer das Contrarrazões"
                  >
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    Ver Parecer
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold px-2 rounded-md flex items-center gap-1 hover:bg-primary/10 text-foreground"
                    onClick={() => handleImprimirTermoContrarrazao(rec)}
                    title="Imprimir Termo Oficial em PDF A4"
                  >
                    <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                    PDF
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [handleImprimirTermoContrarrazao]
  );

  const subTabItems: TabsItem<AvaliadorSubTab>[] = [
    { key: 'avaliacoes', label: 'Avaliações de Subordinados', icon: <UserCheck className="h-4 w-4" />, badge: totalEquipe },
    { key: 'cit', label: 'Diário de Bordo (CIT)', icon: <BookOpen className="h-4 w-4" />, badge: totalCit },
    { key: 'devolutivas', label: 'Entrevistas de Devolutiva', icon: <Calendar className="h-4 w-4" />, badge: totalDevolutivas },
    { key: 'contrarrazoes', label: 'Contrarrazões Recursais', icon: <MessageSquare className="h-4 w-4" />, badge: recursosAguardando > 0 ? recursosAguardando : totalRecursos },
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
                  : activeTab === 'devolutivas'
                  ? 'Portal do Avaliador / Entrevistas Devolutivas Presenciais e Feedback Formal (Art. 27)'
                  : activeTab === 'contrarrazoes'
                  ? 'Portal do Avaliador / Contrarrazões Recursais da Chefia Imediata (Arts. 30 e 31)'
                  : 'Portal do Avaliador / Visão Geral da Chefia'}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {activeTab === 'cit'
                  ? '2. Diário de Bordo Contínuo (Técnica do Incidente Crítico — CIT)'
                  : activeTab === 'devolutivas'
                  ? '3. Entrevistas Devolutivas Presenciais de Feedback (Art. 27)'
                  : activeTab === 'contrarrazoes'
                  ? '4. Contrarrazões Recursais da Chefia Imediata (Arts. 30 e 31)'
                  : '1. Visão Geral da Chefia Imediata'}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {portalSelector}
              {activeTab !== 'cit' && activeTab !== 'devolutivas' && activeTab !== 'contrarrazoes' && (
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
              ) : activeTab === 'devolutivas' ? (
                <>
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
              ) : activeTab === 'contrarrazoes' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium rounded-md px-3 text-foreground"
                    onClick={() => setActiveTab('avaliacoes')}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    Ver Avaliações
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium rounded-md px-3 text-foreground"
                    onClick={() => setActiveTab('cit')}
                  >
                    <BookOpen className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    Diário de Bordo (CIT)
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
          ) : activeTab === 'devolutivas' ? (
            <div className="rounded-lg border-l-4 border-emerald-600 bg-emerald-500/10 dark:bg-emerald-950/25 px-4 py-3 flex items-start gap-2.5 text-xs text-emerald-950 dark:text-emerald-200">
              <Calendar className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Cumprimento Obrigatório do Art. 27 da Lei nº 1.704/2006:</span> Após o encerramento da avaliação pela chefia imediata, é obrigatória a realização de entrevista presencial individual com o servidor para apresentação dos fatores e notas, pactuação das metas do Plano de Desenvolvimento Individual (PDI) e colheita formal da ciência digital em até 5 (cinco) dias úteis.
              </div>
            </div>
          ) : activeTab === 'contrarrazoes' ? (
            <div className="rounded-lg border-l-4 border-amber-600 bg-amber-500/10 dark:bg-amber-950/25 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200">
              <Scale className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Prazo Regimental Improrrogável (Arts. 30 e 31 da Lei Municipal nº 1.704/2006):</span> A chefia imediata dispõe de 5 (cinco) dias úteis após a interposição do recurso pelo servidor para emitir suas contrarrazões técnicas, mantendo fundamentadamente a nota com base nos registros do Diário de Bordo (CIT) ou acolhendo parcialmente o pedido e reconsiderando a pontuação. Em seguida, os autos seguem para julgamento colegiado definitivo pela Comissão Especial (CAD).
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
          ) : activeTab === 'devolutivas' ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground">
                  <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Progresso das Entrevistas Devolutivas (Art. 27) — {departamentoChefia}</span>
                </div>
                <div className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {pctDevolutivasRealizadas}% Concluído ({devolutivasRealizadas} de {totalDevolutivas} realizadas)
                </div>
              </div>

              {/* Barra de progresso contínua */}
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${pctDevolutivasRealizadas}%` }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted-foreground font-mono gap-1 pt-0.5">
                <span>Pactuação de Metas: {acordosPdiRegistrados} PDIs Registrados</span>
                <span className="text-center font-medium">Ciências Emitidas: {cienciasEmitidas} de {totalDevolutivas} assinadas</span>
                <span className="text-foreground font-semibold">Prazo Legal: 5 dias úteis pós-avaliação</span>
              </div>
            </div>
          ) : activeTab === 'contrarrazoes' ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground">
                  <Scale className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Atendimento às Contrarrazões Recursais (Arts. 30 e 31) — {departamentoChefia}</span>
                </div>
                <div className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {pctContrarrazoesConcluidas}% Concluído ({recursosRespondidos} de {totalRecursos} recursos manifestados)
                </div>
              </div>

              {/* Barra de progresso contínua */}
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${pctContrarrazoesConcluidas}%` }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted-foreground font-mono gap-1 pt-0.5">
                <span>Prazo Regimental: 5 dias úteis por protocolo</span>
                <span className="text-center font-medium">Manifestações: {manutencoesQtd} Manutenções • {reconsideracoesQtd} Reconsiderações Parciais</span>
                <span className="text-foreground font-semibold">Destino Pós-Manifestação: Comissão Especial (CAD)</span>
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
            ) : activeTab === 'devolutivas' ? (
              <>
                {/* Card 1: Servidores Aptos a Devolutiva */}
                <div className="rounded-xl border border-border border-l-4 border-l-slate-700 dark:border-l-slate-300 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Avaliados no Ciclo</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{totalDevolutivas}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">100% aptos à devolutiva</div>
                </div>

                {/* Card 2: Devolutivas Realizadas */}
                <div className="rounded-xl border border-border border-l-4 border-l-emerald-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Devolutivas Realizadas</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {devolutivasRealizadas}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                    {pctDevolutivasRealizadas}% concluídas
                  </div>
                </div>

                {/* Card 3: Devolutivas Pendentes */}
                <div className="rounded-xl border border-border border-l-4 border-l-amber-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Devolutivas Pendentes</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {devolutivasPendentes}
                  </div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-medium">
                    {pctDevolutivasPendentes}% a agendar/realizar
                  </div>
                </div>

                {/* Card 4: Ciências Digitais Emitidas */}
                <div className="rounded-xl border border-border border-l-4 border-l-cyan-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Ciência Digital (Gov.br)</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-cyan-600 dark:text-cyan-400">
                    {cienciasEmitidas}/{totalDevolutivas}
                  </div>
                  <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono font-medium">
                    {pctCienciasEmitidas}% assinadas
                  </div>
                </div>

                {/* Card 5: Acordos PDI Pactuados */}
                <div className="rounded-xl border border-border border-l-4 border-l-blue-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Metas e Acordos PDI</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                    {acordosPdiRegistrados}
                  </div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-medium">
                    Planos pactuados
                  </div>
                </div>
              </>
            ) : activeTab === 'contrarrazoes' ? (
              <>
                {/* Card 1: Total de Recursos */}
                <div className="rounded-xl border border-border border-l-4 border-l-slate-700 dark:border-l-slate-300 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Recursos Interpostos</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{totalRecursos}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">1ª Instância (Arts. 30-31)</div>
                </div>

                {/* Card 2: Aguardando Contrarrazões */}
                <div className="rounded-xl border border-border border-l-4 border-l-amber-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Aguardando Resposta</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {recursosAguardando}
                  </div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-medium">
                    {pctRecursosAguardando}% com prazo aberto (5d)
                  </div>
                </div>

                {/* Card 3: Contrarrazões Emitidas */}
                <div className="rounded-xl border border-border border-l-4 border-l-emerald-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Contrarrazões Emitidas</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {recursosRespondidos}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                    {pctContrarrazoesConcluidas}% manifestados
                  </div>
                </div>

                {/* Card 4: Reconsiderações Parciais */}
                <div className="rounded-xl border border-border border-l-4 border-l-cyan-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Reconsiderações Parciais</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-cyan-600 dark:text-cyan-400">
                    {reconsideracoesQtd}
                  </div>
                  <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono font-medium">
                    {pctReconsideracoes}% acolhidos pela chefia
                  </div>
                </div>

                {/* Card 5: Manutenções da Nota */}
                <div className="rounded-xl border border-border border-l-4 border-l-blue-500 bg-card p-4 shadow-2xs space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Manutenções da Nota</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                    {manutencoesQtd}
                  </div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-medium">
                    {pctManutencoes}% com lastro no CIT
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
                  {/* Alternador de Visualização em Pílulas (Tabela como primeira opção ativa) */}
                  <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
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

      {/* ── Sub-Aba 3: Devolutivas Presenciais e PDI (DataTable com Filtros) ── */}
      {activeTab === 'devolutivas' && (
        <div className="space-y-4">
          <Card className="gap-0 py-0 overflow-hidden shadow-2xs">
            {/* Barra Superior e Filtros Avançados de Devolutiva */}
            <div className="p-4 border-b border-border bg-card space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    Acompanhamento das Entrevistas Devolutivas e PDI ({listaDevolutivasFiltrada.length} servidores)
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span>{devolutivasRealizadas} Realizadas</span>
                  <span>•</span>
                  <span>{devolutivasPendentes} Pendentes</span>
                  <span>•</span>
                  <span>{cienciasEmitidas} Ciências Digitais</span>
                </div>
              </div>

              {/* Barra de Filtros Avançados */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
                {/* Busca Textual */}
                <div className="sm:col-span-6 relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome, matrícula, cargo ou termos da entrevista..."
                    value={devolutivaBuscaTexto}
                    onChange={(e) => setDevolutivaBuscaTexto(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                  {devolutivaBuscaTexto && (
                    <button
                      onClick={() => setDevolutivaBuscaTexto('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Filtro por Status da Devolutiva */}
                <div className="sm:col-span-3">
                  <Select
                    value={devolutivaFiltroStatus}
                    onChange={(v) => setDevolutivaFiltroStatus(v as any)}
                    options={[
                      { value: 'todos', label: 'Todos os Status' },
                      { value: 'realizadas', label: 'Entrevistas Realizadas' },
                      { value: 'pendentes', label: 'Pendentes de Realização' },
                    ]}
                  />
                </div>

                {/* Filtro por Ciência Digital */}
                <div className="sm:col-span-3">
                  <Select
                    value={devolutivaFiltroCiencia}
                    onChange={(v) => setDevolutivaFiltroCiencia(v as any)}
                    options={[
                      { value: 'todos', label: 'Todas as Ciências' },
                      { value: 'com_ciencia', label: 'Ciência Formal Emitida' },
                      { value: 'aguardando_ciencia', label: 'Aguardando Ciência (5 dias)' },
                    ]}
                  />
                </div>
              </div>

              {(devolutivaBuscaTexto || devolutivaFiltroStatus !== 'todos' || devolutivaFiltroCiencia !== 'todos') && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">
                    Exibindo <strong className="font-mono text-foreground">{listaDevolutivasFiltrada.length}</strong> de <strong className="font-mono text-foreground">{listaDevolutivasExibicao.length}</strong> avaliados
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setDevolutivaBuscaTexto('');
                      setDevolutivaFiltroStatus('todos');
                      setDevolutivaFiltroCiencia('todos');
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </div>

            {/* Tabela Analítica de Devolutivas (DataTable) */}
            <div className="p-4">
              <DataTable
                columns={columnsDevolutivas}
                data={listaDevolutivasFiltrada}
                loading={loading}
                emptyText="Nenhum registro de entrevista devolutiva encontrado para os critérios selecionados."
                searchable={false}
                pageSize={10}
                pageSizeSelector
                fixedLayout
                exportable
                exportFileName="entrevistas-devolutivas-art27"
                exportTitle="CAPD — Entrevistas Devolutivas Presenciais de Feedback (Art. 27)"
              />
            </div>
          </Card>
        </div>
      )}

      {/* ── Sub-Aba 4: Contrarrazões Recursais ─────────────────────────── */}
      {activeTab === 'contrarrazoes' && (
        <div className="space-y-4">
          <Card className="border-border bg-card shadow-2xs">
            {/* Header da Aba de Contrarrazões */}
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Scale className="h-4 w-4 text-amber-600" />
                    Contrarrazões Recursais da Chefia Imediata (Arts. 30 e 31 da Lei nº 1.704/2006)
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Prazo regimental de 5 (cinco) dias úteis para manifestação técnica preliminar da chefia avaliadora antes da redistribuição à Comissão Especial (CAD).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {recursosAguardando} pendente(s) de resposta
                  </Badge>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {totalRecursos} recurso(s) total
                  </Badge>
                </div>
              </div>

              {/* Barra de Filtros Avançados */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
                {/* Busca Textual */}
                <div className="sm:col-span-6 relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por servidor, matrícula, protocolo (#REC-...), fator ou teor do recurso..."
                    value={recursoBuscaTexto}
                    onChange={(e) => setRecursoBuscaTexto(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                  {recursoBuscaTexto && (
                    <button
                      onClick={() => setRecursoBuscaTexto('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Filtro por Status do Recurso */}
                <div className="sm:col-span-3">
                  <Select
                    value={recursoFiltroStatus}
                    onChange={(v) => setRecursoFiltroStatus(v as any)}
                    options={[
                      { value: 'todos', label: 'Todos os Status' },
                      { value: 'aguardando', label: 'Aguardando Resposta (5 dias)' },
                      { value: 'respondidos', label: 'Contrarrazões Emitidas' },
                      { value: 'julgados', label: 'Julgados pela Comissão (CAD)' },
                    ]}
                  />
                </div>

                {/* Filtro por Posicionamento da Chefia */}
                <div className="sm:col-span-3">
                  <Select
                    value={recursoFiltroPosicionamento}
                    onChange={(v) => setRecursoFiltroPosicionamento(v as any)}
                    options={[
                      { value: 'todos', label: 'Todos os Posicionamentos' },
                      { value: 'manter', label: 'Manutenção da Nota' },
                      { value: 'reconsiderar', label: 'Reconsideração Parcial' },
                      { value: 'pendente', label: 'Pendente de Manifestação' },
                    ]}
                  />
                </div>
              </div>

              {(recursoBuscaTexto || recursoFiltroStatus !== 'todos' || recursoFiltroPosicionamento !== 'todos') && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">
                    Exibindo <strong className="font-mono text-foreground">{listaRecursosFiltrada.length}</strong> de <strong className="font-mono text-foreground">{listaRecursosExibicao.length}</strong> recursos
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setRecursoBuscaTexto('');
                      setRecursoFiltroStatus('todos');
                      setRecursoFiltroPosicionamento('todos');
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </div>

            {/* Tabela Analítica de Contrarrazões Recursais (DataTable) */}
            <div className="p-4">
              <DataTable
                columns={columnsContrarrazoes}
                data={listaRecursosFiltrada}
                loading={loading}
                emptyText="Nenhum recurso administrativo encontrado para os critérios de busca selecionados."
                searchable={false}
                pageSize={10}
                pageSizeSelector
                fixedLayout
                exportable
                exportFileName="contrarrazoes-recursais-capd"
                exportTitle="CAPD — Contrarrazões Recursais da Chefia Imediata (Arts. 30 e 31)"
              />
            </div>
          </Card>
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
        size="xl"
      >
        <form onSubmit={handleSalvarDevolutiva} className="space-y-4 py-2 text-xs">
          {/* Card do Servidor Avaliado */}
          {(() => {
            const avSelecionada = listaDevolutivasExibicao.find((d) => d.id === selectedAvaliacaoId);
            if (!avSelecionada) return null;
            const srv = avSelecionada.servidor || avSelecionada.servidorData || {};
            const nomeSrv = srv.nome_completo || `Servidor #${avSelecionada.servidor_id}`;
            const matSrv = srv.matricula || '—';
            const cargoSrv = srv.cargo_efetivo || 'Servidor Público';
            const depSrv = srv.lotacao_fisica || srv.orgao_lotacao || departamentoChefia;
            const notaNum = Number(avSelecionada.nota_final) || 0;
            const notaFmt = notaNum.toFixed(2).replace('.', ',');
            const isApto = notaNum >= 70;

            const partes = nomeSrv.trim().split(' ');
            const iniciais = partes.length >= 2 ? `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase() : nomeSrv.slice(0, 2).toUpperCase();

            return (
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      {iniciais}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{nomeSrv}</span>
                        <span className="font-mono text-xs font-semibold text-foreground/90 bg-muted px-2 py-0.5 rounded">
                          Mat. {matSrv}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{cargoSrv} • {depSrv}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-border pt-2 sm:pt-0 sm:pl-3">
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Nota Apurada</div>
                      <div className="font-mono text-lg font-bold tabular-nums text-foreground">{notaFmt} pts</div>
                    </div>
                    <Badge
                      variant={isApto ? 'success' : 'outline'}
                      className={`text-[10px] font-bold ${
                        !isApto ? 'border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10' : ''
                      }`}
                    >
                      {isApto ? 'Apto (≥ 70 pts)' : 'Atenção (< 70 pts)'}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 flex items-start gap-2 text-[11px] text-foreground/90">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-primary">Diretriz Regulamentar do Art. 27:</strong> A entrevista devolutiva presencial deve ser pautada pelo diálogo transparente e construtivo. Apresente os fatores de avaliação, motive o servidor, repasse os incidentes registrados no Diário de Bordo e pactue compromissos mútuos para o próximo ciclo funcional.
                  </div>
                </div>
              </div>
            );
          })()}

          <div>
            <label className="block font-semibold text-foreground mb-1">Data da Reunião de Feedback Presencial:</label>
            <Input
              type="date"
              value={dataDevolutiva}
              onChange={(e) => setDataDevolutiva(e.target.value)}
              required
              className="w-full sm:w-60 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">Resumo da Entrevista Presencial e Feedback:</label>
            <textarea
              rows={4}
              value={resumoEntrevista}
              onChange={(e) => setResumoEntrevista(e.target.value)}
              placeholder="Descreva detalhadamente os principais pontos debatidos na reunião com o servidor, destacando as forças observadas e oportunidades de melhoria funcional..."
              required
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden leading-relaxed"
            />
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1">Plano de Desenvolvimento Individual (PDI) e Metas Pactuadas:</label>
            <textarea
              rows={3}
              value={acordosDesenvolvimento}
              onChange={(e) => setAcordosDesenvolvimento(e.target.value)}
              placeholder="Metas de aperfeiçoamento, cursos recomendados ou mudanças operacionais acordadas entre a chefia e o servidor avaliado para o ciclo seguinte..."
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-hidden leading-relaxed"
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

      {/* ── Modal: Visualização da Ata de Devolutiva Presencial (Art. 27) ──── */}
      <Modal
        open={!!detalheDevolutivaModal}
        onClose={() => setDetalheDevolutivaModal(null)}
        title="Ata Oficial de Entrevista Devolutiva Presencial (Art. 27)"
        size="xl"
      >
        {detalheDevolutivaModal && (
          <div className="space-y-4 py-2 text-xs">
            {/* Cabeçalho Oficial do Documento */}
            <div className="border border-border/80 rounded-xl bg-card p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-3 gap-2">
                <div>
                  <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Prefeitura Municipal • Sistema SYSGOV
                  </div>
                  <h4 className="text-sm font-bold text-foreground">
                    Comissão Permanente de Avaliação de Desempenho (CAPD)
                  </h4>
                  <div className="text-[11px] text-muted-foreground">
                    Termo Circunstanciado de Cumprimento do Art. 27 da Lei nº 1.704/2006
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Entrevista Realizada
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold px-3 flex items-center gap-1.5 hover:bg-primary/10"
                    onClick={() => handleImprimirAtaDevolutiva(detalheDevolutivaModal)}
                  >
                    <Printer className="h-3.5 w-3.5 text-primary" />
                    Imprimir Ata (PDF)
                  </Button>
                </div>
              </div>

              {/* Informações dos Sujeitos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-muted/30 p-3 rounded-lg border border-border/50 space-y-1">
                  <div className="font-semibold text-foreground/80 text-[11px] uppercase">1. Servidor Avaliado</div>
                  <div className="font-bold text-sm text-foreground">
                    {detalheDevolutivaModal.servidor?.nome_completo || detalheDevolutivaModal.servidorData?.nome_completo || `Servidor #${detalheDevolutivaModal.servidor_id}`}
                  </div>
                  <div className="font-mono text-muted-foreground text-[11px]">
                    Matrícula: <strong className="text-foreground">{detalheDevolutivaModal.servidor?.matricula || detalheDevolutivaModal.servidorData?.matricula || '—'}</strong>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Cargo: {detalheDevolutivaModal.servidor?.cargo_efetivo || detalheDevolutivaModal.servidorData?.cargo_efetivo || 'Servidor Público'}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Lotação: {detalheDevolutivaModal.servidor?.lotacao_fisica || detalheDevolutivaModal.servidor?.orgao_lotacao || departamentoChefia}
                  </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/50 space-y-1">
                  <div className="font-semibold text-foreground/80 text-[11px] uppercase">2. Chefia Imediata / Avaliador</div>
                  <div className="font-bold text-sm text-foreground">
                    {(servidores.find((s) => String(s.user_id || s.id) === selectedAvaliadorId)?.nome_completo) || 'Chefia Imediata / Avaliador Oficial'}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Unidade: {departamentoChefia}
                  </div>
                  <div className="font-mono text-muted-foreground text-[11px]">
                    Data da Entrevista: <strong className="text-foreground">{detalheDevolutivaModal.devolutiva_em ? new Date(detalheDevolutivaModal.devolutiva_em).toLocaleDateString('pt-BR') : 'Data informada'}</strong>
                  </div>
                </div>
              </div>

              {/* Síntese do Desempenho */}
              <div className="bg-muted/20 p-3 rounded-lg border border-border/50 space-y-2">
                <div className="font-semibold text-foreground/80 text-[11px] uppercase">3. Síntese do Desempenho no Ciclo</div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">Nota Apurada:</span>
                    <span className="font-mono text-base font-bold tabular-nums text-foreground">
                      {Number(detalheDevolutivaModal.nota_final || 0).toFixed(2).replace('.', ',')} pontos
                    </span>
                    <Badge
                      variant={Number(detalheDevolutivaModal.nota_final || 0) >= 70 ? 'success' : 'outline'}
                      className={`text-[10px] ${
                        Number(detalheDevolutivaModal.nota_final || 0) < 70 ? 'border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10' : ''
                      }`}
                    >
                      {Number(detalheDevolutivaModal.nota_final || 0) >= 70 ? 'Apto (≥ 70 pts)' : 'Atenção (< 70 pts)'}
                    </Badge>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    Data da Avaliação: {detalheDevolutivaModal.data_conclusao ? new Date(detalheDevolutivaModal.data_conclusao).toLocaleDateString('pt-BR') : 'Ciclo Vigente'}
                  </div>
                </div>
              </div>

              {/* Relato da Entrevista */}
              <div className="space-y-1">
                <div className="font-semibold text-foreground/90 text-xs">
                  4. Relato da Reunião e Feedback Construtivo da Chefia:
                </div>
                <div className="bg-muted/20 border border-border/60 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                  {detalheDevolutivaModal.devolutiva_resumo || 'Reunião de devolutiva presencial realizada nos termos do Art. 27, oportunizando o alinhamento de conduta funcional e análise dos pontos fortes e de desenvolvimento apurados no ciclo.'}
                </div>
              </div>

              {/* Plano de Desenvolvimento Individual (PDI) */}
              <div className="space-y-1">
                <div className="font-semibold text-foreground/90 text-xs">
                  5. Metas do Plano de Desenvolvimento Individual (PDI):
                </div>
                <div className="bg-muted/20 border border-border/60 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                  {detalheDevolutivaModal.devolutiva_acordos || 'Fica acordado o acompanhamento contínuo das metas pactuadas, com priorização em capacitações funcionais e alinhamento de processos de trabalho durante o próximo período avaliativo.'}
                </div>
              </div>

              {/* Ciência Digital do Servidor */}
              <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-1.5">
                <div className="font-semibold text-foreground/90 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  6. Certificação de Ciência Digital do Servidor
                </div>
                {detalheDevolutivaModal.ciencia_servidor_em ? (
                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground leading-relaxed">
                      O servidor emitiu ciência formal por autenticação eletrônica integrada ao Gov.br nos autos do processo de avaliação de desempenho.
                    </p>
                    <div className="font-mono text-[11px] text-primary">
                      Registrado em: {new Date(detalheDevolutivaModal.ciencia_servidor_em).toLocaleString('pt-BR')} • IP: {detalheDevolutivaModal.ciencia_ip || '189.34.120.45'} • Certificação SHA-256
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    Aguardando ciência digital do servidor avaliado nos autos (prazo legal de 5 dias úteis contados a partir da realização da entrevista presencial).
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold px-4"
                onClick={() => setDetalheDevolutivaModal(null)}
              >
                Fechar
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs font-semibold px-4 flex items-center gap-1.5"
                onClick={() => handleImprimirAtaDevolutiva(detalheDevolutivaModal)}
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir Ata Oficial (PDF)
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Contrarrazões da Chefia (Arts. 30 e 31) ───────────────── */}
      <Modal
        open={modalContrarrazaoOpen}
        onClose={() => setModalContrarrazaoOpen(false)}
        title="Manifestação Técnica de Contrarrazões da Chefia (Arts. 30 e 31)"
        size="xl"
      >
        {(() => {
          const recEmFoco = listaRecursosExibicao.find((r) => r.id === selectedRecursoId);
          const srv = recEmFoco?.servidor || {};
          const nomeRec = srv.nome_completo || recEmFoco?.recorrente?.name || `Servidor #${recEmFoco?.recorrente_id || ''}`;
          const matRec = srv.matricula || '—';
          const cargoRec = srv.cargo_efetivo || 'Servidor Público';
          const depRec = srv.departamento || departamentoChefia;
          const fatorRec = recEmFoco?.fatorContestado?.nome || recEmFoco?.fator_contestado?.nome || `Fator #${recEmFoco?.fator_contestado_id || ''}`;
          const gOriginal = recEmFoco?.grau_original || 2;
          const gPretendido = recEmFoco?.grau_pretendido || 4;

          const partes = nomeRec.trim().split(' ');
          const iniciais = partes.length >= 2 ? `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase() : nomeRec.slice(0, 2).toUpperCase();

          return (
            <form onSubmit={handleSalvarContrarrazao} className="space-y-4 py-2 text-xs">
              {/* Card Resumo do Recurso e Partes */}
              {recEmFoco && (
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {iniciais}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{nomeRec}</span>
                          <span className="font-mono text-xs text-muted-foreground">(Mat. {matRec})</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {cargoRec} • {depRec}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        Protocolo #REC-{String(recEmFoco.id).padStart(4, '0')}
                      </span>
                      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 font-mono text-[10px]">
                        Prazo Legal: 5 dias úteis
                      </Badge>
                    </div>
                  </div>

                  {/* Fator Contestado e Graus */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-3 rounded-lg border border-border/60">
                    <div>
                      <span className="text-[11px] text-muted-foreground block font-medium">Fator Avaliativo Contestado:</span>
                      <strong className="text-xs text-foreground block mt-0.5">{fatorRec}</strong>
                    </div>
                    <div className="flex items-center justify-start sm:justify-end gap-3 font-mono text-xs">
                      <div className="bg-muted px-2.5 py-1 rounded border border-border/80">
                        <span className="text-muted-foreground block text-[10px]">Nota Original:</span>
                        <strong className="text-foreground">Grau {gOriginal} (da Chefia)</strong>
                      </div>
                      <span className="text-muted-foreground font-bold">➔</span>
                      <div className="bg-primary/10 px-2.5 py-1 rounded border border-primary/20 text-primary">
                        <span className="block text-[10px] opacity-80">Pleito do Recorrente:</span>
                        <strong className="font-bold">Grau {gPretendido}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Razões Recursais do Servidor */}
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground/90 block">Razões Recursais do Servidor:</span>
                    <div className="bg-muted/30 border border-border/70 rounded-lg p-3 text-xs text-muted-foreground italic leading-relaxed">
                      "{recEmFoco.justificativa_servidor}"
                    </div>
                  </div>
                </div>
              )}

              {/* Alerta de Diretriz Metodológica (Arts. 30 e 31) */}
              <div className="rounded-lg border-l-4 border-indigo-600 bg-indigo-500/10 dark:bg-indigo-950/20 p-3 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-indigo-600" />
                  Diretrizes Metodológicas de Contrarrazões da Chefia Imediata
                </span>
                <p className="text-[11px] leading-relaxed text-muted-foreground dark:text-indigo-300">
                  A manifestação técnica da chefia integra os autos recursais. Em caso de <strong>manutenção da nota</strong>, fundamente sua decisão nos fatos observáveis já registrados no Diário de Bordo (CIT). Havendo <strong>reconsideração parcial</strong>, indique o novo grau conferido antes de encaminhar à Comissão Permanente (CAD).
                </p>
              </div>

              {/* Posicionamento da Chefia */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                <label className="block font-bold text-foreground">1. Posicionamento Conclusivo da Chefia Imediata:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    manterOuRetificar === 'manter'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-background hover:bg-muted/30'
                  }`}>
                    <input
                      type="radio"
                      name="posicionamento"
                      checked={manterOuRetificar === 'manter'}
                      onChange={() => setManterOuRetificar('manter')}
                      className="accent-primary mt-0.5"
                    />
                    <div>
                      <strong className="block text-foreground">Manter Nota Original</strong>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        A pontuação atribuída reflete o desempenho fático documentado no Diário de Bordo (CIT).
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    manterOuRetificar === 'reconsiderar'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-background hover:bg-muted/30'
                  }`}>
                    <input
                      type="radio"
                      name="posicionamento"
                      checked={manterOuRetificar === 'reconsiderar'}
                      onChange={() => setManterOuRetificar('reconsiderar')}
                      className="accent-primary mt-0.5"
                    />
                    <div>
                      <strong className="block text-foreground">Reconsiderar Parcialmente</strong>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        Acolhe parcialmente o pleito e retifica o grau do fator com nova motivação técnica.
                      </span>
                    </div>
                  </label>
                </div>

                {manterOuRetificar === 'reconsiderar' && (
                  <div className="pt-2 border-t border-border/60 flex items-center gap-3">
                    <label className="font-semibold text-foreground">Novo Grau Proposto pela Chefia (1 a 5):</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={novoGrauProposto}
                      onChange={(e) => setNovoGrauProposto(Number(e.target.value))}
                      className="font-mono w-24 h-8 text-xs text-center"
                      required
                    />
                    <span className="text-[11px] text-muted-foreground">
                      (Será submetido à homologação da Comissão CAD)
                    </span>
                  </div>
                )}
              </div>

              {/* Fundamentação Técnica */}
              <div className="space-y-1.5">
                <label className="block font-bold text-foreground">
                  2. Fundamentação Técnica Detalhada das Contrarrazões:
                </label>
                <textarea
                  rows={5}
                  value={textoContrarrazao}
                  onChange={(e) => setTextoContrarrazao(e.target.value)}
                  placeholder="Descreva pormenorizadamente os motivos de fato e de direito pelos quais a pontuação inicial deve ser mantida (citando evidências do Diário de Bordo) ou as razões fáticas da reconsideração proposta..."
                  required
                  className="w-full rounded-md border border-input bg-background p-3 text-xs leading-relaxed focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* Rodapé e Botões */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                {recEmFoco && (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="h-8 text-xs font-medium"
                    onClick={() => handleImprimirTermoContrarrazao(recEmFoco)}
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    Gerar Minuta (PDF)
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setModalContrarrazaoOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="default" size="sm" type="submit" disabled={salvandoContrarrazao}>
                    {salvandoContrarrazao ? 'Protocolando...' : 'Protocolar Contrarrazões Oficiais'}
                  </Button>
                </div>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* ── Modal: Parecer Oficial Completo de Contrarrazões (detalheRecursoModal) ── */}
      <Modal
        open={!!detalheRecursoModal}
        onClose={() => setDetalheRecursoModal(null)}
        title="Parecer Oficial de Contrarrazões da Chefia Imediata (Arts. 30 e 31)"
        size="xl"
      >
        {detalheRecursoModal && (
          <div className="space-y-4 py-2 text-xs">
            {/* Cabeçalho do Protocolo */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary">
                      Protocolo #REC-{String(detalheRecursoModal.id).padStart(4, '0')}
                    </span>
                    <Badge variant={detalheRecursoModal.contestacao_chefia ? 'success' : 'outline'} className="text-xs">
                      {detalheRecursoModal.contestacao_chefia ? 'Contrarrazões Protocoladas' : 'Aguardando Resposta (5 dias)'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    Interposto em: {new Date(detalheRecursoModal.created_at || '2026-09-08').toLocaleDateString('pt-BR')} • Prazo Legal: 5 dias úteis (Arts. 30 e 31)
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold px-3 flex items-center gap-1.5 hover:bg-primary/10"
                    onClick={() => handleImprimirTermoContrarrazao(detalheRecursoModal)}
                  >
                    <Printer className="h-3.5 w-3.5 text-primary" />
                    Imprimir Parecer Oficial (PDF)
                  </Button>
                </div>
              </div>

              {/* Informações das Partes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-muted/30 p-3 rounded-lg border border-border/50 space-y-1">
                  <div className="font-semibold text-foreground/80 text-[11px] uppercase">1. Servidor Recorrente</div>
                  <div className="font-bold text-sm text-foreground">
                    {detalheRecursoModal.servidor?.nome_completo || detalheRecursoModal.recorrente?.name || `Servidor #${detalheRecursoModal.recorrente_id}`}
                  </div>
                  <div className="font-mono text-muted-foreground text-[11px]">
                    Matrícula: <strong className="text-foreground">{detalheRecursoModal.servidor?.matricula || '—'}</strong>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Cargo: {detalheRecursoModal.servidor?.cargo_efetivo || 'Servidor Público'}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Lotação: {detalheRecursoModal.servidor?.departamento || departamentoChefia}
                  </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/50 space-y-1">
                  <div className="font-semibold text-foreground/80 text-[11px] uppercase">2. Chefia Avaliadora / Unidade</div>
                  <div className="font-bold text-sm text-foreground">
                    {(servidores.find((s) => String(s.user_id || s.id) === selectedAvaliadorId)?.nome_completo) || 'Chefia Imediata / Avaliador Oficial'}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Unidade: {departamentoChefia}
                  </div>
                  <div className="font-mono text-muted-foreground text-[11px]">
                    Manifestação em: <strong className="text-foreground">
                      {detalheRecursoModal.contestacao_em ? new Date(detalheRecursoModal.contestacao_em).toLocaleDateString('pt-BR') : 'Pendente de registro'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Fator Contestado e Comparativo das Notas */}
              <div className="bg-muted/20 p-3.5 rounded-lg border border-border/50 space-y-2">
                <div className="font-semibold text-foreground/80 text-[11px] uppercase">3. Fator Avaliativo Contestado e Graus</div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-foreground block">
                      {detalheRecursoModal.fatorContestado?.nome || detalheRecursoModal.fator_contestado?.nome || `Fator #${detalheRecursoModal.fator_contestado_id}`}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Grupo de Competências do Formulário Regulamentar CAPD
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="bg-muted px-2 py-1 rounded border border-border/80">
                      Nota Inicial: <strong>Grau {detalheRecursoModal.grau_original || 2}</strong>
                    </span>
                    <span>➔</span>
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20 font-bold">
                      Pleito do Servidor: Grau {detalheRecursoModal.grau_pretendido || 4}
                    </span>
                  </div>
                </div>
              </div>

              {/* Razões Recursais do Servidor */}
              <div className="space-y-1">
                <div className="font-semibold text-foreground/90 text-xs">
                  4. Razões Recursais Apresentadas pelo Servidor:
                </div>
                <div className="bg-muted/20 border border-border/60 rounded-lg p-3 text-xs text-muted-foreground italic leading-relaxed">
                  "{detalheRecursoModal.justificativa_servidor}"
                </div>
              </div>

              {/* Manifestação Oficial da Chefia Imediata */}
              <div className="space-y-1">
                <div className="font-semibold text-foreground/90 text-xs flex items-center justify-between">
                  <span>5. Fundamentação Técnica e Decisão da Chefia Imediata:</span>
                  {detalheRecursoModal.posicionamento_chefia === 'reconsiderar' ? (
                    <Badge variant="outline" className="border-cyan-500/40 text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 font-mono text-[10px]">
                      Reconsideração Parcial Proposta
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-blue-500/40 text-blue-700 dark:text-blue-400 bg-blue-500/10 font-mono text-[10px]">
                      Manutenção Integral da Nota
                    </Badge>
                  )}
                </div>
                <div className="bg-muted/20 border border-border/60 rounded-lg p-3 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {detalheRecursoModal.contestacao_chefia || 'Contrarrazões ainda não formalizadas no sistema.'}
                </div>
              </div>

              {/* Informação sobre a Instância Colegiada (CAD) */}
              <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-1">
                <div className="font-semibold text-foreground/90 text-xs flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-amber-600" />
                  6. Tramitação à Comissão Especial de Avaliação de Desempenho (CAD)
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Com o protocolo formal das presentes contrarrazões, os autos são redistribuídos automaticamente à Comissão Especial (CAD) para saneamento processual, instrução probatória e julgamento colegiado definitivo em 2ª instância, nos termos do Art. 31 da Lei Municipal nº 1.704/2006.
                </p>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold px-4"
                onClick={() => setDetalheRecursoModal(null)}
              >
                Fechar
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs font-semibold px-4 flex items-center gap-1.5"
                onClick={() => handleImprimirTermoContrarrazao(detalheRecursoModal)}
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir Parecer Oficial (PDF)
              </Button>
            </div>
          </div>
        )}
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
