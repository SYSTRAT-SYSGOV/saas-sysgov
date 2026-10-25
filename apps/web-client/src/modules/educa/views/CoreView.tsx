import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@sysgov/ui';
import { Calendar, BookOpen, Layers, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { useEduca } from '../context/EducaContext';
import { LdbComplianceBadge } from '../components/LdbComplianceBadge';
import { apiClient } from '@/core/api/client';

interface TurmaResumo {
  id: string;
  codigo: string;
  nome: string;
  turno: string;
  serie_nome?: string;
  lotacao_maxima: number;
  lotacao_efetiva: number;
}

export const CoreView: React.FC = () => {
  const { escolaAtiva, anoLetivoAtivo, anoLetivoObj } = useEduca();
  const [turmas, setTurmas] = useState<TurmaResumo[]>([]);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [diasApurados, setDiasApurados] = useState<number>(200);
  const [horasApuradas, setHorasApuradas] = useState<number>(800);

  useEffect(() => {
    if (!escolaAtiva) return;

    setCarregando(true);
    apiClient
      .get(`/educa/core/escolas/${escolaAtiva.id}/turmas`, {
        params: { ano_letivo: anoLetivoAtivo },
      })
      .then((res) => {
        if (res.data?.data) {
          setTurmas(res.data.data);
        }
      })
      .catch(() => {
        // Fallback para visualização limpa
        setTurmas([]);
      })
      .finally(() => setCarregando(false));

    // Busca dados do calendário
    apiClient
      .get('/educa/core/calendarios/conformidade-ldb', {
        params: { school_id: escolaAtiva.id, ano: anoLetivoAtivo },
      })
      .then((res) => {
        if (res.data) {
          setDiasApurados(res.data.total_dias_letivos ?? 200);
          setHorasApuradas(res.data.total_horas_anuais ?? 800);
        }
      })
      .catch(() => {
        setDiasApurados(200);
        setHorasApuradas(800);
      });
  }, [escolaAtiva, anoLetivoAtivo]);

  return (
    <div className="space-y-6">
      {/* Diagnóstico LDB e Indicadores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LdbComplianceBadge diasApurados={diasApurados} horasApuradas={horasApuradas} />
        </div>

        <Card className="bg-white border-gov-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-gov-text-muted flex items-center justify-between">
              <span>Status do Ano Letivo</span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-gov-text-primary">
                {anoLetivoAtivo}
              </span>
              <Badge
                variant="outline"
                className={`uppercase text-[11px] font-mono ${
                  anoLetivoObj?.status === 'active'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                {anoLetivoObj?.status || 'Ativo'}
              </Badge>
            </div>
            <p className="text-xs text-gov-text-muted mt-2">
              Ciclo acadêmico com apuração centralizada de carga horária e dias de trabalho pedagógico.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Relação de Turmas e Matrizes Curriculares */}
      <Card className="bg-white border-gov-border">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gov-border pb-4">
          <div>
            <CardTitle className="text-sm font-semibold text-gov-text-primary flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Turmas Homologadas da Unidade Escolar
            </CardTitle>
            <p className="text-xs text-gov-text-muted mt-1">
              {escolaAtiva ? escolaAtiva.nome : 'Selecione uma escola'} • Ano {anoLetivoAtivo}
            </p>
          </div>
          <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Nova Turma
          </Button>
        </CardHeader>

        <CardContent className="pt-4">
          {carregando ? (
            <div className="py-8 text-center text-xs text-gov-text-muted font-mono animate-pulse">
              Carregando turmas e lotações...
            </div>
          ) : turmas.length === 0 ? (
            <div className="py-8 text-center text-xs text-gov-text-muted">
              Nenhuma turma cadastrada para este ano letivo na unidade escolar ativa.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Código</TableHead>
                  <TableHead className="text-xs">Nome da Turma</TableHead>
                  <TableHead className="text-xs">Turno</TableHead>
                  <TableHead className="text-xs">Lotação (Alunos / Vagas)</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turmas.map((t) => {
                  const vagasRestantes = Math.max(0, t.lotacao_maxima - t.lotacao_efetiva);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs font-semibold tabular-nums text-gov-text-primary">
                        {t.codigo}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-gov-text-primary">
                        {t.nome}
                      </TableCell>
                      <TableCell className="text-xs capitalize text-gov-text-secondary">
                        {t.turno}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold tabular-nums text-gov-text-primary">
                            {t.lotacao_efetiva} / {t.lotacao_maxima}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono px-1.5 py-0 ${
                              vagasRestantes === 0
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : vagasRestantes <= 2
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            }`}
                          >
                            {vagasRestantes === 0 ? 'Lotada' : `${vagasRestantes} vagas`}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-700 hover:text-blue-900">
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
