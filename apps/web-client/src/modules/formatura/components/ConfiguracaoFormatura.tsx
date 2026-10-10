import React, { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Switch, Textarea } from '@sysgov/ui';
import { paraCentavos } from '@/lib/formatacao';
import { erroApi, formaturaApi, type FormaPagamento, type TipoCalculo } from '../api';
import { centavosParaTexto, chavesPixDeTexto, FORMAS, ROTULO_FORMA } from '../formato';
import type { PropsAba } from '../ModuloFormaturaMain';

export const ConfiguracaoFormatura: React.FC<PropsAba> = ({ ano, dados, recarregar, avisar, permissoes }) => {
  const c = dados.configuracao;
  const [titulo, setTitulo] = useState(c?.titulo ?? `Formatura ${ano}`);
  const [tipo, setTipo] = useState<TipoCalculo>(c?.tipo_calculo ?? 'por_pessoa');
  const [valorBase, setValorBase] = useState(c ? centavosParaTexto(c.valor_base_centavos) : '');
  const [valorExtra, setValorExtra] = useState(c ? centavosParaTexto(c.valor_pessoa_extra_centavos) : '0,00');
  const [parcelas, setParcelas] = useState(String(c?.max_parcelas ?? 1));
  const [formas, setFormas] = useState<FormaPagamento[]>(c?.formas_pagamento ?? ['pix', 'dinheiro']);
  const [chaves, setChaves] = useState((c?.chaves_pix ?? []).join('\n'));
  const [turmas, setTurmas] = useState<number[]>(c?.turmas_ids ?? []);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const somenteLeitura = !permissoes.configurar;

  const alternar = <T,>(lista: T[], item: T, ligado: boolean): T[] => (ligado ? [...lista, item] : lista.filter((x) => x !== item));

  const salvar = async () => {
    const base = paraCentavos(valorBase);
    // Por pessoa usa um único valor; o valor por convidado só vale no tipo fixo + convidados (D16).
    const extra = tipo === 'por_pessoa' ? 0 : paraCentavos(valorExtra || '0');
    const novosErros: Record<string, string> = {};
    if (base === null) novosErros.valor_base = 'Informe o valor em reais, ex.: 150,00';
    if (extra === null) novosErros.valor_extra = 'Informe o valor em reais, ex.: 80,00';
    if (formas.length === 0) novosErros.formas = 'Escolha ao menos uma forma de pagamento';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0 || base === null || extra === null) return;

    setSalvando(true);
    try {
      await formaturaApi.salvarConfiguracao({
        ano_letivo: ano, titulo, tipo_calculo: tipo, valor_base_centavos: base, valor_pessoa_extra_centavos: extra,
        convidados_incluidos_padrao: 0, max_parcelas: Number(parcelas), formas_pagamento: formas,
        chaves_pix: chavesPixDeTexto(chaves), turmas_ids: turmas,
      });
      avisar({ type: 'success', title: 'Configuração salva', message: `Formatura de ${ano} atualizada.` });
      await recarregar();
    } catch (e) {
      avisar({ type: 'error', title: 'Não foi possível salvar', message: erroApi(e).mensagem });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Valores e pagamento — {ano}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={somenteLeitura} maxLength={200} />
          <Select
            label="Tipo de cálculo"
            value={tipo}
            onChange={(v) => setTipo(v as TipoCalculo)}
            disabled={somenteLeitura}
            options={[
              { value: 'por_pessoa', label: 'Por pessoa (formando + convidados)' },
              { value: 'fixo_mais_convidados', label: 'Valor fixo + convidados' },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {tipo === 'por_pessoa' ? (
              <Input label="Valor por pessoa (R$)" helperText="Formando e cada convidado pagam este valor." value={valorBase} onChange={(e) => setValorBase(e.target.value)} error={erros.valor_base} disabled={somenteLeitura} className="font-mono tabular-nums" inputMode="decimal" />
            ) : (
              <>
                <Input label="Valor fixo (R$)" helperText="Valor do formando." value={valorBase} onChange={(e) => setValorBase(e.target.value)} error={erros.valor_base} disabled={somenteLeitura} className="font-mono tabular-nums" inputMode="decimal" />
                <Input label="Valor por convidado (R$)" value={valorExtra} onChange={(e) => setValorExtra(e.target.value)} error={erros.valor_extra} disabled={somenteLeitura} className="font-mono tabular-nums" inputMode="decimal" />
              </>
            )}
            <Input label="Máximo de parcelas" type="number" min={1} max={24} value={parcelas} onChange={(e) => setParcelas(e.target.value)} disabled={somenteLeitura} className="font-mono tabular-nums" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Formas de pagamento aceitas</p>
            {FORMAS.map((f) => (
              <label key={f} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                {ROTULO_FORMA[f]}
                <Switch checked={formas.includes(f)} onCheckedChange={(v) => setFormas(alternar(formas, f, v))} disabled={somenteLeitura} label={ROTULO_FORMA[f]} />
              </label>
            ))}
            {erros.formas && <p className="text-xs text-destructive">{erros.formas}</p>}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Chaves Pix (uma por linha, até 5)</p>
            <Textarea value={chaves} onChange={(e) => setChaves(e.target.value)} disabled={somenteLeitura} rows={3} className="font-mono" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Turmas formandas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {dados.turmasDoAno.length === 0 ? (
            <p className="text-sm text-muted-foreground">Não há turmas de {ano} no Cadastro Escolar.</p>
          ) : (
            dados.turmasDoAno.map((t) => (
              <label key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-foreground">{t.nome}</span>
                  <span className="ml-2 text-muted-foreground">{t.turno?.nome ?? ''}</span>
                  {t.total_alunos !== undefined && <span className="ml-2 font-mono tabular-nums text-muted-foreground">{t.total_alunos} alunos</span>}
                </span>
                <Switch checked={turmas.includes(t.id)} onCheckedChange={(v) => setTurmas(alternar(turmas, t.id, v))} disabled={somenteLeitura} label={`Turma ${t.nome} é formanda`} />
              </label>
            ))
          )}
        </CardContent>
      </Card>

      {!somenteLeitura && (
        <div className="lg:col-span-2 flex justify-end">
          <Button variant="primary" onClick={salvar} isLoading={salvando}>Salvar configuração</Button>
        </div>
      )}
    </div>
  );
};
