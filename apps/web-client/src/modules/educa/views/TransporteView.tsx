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
} from '@sysgov/ui';
import { Bus, MapPin, Plus, User } from 'lucide-react';
import { useEduca } from '../context/EducaContext';

interface RotaTransporte {
  id: string;
  codigo: string;
  nome: string;
  tipo_veiculo: string;
  placa: string;
  condutor_nome: string;
  capacidade: number;
  alunos_vinculados: number;
  turno: string;
}

export const TransporteView: React.FC = () => {
  const { escolaAtiva } = useEduca();

  const [rotas] = useState<RotaTransporte[]>([
    {
      id: '1',
      codigo: 'ROTA-ZONA-RURAL-01',
      nome: 'Linha Água Limpa → Sede Municipal',
      tipo_veiculo: 'Micro-ônibus Escolar',
      placa: 'BRA-2E19',
      condutor_nome: 'Sebastião Moreira Neto',
      capacidade: 22,
      alunos_vinculados: 19,
      turno: 'matutino',
    },
    {
      id: '2',
      codigo: 'ROTA-URBANA-NORTE',
      nome: 'Bairro Esperança → EMEF Monteiro Lobato',
      tipo_veiculo: 'Ônibus Urbano',
      placa: 'SYG-4040',
      condutor_nome: 'Valdomiro Pereira',
      capacidade: 44,
      alunos_vinculados: 40,
      turno: 'vespertino',
    },
  ]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Transporte */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-lg border border-gov-border">
        <div>
          <h2 className="text-base font-semibold text-gov-text-primary flex items-center gap-2">
            <Bus className="w-5 h-5 text-blue-700" />
            Transporte Escolar Municipal (Rotas e Frotas)
          </h2>
          <p className="text-xs text-gov-text-muted mt-0.5">
            Gestão de veículos, itinerários de paradas e condutores credenciados no MDM Pessoas.
          </p>
        </div>

        <Button className="bg-blue-700 hover:bg-blue-800 text-white gap-2 text-xs">
          <Plus className="w-4 h-4" />
          Nova Rota
        </Button>
      </div>

      {/* Relação de Rotas e Ocupação */}
      <Card className="bg-white border-gov-border">
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Código da Rota</TableHead>
                <TableHead className="text-xs">Itinerário / Trajeto</TableHead>
                <TableHead className="text-xs">Veículo e Placa</TableHead>
                <TableHead className="text-xs">Condutor (Pessoa MDM)</TableHead>
                <TableHead className="text-xs text-center">Lotação do Veículo</TableHead>
                <TableHead className="text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rotas.map((r) => {
                const vagasLivres = r.capacidade - r.alunos_vinculados;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-semibold tabular-nums text-gov-text-primary">
                      {r.codigo}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-gov-text-primary">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>{r.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gov-text-secondary">
                      {r.tipo_veiculo} (
                      <strong className="font-mono uppercase tabular-nums">{r.placa}</strong>)
                    </TableCell>
                    <TableCell className="text-xs text-gov-text-secondary">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-gov-text-muted" />
                        <span>{r.condutor_nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-mono text-xs font-bold tabular-nums text-gov-text-primary">
                          {r.alunos_vinculados} / {r.capacidade}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono px-1.5 py-0 ${
                            vagasLivres === 0
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          }`}
                        >
                          {vagasLivres === 0 ? 'Lotado' : `${vagasLivres} vagas`}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-700 hover:text-blue-900">
                        Passageiros
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
