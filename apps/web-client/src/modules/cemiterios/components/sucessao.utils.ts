import type { EstadoSucessao, ViaSucessao, Parentesco, TipoDocumentoSucessao } from '../api';

export const VIA_LABELS: Record<ViaSucessao, string> = {
  inventario_judicial: 'Inventário Judicial',
  inventario_extrajudicial: 'Inventário Extrajudicial',
  alvara_judicial: 'Alvará Judicial',
  arrolamento: 'Arrolamento',
};

export const PARENTECO_LABELS: Record<Parentesco, string> = {
  companheiro: 'Cônjuge/Companheiro',
  filho: 'Filho(a)',
  pai: 'Pai',
  mae: 'Mãe',
  irmao: 'Irmão/Irmã',
  neto: 'Neto(a)',
  avo: 'Avô(óvia)',
  tio: 'Tio(a)',
  sobrinho: 'Sobrinho(a)',
  outro: 'Outro',
  representante: 'Representante',
};

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumentoSucessao, string> = {
  certidao_obito: 'Certidão de Óbito',
  inventario: 'Inventário',
  formal_partilha: 'Formal de Partilha',
  escritura: 'Escritura Pública',
  alvara: 'Alvará',
  procuracao: 'Procuração',
  outro: 'Outro',
};
