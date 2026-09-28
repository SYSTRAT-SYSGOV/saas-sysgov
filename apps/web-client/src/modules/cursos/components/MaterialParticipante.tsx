import React, { useState } from 'react';
import { ExternalLink, FileText, Link2, Lock, PlayCircle } from 'lucide-react';
import { Button, buttonVariants } from '@sysgov/ui';
import { StatusChip } from '@/components/ui';
import { sysgovApi, type ConteudoMaterial } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { TIPO_MATERIAL, formatarDataHora, formatarTamanho } from '../utils/formatos';
import { abrirPdfEmNovaAba } from '../utils/arquivos';
import { ErroFormulario } from './ErroFormulario';
import { TextoSeguro } from './TextoSeguro';

/** Só os players que o servidor monta (YouTube sem cookies e Vimeo): outro endereço nunca vira iframe. */
const EMBED_PERMITIDO = /^https:\/\/(www\.youtube-nocookie\.com\/embed\/[\w-]{11}|player\.vimeo\.com\/video\/\d+)$/;
const LINK_PERMITIDO = /^https?:\/\//i;

const ICONE = { arquivo: FileText, video: PlayCircle, link: Link2, texto: FileText } as const;

/** Um material na área do participante: liberado com o conteúdo, ou só título e data prevista. */
export const MaterialParticipante: React.FC<{ material: ConteudoMaterial }> = ({ material }) => {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const Icone = material.liberado ? ICONE[material.tipo] : Lock;

  const abrirPdf = async () => {
    setErro(null);
    setAbrindo(true);
    try {
      abrirPdfEmNovaAba(await sysgovApi.cursos.baixarArquivoMaterial(material.id));
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível abrir o PDF.'));
    } finally {
      setAbrindo(false);
    }
  };

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Icone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{material.titulo}</p>
            <p className="text-xs text-muted-foreground">
              {TIPO_MATERIAL[material.tipo]}
              {material.arquivo_nome && ` · ${material.arquivo_nome} (${formatarTamanho(material.arquivo_tamanho)})`}
            </p>
          </div>
        </div>

        {!material.liberado ? (
          <StatusChip label={material.aguardando_agendamento ? 'Aguardando agendamento' : `Libera em ${formatarDataHora(material.prevista_em)}`} variant="warning" />
        ) : (
          <div className="flex items-center gap-2">
            {material.tipo === 'arquivo' && (
              <Button size="sm" variant="outline" onClick={abrirPdf} isLoading={abrindo}>
                <ExternalLink className="h-4 w-4" /> Abrir PDF
              </Button>
            )}
            {material.tipo === 'link' && material.url && LINK_PERMITIDO.test(material.url) && (
              <a href={material.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <ExternalLink className="h-4 w-4" /> Abrir link
              </a>
            )}
            {(material.tipo === 'texto' || material.tipo === 'video') && (
              <Button size="sm" variant="outline" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
                {aberto ? 'Ocultar' : material.tipo === 'video' ? 'Assistir' : 'Ler'}
              </Button>
            )}
          </div>
        )}
      </div>

      {material.liberado && material.descricao && <p className="whitespace-pre-line pl-6 text-xs text-muted-foreground">{material.descricao}</p>}
      <ErroFormulario mensagem={erro} />

      {material.liberado && aberto && material.tipo === 'texto' && <TextoSeguro html={material.conteudo} className="rounded-lg border border-border p-3" />}
      {material.liberado && aberto && material.tipo === 'video' && (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
          {material.embed_url && EMBED_PERMITIDO.test(material.embed_url) ? (
            <iframe
              title={`Vídeo: ${material.titulo}`}
              src={material.embed_url}
              className="h-full w-full"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="fullscreen"
              allowFullScreen
            />
          ) : (
            <p className="p-3 text-sm text-muted-foreground">Não foi possível exibir este vídeo.</p>
          )}
        </div>
      )}
    </li>
  );
};

export default MaterialParticipante;
