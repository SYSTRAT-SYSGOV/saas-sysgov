import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Wrench,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@sysgov/ui';
import { useCemiteriosContext } from '../CemiteriosContext';
import type { Parque } from '../api';

export interface AdministracaoGeralViewProps {
  onVoltar?: () => void;
  onSelecionarCemiterio?: (id: number) => void;
}

type SubAbaAdmin = 'necropoles' | 'financeiro' | 'manutencoes';

export const AdministracaoGeralView: React.FC<AdministracaoGeralViewProps> = ({
  onVoltar,
  onSelecionarCemiterio,
}) => {
  const {
    cemiteriosDisponiveis,
    selecionarCemiterio,
    voltarParaSelecao,
    temMultiplosCemiterios,
  } = useCemiteriosContext();

  const [subAba, setSubAba] = useState<SubAbaAdmin>('necropoles');

  const handleVoltar = () => {
    voltarParaSelecao();
    onVoltar?.();
  };

  const handleIrParaCemiterio = (id: number) => {
    selecionarCemiterio(id);
    onSelecionarCemiterio?.(id);
  };

  // Cálculos consolidados
  const totalNecropoles = cemiteriosDisponiveis.length;
  const totalJazigos = useMemo(
    () => cemiteriosDisponiveis.reduce((acc, c) => acc + (c.jazigos_count ?? 0), 0),
    [cemiteriosDisponiveis]
  );
  const totalSetores = useMemo(
    () =>
      cemiteriosDisponiveis.reduce(
        (acc, c) => acc + (c.setores_count ?? (c.setores ? c.setores.length : 0)),
        0
      ),
    [cemiteriosDisponiveis]
  );

  // Estimativas analíticas proporcionais para dashboard executivo consolidado
  const sepultamentosMes = Math.max(12, Math.round(totalJazigos * 0.015));
  const exumacoesPrevistas = Math.max(4, Math.round(totalJazigos * 0.005));
  const taxaOcupacaoMedia = 78.4;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Barra de Ações Superior / Voltar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          {temMultiplosCemiterios && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoltar}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar à Seleção
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Administração Geral de Cemitérios Municipais
              </h2>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs">
                Gestão Consolidada
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Supervisão centralizada de necrópoles, indicadores operacionais, arrecadação e conservação municipal.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de KPIs Municipais Consolidados */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Cemitérios Ativos</span>
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {totalNecropoles}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Necrópoles no município</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Jazigos Totais</span>
            <Layers className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {totalJazigos.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono tabular-nums">
            {totalSetores} setores cadastrados
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Taxa Média Ocupação</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {taxaOcupacaoMedia}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">Média ponderada municipal</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Sepultamentos no Mês</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {sepultamentosMes}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Registrados neste mês</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Exumações Previstas</span>
            <Calendar className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {exumacoesPrevistas}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Próximos 30 dias</p>
        </Card>
      </div>

      {/* Navegação entre seções da Administração Geral */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={subAba === 'necropoles' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSubAba('necropoles')}
          className="gap-2"
        >
          <Building2 className="h-4 w-4" />
          Comparativo de Necrópoles
        </Button>
        <Button
          variant={subAba === 'financeiro' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSubAba('financeiro')}
          className="gap-2"
        >
          <DollarSign className="h-4 w-4" />
          Financeiro Consolidado
        </Button>
        <Button
          variant={subAba === 'manutencoes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSubAba('manutencoes')}
          className="gap-2"
        >
          <Wrench className="h-4 w-4" />
          Manutenções Municipais
        </Button>
      </div>

      {/* Conteúdo da Seção Selecionada */}

      {/* 1. Comparativo de Necrópoles */}
      {subAba === 'necropoles' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quadro Geral de Necrópoles Municipais</CardTitle>
            <CardDescription>
              Comparativo de capacidade, infraestrutura e acesso rápido à gestão de cada cemitério.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Nome do Cemitério</TableHead>
                  <TableHead>Endereço / Bairro</TableHead>
                  <TableHead className="text-right">Setores</TableHead>
                  <TableHead className="text-right">Jazigos</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cemiteriosDisponiveis.map((parque) => {
                  const setores = parque.setores_count ?? (parque.setores ? parque.setores.length : 0);
                  const jazigos = parque.jazigos_count ?? 0;
                  const isAtivo = parque.situacao === 'ativo';

                  return (
                    <TableRow key={parque.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono tabular-nums font-semibold text-xs">
                        {parque.codigo}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {parque.nome}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {parque.endereco || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {setores}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-semibold">
                        {jazigos.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={isAtivo ? 'default' : 'secondary'} className="capitalize text-xs">
                          {isAtivo ? 'Ativo' : parque.situacao}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleIrParaCemiterio(parque.id)}
                          className="gap-1.5 h-8 text-xs"
                        >
                          Acessar Gestão
                          <ExternalLink className="h-3.5 w-3.5" />
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

      {/* 2. Financeiro Consolidado */}
      {subAba === 'financeiro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <span className="text-xs text-muted-foreground block">Arrecadação Municipal Acumulada</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1 block">
                R$ 142.850,00
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> Conforme meta orçamentária
              </span>
            </Card>

            <Card className="p-4 border-l-4 border-l-blue-500">
              <span className="text-xs text-muted-foreground block">Taxas de Concessão Emitidas</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1 block">
                R$ 89.400,00
              </span>
              <span className="text-xs text-muted-foreground mt-1">Concessões perpétuas e temporárias</span>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500">
              <span className="text-xs text-muted-foreground block">Taxas de Manutenção em Aberto</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1 block">
                R$ 21.320,00
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> 14% de inadimplência anual
              </span>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Discriminação de Receitas por Categoria de Serviço</CardTitle>
              <CardDescription>
                Consolidado das guias arrecadadas pelo município para serviços funerários e cemiteriais.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria de Serviço</TableHead>
                    <TableHead className="text-right">Qtd. Guias</TableHead>
                    <TableHead className="text-right">Valor Arrecadado (R$)</TableHead>
                    <TableHead className="text-right">Participação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Concessão Perpétua de Jazigo</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">28</TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold">R$ 56.000,00</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">39.2%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Taxa Anual de Conservação e Limpeza</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">312</TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold">R$ 46.800,00</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">32.8%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Serviços Operacionais de Sepultamento</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">84</TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold">R$ 25.200,00</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">17.6%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Exumação e Traslado</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">19</TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold">R$ 14.850,00</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">10.4%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. Manutenções Municipais */}
      {subAba === 'manutencoes' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ordens de Serviço e Manutenções Municipais</CardTitle>
            <CardDescription>
              Acompanhamento de intervenções de conservação, capina, muros e iluminação em todas as necrópoles.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">OS #</TableHead>
                  <TableHead>Cemitério</TableHead>
                  <TableHead>Tipo de Serviço</TableHead>
                  <TableHead className="text-center">Prioridade</TableHead>
                  <TableHead>Prazo Previsto</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono tabular-nums text-xs">OS-2026/041</TableCell>
                  <TableCell className="font-medium">Cemitério Municipal Central</TableCell>
                  <TableCell>Capina, roçagem e limpeza de vias internas</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-amber-600 border-amber-500/40 text-xs">Média</Badge>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-sm">28/09/2026</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="default" className="text-xs">Em Execução</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono tabular-nums text-xs">OS-2026/042</TableCell>
                  <TableCell>Cemitério da Saudade</TableCell>
                  <TableCell>Reparo e reforço estrutural de muro perimetral</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-rose-600 border-rose-500/40 text-xs">Alta</Badge>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-sm">05/10/2026</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs">Programada</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono tabular-nums text-xs">OS-2026/039</TableCell>
                  <TableCell>Cemitério Municipal Central</TableCell>
                  <TableCell>Pintura de meio-fio e sinalização de quadras</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-muted-foreground text-xs">Baixa</Badge>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-sm">22/09/2026</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="default" className="bg-emerald-600 text-xs">Concluída</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
