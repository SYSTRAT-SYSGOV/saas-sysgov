import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, KpiCard, Select, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { formatarCentavos } from '@/lib/formatacao';
import { useCarga } from '../../escola/useCarga';
import { formaturaApi, type Periodo, type Relatorio } from '../api';
import { periodoInvalido, periodoParaApi, ROTULO_FORMA, situacaoDoFormando } from '../formato';
import type { PropsAba } from '../ModuloFormaturaMain';

/** Relatório financeiro do servidor; turma filtrada na tela, período na API (D13). */
export const RelatorioFormatura: React.FC<PropsAba> = ({ ano, dados }) => {
  const [turma, setTurma] = useState('todas');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>({});
  const rel = useCarga(() => formaturaApi.relatorio(ano, periodo), [ano, periodo, dados]);

  const invalido = periodoInvalido(inicio, fim);
  const turmas = rel.dados?.turmas ?? [];
  const turmasVisiveis = turmas.filter((t) => turma === 'todas' || t.turma === turma);

  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-end">
          <Select label="Turma" value={turma} onChange={setTurma} options={[{ value: 'todas', label: 'Todas' }, ...turmas.map((t) => ({ value: t.turma, label: t.turma }))]} className="md:w-52" />
          <Input label="Recebido de" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="font-mono tabular-nums md:w-44" />
          <Input label="até" type="date" value={fim} onChange={(e) => setFim(e.target.value)} error={invalido ? 'Data final antes da inicial' : undefined} className="font-mono tabular-nums md:w-44" />
          <Button variant="outline" disabled={invalido} onClick={() => setPeriodo(periodoParaApi(inicio, fim))}>Aplicar período</Button>
          <Button variant="outline" className="md:ml-auto" leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Imprimir</Button>
        </CardContent>
      </Card>

      {rel.erro ? (
        <p className="text-sm text-destructive">{rel.erro}</p>
      ) : !rel.dados ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <ConteudoRelatorio relatorio={rel.dados} turmasVisiveis={turmasVisiveis} />
      )}
    </div>
  );
};

const ConteudoRelatorio: React.FC<{ relatorio: Relatorio; turmasVisiveis: Relatorio['turmas'] }> = ({ relatorio, turmasVisiveis }) => {
  const { resumo, formas_pagamento } = relatorio;
  return (
    <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="A receber (ano)" value={formatarCentavos(resumo.valor_total_receber_centavos)} subtitle={`${resumo.total_formandos} formandos · ${resumo.total_convidados} convidados`} className="font-mono tabular-nums" />
          <KpiCard title="Recebido (ano)" value={formatarCentavos(resumo.valor_total_recebido_centavos)} subtitle={`${resumo.percentual_arrecadado.toFixed(1)}%`} className="font-mono tabular-nums" />
          <KpiCard title="Pendente" value={formatarCentavos(resumo.valor_total_pendente_centavos)} subtitle={`${resumo.qtd_quitados} quitados · ${resumo.qtd_parciais} parciais · ${resumo.qtd_pendentes} pendentes`} className="font-mono tabular-nums" />
          {resumo.recebido_periodo_centavos !== undefined && (
            <KpiCard title="Recebido no período" value={formatarCentavos(resumo.recebido_periodo_centavos)} className="font-mono tabular-nums" />
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Por forma de pagamento{resumo.recebido_periodo_centavos !== undefined ? ' (no período)' : ''}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Forma</TableHead><TableHead className="text-right">Lançamentos</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
              <TableBody>
                {formas_pagamento.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum pagamento.</TableCell></TableRow>}
                {formas_pagamento.map((f) => (
                  <TableRow key={f.forma_pagamento}>
                    <TableCell>{ROTULO_FORMA[f.forma_pagamento]}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{f.quantidade}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(f.total_centavos)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{f.percentual.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {turmasVisiveis.map((t) => (
          <Card key={t.turma} className="break-inside-avoid">
            <CardHeader>
              <CardTitle>
                {t.turma} <span className="ml-2 font-mono text-sm font-normal tabular-nums text-muted-foreground">
                  {formatarCentavos(t.valor_total_recebido_centavos)} de {formatarCentavos(t.valor_total_receber_centavos)} ({t.percentual_arrecadado.toFixed(1)}%)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Nome</TableHead><TableHead className="text-right">Convidados</TableHead><TableHead className="text-right">Devido</TableHead><TableHead className="text-right">Pago</TableHead><TableHead className="text-right">Saldo</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader>
                <TableBody>
                  {t.alunos.map((a) => {
                    const s = situacaoDoFormando(a);
                    return (
                      <TableRow key={a.aluno_id}>
                        <TableCell className="font-mono tabular-nums">{a.numero ?? '—'}</TableCell>
                        <TableCell>{a.nome}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{a.convidados}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(a.valor_devido_centavos)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(a.total_pago_centavos)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(a.saldo_devedor_centavos)}</TableCell>
                        <TableCell><StatusChip label={s.rotulo} variant={s.variante} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
    </>
  );
};
