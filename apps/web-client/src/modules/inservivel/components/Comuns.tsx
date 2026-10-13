import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Button, Select, Skeleton, StatusChip, Textarea, type TextareaProps } from '@sysgov/ui';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type Opcoes, type SituacaoRef } from '../api';
import { VARIANTE_PAPEL, secretarias, setoresDe } from '../formato';

/** Opções dos formulários (listas de parâmetros e Organograma), carregadas uma vez por tela. */
export function useOpcoes(versao: unknown = 0): { opcoes: Opcoes | null; erro: string | null } {
  const carga = useCarga(() => inservivelApi.opcoes(), [versao]);
  return { opcoes: carga.dados, erro: carga.erro };
}

export const ChipSituacao: React.FC<{ situacao: SituacaoRef }> = ({ situacao }) => (
  <StatusChip label={situacao.nome} variant={situacao.papel ? VARIANTE_PAPEL[situacao.papel] : 'neutral'} />
);

/**
 * Foto do bem servida pela API (arquivo privado): baixa com o token e mostra por blob: URL.
 * `carregar` permite usar a rota interna ou a do portal; `chave` identifica a foto (muda → baixa de novo).
 */
export const FotoBem: React.FC<{ chave: string | null; carregar: () => Promise<Blob>; alt: string; className?: string }> = ({ chave, carregar, alt, className = 'h-12 w-12' }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    if (chave === null) return undefined;
    let ativo = true;
    let criada: string | null = null;
    setUrl(null);
    setFalhou(false);
    carregar().then((blob) => {
      if (!ativo) return;
      criada = URL.createObjectURL(blob);
      setUrl(criada);
    }).catch(() => ativo && setFalhou(true));
    return () => {
      ativo = false;
      if (criada) URL.revokeObjectURL(criada);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  if (chave === null || falhou) {
    return <div className={`${className} flex items-center justify-center rounded-md bg-muted text-muted-foreground`} aria-label={`${alt}: sem foto`}><ImageOff className="h-4 w-4" /></div>;
  }
  if (!url) return <Skeleton className={`${className} rounded-md`} />;
  return <img src={url} alt={alt} className={`${className} rounded-md object-cover`} />;
};

/** Secretaria + setor do Organograma (o setor só lista unidades abaixo da secretaria). */
export const SelectUnidades: React.FC<{
  opcoes: Opcoes;
  secretaria: number | null;
  setor: number | null;
  onChange: (secretaria: number | null, setor: number | null) => void;
  obrigatoria?: boolean;
}> = ({ opcoes, secretaria, setor, onChange, obrigatoria = false }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <Select
      label={`Secretaria${obrigatoria ? ' *' : ''}`}
      value={secretaria === null ? '' : String(secretaria)}
      onChange={(v) => onChange(v ? Number(v) : null, null)}
      options={secretarias(opcoes.unidades).map((u) => ({ value: String(u.id), label: u.sigla ? `${u.sigla} — ${u.nome}` : u.nome }))}
      placeholder="Selecione a secretaria"
    />
    <Select
      label="Setor"
      value={setor === null ? '' : String(setor)}
      onChange={(v) => onChange(secretaria, v ? Number(v) : null)}
      options={[{ value: '', label: '(sem setor)' }, ...setoresDe(opcoes.unidades, secretaria)]}
      placeholder={secretaria === null ? 'Escolha a secretaria antes' : 'Selecione o setor'}
      disabled={secretaria === null}
    />
  </div>
);

/** Paginação simples (anterior / próxima). */
export const Paginacao: React.FC<{ pagina: number; ultima: number; total: number; onMudar: (p: number) => void }> = ({ pagina, ultima, total, onMudar }) => (
  <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
    <span><span className="font-mono tabular-nums">{total}</span> registro(s)</span>
    <div className="flex items-center gap-2">
      <BotaoPagina rotulo="Anterior" desativado={pagina <= 1} onClick={() => onMudar(pagina - 1)} />
      <span className="font-mono tabular-nums">{pagina} / {Math.max(1, ultima)}</span>
      <BotaoPagina rotulo="Próxima" desativado={pagina >= ultima} onClick={() => onMudar(pagina + 1)} />
    </div>
  </div>
);

const BotaoPagina: React.FC<{ rotulo: string; desativado: boolean; onClick: () => void }> = ({ rotulo, desativado, onClick }) => (
  <Button size="sm" variant="outline" disabled={desativado} onClick={onClick}>{rotulo}</Button>
);

/** Textarea com rótulo (o Textarea do @sysgov/ui não tem `label`). */
export const CampoTexto: React.FC<TextareaProps & { rotulo: string }> = ({ rotulo, ...props }) => (
  <label className="block space-y-1 text-sm font-medium">{rotulo}<Textarea {...props} /></label>
);
