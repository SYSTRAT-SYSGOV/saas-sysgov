import React, { useState } from 'react';
import { Modal, Button, Textarea, Badge } from '@sysgov/ui';
import { AlertTriangle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cemiteriosApi, type Jazigo } from '../api';
import { Mono } from './comum';

export interface ModalAcaoLoteManutencaoProps {
  aberto: boolean;
  jazigos: Jazigo[];
  onFechar: () => void;
  onConcluido: () => void;
}

export const ModalAcaoLoteManutencao: React.FC<ModalAcaoLoteManutencaoProps> = ({
  aberto,
  jazigos,
  onFechar,
  onConcluido,
}) => {
  const [tipoAcao, setTipoAcao] = useState<'manutencao' | 'restaurar'>('manutencao');
  const [motivo, setMotivo] = useState('');
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState({ processados: 0, sucesso: 0, falha: 0 });
  const [finalizado, setFinalizado] = useState(false);

  const total = jazigos.length;

  const executarEmLote = async () => {
    if (!motivo.trim() || total === 0) return;

    setExecutando(true);
    setFinalizado(false);
    let sucesso = 0;
    let falha = 0;

    for (let i = 0; i < jazigos.length; i++) {
      const j = jazigos[i];
      try {
        await cemiteriosApi.alterarEstado(j.id, tipoAcao, motivo.trim(), j.lock_version);
        sucesso++;
      } catch (err) {
        console.error(`Falha ao alterar estado do jazigo ${j.codigo}:`, err);
        falha++;
      }
      setProgresso({ processados: i + 1, sucesso, falha });
    }

    setExecutando(false);
    setFinalizado(true);
    onConcluido();
  };

  const fecharLimpo = () => {
    if (executando) return;
    setMotivo('');
    setProgresso({ processados: 0, sucesso: 0, falha: 0 });
    setFinalizado(false);
    onFechar();
  };

  return (
    <Modal
      open={aberto}
      onClose={fecharLimpo}
      title="Operação Coletiva de Manutenção / Interdição"
      description={`Aplicação em lote de transição de estado físico para ${total} unidade(s) selecionada(s).`}
      className="max-w-lg"
    >
      <div className="space-y-4 py-2 text-xs">
        {/* Escolha do tipo de transição */}
        <div className="space-y-1.5">
          <label className="font-semibold text-foreground block">Ação Coletiva a Executar:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={executando}
              onClick={() => setTipoAcao('manutencao')}
              className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                tipoAcao === 'manutencao'
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" /> Interditar para Manutenção
              </div>
              <p className="text-[11px] opacity-80 pt-0.5">Sinaliza ruína ou reformas estruturais</p>
            </button>

            <button
              type="button"
              disabled={executando}
              onClick={() => setTipoAcao('restaurar')}
              className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                tipoAcao === 'restaurar'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" /> Restaurar / Liberar
              </div>
              <p className="text-[11px] opacity-80 pt-0.5">Conclui reparos e libera unidade</p>
            </button>
          </div>
        </div>

        {/* Resumo dos Jazigos Selecionados */}
        <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Unidades Selecionadas:</span>
            <Badge variant="outline" className="font-mono text-[10px]">
              {total} unidade(s)
            </Badge>
          </div>
          <div className="max-h-20 overflow-y-auto flex flex-wrap gap-1 pt-1">
            {jazigos.map((j) => (
              <Mono key={j.id} className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                {j.codigo}
              </Mono>
            ))}
          </div>
        </div>

        {/* Campo obrigatório de justificativa técnica */}
        <div className="space-y-1.5">
          <label className="font-semibold text-foreground flex items-center justify-between">
            <span>Justificativa Técnica Formal:</span>
            <span className="text-[11px] text-muted-foreground font-normal">Obrigatória para fé pública</span>
          </label>
          <Textarea
            value={motivo}
            disabled={executando}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: Vistoria preventiva nº 24/2026 constatou avaria estrutural na laje superior..."
            rows={3}
            className="text-xs resize-none"
          />
        </div>

        {/* Barra de Progresso e Resultado */}
        {(executando || finalizado) && (
          <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                {executando && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                {executando ? 'Processando alterações...' : 'Operação concluída!'}
              </span>
              <Mono className="tabular-nums">
                {progresso.processados} / {total}
              </Mono>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${total > 0 ? (progresso.processados / total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="text-emerald-500 font-medium">✓ Sucesso: {progresso.sucesso}</span>
              {progresso.falha > 0 && (
                <span className="text-rose-500 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Erros: {progresso.falha}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Rodapé com botões de ação */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" disabled={executando} onClick={fecharLimpo}>
            {finalizado ? 'Concluir' : 'Cancelar'}
          </Button>
          {!finalizado && (
            <Button
              size="sm"
              disabled={executando || !motivo.trim()}
              onClick={executarEmLote}
              variant={tipoAcao === 'manutencao' ? 'destructive' : 'default'}
              className="gap-1.5 font-medium"
            >
              {executando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {executando ? 'Aplicando...' : 'Confirmar Operação em Lote'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
