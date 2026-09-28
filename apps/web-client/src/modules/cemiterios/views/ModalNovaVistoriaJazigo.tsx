import React, { useState } from 'react';
import { Modal, Button, Textarea, Badge } from '@sysgov/ui';
import { ClipboardCheck, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { cemiteriosApi, type Jazigo } from '../api';

export interface ModalNovaVistoriaJazigoProps {
  aberto: boolean;
  jazigo: Pick<Jazigo, 'id' | 'codigo'> | null;
  onFechar: () => void;
  onSucesso: () => void;
}

const ESTADOS_CONSERVACAO = [
  { value: 'otimo', label: 'Ótimo' },
  { value: 'bom', label: 'Bom' },
  { value: 'regular', label: 'Regular' },
  { value: 'ruim', label: 'Ruim' },
  { value: 'critico', label: 'Crítico (Risco Estrutural)' },
];

const NIVEIS_RISCO = [
  { value: 'baixo', label: 'Baixo' },
  { value: 'medio', label: 'Médio' },
  { value: 'alto', label: 'Alto' },
];

export const ModalNovaVistoriaJazigo: React.FC<ModalNovaVistoriaJazigoProps> = ({
  aberto,
  jazigo,
  onFechar,
  onSucesso,
}) => {
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(hoje);
  const [estadoConservacao, setEstadoConservacao] = useState('regular');
  const [risco, setRisco] = useState('baixo');
  const [observacoes, setObservacoes] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!jazigo) return null;

  const handleFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFotos(Array.from(e.target.files));
    }
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    try {
      await cemiteriosApi.registrarVistoria({
        plot_id: jazigo.id,
        data,
        estado_conservacao: estadoConservacao,
        risco,
        observacoes: observacoes.trim() || undefined,
        fotos: fotos.length > 0 ? fotos : undefined,
      });

      onSucesso();
      fechar();
    } catch (err: any) {
      console.error('Erro ao registrar vistoria:', err);
      setErro(err?.message || 'Falha ao registrar a vistoria técnica.');
    } finally {
      setSalvando(false);
    }
  };

  const fechar = () => {
    setData(hoje);
    setEstadoConservacao('regular');
    setRisco('baixo');
    setObservacoes('');
    setFotos([]);
    setErro(null);
    onFechar();
  };

  return (
    <Modal
      open={aberto}
      onClose={fechar}
      title={`Nova Vistoria Técnica — Unidade ${jazigo.codigo}`}
      description="Registro de laudo de conservação física com anexação fotográfica e fé pública."
      className="max-w-lg"
    >
      <form onSubmit={salvar} className="space-y-4 py-2 text-xs">
        {erro && (
          <div className="p-2.5 rounded bg-destructive/10 text-destructive border border-destructive/20 font-medium">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-foreground block">Data da Inspeção:</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-foreground block">Classificação de Risco:</label>
            <select
              value={risco}
              onChange={(e) => setRisco(e.target.value)}
              className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground"
            >
              {NIVEIS_RISCO.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground block">Estado de Conservação Física:</label>
          <select
            value={estadoConservacao}
            onChange={(e) => setEstadoConservacao(e.target.value)}
            className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground"
          >
            {ESTADOS_CONSERVACAO.map((ec) => (
              <option key={ec.value} value={ec.value}>
                {ec.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground block">Parecer Técnico / Observações:</label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Descreva detalhes estruturais, infiltrações, trincas, estado da lápide ou potreiras..."
            rows={3}
            className="text-xs resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-foreground block">Anexar Fotografias do Túmulo:</label>
          <div className="border border-dashed border-border rounded-lg p-3 text-center space-y-1.5">
            <ImageIcon className="h-5 w-5 text-muted-foreground mx-auto" />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFotos}
              className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 cursor-pointer"
            />
            {fotos.length > 0 && (
              <span className="text-[11px] text-primary font-medium block">
                {fotos.length} foto(s) selecionada(s)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" type="button" disabled={salvando} onClick={fechar}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" disabled={salvando} className="gap-1.5 font-medium">
            {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {salvando ? 'Gravando...' : 'Salvar Vistoria'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
