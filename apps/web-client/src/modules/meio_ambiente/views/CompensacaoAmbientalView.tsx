import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Dialog, Input, Select } from '@sysgov/ui';
import { Landmark } from 'lucide-react';
import { useCan } from '@/core/rbac/useCan';
import {
  meioAmbienteApi,
  erroApi,
  type CompensacaoAmbiental,
  type DestinoCompensacao,
  type Empreendimento,
} from '../api';

const DESTINOS: { value: DestinoCompensacao; label: string }[] = [
  { value: 'fundo_municipal', label: 'Fundo Municipal de Meio Ambiente' },
  { value: 'unidade_conservacao', label: 'Unidade de Conservação' },
];

function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const CompensacaoAmbientalView: React.FC = () => {
  const { can } = useCan();
  const podeGerenciar = can('meio_ambiente.compensacao.manage');

  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [empreendimentoId, setEmpreendimentoId] = useState<number | null>(null);
  const [compensacoes, setCompensacoes] = useState<CompensacaoAmbiental[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoCompensacaoId, setAcaoCompensacaoId] = useState<number | null>(null);

  useEffect(() => {
    void meioAmbienteApi.listarEmpreendimentos({ per_page: 100 }).then((r) => {
      const comImpacto = r.data.filter((e) => e.impacto_significativo);
      setEmpreendimentos(comImpacto);
      if (comImpacto.length > 0) setEmpreendimentoId(comImpacto[0].id);
    });
  }, []);

  const carregar = useCallback(async () => {
    if (empreendimentoId === null) return;
    setLoading(true);
    setErro(null);
    try {
      setCompensacoes(await meioAmbienteApi.listarCompensacoesAmbientais(empreendimentoId));
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setLoading(false);
    }
  }, [empreendimentoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const compensacaoEmAcao = compensacoes.find((c) => c.id === acaoCompensacaoId) ?? null;

  return (
    <div>
      <div className="mb-4 w-80">
        <Select
          label="Empreendimento (impacto significativo)"
          value={empreendimentoId}
          onChange={(v) => setEmpreendimentoId(Number(v))}
          options={empreendimentos.map((e) => ({ value: e.id, label: e.razao_social ?? e.titular_nome ?? `#${e.id}` }))}
          emptyText="Nenhum empreendimento marcado como impacto significativo"
        />
      </div>

      {erro && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

      <div className="grid gap-3">
        {!loading && compensacoes.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma compensação ambiental para este empreendimento.</Card>
        )}
        {compensacoes.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold"><Landmark className="h-4 w-4" /> Compensação #{c.id} ({c.percentual}%)</div>
              <Badge variant={c.saldo_devedor_centavos > 0 ? 'warning' : 'success'}>
                {c.saldo_devedor_centavos > 0 ? 'Saldo pendente' : 'Quitada'}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><div className="text-xs text-muted-foreground">Devido</div><div className="font-mono">{formatarCentavos(c.valor_devido_centavos)}</div></div>
              <div><div className="text-xs text-muted-foreground">Pago</div><div className="font-mono">{formatarCentavos(c.valor_pago_centavos)}</div></div>
              <div><div className="text-xs text-muted-foreground">Destinado</div><div className="font-mono">{formatarCentavos(c.valor_destinado_centavos)}</div></div>
              <div><div className="text-xs text-muted-foreground">Saldo devedor</div><div className="font-mono font-semibold">{formatarCentavos(c.saldo_devedor_centavos)}</div></div>
            </div>
            {podeGerenciar && (
              <Button className="mt-3" variant="outline" size="sm" onClick={() => setAcaoCompensacaoId(c.id)}>Registrar pagamento / destinação</Button>
            )}
          </Card>
        ))}
      </div>

      {compensacaoEmAcao && (
        <CompensacaoAcaoModal
          compensacao={compensacaoEmAcao}
          onClose={() => setAcaoCompensacaoId(null)}
          onAtualizado={() => void carregar()}
        />
      )}
    </div>
  );
};

const CompensacaoAcaoModal: React.FC<{ compensacao: CompensacaoAmbiental; onClose: () => void; onAtualizado: () => void }> = ({ compensacao, onClose, onAtualizado }) => {
  const [valorPagamento, setValorPagamento] = useState('');
  const [destino, setDestino] = useState<DestinoCompensacao>('fundo_municipal');
  const [valorDestinacao, setValorDestinacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pagar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.registrarPagamentoCompensacao(compensacao.id, Math.round(Number(valorPagamento) * 100));
      setValorPagamento('');
      onAtualizado();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const destinar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await meioAmbienteApi.registrarDestinacaoCompensacao(compensacao.id, destino, Math.round(Number(valorDestinacao) * 100));
      setValorDestinacao('');
      onAtualizado();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Compensação #${compensacao.id}`} footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}>
      <div className="space-y-5">
        {erro && <div className="rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

        <section>
          <h4 className="mb-2 text-sm font-semibold">Registrar pagamento</h4>
          <div className="flex items-end gap-2">
            <Input label="Valor (R$)" type="number" value={valorPagamento} onChange={(e) => setValorPagamento(e.target.value)} />
            <Button onClick={pagar} disabled={salvando || !valorPagamento}>Registrar</Button>
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-sm font-semibold">Registrar destinação</h4>
          <div className="grid gap-2">
            <Select label="Destino" value={destino} onChange={(v) => setDestino(v as DestinoCompensacao)} options={DESTINOS} />
            <div className="flex items-end gap-2">
              <Input label="Valor (R$)" type="number" value={valorDestinacao} onChange={(e) => setValorDestinacao(e.target.value)} />
              <Button onClick={destinar} disabled={salvando || !valorDestinacao}>Registrar</Button>
            </div>
          </div>
        </section>
      </div>
    </Dialog>
  );
};
