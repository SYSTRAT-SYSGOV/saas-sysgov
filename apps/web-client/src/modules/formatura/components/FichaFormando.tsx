import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, MessageCircle, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { formatarCentavos, formatarData } from '@/lib/formatacao';
import { erroApi, formaturaApi, type Formando, type Pagamento } from '../api';
import { linkWhatsApp, previaValorDevido, ROTULO_FORMA, simularParcelas, situacaoDoFormando } from '../formato';
import type { PropsAba } from '../ModuloFormaturaMain';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { RegistrarPagamentoModal } from './RegistrarPagamentoModal';

/** Ficha do formando: convidados, observações e telefone (gravado no Cadastro Escolar, D14) e pagamentos. */
export const FichaFormando: React.FC<{ formando: Formando; aberto: boolean; props: PropsAba; onFechar: () => void }> = ({ formando, aberto, props, onFechar }) => {
  const { ano, dados, recarregar, avisar, permissoes } = props;
  const navigate = useNavigate();
  const [telefone, setTelefone] = useState(formando.telefone ?? '');
  const [convidados, setConvidados] = useState(String(formando.convidados));
  const [parcelasSimuladas, setParcelasSimuladas] = useState(dados.configuracao?.max_parcelas ?? 1);
  const [observacoes, setObservacoes] = useState(formando.observacoes ?? '');
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [estornar, setEstornar] = useState<Pagamento | null>(null);
  const situacao = situacaoDoFormando(formando);
  // Prévia enquanto o número de convidados é editado; sem alteração, vale o valor do servidor.
  const alterado = dados.configuracao !== null && (Number(convidados) || 0) !== formando.convidados;
  const devido = alterado && dados.configuracao
    ? previaValorDevido(dados.configuracao, formando.participa, Number(convidados) || 0)
    : formando.valor_devido_centavos;
  const saldo = Math.max(0, devido - formando.total_pago_centavos);
  const whatsapp = linkWhatsApp(formando.telefone);

  const carregarPagamentos = async () => {
    try {
      setPagamentos(await formaturaApi.pagamentosDoFormando(formando.aluno_id, ano));
    } catch (e) {
      avisar({ type: 'error', title: 'Pagamentos indisponíveis', message: erroApi(e).mensagem });
    }
  };
  useEffect(() => {
    if (aberto) void carregarPagamentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, formando.aluno_id, ano]);

  const salvar = async () => {
    setSalvando(true);
    try {
      await formaturaApi.salvarParticipacao(formando.aluno_id, ano, {
        participa: formando.participa, convidados: Number(convidados) || 0,
        observacoes: observacoes || null,
        // Só envia o telefone se mudou, para não sobrescrever uma alteração feita no Cadastro Escolar.
        ...(telefone.trim() !== (formando.telefone ?? '') ? { telefone: telefone.trim() || null } : {}),
      });
      avisar({ type: 'success', title: 'Ficha salva', message: 'Telefone gravado também no Cadastro Escolar.' });
      await recarregar();
      onFechar();
    } catch (e) {
      avisar({ type: 'error', title: 'Não foi possível salvar', message: erroApi(e).mensagem });
    } finally {
      setSalvando(false);
    }
  };

  const podeEditar = permissoes.editarFormandos;
  return (
    <>
      <Modal
        open={aberto}
        onClose={onFechar}
        title={formando.nome}
        description={<span className="font-mono tabular-nums">{formando.turma ?? '—'} · Nº {formando.numero ?? '—'} · CGM {formando.cgm ?? '—'}</span>}
        size="xl"
        headerActions={<StatusChip label={situacao.rotulo} variant={situacao.variante} />}
        footer={
          <>
            <Button variant="outline" leftIcon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate('/escola')}>Editar no Cadastro Escolar</Button>
            {podeEditar && <Button variant="primary" onClick={salvar} isLoading={salvando}>Salvar ficha</Button>}
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Telefone (contato principal)" value={telefone} onChange={(e) => setTelefone(e.target.value)} disabled={!podeEditar} maxLength={30} className="font-mono tabular-nums" />
            <Input label="Convidados" type="number" min={0} max={50} value={convidados} onChange={(e) => setConvidados(e.target.value)} disabled={!podeEditar || !formando.participa} className="font-mono tabular-nums" />
          </div>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <MessageCircle className="h-4 w-4" /> Conversar no WhatsApp
            </a>
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Observações</p>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={!podeEditar} maxLength={1000} rows={2} />
          </div>

          <div className="grid gap-2 font-mono tabular-nums text-sm sm:grid-cols-3">
            <div>Devido{alterado ? ' (prévia)' : ''}: <strong>{formatarCentavos(devido)}</strong></div>
            <div>Pago: <strong>{formatarCentavos(formando.total_pago_centavos)}</strong></div>
            <div>Saldo: <strong>{formatarCentavos(saldo)}</strong></div>
          </div>

          {dados.configuracao && saldo > 0 && (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-end">
              <Select
                label="Simular parcelas"
                value={parcelasSimuladas}
                onChange={(v) => setParcelasSimuladas(Number(v))}
                options={Array.from({ length: dados.configuracao.max_parcelas }, (_, i) => ({ value: i + 1, label: `${i + 1}×` }))}
                className="w-32 font-mono tabular-nums"
              />
              <p className="font-mono text-sm tabular-nums text-foreground">
                {simularParcelas(saldo, parcelasSimuladas).map((p) => `${p.quantidade}× ${formatarCentavos(p.valor)}`).join(' + ')}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Pagamentos</p>
              {permissoes.pagar && formando.participa && dados.configuracao && (
                <Button size="sm" variant="primary" onClick={() => setRegistrando(true)}>Registrar pagamento</Button>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parcela</TableHead><TableHead>Data</TableHead><TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum pagamento registrado.</TableCell></TableRow>
                )}
                {pagamentos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono tabular-nums">{p.numero_parcela}</TableCell>
                    <TableCell className="font-mono tabular-nums">{formatarData(p.data_pagamento)}</TableCell>
                    <TableCell>{ROTULO_FORMA[p.forma_pagamento]}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatarCentavos(p.valor_centavos)}</TableCell>
                    <TableCell className="text-right">
                      {permissoes.pagar && (
                        <Button size="xs" variant="ghost" aria-label="Estornar pagamento" onClick={() => setEstornar(p)}><Trash2 /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Modal>

      {dados.configuracao && (
        <RegistrarPagamentoModal
          aberto={registrando}
          ano={ano}
          configuracao={dados.configuracao}
          formandos={dados.formandos}
          alunoIdInicial={formando.aluno_id}
          avisar={avisar}
          onFechar={() => setRegistrando(false)}
          onRegistrado={async () => { await carregarPagamentos(); await recarregar(); }}
        />
      )}
      <ConfirmarModal
        aberto={estornar !== null}
        titulo="Estornar pagamento"
        perigo
        rotuloConfirmar="Estornar"
        mensagem={estornar && <>Estornar a parcela {estornar.numero_parcela} de <strong className="font-mono">{formatarCentavos(estornar.valor_centavos)}</strong>? O lançamento sai dos totais e fica registrado na auditoria.</>}
        onFechar={() => setEstornar(null)}
        onConfirmar={async () => {
          if (!estornar) return;
          try {
            await formaturaApi.estornarPagamento(estornar.id);
            avisar({ type: 'success', title: 'Pagamento estornado', message: 'Totais atualizados.' });
            await carregarPagamentos();
            await recarregar();
          } catch (e) {
            avisar({ type: 'error', title: 'Estorno não realizado', message: erroApi(e).mensagem });
          }
        }}
      />
    </>
  );
};
