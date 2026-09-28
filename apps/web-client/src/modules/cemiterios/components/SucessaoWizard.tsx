import React, { useState, useCallback } from 'react';
import { Button, Modal, Input, Field, Select } from '@/components/ui';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAcao, ErroBox } from '../views/comum';
import { cemiteriosApi } from '../api';
import type {
  AbrirSucessaoInput,
  Concessao,
  Sucessao,
  EstadoSucessao,
  ViaSucessao,
  Paginado,
} from '../api';
import { VIA_LABELS } from './sucessao.utils';
import { StatusChip } from '@/components/ui';
import { Mono } from '../views/comum';

interface SucessaoWizardProps {
  concessionId?: number;
  parkId?: number | null;
  aberto: boolean;
  onFechar: () => void;
  onSucesso?: () => void;
}

const VIA_OPTIONS: { value: ViaSucessao; label: string }[] = [
  { value: 'inventario_judicial', label: 'Inventário Judicial' },
  { value: 'inventario_extrajudicial', label: 'Inventário Extrajudicial' },
  { value: 'alvara_judicial', label: 'Alvará Judicial' },
  { value: 'arrolamento', label: 'Arrolamento' },
];

const PASSOS = ['Buscar Concessão', 'Definir Vias', 'Confirmar'] as const;

export const SucessaoWizard: React.FC<SucessaoWizardProps> = ({
  concessionId,
  parkId,
  aberto,
  onFechar,
  onSucesso,
}) => {
  const { executar, erro, enviando } = useAcao();
  const [passo, setPasso] = useState(concessionId ? 1 : 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState<Concessao[]>([]);
  const [concessaoSelecionada, setConcessaoSelecionada] = useState<Concessao | null>(null);
  const [viaSelecionada, setViaSelecionada] = useState<ViaSucessao>('inventario_judicial');
  const [processoReferencia, setProcessoReferencia] = useState('');
  const [dataFalecimento, setDataFalecimento] = useState('');
  const [buscaCarregando, setBuscaCarregando] = useState(false);

  const passoAtual = PASSOS[passo];

  const resetar = useCallback(() => {
    setPasso(concessionId ? 1 : 0);
    setSearchTerm('');
    setResultadosBusca([]);
    setConcessaoSelecionada(null);
    setViaSelecionada('inventario_judicial');
    setProcessoReferencia('');
    setDataFalecimento('');
  }, [concessionId]);

  React.useEffect(() => {
    if (concessionId && !concessaoSelecionada && aberto) {
      void carregarConcessao(concessionId);
    }
  }, [concessionId, aberto]);

  const carregarConcessao = useCallback(async (id: number) => {
    const res = await cemiteriosApi.concessao(id);
    setConcessaoSelecionada(res);
    setPasso(1);
  }, []);

  const buscarConcessao = useCallback(async () => {
    if (!searchTerm.trim()) return;
    setBuscaCarregando(true);
    try {
      const res: Paginado<Concessao> = await cemiteriosApi.concessoes({
        q: searchTerm,
        park_id: parkId ?? undefined,
        per_page: 20,
      });
      setResultadosBusca(res.data ?? []);
    } catch {
      setResultadosBusca([]);
    } finally {
      setBuscaCarregando(false);
    }
  }, [searchTerm, parkId]);

  const avancar = () => {
    if (passo === 0 && !concessaoSelecionada) return;
    if (passo < PASSOS.length - 1) setPasso(passo + 1);
  };

  const voltar = () => {
    if (passo > 0) setPasso(passo - 1);
  };

  const confirmar = useCallback(async () => {
    if (!concessaoSelecionada) return;
    const dados: AbrirSucessaoInput = {
      concession_id: concessaoSelecionada.id,
      park_id: concessaoSelecionada.jazigo?.park_id ?? parkId ?? null,
      plot_id: concessaoSelecionada.plot_id,
      via: viaSelecionada,
      processo_referencia: processoReferencia || undefined,
      data_falecimento: dataFalecimento || undefined,
    };

    await executar(async () => {
      await cemiteriosApi.criarSucessao(dados);
      onSucesso?.();
      resetar();
      onFechar();
    });
  }, [concessaoSelecionada, viaSelecionada, processoReferencia, dataFalecimento, executar, onSucesso, resetar, onFechar, parkId]);

  const podeAvancar = passo === 0 ? !!concessaoSelecionada : passo === 1 ? !!viaSelecionada : true;

  return (
    <Modal
      open={aberto}
      onClose={() => {
        resetar();
        onFechar();
      }}
      title="Abrir Processo de Sucessão Hereditária"
      size="2xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="flex gap-1">
            {PASSOS.map((p, i) => (
              <div
                key={p}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  i === passo
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/20 text-muted-foreground'
                }`}
              >
                {i + 1}. {p}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {passo > 0 && (
              <Button size="sm" variant="outline" onClick={voltar}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {passo < PASSOS.length - 1 ? (
              <Button size="sm" onClick={avancar} disabled={!podeAvancar}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={confirmar} disabled={enviando || !podeAvancar}>
                {enviando ? 'Criando…' : 'Criar Processo'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <ErroBox erro={erro} />

        {passo === 0 && (
          <div className="space-y-3">
            <Field label="Buscar Concessão" hint="Digite o número da concessão, código do jazigo ou nome do titular">
              <div className="flex gap-2">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex: CON-2024-001 ou João Silva"
                />
                <Button size="sm" variant="outline" onClick={buscarConcessao} disabled={buscaCarregando || !searchTerm.trim()}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </Field>

            {concessionId && (
              <div className="text-xs text-muted-foreground">
                Concessão #{concessionId} será carregada automaticamente.
              </div>
            )}

            {resultadosBusca.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {resultadosBusca.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      concessaoSelecionada?.id === c.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setConcessaoSelecionada(c)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Mono className="font-bold text-foreground">{c.numero}</Mono>
                        <div className="text-xs text-muted-foreground">
                          Jazigo: {c.jazigo?.codigo ?? '—'} · {c.concessionario?.nome ?? '—'}
                        </div>
                      </div>
                      {c.concessionario?.titular_falecido && (
                        <StatusChip label="Falecido" variant="danger" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {resultadosBusca.length === 0 && searchTerm && !buscaCarregando && (
              <p className="text-xs text-muted-foreground">Nenhuma concessão encontrada.</p>
            )}
          </div>
        )}

        {passo === 1 && (
          <div className="space-y-4">
            <Field label="Via de Sucessão" required>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {VIA_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                      viaSelecionada === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="via"
                      value={opt.value}
                      checked={viaSelecionada === opt.value}
                      onChange={() => setViaSelecionada(opt.value)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Número do Processo / Referência">
              <Input
                value={processoReferencia}
                onChange={(e) => setProcessoReferencia(e.target.value)}
                placeholder="Ex: 0012345-67.2026.8.16.0001"
              />
            </Field>

            <Field label="Data do Falecimento">
              <Input
                type="date"
                value={dataFalecimento}
                onChange={(e) => setDataFalecimento(e.target.value)}
                className="font-mono tabular-nums"
              />
            </Field>

            {concessaoSelecionada && (
              <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border">
                <div className="text-xs font-semibold text-muted-foreground mb-1">Concessão Selecionada</div>
                <Mono className="font-bold text-foreground">{concessaoSelecionada.numero}</Mono>
                <div className="text-xs text-muted-foreground mt-1">
                  Titular: {concessaoSelecionada.concessionario?.nome ?? '—'}
                </div>
              </div>
            )}
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/20 border border-border space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Resumo da Abertura</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Concessão:</span>
                  <Mono className="ml-2 font-medium">{concessaoSelecionada?.numero ?? '—'}</Mono>
                </div>
                <div>
                  <span className="text-muted-foreground">Via:</span>
                  <span className="ml-2">{VIA_LABELS[viaSelecionada] ?? viaSelecionada}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Processo:</span>
                  <Mono className="ml-2">{processoReferencia || '—'}</Mono>
                </div>
                <div>
                  <span className="text-muted-foreground">Data Falecimento:</span>
                  <Mono className="ml-2">{dataFalecimento || '—'}</Mono>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              O processo será criado no estado <strong>Solicitada</strong> e enviado para análise.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SucessaoWizard;
