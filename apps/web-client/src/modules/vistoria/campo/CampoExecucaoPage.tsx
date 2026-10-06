import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Textarea } from '@sysgov/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ArrowLeft, Camera, ClipboardCheck } from 'lucide-react';
import type { OrdemServico } from '../api';
import { compressImage } from './imageCompression';
import { enqueueExecucao } from './syncEngine';

export interface CampoExecucaoPageProps {
  ordem: OrdemServico;
  onBack: () => void;
  onEnfileirado: () => void;
}

/**
 * Formulário mínimo de execução de vistoria — só para validar a fila offline
 * ponta a ponta (seção 4). O checklist dinâmico completo é construído na seção 5.
 */
export const CampoExecucaoPage: React.FC<CampoExecucaoPageProps> = ({ ordem, onBack, onEnfileirado }) => {
  const [observacao, setObservacao] = useState('');
  const [foto, setFoto] = useState<Blob | null>(null);
  const [comprimindo, setComprimindo] = useState(false);
  const [enfileirando, setEnfileirando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const iniciadoEmDispositivo = React.useRef(new Date().toISOString());

  async function handleFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setComprimindo(true);
    try {
      setFoto(await compressImage(arquivo));
    } catch {
      setErro('Não foi possível processar a foto capturada.');
    } finally {
      setComprimindo(false);
    }
  }

  async function handleConcluir() {
    setEnfileirando(true);
    setErro(null);

    try {
      let fotoBase64: string | null = null;
      if (foto) {
        fotoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(foto);
        });
      }

      await enqueueExecucao(ordem.id, {
        dados: { observacao, foto: fotoBase64 },
        iniciadoEmDispositivo: iniciadoEmDispositivo.current,
        concluidoEmDispositivo: new Date().toISOString(),
      });

      onEnfileirado();
    } catch {
      setErro('Não foi possível enfileirar a execução. Os dados continuam salvos no dispositivo — tente novamente.');
    } finally {
      setEnfileirando(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon={<ClipboardCheck className="h-6 w-6" />}
        title={`Execução — OS #${ordem.id}`}
        subtitle={ordem.local?.nome ?? 'Local não identificado'}
        actions={
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Voltar
          </Button>
        }
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Observações da vistoria</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Textarea
            placeholder="Descreva o que foi observado na vistoria..."
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            rows={5}
          />

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Camera className="h-4 w-4" /> Foto (opcional)
            </label>
            <input type="file" accept="image/*" capture="environment" onChange={handleFoto} />
            {comprimindo && <p className="mt-1 text-xs text-muted-foreground">Comprimindo foto...</p>}
            {foto && !comprimindo && (
              <p className="mt-1 text-xs text-muted-foreground">Foto pronta para envio ({Math.round(foto.size / 1024)} KB).</p>
            )}
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex justify-end">
            <Button onClick={handleConcluir} isLoading={enfileirando} disabled={comprimindo}>
              Concluir e enfileirar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampoExecucaoPage;
