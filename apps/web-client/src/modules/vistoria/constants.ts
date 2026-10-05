import type { TipoLocalFiscalizavel } from './api';

export const TIPO_LOCAL_LABELS: Record<TipoLocalFiscalizavel, string> = {
  propriedade_rural: 'Propriedade Rural',
  estabelecimento_comercial: 'Estabelecimento Comercial',
  feira: 'Feira',
  evento: 'Evento',
  outro: 'Outro',
};

export const TIPO_LOCAL_OPTIONS = (Object.entries(TIPO_LOCAL_LABELS) as [TipoLocalFiscalizavel, string][]).map(
  ([value, label]) => ({ value, label }),
);
