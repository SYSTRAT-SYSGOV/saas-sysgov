import React from 'react';
import { Bus, CheckCircle2, ClipboardCheck, DollarSign, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, KpiCard, StatusChip } from '@sysgov/ui';
import { formatarCentavos, formatarData } from '@/lib/formatacao';
import type { Indicadores } from '../api';
import { STATUS, periodoDoPasseio } from '../formato';
import type { PropsAba } from '../ModuloPasseioMain';

const Barra: React.FC<{ rotulo: string; valor: number; total: number }> = ({ rotulo, valor, total }) => {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{rotulo}</span>
        <span className="font-mono tabular-nums">{valor} de {total} ({pct}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={rotulo} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

/** Indicadores do passeio ativo (API) e resumo geral da escola. */
export const PainelPasseio: React.FC<PropsAba & { indicadoresGerais: Indicadores | null }> = ({ ativo, dados, indicadoresGerais }) => {
  const i = dados.indicadores;
  const status = STATUS[ativo.status];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Vão ao passeio" value={i.alunos_que_vao} subtitle={`${i.alunos_inscritos} inscritos`} icon={<Users className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Termos entregues" value={`${i.autorizacoes_percentual.toFixed(0)}%`} subtitle={`${i.autorizacoes_entregues} de ${i.alunos_que_vao} que vão`} icon={<ClipboardCheck className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Arrecadado" value={formatarCentavos(i.arrecadado_centavos)} subtitle={`a receber ${formatarCentavos(i.pendente_centavos)}`} icon={<DollarSign className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Assentos marcados" value={`${i.assentos_ocupados} / ${i.capacidade_total}`} subtitle={`${i.total_veiculos} veículo(s)`} icon={<Bus className="h-5 w-5" />} className="font-mono tabular-nums" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between gap-2">{ativo.nome}<StatusChip label={status.rotulo} variant={status.variante} /></CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Data:</span> <span className="font-mono tabular-nums">{formatarData(ativo.data_passeio)}</span></p>
            <p><span className="text-muted-foreground">Horário:</span> <span className="font-mono tabular-nums">{periodoDoPasseio(ativo)}</span></p>
            <p><span className="text-muted-foreground">Destino:</span> {ativo.destino} — {ativo.cidade}</p>
            <p><span className="text-muted-foreground">Saída:</span> {ativo.local_saida}</p>
            <p><span className="text-muted-foreground">Responsável:</span> {ativo.responsavel}</p>
            <p><span className="text-muted-foreground">Valor por aluno:</span> <span className="font-mono tabular-nums">{formatarCentavos(ativo.valor_centavos)}</span></p>
            <p className="sm:col-span-2"><span className="text-muted-foreground">Prazo dos termos:</span> <span className="font-mono tabular-nums">{ativo.data_limite_autorizacao ? formatarData(ativo.data_limite_autorizacao) : 'não definido'}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Andamento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Barra rotulo="Termos de autorização entregues" valor={i.autorizacoes_entregues} total={i.alunos_que_vao} />
            <Barra rotulo="Alunos com assento marcado" valor={i.assentos_ocupados} total={i.alunos_que_vao} />
            <Barra rotulo="Ocupação da frota" valor={i.assentos_ocupados} total={i.capacidade_total} />
            {indicadoresGerais && (
              <p className="flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-mono tabular-nums">{indicadoresGerais.total_passeios}</span> passeio(s) cadastrados na escola ·
                <span className="font-mono tabular-nums">{formatarCentavos(indicadoresGerais.arrecadado_centavos)}</span> arrecadados no total
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
