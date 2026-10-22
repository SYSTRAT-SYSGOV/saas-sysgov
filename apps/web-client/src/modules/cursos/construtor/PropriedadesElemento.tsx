import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Card, Input, Select, Switch } from '@sysgov/ui';
import type { AssinaturaOrgao, ElementoLeiaute, ElementoTexto } from '@sysgov/sdk';
import { ROTULO_CAMPO, marcador, rotuloElemento } from './leiaute';

interface PropriedadesProps {
  elemento: ElementoLeiaute;
  assinaturas: Map<number, AssinaturaOrgao>;
  onChange: (mudanca: Partial<ElementoLeiaute>) => void;
  /** Sem `onRemover`, o elemento é fixo do leiaute (sai pelo checkbox, não pela lixeira). */
  onRemover?: () => void;
  /** Campos que o elemento de texto pode trocar; vazio esconde a troca de campo. */
  campos?: string[];
  camposLivres: string[];
  tamanhoMin: number;
  tamanhoMax: number;
}

/** Propriedades do elemento selecionado: posição, largura da caixa, fonte, tamanho, cor e alinhamento. */
export const PropriedadesElemento: React.FC<PropriedadesProps> = ({
  elemento, assinaturas, onChange, onRemover, campos = [], camposLivres, tamanhoMin, tamanhoMax,
}) => {
  const tamanho = (v: string) => Math.min(tamanhoMax, Math.max(tamanhoMin, Number(v)));

  return (
    <Card className="space-y-2 p-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Propriedades do elemento</h3>
          <p className="text-xs font-medium text-primary">{rotuloElemento(elemento, assinaturas)}</p>
        </div>
        {onRemover && <Button size="icon-sm" variant="ghost" aria-label="Remover elemento" onClick={onRemover}><Trash2 /></Button>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Input label="X (pt)" type="number" value={elemento.x} onChange={(e) => onChange({ x: Number(e.target.value) })} />
        <Input label="Y (pt)" type="number" value={elemento.y} onChange={(e) => onChange({ y: Number(e.target.value) })} />
        <Input label="Largura caixa" type="number" value={elemento.largura} onChange={(e) => onChange({ largura: Number(e.target.value) })} />
      </div>

      {elemento.tipo === 'texto' && (
        <PropriedadesTexto el={elemento} campos={campos} camposLivres={camposLivres} tamanho={tamanho} min={tamanhoMin} max={tamanhoMax} onChange={(m) => onChange(m as Partial<ElementoLeiaute>)} />
      )}

      {elemento.tipo === 'assinatura' && (
        <>
          <div className="flex items-center gap-2">
            <Switch id="mostrar-textos" checked={elemento.mostrar_textos} onCheckedChange={(v) => onChange({ mostrar_textos: v } as Partial<ElementoLeiaute>)} label="Nome e cargo" />
            <label htmlFor="mostrar-textos" className="text-sm">Nome, cargo e registro abaixo</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Tamanho fonte (pt)" type="number" min={tamanhoMin} max={tamanhoMax} value={elemento.tamanho} onChange={(e) => onChange({ tamanho: tamanho(e.target.value) } as Partial<ElementoLeiaute>)} />
            <Cor valor={elemento.cor} onChange={(cor) => onChange({ cor } as Partial<ElementoLeiaute>)} />
          </div>
        </>
      )}
    </Card>
  );
};

const Cor: React.FC<{ valor: string; onChange: (cor: string) => void }> = ({ valor, onChange }) => (
  <label className="space-y-1 text-xs font-medium text-muted-foreground">Cor
    <input type="color" value={valor} onChange={(e) => onChange(e.target.value)} className="block h-9 w-full cursor-pointer rounded border border-input" />
  </label>
);

const PropriedadesTexto: React.FC<{
  el: ElementoTexto;
  campos: string[];
  camposLivres: string[];
  tamanho: (v: string) => number;
  min: number;
  max: number;
  onChange: (mudanca: Partial<ElementoTexto>) => void;
}> = ({ el, campos, camposLivres, tamanho, min, max, onChange }) => (
  <div className="space-y-2">
    {el.campo !== null ? (
      campos.length > 0 && <Select label="Campo" value={el.campo} onChange={(v) => onChange({ campo: v })} options={campos.map((c) => ({ value: c, label: ROTULO_CAMPO[c] ?? c }))} />
    ) : (
      <label className="block space-y-1 text-xs font-medium text-muted-foreground">
        Texto livre
        <textarea
          value={el.texto ?? ''}
          onChange={(e) => onChange({ texto: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
        />
        <span className="block font-normal">Variáveis: {camposLivres.map(marcador).join(' ')}</span>
      </label>
    )}
    <div className="grid grid-cols-2 gap-2">
      <Input label="Tamanho fonte (pt)" type="number" min={min} max={max} value={el.tamanho} onChange={(e) => onChange({ tamanho: tamanho(e.target.value) })} />
      <Cor valor={el.cor} onChange={(cor) => onChange({ cor })} />
      <Select label="Alinhamento" value={el.alinhamento} onChange={(v) => onChange({ alinhamento: v as ElementoTexto['alinhamento'] })} options={[{ value: 'esquerda', label: 'Esquerda' }, { value: 'centro', label: 'Centro' }, { value: 'direita', label: 'Direita' }, { value: 'justificado', label: 'Justificado' }]} />
      <Select label="Fonte" value={el.fonte} onChange={(v) => onChange({ fonte: v as ElementoTexto['fonte'] })} options={[{ value: 'sans', label: 'Sem serifa' }, { value: 'serif', label: 'Com serifa' }]} />
    </div>
    <div className="flex flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <Switch id="negrito" checked={el.negrito} onCheckedChange={(v) => onChange({ negrito: v })} label="Negrito" />
        <label htmlFor="negrito" className="text-sm">Negrito</label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="caixa-alta" checked={el.caixa_alta} onCheckedChange={(v) => onChange({ caixa_alta: v })} label="Caixa alta" />
        <label htmlFor="caixa-alta" className="text-sm">Caixa alta</label>
      </div>
    </div>
  </div>
);

export default PropriedadesElemento;
