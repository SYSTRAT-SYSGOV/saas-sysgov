import React, { useEffect, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { Button, Input, Modal, RichTextEditor, Select, Switch } from '@sysgov/ui';
import { sysgovApi, type Aula, type Material, type MaterialInput, type TipoMaterial } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { TIPO_MATERIAL, formatarTamanho } from '../utils/formatos';
import { LIBERACAO_IMEDIATA, liberacaoDe, liberacaoParaApi, validarLiberacao, validarPdf, type LiberacaoForm } from '../utils/validacoes';
import { CampoTexto } from './CampoTexto';
import { ErroFormulario } from './ErroFormulario';
import { RegraLiberacaoFields } from './RegraLiberacaoFields';

interface Props {
  open: boolean;
  cursoId: number;
  aulas: Aula[];
  material?: Material | null;
  onClose: () => void;
  onSalvo: () => void;
}

const TIPOS = (Object.keys(TIPO_MATERIAL) as TipoMaterial[]).map((tipo) => ({ value: tipo, label: TIPO_MATERIAL[tipo] }));

/** Cadastro de material: PDF, vídeo (YouTube/Vimeo), link externo ou texto, com a regra de liberação. */
export const MaterialFormModal: React.FC<Props> = ({ open, cursoId, aulas, material, onClose, onSalvo }) => {
  const [tipo, setTipo] = useState<TipoMaterial>('texto');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [url, setUrl] = useState('');
  const [publicado, setPublicado] = useState(false);
  const [liberacao, setLiberacao] = useState<LiberacaoForm>(LIBERACAO_IMEDIATA);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setArquivo(null);
    setTipo(material?.tipo ?? 'texto');
    setTitulo(material?.titulo ?? '');
    setDescricao(material?.descricao ?? '');
    setConteudo(material?.conteudo ?? '');
    setUrl(material?.tipo === 'link' ? (material.url ?? '') : '');
    setPublicado(material?.publicado ?? false);
    setLiberacao(liberacaoDe(material));
  }, [open, material]);

  const escolherArquivo = (novo: File | null) => {
    if (novo) {
      const problema = validarPdf(novo);
      if (problema) {
        setErro(problema);
        return;
      }
    }
    setErro(null);
    setArquivo(novo);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (titulo.trim() === '') {
      setErro('Informe o título do material.');
      return;
    }
    const problema = validarLiberacao(liberacao);
    if (problema) {
      setErro(problema);
      return;
    }
    if ((tipo === 'link' || (tipo === 'video' && !material)) && url.trim() === '') {
      setErro(tipo === 'link' ? 'Informe o endereço do link.' : 'Informe o endereço do vídeo.');
      return;
    }
    if (tipo === 'texto' && conteudo.replace(/<[^>]*>/g, '').trim() === '') {
      setErro('Informe o conteúdo do texto.');
      return;
    }
    if (tipo === 'arquivo' && publicado && !arquivo && !material?.arquivo_nome) {
      setErro('Envie o arquivo PDF antes de publicar o material.');
      return;
    }

    setSalvando(true);
    setErro(null);
    // Material de arquivo só pode ser publicado depois de ter o PDF: cria/atualiza como rascunho, envia e publica.
    const publicarDepois = tipo === 'arquivo' && publicado && !material?.arquivo_nome;
    const dados: MaterialInput = {
      titulo,
      descricao: descricao || null,
      publicado: publicarDepois ? false : publicado,
      ...liberacaoParaApi(liberacao),
      ...(tipo === 'texto' ? { conteudo } : {}),
      ...(tipo === 'link' || (tipo === 'video' && url.trim() !== '') ? { url } : {}),
    };
    try {
      const salvo = material ? await sysgovApi.cursos.atualizarMaterial(material.id, dados) : await sysgovApi.cursos.criarMaterial(cursoId, { ...dados, tipo });
      if (tipo === 'arquivo' && arquivo) await sysgovApi.cursos.enviarArquivoMaterial(salvo.id, arquivo);
      if (publicarDepois) await sysgovApi.cursos.atualizarMaterial(salvo.id, { publicado: true });
      onSalvo();
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível salvar o material.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={material ? 'Editar material' : 'Novo material'} icon={<Paperclip className="h-5 w-5" />} size="lg">
      <form onSubmit={salvar} noValidate className="space-y-4">
        <ErroFormulario mensagem={erro} />
        <Select label="Tipo" value={tipo} onChange={(v) => setTipo(v as TipoMaterial)} options={TIPOS} disabled={!!material} />
        <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={255} />
        <CampoTexto label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} maxLength={10000} />

        {tipo === 'texto' && (
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">Conteúdo</p>
            <RichTextEditor value={conteudo} onChange={setConteudo} minHeight={200} />
          </div>
        )}
        {tipo === 'link' && (
          <Input label="Endereço do link" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" required maxLength={2048} helperText="Só endereços http ou https." />
        )}
        {tipo === 'video' && (
          <Input
            label="Endereço do vídeo"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required={!material}
            maxLength={2048}
            helperText={material ? 'Deixe em branco para manter o vídeo atual. Aceitamos YouTube e Vimeo.' : 'Aceitamos YouTube e Vimeo.'}
          />
        )}
        {tipo === 'arquivo' && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Arquivo PDF (até 20 MB)</p>
            <input ref={inputArquivo} type="file" accept="application/pdf,.pdf" className="hidden" aria-label="Arquivo PDF" onChange={(e) => escolherArquivo(e.target.files?.[0] ?? null)} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => inputArquivo.current?.click()}>
                <Paperclip className="h-4 w-4" /> {arquivo || material?.arquivo_nome ? 'Trocar PDF' : 'Escolher PDF'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {arquivo ? `${arquivo.name} (${formatarTamanho(arquivo.size)})` : material?.arquivo_nome ? `${material.arquivo_nome} (${formatarTamanho(material.arquivo_tamanho)})` : 'Nenhum arquivo escolhido'}
              </span>
            </div>
          </div>
        )}

        <RegraLiberacaoFields value={liberacao} onChange={setLiberacao} aulas={aulas} />

        <div className="flex items-center gap-3">
          <Switch checked={publicado} onCheckedChange={setPublicado} label="Publicado para os participantes" />
          <span className="text-sm text-foreground">{publicado ? 'Publicado' : 'Rascunho — só o Administrador e os instrutores veem'}</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={salvando}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MaterialFormModal;
