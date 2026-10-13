import React from 'react';
import { Skeleton } from '@sysgov/ui';
import { useArquivoAutenticado } from '@/hooks/useArquivoAutenticado';

interface Props { url: string; alt: string; className?: string; onClick?: () => void }

/** <img> de arquivo privado da API (o token não vai no src). */
export const ImagemAutenticada: React.FC<Props> = ({ url, alt, className, onClick }) => {
  const { src, carregando } = useArquivoAutenticado(url);
  if (carregando || !src) return <Skeleton className={className} />;
  return onClick
    ? <button type="button" onClick={onClick} className="p-0 border-0 bg-transparent"><img src={src} alt={alt} className={className} /></button>
    : <img src={src} alt={alt} className={className} />;
};
