import React from 'react';
import { CheckCircle2, Clock, DollarSign, Users } from 'lucide-react';
import { Button, KpiCard, Skeleton } from '@sysgov/ui';
import { formatarCentavos } from '@/lib/formatacao';
import { useCarga } from '../../escola/useCarga';
import { formaturaApi } from '../api';
import type { PropsAba } from '../ModuloFormaturaMain';

/** Visão geral a partir do resumo do relatório do servidor (sem recalcular na tela). */
export const PainelFormatura: React.FC<PropsAba> = ({ ano, dados, irPara, permissoes }) => {
  const relatorio = useCarga(() => formaturaApi.relatorio(ano), [ano, dados]);
  const total = dados.formandos.length;
  const participantes = dados.formandos.filter((f) => f.participa).length;
  const adesao = total > 0 ? Math.round((participantes * 100) / total) : 0;

  if (relatorio.erro) return <p className="text-sm text-destructive">{relatorio.erro}</p>;
  if (!relatorio.dados) return <Skeleton className="h-40 w-full" />;
  const r = relatorio.dados.resumo;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Meta de arrecadação" value={formatarCentavos(r.valor_total_receber_centavos)} subtitle={`${r.total_formandos} participantes · ${r.total_convidados} convidados`} icon={<DollarSign className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Recebido" value={formatarCentavos(r.valor_total_recebido_centavos)} subtitle={`${r.percentual_arrecadado.toFixed(1)}% da meta`} icon={<CheckCircle2 className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="A receber" value={formatarCentavos(r.valor_total_pendente_centavos)} subtitle={`${r.qtd_parciais} parciais · ${r.qtd_pendentes} pendentes`} icon={<Clock className="h-5 w-5" />} className="font-mono tabular-nums" />
        <KpiCard title="Adesão" value={`${adesao}%`} subtitle={`${participantes} de ${total} alunos das turmas formandas`} icon={<Users className="h-5 w-5" />} className="font-mono tabular-nums" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => irPara('formandos')}>Ver formandos</Button>
        {permissoes.pagar && <Button variant="primary" onClick={() => irPara('pagamentos')}>Registrar pagamento</Button>}
        <Button variant="outline" onClick={() => irPara('relatorios')}>Relatório financeiro</Button>
      </div>
    </div>
  );
};
