import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Textarea, Select } from '@sysgov/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ArrowLeft, Camera, ClipboardCheck, AlertCircle } from 'lucide-react';
import type { OrdemServico, ModeloFormulario, Pergunta } from '../api';
import { compressImage } from './imageCompression';
import { enqueueExecucao } from './syncEngine';
import { obterCoordenadasAtuais } from './geolocation';

export interface CampoExecucaoPageProps {
  ordem: OrdemServico;
  formulario: ModeloFormulario | null;
  onBack: () => void;
  onEnfileirado: () => void;
}

interface RespostaEmEdicao {
  valor: string;
  latitude?: number;
  longitude?: number;
  capturadoEm?: string;
}

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Execução de vistoria em campo: renderiza o checklist dinâmico do formulário
 * baixado no pacote do dia (100% offline) e enfileira a execução ao concluir.
 * Quando a ordem não tem formulário aplicável, cai num formulário mínimo
 * (observação livre), mantendo o fluxo da seção 4 funcionando.
 */
export const CampoExecucaoPage: React.FC<CampoExecucaoPageProps> = ({ ordem, formulario, onBack, onEnfileirado }) => {
  const [respostas, setRespostas] = useState<Record<number, RespostaEmEdicao>>({});
  const [observacaoLivre, setObservacaoLivre] = useState('');
  const [comprimindoId, setComprimindoId] = useState<number | null>(null);
  const [pendentes, setPendentes] = useState<Set<number>>(new Set());
  const [enfileirando, setEnfileirando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const iniciadoEmDispositivo = React.useRef(new Date().toISOString());

  const perguntas = (formulario?.perguntas_ativas ?? []).slice().sort((a, b) => a.ordem - b.ordem);

  async function registrarResposta(pergunta: Pergunta, valor: string) {
    const coordenadas = await obterCoordenadasAtuais();
    setRespostas((atual) => ({
      ...atual,
      [pergunta.id]: {
        valor,
        latitude: coordenadas?.latitude,
        longitude: coordenadas?.longitude,
        capturadoEm: new Date().toISOString(),
      },
    }));
    setPendentes((atual) => {
      const copia = new Set(atual);
      copia.delete(pergunta.id);
      return copia;
    });
  }

  async function handleFoto(pergunta: Pergunta, event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setComprimindoId(pergunta.id);
    try {
      const comprimida = await compressImage(arquivo);
      await registrarResposta(pergunta, await blobParaBase64(comprimida));
    } catch {
      setErro('Não foi possível processar a foto capturada.');
    } finally {
      setComprimindoId(null);
    }
  }

  async function handleConcluir() {
    setErro(null);

    if (formulario) {
      const faltando = perguntas.filter((p) => p.obrigatoria && !respostas[p.id]?.valor);
      if (faltando.length > 0) {
        setPendentes(new Set(faltando.map((p) => p.id)));
        setErro('Responda as perguntas obrigatórias destacadas antes de concluir.');
        return;
      }
    }

    setEnfileirando(true);
    try {
      const dados = formulario
        ? {
            respostas: Object.entries(respostas).map(([perguntaId, resposta]) => ({
              pergunta_id: Number(perguntaId),
              valor: resposta.valor,
              latitude: resposta.latitude,
              longitude: resposta.longitude,
              capturado_em: resposta.capturadoEm,
            })),
          }
        : { observacao: observacaoLivre };

      await enqueueExecucao(ordem.id, {
        dados,
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
          <CardTitle>{formulario ? formulario.nome : 'Observações da vistoria'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {formulario ? (
            perguntas.map((pergunta) => (
              <div key={pergunta.id} className={pendentes.has(pergunta.id) ? 'rounded-md border border-destructive p-3' : ''}>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  {pergunta.enunciado}
                  {pergunta.obrigatoria && <span className="text-destructive">*</span>}
                  {pendentes.has(pergunta.id) && <AlertCircle className="h-4 w-4 text-destructive" />}
                </label>

                {pergunta.tipo === 'multipla_escolha' && (
                  <Select
                    value={respostas[pergunta.id]?.valor ?? null}
                    onChange={(valor) => registrarResposta(pergunta, valor)}
                    options={(pergunta.opcoes ?? []).map((opcao) => ({ value: opcao, label: opcao }))}
                    placeholder="Selecione uma opção..."
                  />
                )}

                {pergunta.tipo === 'texto_livre' && (
                  <Textarea
                    value={respostas[pergunta.id]?.valor ?? ''}
                    onChange={(event) => registrarResposta(pergunta, event.target.value)}
                    rows={3}
                  />
                )}

                {pergunta.tipo === 'foto' && (
                  <div>
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      <input type="file" accept="image/*" capture="environment" onChange={(event) => handleFoto(pergunta, event)} />
                    </div>
                    {comprimindoId === pergunta.id && <p className="mt-1 text-xs text-muted-foreground">Comprimindo foto...</p>}
                    {respostas[pergunta.id]?.valor && comprimindoId !== pergunta.id && (
                      <p className="mt-1 text-xs text-muted-foreground">Foto pronta para envio.</p>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <Textarea
              placeholder="Descreva o que foi observado na vistoria..."
              value={observacaoLivre}
              onChange={(event) => setObservacaoLivre(event.target.value)}
              rows={5}
            />
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex justify-end">
            <Button onClick={handleConcluir} isLoading={enfileirando} disabled={comprimindoId !== null}>
              Concluir e enfileirar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampoExecucaoPage;
