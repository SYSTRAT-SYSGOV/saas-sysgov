import React, { useState } from 'react';
import { Button, RichTextEditor } from '@sysgov/ui';
import { Sparkles } from 'lucide-react';
import { sysgovApi, type LegislacaoUtilizadaIa } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';

interface SugestaoIa {
  texto: string;
  legislacaoUtilizada: LegislacaoUtilizadaIa[];
}

interface RichTextEditorWithIaProps {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  minHeight?: number;
  placeholder?: string;
  /**
   * Descrição do campo para a IA entender o que redigir (ex.: "Justificativa
   * técnica do item", ou o label do campo extra configurado pelo órgão).
   * Obrigatório a menos que `onSugerir` seja passado (que dispensa o
   * endpoint genérico e decide sozinho o que pedir à IA).
   */
  campo?: string;
  /** Texto livre com dados já preenchidos em outros campos do mesmo documento — ajuda a IA e a busca de legislação relevante. Opcional. */
  contexto?: string;
  /**
   * Sobrescreve a chamada padrão (POST /licita/ia/sugerir-texto) — usado
   * por telas com um prompt dedicado e melhor (ex.: Justificativa do DFD,
   * ver DfdIaController). Quando omitido, usa o endpoint genérico com
   * `campo`/`contexto`.
   */
  onSugerir?: () => Promise<SugestaoIa>;
  /** Desabilita só o botão "Sugerir com IA" (o editor continua editável) — ex.: enquanto um campo pré-requisito ainda está vazio. */
  sugerirDesabilitado?: boolean;
  /** Tooltip do botão "Sugerir com IA" quando `sugerirDesabilitado`. */
  sugerirDesabilitadoTitulo?: string;
}

/**
 * `@sysgov/ui`'s RichTextEditor (TinyMCE) + botão "Sugerir com IA" — padrão
 * obrigatório para todo campo de texto rico dos ARTEFATOS que o órgão
 * elabora no Licita (DFD, ETP, Mapa de Riscos, TR, ...), incluindo seus
 * campos extras configuráveis. A IA sempre se fundamenta na legislação
 * cadastrada na plataforma (global + do tenant), nunca "inventando"
 * embasamento legal.
 *
 * Use em qualquer novo campo TinyMCE desses artefatos em vez de
 * `RichTextEditor` puro.
 *
 * NÃO use na Biblioteca de Legislação (texto_completo de LegalDocumento):
 * aquele campo é a norma real tal como publicada — a FONTE que embasa a IA
 * aqui, nunca algo que a IA deva gerar. Ver LegislacaoDetailPage, que usa o
 * `RichTextEditor` puro de propósito.
 */
export const RichTextEditorWithIa: React.FC<RichTextEditorWithIaProps> = ({
  label,
  value,
  onChange,
  disabled,
  minHeight,
  placeholder,
  campo,
  contexto,
  onSugerir,
  sugerirDesabilitado,
  sugerirDesabilitadoTitulo,
}) => {
  const [sugerindo, setSugerindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [legislacaoUtilizada, setLegislacaoUtilizada] = useState<LegislacaoUtilizadaIa[] | null>(null);

  // Campo já tem conteúdo? Vira "Melhorar com IA" — a IA recebe o texto
  // atual (`value`) e o expande em vez de escrever do zero, deixando o
  // usuário refinar a sugestão em vários cliques (cada um deixa o texto um
  // pouco mais completo) em vez de só um texto pronto de uma vez só.
  const temConteudo = value.replace(/<[^>]*>/g, '').trim().length > 0;

  const handleSugerir = async () => {
    setErro(null);
    setSugerindo(true);
    try {
      const resultado = onSugerir
        ? await onSugerir()
        : await (async () => {
            const r = await sysgovApi.licita.sugerirTextoIa({
              campo: campo ?? label ?? 'Campo',
              contexto,
              texto_atual: temConteudo ? value : null,
            });
            return { texto: r.texto, legislacaoUtilizada: r.legislacao_utilizada };
          })();
      onChange(resultado.texto);
      setLegislacaoUtilizada(resultado.legislacaoUtilizada);
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível gerar a sugestão com IA.'));
    } finally {
      setSugerindo(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        {label ? <label className="block text-sm font-medium text-foreground">{label}</label> : <span />}
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            isLoading={sugerindo}
            disabled={sugerirDesabilitado}
            title={sugerirDesabilitado ? sugerirDesabilitadoTitulo : undefined}
            onClick={handleSugerir}
          >
            {temConteudo ? 'Melhorar com IA' : 'Sugerir com IA'}
          </Button>
        )}
      </div>
      {erro && (
        <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erro}
        </div>
      )}
      <RichTextEditor value={value} onChange={onChange} disabled={disabled} minHeight={minHeight} placeholder={placeholder} />
      {legislacaoUtilizada !== null && (
        <p className="mt-1 text-xs text-muted-foreground">
          {legislacaoUtilizada.length > 0 ? (
            <>Sugestão da IA fundamentada em: {legislacaoUtilizada.map((l) => l.titulo).join(', ')}. Revise antes de salvar.</>
          ) : (
            <>Sugestão gerada pela IA sem legislação específica cadastrada como base. Revise antes de salvar.</>
          )}
        </p>
      )}
    </div>
  );
};

export default RichTextEditorWithIa;
