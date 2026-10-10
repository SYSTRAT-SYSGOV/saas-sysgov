import React, { useEffect, useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@sysgov/ui';
import { paraCentavos } from '@/lib/formatacao';
import type { Toast } from '../../escola/components/AdminModal';
import { erroApi, formaturaApi, type Configuracao, type FormaPagamento, type Formando } from '../api';
import { hojeIso, proximaParcela, ROTULO_FORMA } from '../formato';

/** Registro de pagamento: valor digitado em reais e enviado em centavos inteiros. */
export const RegistrarPagamentoModal: React.FC<{
  aberto: boolean;
  ano: number;
  configuracao: Configuracao;
  formandos: Formando[];
  alunoIdInicial?: number;
  avisar: Toast;
  onFechar: () => void;
  onRegistrado: () => Promise<void>;
}> = ({ aberto, ano, configuracao, formandos, alunoIdInicial, avisar, onFechar, onRegistrado }) => {
  const participantes = formandos.filter((f) => f.participa && f.situacao_aluno !== 'transferido');
  const [alunoId, setAlunoId] = useState<number | null>(alunoIdInicial ?? null);
  const [parcela, setParcela] = useState('1');
  const [data, setData] = useState(hojeIso());
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState<FormaPagamento>(configuracao.formas_pagamento[0]);
  const [chave, setChave] = useState(configuracao.chaves_pix?.[0] ?? '');
  const [observacao, setObservacao] = useState('');
  const [erroValor, setErroValor] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!aberto || alunoId === null) return;
    formaturaApi.pagamentosDoFormando(alunoId, ano)
      .then((ps) => setParcela(String(proximaParcela(ps, configuracao.max_parcelas))))
      .catch(() => setParcela('1'));
  }, [aberto, alunoId, ano, configuracao.max_parcelas]);

  const registrar = async () => {
    const centavos = paraCentavos(valor);
    if (centavos === null || centavos <= 0) {
      setErroValor('Informe o valor em reais, ex.: 150,50');
      return;
    }
    if (alunoId === null) return;
    setErroValor(undefined);
    setEnviando(true);
    try {
      await formaturaApi.registrarPagamento({
        ano_letivo: ano, aluno_id: alunoId, numero_parcela: Number(parcela), data_pagamento: data, valor_centavos: centavos,
        forma_pagamento: forma, chave_pix: forma === 'pix' ? chave : null, observacao: observacao || null,
      });
      avisar({ type: 'success', title: 'Pagamento registrado', message: `Parcela ${parcela} lançada.` });
      setValor('');
      setObservacao('');
      await onRegistrado();
      onFechar();
    } catch (e) {
      avisar({ type: 'error', title: 'Pagamento não registrado', message: erroApi(e).mensagem });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      title="Registrar pagamento"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onFechar} disabled={enviando}>Cancelar</Button>
          <Button variant="primary" onClick={registrar} isLoading={enviando} disabled={alunoId === null}>Registrar</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Select
            label="Formando"
            value={alunoId}
            onChange={(v) => setAlunoId(Number(v))}
            placeholder="Selecione o formando"
            emptyText="Nenhum formando participante"
            options={participantes.map((f) => ({ value: f.aluno_id, label: `${f.nome} — ${f.turma ?? ''}` }))}
          />
        </div>
        <Input label={`Parcela (1 a ${configuracao.max_parcelas})`} type="number" min={1} max={configuracao.max_parcelas} value={parcela} onChange={(e) => setParcela(e.target.value)} className="font-mono tabular-nums" />
        <Input label="Data do pagamento" type="date" max={hojeIso()} value={data} onChange={(e) => setData(e.target.value)} className="font-mono tabular-nums" />
        <Input label="Valor (R$)" value={valor} onChange={(e) => setValor(e.target.value)} error={erroValor} inputMode="decimal" placeholder="150,50" className="font-mono tabular-nums" />
        <Select label="Forma de pagamento" value={forma} onChange={(v) => setForma(v as FormaPagamento)} options={configuracao.formas_pagamento.map((f) => ({ value: f, label: ROTULO_FORMA[f] }))} />
        {forma === 'pix' && (
          <div className="sm:col-span-2">
            <Select label="Chave Pix recebedora" value={chave} onChange={setChave} emptyText="Cadastre chaves Pix na Configuração" options={(configuracao.chaves_pix ?? []).map((c) => ({ value: c, label: c }))} />
          </div>
        )}
        <div className="sm:col-span-2 space-y-1">
          <p className="text-sm font-medium text-foreground">Observação</p>
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={500} rows={2} />
        </div>
      </div>
    </Modal>
  );
};
