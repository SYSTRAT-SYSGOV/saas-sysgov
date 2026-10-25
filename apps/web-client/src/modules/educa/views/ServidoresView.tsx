import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
} from '@sysgov/ui';
import { Users, Briefcase, Plus } from 'lucide-react';
import { PisoDocenteMeter } from '../components/PisoDocenteMeter';
import { useEduca } from '../context/EducaContext';

interface DocenteItem {
  id: string;
  nome: string;
  matricula_servidor: string;
  disciplina: string;
  horas_sala: number;
  horas_atividade: number;
  jornada_total: number;
  status: string;
}

export const ServidoresView: React.FC = () => {
  const { escolaAtiva } = useEduca();

  const [docentes] = useState<DocenteItem[]>([
    {
      id: '1',
      nome: 'Mariana Castro Ribeiro',
      matricula_servidor: 'DOC-2024-001',
      disciplina: 'Língua Portuguesa',
      horas_sala: 26,
      horas_atividade: 14,
      jornada_total: 40,
      status: 'ativo',
    },
    {
      id: '2',
      nome: 'Carlos Eduardo Mendes',
      matricula_servidor: 'DOC-2024-002',
      disciplina: 'Matemática',
      horas_sala: 13,
      horas_atividade: 7,
      jornada_total: 20,
      status: 'ativo',
    },
    {
      id: '3',
      nome: 'Patricia Fernandes Lima',
      matricula_servidor: 'DOC-2023-018',
      disciplina: 'Ciências',
      horas_sala: 20,
      horas_atividade: 10,
      jornada_total: 30,
      status: 'afastado',
    },
  ]);

  return (
    <div className="space-y-6">
      {/* Indicador de Média da Rede para a Lei do Piso */}
      <div>
        <PisoDocenteMeter horasInteracao={26} horasAtividade={14} jornadaSemanal={40} />
      </div>

      {/* Lista de Servidores e Lotações */}
      <Card className="bg-white border-gov-border">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gov-border pb-4">
          <div>
            <CardTitle className="text-sm font-semibold text-gov-text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700" />
              Corpo Docente e Lotação em Sala de Aula
            </CardTitle>
            <p className="text-xs text-gov-text-muted mt-1">
              {escolaAtiva?.nome || 'Unidade Escolar'} • Trava de 1/3 da jornada (Lei 11.738/2008)
            </p>
          </div>

          <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Nova Lotação
          </Button>
        </CardHeader>

        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Matrícula</TableHead>
                <TableHead className="text-xs">Servidor (Docente)</TableHead>
                <TableHead className="text-xs">Componente / Função</TableHead>
                <TableHead className="text-xs text-center">Jornada Semanal</TableHead>
                <TableHead className="text-xs text-center">Hora-Atividade</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docentes.map((d) => {
                const percAtividade = (d.horas_atividade / d.jornada_total) * 100;
                const conforme = percAtividade >= 33.33;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs font-semibold tabular-nums text-gov-text-muted">
                      {d.matricula_servidor}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-gov-text-primary">
                      {d.nome}
                    </TableCell>
                    <TableCell className="text-xs text-gov-text-secondary">
                      {d.disciplina}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-center tabular-nums text-gov-text-primary">
                      {d.jornada_total}h
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-mono text-xs font-bold tabular-nums text-gov-text-primary">
                          {d.horas_atividade}h
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono px-1 py-0 ${
                            conforme
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          {percAtividade.toFixed(0)}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono px-1.5 py-0 ${
                          d.status === 'ativo'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-700 hover:text-blue-900">
                        Afastamentos
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
