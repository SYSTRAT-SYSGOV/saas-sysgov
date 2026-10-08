import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Input, Select } from '@sysgov/ui';
import { Gavel, Receipt } from 'lucide-react';
import { useCan } from '@/core/rbac/useCan';
import {
  meioAmbienteApi,
  erroApi,
  type AutoInfracaoAmbiental,
  type Empreendimento,
  type ParcelamentoMulta,
  type TipoInfracaoAmbiental,
} from '../api';

const TIPOS_INFRACAO: { value: TipoInfracaoAmbiental; label: string }[] = [
  { value: 'desmatamento', label: 'Desmatamento' },
  { value: 'poluicao_hidrica', label: 'Poluição Hídrica' },
  { value: 'poluicao_atmosferica', label: 'Poluição Atmosférica' },
  { value: 'queimada', label: 'Queimada' },
  { value: 'caca_ilegal', label: 'Caça Ilegal' },
  { value: 'outra', label: 'Outra' },
];

function formatarCentavos(centavos: number | null): string {
  if (centavos === null) return '—';
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Emissão de auto de infração ambiental a partir de uma execução de vistoria já
 * concluída no módulo Vistoria. O Vistoria ainda não expõe uma tela/endpoint de
 * listagem de execuções concluídas (só a emissão de documento por ID) — por isso o
 * ID da execução é informado diretamente aqui, em vez de escolhido de uma lista.
 * Ver openspec/changes/criar-modulo-meio-ambiente/tasks.md (Fase 4, nota de
 * implementação) para o detalhamento dessa limitação.
 */
export const FiscalizacaoAmbientalView: React.FC = () => {
  const { can } = useCan();
  const podeAutuar = can('meio_ambiente.fiscalizacao.autuar');

  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [empreendimentoId, setEmpreendimentoId] = useState<number | null>(null);
  const [execucaoVistoriaId, setExecucaoVistoriaId] = useState('');
  const [tipoInfracao, setTipoInfracao] = useState<TipoInfracaoAmbiental>('desmatamento');
  const [areaAfetadaHa, setAreaAfetadaHa] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [autoEmitido, setAutoEmitido] = useState<AutoInfracaoAmbiental | null>(null);

  const [processoSancionatorioId, setProcessoSancionatorioId] = useState('');
  const [numeroParcelas, setNumeroParcelas] = useState('6');
  const [parcelamento, setParcelamento] = useState<ParcelamentoMulta | null>(null);
  const [erroParcelamento, setErroParcelamento] = useState<string | null>(null);
  const [salvandoParcelamento, setSalvandoParcelamento] = useState(false);

  useEffect(() => {
    void meioAmbienteApi.listarEmpreendimentos({ per_page: 100 }).then((r) => {
      setEmpreendimentos(r.data);
      if (r.data.length > 0) setEmpreendimentoId(r.data[0].id);
    });
  }, []);

  const emitirAuto = async () => {
    if (empreendimentoId === null || execucaoVistoriaId.trim() === '') return;
    setSalvando(true);
    setErro(null);
    setAutoEmitido(null);
    try {
      const auto = await meioAmbienteApi.emitirAutoInfracaoAmbiental(Number(execucaoVistoriaId), {
        empreendimento_id: empreendimentoId,
        tipo_infracao: tipoInfracao,
        area_afetada_ha: areaAfetadaHa ? Number(areaAfetadaHa) : null,
      });
      setAutoEmitido(auto);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const parcelar = async () => {
    if (processoSancionatorioId.trim() === '') return;
    setSalvandoParcelamento(true);
    setErroParcelamento(null);
    try {
      setParcelamento(await meioAmbienteApi.parcelarMulta(Number(processoSancionatorioId), Number(numeroParcelas)));
    } catch (e) {
      setErroParcelamento(erroApi(e).mensagem);
    } finally {
      setSalvandoParcelamento(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Gavel className="h-4 w-4" /> Emitir Auto de Infração Ambiental</h3>

        {erro && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Empreendimento"
            value={empreendimentoId}
            onChange={(v) => setEmpreendimentoId(Number(v))}
            options={empreendimentos.map((e) => ({ value: e.id, label: e.razao_social ?? e.titular_nome ?? `#${e.id}` }))}
          />
          <Input
            label="ID da Execução de Vistoria"
            value={execucaoVistoriaId}
            onChange={(e) => setExecucaoVistoriaId(e.target.value)}
            helperText="Execução concluída no app de campo do módulo Vistoria"
          />
          <Select label="Tipo de Infração" value={tipoInfracao} onChange={(v) => setTipoInfracao(v as TipoInfracaoAmbiental)} options={TIPOS_INFRACAO} />
          <Input label="Área Afetada (ha)" type="number" value={areaAfetadaHa} onChange={(e) => setAreaAfetadaHa(e.target.value)} />
        </div>

        {podeAutuar && (
          <Button className="mt-4" onClick={emitirAuto} disabled={salvando}>
            {salvando ? 'Emitindo...' : 'Emitir Auto de Infração'}
          </Button>
        )}

        {autoEmitido && (
          <div className="mt-4 rounded-md border p-4 text-sm">
            <div>Documento <span className="font-mono">{autoEmitido.documento_numero ?? `#${autoEmitido.documento_id}`}</span> emitido.</div>
            <div className="mt-1 flex items-center gap-2">
              Valor sugerido da multa: <span className="font-mono font-semibold">{formatarCentavos(autoEmitido.valor_multa_sugerido_centavos)}</span>
              {autoEmitido.reincidente && <Badge variant="warning">Reincidente</Badge>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              A defesa, o julgamento e o recurso tramitam no processo sancionatório do módulo Vistoria
              (mesmo fluxo da fiscalização geral) — valor final definido pelo julgador pode divergir do sugerido.
            </p>
          </div>
        )}
      </Card>

      {podeAutuar && (
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Receipt className="h-4 w-4" /> Parcelar Multa Aplicada</h3>

          {erroParcelamento && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erroParcelamento}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="ID do Processo Sancionatório" value={processoSancionatorioId} onChange={(e) => setProcessoSancionatorioId(e.target.value)} />
            <Input label="Número de Parcelas" type="number" value={numeroParcelas} onChange={(e) => setNumeroParcelas(e.target.value)} />
          </div>

          <Button className="mt-4" variant="outline" onClick={parcelar} disabled={salvandoParcelamento}>
            {salvandoParcelamento ? 'Parcelando...' : 'Parcelar'}
          </Button>

          {parcelamento && (
            <table className="mt-4 w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th>Parcela</th><th>Valor</th><th>Vencimento</th></tr></thead>
              <tbody>
                {parcelamento.parcelas.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-1">{p.numero}/{parcelamento.numero_parcelas}</td>
                    <td className="font-mono">{formatarCentavos(p.valor_centavos)}</td>
                    <td className="font-mono">{p.vencimento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
};
