import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@sysgov/ui';
import { formatarData } from '@/lib/formatacao';
import type { ImagemTrabalho, Trabalho } from '../api';
import { formatarAvaliacao } from '../formato';
import { ImagemAutenticada } from './ImagemAutenticada';

interface Props { trabalho: Trabalho; onEditar: () => void; onExcluir: () => void; onAbrirImagem: (imagem: ImagemTrabalho) => void }

export const CardTrabalho: React.FC<Props> = ({ trabalho: t, onEditar, onExcluir, onAbrirImagem }) => (
  <Card>
    <CardContent className="p-4 flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold">{t.titulo}</h3>
          <p className="text-xs text-muted-foreground">
            <Badge variant="secondary">{t.materia.nome}</Badge> <span className="font-mono tabular-nums">{formatarData(t.data)}</span>
            {t.trimestre && <> · {t.trimestre}º tri</>} · Turma {t.turma.nome} · por {t.autor.nome}
          </p>
        </div>
        <span className="font-mono tabular-nums text-xl font-bold text-primary">{formatarAvaliacao(t.avaliacao)}</span>
      </div>
      {t.descricao && <p className="text-sm">{t.descricao}</p>}
      {t.observacoes && <p className="text-sm text-muted-foreground"><strong>Observações:</strong> {t.observacoes}</p>}
      {t.imagens.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {t.imagens.map((i) => (
            <ImagemAutenticada key={i.id} url={i.url} alt={i.nome} className="h-20 w-28 object-cover rounded-md border" onClick={() => onAbrirImagem(i)} />
          ))}
        </div>
      )}
      {t.pode_editar && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onEditar}><Pencil className="h-4 w-4 mr-1" /> Editar</Button>
          <Button size="sm" variant="ghost" onClick={onExcluir}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>
        </div>
      )}
    </CardContent>
  </Card>
);
