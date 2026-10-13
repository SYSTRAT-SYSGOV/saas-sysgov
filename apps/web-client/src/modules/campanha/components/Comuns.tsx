import React from 'react';
import { Select } from '@sysgov/ui';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type MunicipioLinha } from '../api';

/** Municípios da UF da campanha (para seletores e nomes nas tabelas). */
export function useMunicipiosDaCampanha(campanhaId: number) {
  return useCarga<MunicipioLinha[]>(() => campanhaApi.municipios(), [campanhaId]);
}

export function nomeDoMunicipio(municipios: MunicipioLinha[] | null, ibge: number | null | undefined): string {
  if (!ibge) return '—';
  return municipios?.find((m) => m.codigo_ibge === ibge)?.nome ?? String(ibge);
}

/** `rotuloVazio`: o que "nenhum município" significa no contexto (ex.: Estadual, Campanha geral). */
export const SelectMunicipio: React.FC<{ label: string; municipios: MunicipioLinha[] | null; value: number | null; onChange: (ibge: number | null) => void; opcional?: boolean; disabled?: boolean; rotuloVazio?: string }> = ({ label, municipios, value, onChange, opcional = false, disabled, rotuloVazio = 'Nenhum' }) => (
  <Select
    label={label}
    value={value ?? (opcional ? 'nenhum' : null)}
    placeholder="Escolha o município"
    loading={municipios === null}
    disabled={disabled}
    onChange={(v) => onChange(v === 'nenhum' ? null : Number(v))}
    options={[...(opcional ? [{ value: 'nenhum', label: rotuloVazio }] : []), ...(municipios ?? []).map((m) => ({ value: m.codigo_ibge, label: m.nome }))]}
  />
);

/** Campo de texto opcional: vazio vira null na API. */
export const vazioParaNulo = (v: string): string | null => (v.trim() === '' ? null : v.trim());
