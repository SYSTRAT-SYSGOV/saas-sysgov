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
import { ShieldCheck, Download, AlertOctagon, AlertTriangle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { useEduca } from '../context/EducaContext';

interface PendenciaCenso {
  id: string;
  registro: string;
  descricao_registro: string;
  tipo: 'impeditivo' | 'aviso';
  mensagem: string;
  entidade_afetada: string;
}

export const EducacensoView: React.FC = () => {
  const { escolaAtiva, anoLetivoAtivo } = useEduca();
  const [exportando, setExportando] = useState<boolean>(false);
  const [exportadoComSucesso, setExportadoComSucesso] = useState<boolean>(false);

  const [pendencias] = useState<PendenciaCenso[]>([
    {
      id: '1',
      registro: 'Registro 30',
      descricao_registro: 'Docente / Profissional Escolar',
      tipo: 'impeditivo',
      mensagem: 'Docente sem CPF validado ou formação superior cadastrada para os Anos Finais.',
      entidade_afetada: 'Carlos Eduardo Mendes',
    },
    {
      id: '2',
      registro: 'Registro 20',
      descricao_registro: 'Turmas e Modalidades',
      tipo: 'aviso',
      mensagem: 'Turma sem código de forma de organização declarada (seriação regular assumida).',
      entidade_afetada: '5º Ano B',
    },
    {
      id: '3',
      registro: 'Registro 40',
      descricao_registro: 'Estudantes e Matrículas',
      tipo: 'aviso',
      mensagem: 'Certidão de nascimento em modelo antigo (sem matrícula civil de 32 dígitos).',
      entidade_afetada: 'Danilo Alves Ferreira',
    },
  ]);

  const totalImpeditivos = pendencias.filter((p) => p.tipo === 'impeditivo').length;
  const totalAvisos = pendencias.filter((p) => p.tipo === 'aviso').length;

  const handleExportarCenso = () => {
    setExportando(true);
    setTimeout(() => {
      setExportando(false);
      setExportadoComSucesso(true);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Resumo da Auditoria Prévia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-gov-border">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-gov-text-muted font-medium block">
                Pendências Impeditivas
              </span>
              <strong className="text-2xl font-mono tabular-nums text-rose-700">
                {totalImpeditivos}
              </strong>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gov-border">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-gov-text-muted font-medium block">
                Avisos / Alertas de Qualidade
              </span>
              <strong className="text-2xl font-mono tabular-nums text-amber-700">
                {totalAvisos}
              </strong>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gov-border">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-gov-text-muted font-medium block">
                Status da Unidade
              </span>
              <strong className="text-sm font-semibold text-gov-text-primary block mt-1">
                {totalImpeditivos === 0 ? 'Pronto para Exportar' : 'Correções Exigidas'}
              </strong>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ação de Exportação do Arquivo INEP */}
      <Card className="bg-white border-gov-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gov-border pb-4 gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-gov-text-primary flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-700" />
              Auditoria de Consistência e Exportação Censo Escolar (INEP/MEC)
            </CardTitle>
            <p className="text-xs text-gov-text-muted mt-1">
              {escolaAtiva?.nome || 'Escola Ativa'} • Layout Oficial Pipe-Delimited ISO-8859-1
            </p>
          </div>

          <Button
            onClick={handleExportarCenso}
            disabled={exportando || totalImpeditivos > 0}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            {exportando ? 'Gerando Arquivo INEP...' : 'Exportar Arquivo .txt do Censo'}
          </Button>
        </CardHeader>

        <CardContent className="pt-4">
          {exportadoComSucesso && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-md flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Lote de exportação concluído com sucesso! Registro de fechamento 99 gerado no padrão INEP.
              </span>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-32">Registro</TableHead>
                <TableHead className="text-xs w-28">Severidade</TableHead>
                <TableHead className="text-xs">Elemento Afetado</TableHead>
                <TableHead className="text-xs">Diagnóstico da Consistência Cadastral</TableHead>
                <TableHead className="text-xs text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendencias.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold tabular-nums text-gov-text-primary">
                    {p.registro}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-mono px-1.5 py-0 ${
                        p.tipo === 'impeditivo'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {p.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-gov-text-primary">
                    {p.entidade_afetada}
                  </TableCell>
                  <TableCell className="text-xs text-gov-text-secondary">
                    {p.mensagem}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-700 hover:text-blue-900">
                      Corrigir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
