import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Select, Textarea, PessoaPicker } from '@sysgov/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ArrowLeft, FileSignature, Eraser } from 'lucide-react';
import { usePessoaPicker } from '@/modules/pessoas/hooks';
import type { Documento, PapelAssinatura } from '../api';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';
import { enqueueAssinatura } from './syncEngine';
import { obterCoordenadasAtuais } from './geolocation';

export interface DocumentoAssinaturaPageProps {
  documento: Documento;
  onBack: () => void;
  onConcluido: () => void;
}

const PAPEL_OPTIONS = [
  { value: 'autuado', label: 'Autuado' },
  { value: 'responsavel', label: 'Responsável pelo estabelecimento' },
  { value: 'testemunha', label: 'Testemunha' },
];

/**
 * Coleta a assinatura (ou a recusa) do documento emitido na seção 6. A coleta é
 * enfileirada via `syncEngine` (igual à execução de vistoria) — funciona offline e
 * sincroniza quando a conexão voltar, com o timestamp oficial sempre definido pelo
 * servidor no momento da sincronização, nunca pelo relógio do dispositivo.
 */
export const DocumentoAssinaturaPage: React.FC<DocumentoAssinaturaPageProps> = ({ documento, onBack, onConcluido }) => {
  const [modo, setModo] = useState<'assinar' | 'recusar'>('assinar');
  const [papel, setPapel] = useState<PapelAssinatura>('autuado');
  const [motivo, setMotivo] = useState('');
  const [testemunhaPessoaId, setTestemunhaPessoaId] = useState<number | null>(null);
  const [enfileirando, setEnfileirando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const signaturePadRef = useRef<SignaturePadHandle>(null);
  const { buscarPessoas, criarPessoaRapido } = usePessoaPicker();

  async function handleConfirmarAssinatura() {
    const capturada = signaturePadRef.current?.exportar();
    if (!capturada) {
      setErro('Colha a assinatura na tela antes de confirmar.');
      return;
    }

    setErro(null);
    setEnfileirando(true);
    try {
      const coordenadas = await obterCoordenadasAtuais();
      await enqueueAssinatura(documento.id, {
        papel,
        status: 'assinada',
        tracadoVetorial: capturada.tracadoVetorial,
        imagemBase64: capturada.imagemBase64,
        latitude: coordenadas?.latitude,
        longitude: coordenadas?.longitude,
        coletadoEmDispositivo: new Date().toISOString(),
      });
      onConcluido();
    } catch {
      setErro('Não foi possível enfileirar a assinatura. Os dados continuam salvos no dispositivo — tente novamente.');
    } finally {
      setEnfileirando(false);
    }
  }

  async function handleConfirmarRecusa() {
    if (!motivo.trim()) {
      setErro('Informe o motivo da recusa.');
      return;
    }

    setErro(null);
    setEnfileirando(true);
    try {
      const coordenadas = await obterCoordenadasAtuais();
      await enqueueAssinatura(documento.id, {
        papel,
        status: 'recusada',
        motivo,
        testemunhaPessoaId,
        latitude: coordenadas?.latitude,
        longitude: coordenadas?.longitude,
        coletadoEmDispositivo: new Date().toISOString(),
      });
      onConcluido();
    } catch {
      setErro('Não foi possível enfileirar a recusa. Os dados continuam salvos no dispositivo — tente novamente.');
    } finally {
      setEnfileirando(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon={<FileSignature className="h-6 w-6" />}
        title={`Assinatura — ${documento.numero}`}
        actions={
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Voltar
          </Button>
        }
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Coleta de assinatura</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Papel de quem assina</label>
            <Select value={papel} onChange={(valor) => setPapel(valor as PapelAssinatura)} options={PAPEL_OPTIONS} />
          </div>

          <div className="flex gap-2">
            <Button variant={modo === 'assinar' ? 'primary' : 'outline'} onClick={() => setModo('assinar')}>
              Assinar
            </Button>
            <Button variant={modo === 'recusar' ? 'primary' : 'outline'} onClick={() => setModo('recusar')}>
              Registrar recusa
            </Button>
          </div>

          {modo === 'assinar' ? (
            <div className="flex flex-col gap-2">
              <SignaturePad ref={signaturePadRef} />
              <Button variant="outline" size="sm" leftIcon={<Eraser className="h-4 w-4" />} onClick={() => signaturePadRef.current?.limpar()} className="self-start">
                Limpar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Motivo da recusa *</label>
                <Textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={3} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Testemunha (opcional)</label>
                <PessoaPicker
                  value={testemunhaPessoaId}
                  onChange={(id) => setTestemunhaPessoaId(id)}
                  onSearch={buscarPessoas}
                  onCreatePessoa={criarPessoaRapido}
                  placeholder="Buscar testemunha no Cadastro Único..."
                />
              </div>
            </div>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex justify-end">
            <Button
              onClick={modo === 'assinar' ? handleConfirmarAssinatura : handleConfirmarRecusa}
              isLoading={enfileirando}
            >
              {modo === 'assinar' ? 'Confirmar assinatura' : 'Confirmar recusa'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentoAssinaturaPage;
