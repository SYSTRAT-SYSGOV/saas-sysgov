/** "2026-10-31" → "31/10/2026". */
export function data(valor: string | null | undefined): string {
  if (!valor) return '—';
  const [a, m, d] = valor.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export const ROTULO_ALERTA: Record<string, string> = {
  cnh: 'CNH',
  curso: 'Curso especializado',
  toxicologico: 'Exame toxicológico',
  vistoria: 'Vistoria do DETRAN',
  contrato: 'Contrato da empresa',
};

export const ROTULO_INELEGIBILIDADE: Record<string, string> = {
  cnh_vencida: 'CNH vencida',
  curso_ausente: 'Curso especializado não informado',
  curso_vencido: 'Curso especializado vencido',
  toxicologico_ausente: 'Exame toxicológico não informado',
  toxicologico_vencido: 'Exame toxicológico vencido',
  nascimento_ausente: 'Sem data de nascimento no Cadastro de Pessoas',
  idade_minima: 'Idade mínima (mais de 21 anos) não atingida',
};

export const ROTULO_IRREGULARIDADE: Record<string, string> = {
  inativo: 'Veículo inativo',
  sem_vistoria: 'Sem vistoria',
  vistoria_vencida: 'Vistoria vencida',
  contrato_vencido: 'Contrato da empresa vencido',
};

export function rotuloDe(mapa: Record<string, string>, chave: string): string {
  return mapa[chave] ?? chave;
}

/** "em 12 dias", "hoje", "há 3 dias". */
export function prazo(dias: number): string {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'ontem';
  return dias > 0 ? `em ${dias} dias` : `há ${Math.abs(dias)} dias`;
}

export const ROTULO_ACAO: Record<string, string> = {
  'empresa.criada': 'Cadastrou empresa',
  'empresa.alterada': 'Alterou empresa',
  'empresa.excluida': 'Excluiu empresa',
  'motorista.criado': 'Cadastrou motorista',
  'motorista.alterado': 'Alterou motorista',
  'motorista.excluido': 'Excluiu motorista',
  'veiculo.criado': 'Cadastrou veículo',
  'veiculo.alterado': 'Alterou veículo',
  'veiculo.excluido': 'Excluiu veículo',
  'vistoria.registrada': 'Registrou vistoria',
};
