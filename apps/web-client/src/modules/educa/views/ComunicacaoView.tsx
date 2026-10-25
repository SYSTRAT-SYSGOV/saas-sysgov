import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
} from '@sysgov/ui';
import { MessageSquare, Bell, AlertTriangle, Plus, CheckCircle2 } from 'lucide-react';
import { useEduca } from '../context/EducaContext';

interface AvisoItem {
  id: string;
  titulo: string;
  publico_alvo: string;
  exige_confirmacao: boolean;
  total_leituras: number;
  total_destinatarios: number;
  data_publicacao: string;
}

interface OcorrenciaItem {
  id: string;
  numero_sequencial: string;
  aluno_nome: string;
  tipo: string;
  gravidade: string;
  status: string;
  data_ocorrencia: string;
}

export const ComunicacaoView: React.FC = () => {
  const { escolaAtiva } = useEduca();
  const [secaoAtiva, setSecaoAtiva] = useState<'avisos' | 'ocorrencias'>('avisos');

  const [avisos] = useState<AvisoItem[]>([
    {
      id: '1',
      titulo: 'Reunião Bimestral de Pais e Mestres do Ensino Fundamental',
      publico_alvo: 'Toda a Escola',
      exige_confirmacao: true,
      total_leituras: 124,
      total_destinatarios: 150,
      data_publicacao: '2026-10-20',
    },
    {
      id: '2',
      titulo: 'Campanha de Vacinação Infantil na Unidade Escolar',
      publico_alvo: 'Anos Iniciais (1º ao 5º Ano)',
      exige_confirmacao: false,
      total_leituras: 88,
      total_destinatarios: 110,
      data_publicacao: '2026-10-18',
    },
  ]);

  const [ocorrencias] = useState<OcorrenciaItem[]>([
    {
      id: '1',
      numero_sequencial: 'OC-2026-000101',
      aluno_nome: 'Bruno Henrique Oliveira',
      tipo: 'disciplinar',
      gravidade: 'alta',
      status: 'pendente_ciencia',
      data_ocorrencia: '2026-10-24',
    },
    {
      id: '2',
      numero_sequencial: 'OC-2026-000098',
      aluno_nome: 'Ana Clara da Silva',
      tipo: 'pedagogica',
      gravidade: 'baixa',
      status: 'cientificada',
      data_ocorrencia: '2026-10-21',
    },
  ]);

  return (
    <div className="space-y-6">
      {/* Botões de Alternância entre Mural de Avisos e Ocorrências */}
      <div className="flex items-center justify-between border-b border-gov-border pb-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={secaoAtiva === 'avisos' ? 'default' : 'outline'}
            onClick={() => setSecaoAtiva('avisos')}
            className={`text-xs ${secaoAtiva === 'avisos' ? 'bg-blue-700 text-white' : ''}`}
          >
            <Bell className="w-3.5 h-3.5 mr-1.5" />
            Mural de Comunicados Oficiais
          </Button>

          <Button
            size="sm"
            variant={secaoAtiva === 'ocorrencias' ? 'default' : 'outline'}
            onClick={() => setSecaoAtiva('ocorrencias')}
            className={`text-xs ${secaoAtiva === 'ocorrencias' ? 'bg-blue-700 text-white' : ''}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
            Ocorrências Disciplinares e Pedagógicas
          </Button>
        </div>

        <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />
          {secaoAtiva === 'avisos' ? 'Novo Comunicado' : 'Registrar Ocorrência'}
        </Button>
      </div>

      {/* Conteúdo: Mural de Avisos */}
      {secaoAtiva === 'avisos' && (
        <Card className="bg-white border-gov-border">
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Título do Comunicado</TableHead>
                  <TableHead className="text-xs">Público-Alvo</TableHead>
                  <TableHead className="text-xs text-center">Ciência Requerida</TableHead>
                  <TableHead className="text-xs text-center">Taxa de Confirmação</TableHead>
                  <TableHead className="text-xs">Publicação</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {avisos.map((av) => {
                  const taxa = (av.total_leituras / av.total_destinatarios) * 100;
                  return (
                    <TableRow key={av.id}>
                      <TableCell className="text-xs font-medium text-gov-text-primary">
                        {av.titulo}
                      </TableCell>
                      <TableCell className="text-xs text-gov-text-secondary">
                        {av.publico_alvo}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-mono px-1.5 py-0 ${
                            av.exige_confirmacao
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-gray-50 text-gray-700 border-gray-300'
                          }`}
                        >
                          {av.exige_confirmacao ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5 font-mono text-xs tabular-nums">
                          <strong className="text-blue-700 font-bold">{taxa.toFixed(1)}%</strong>
                          <span className="text-gov-text-muted">
                            ({av.total_leituras}/{av.total_destinatarios})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gov-text-muted tabular-nums">
                        {av.data_publicacao}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-700 hover:text-blue-900">
                          Leituras
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo: Ocorrências */}
      {secaoAtiva === 'ocorrencias' && (
        <Card className="bg-white border-gov-border">
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Número (Protocolo)</TableHead>
                  <TableHead className="text-xs">Estudante</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Gravidade</TableHead>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Status da Ciência</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ocorrencias.map((oc) => (
                  <TableRow key={oc.id}>
                    <TableCell className="font-mono text-xs font-semibold tabular-nums text-gov-text-primary">
                      {oc.numero_sequencial}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-gov-text-primary">
                      {oc.aluno_nome}
                    </TableCell>
                    <TableCell className="text-xs capitalize text-gov-text-secondary">
                      {oc.tipo}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono px-1.5 py-0 ${
                          oc.gravidade === 'alta'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : oc.gravidade === 'media'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-blue-50 text-blue-800 border-blue-300'
                        }`}
                      >
                        {oc.gravidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gov-text-muted tabular-nums">
                      {oc.data_ocorrencia}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono px-1.5 py-0 ${
                          oc.status === 'cientificada'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {oc.status === 'cientificada' ? 'Cientificada' : 'Pendente de Ciência'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-700 hover:text-blue-900">
                        Despachar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
