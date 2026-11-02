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
  manutencao: 'Manutenção prevista',
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

/** Motivos de irregularidade de uma rota: do veículo, da empresa e do motorista. */
export const ROTULO_IRREGULARIDADE_ROTA: Record<string, string> = {
  ...ROTULO_IRREGULARIDADE,
  veiculo_inativo: 'Veículo inativo',
  empresa_inativa: 'Empresa inativa',
  motorista_inativo: 'Motorista inativo',
  ...ROTULO_INELEGIBILIDADE,
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
  'parada.criada': 'Cadastrou parada',
  'parada.alterada': 'Alterou parada',
  'parada.excluida': 'Excluiu parada',
  'rota.criada': 'Cadastrou rota',
  'rota.alterada': 'Alterou rota',
  'rota.excluida': 'Excluiu rota',
  'itinerario.parada_adicionada': 'Adicionou parada ao itinerário',
  'itinerario.parada_removida': 'Removeu parada do itinerário',
  'itinerario.reordenado': 'Reordenou o itinerário',
  'itinerario.horarios_alterados': 'Alterou horários da parada',
  'censo.pre_validado': 'Pré-validou o Censo',
  'censo.arquivo_gerado': 'Gerou o arquivo do Censo',
  'censo.conferencia_gerada': 'Gerou o CSV de conferência do Censo',
  'modelo_exportacao.criado': 'Criou modelo de exportação',
  'modelo_exportacao.alterado': 'Alterou modelo de exportação',
  'modelo_exportacao.excluido': 'Excluiu modelo de exportação',
  'importacao.previa': 'Enviou arquivo para importação',
  'importacao.concluida': 'Concluiu importação por CSV',
  'alocacao.criada': 'Alocou aluno em rota',
  'alocacao.alterada': 'Alterou alocação de aluno',
  'alocacao.encerrada': 'Encerrou alocação de aluno',
  'alocacao.encerrada_automaticamente': 'Alocação encerrada por mudança do aluno',
  'alocacao.excesso_autorizado': 'Autorizou alocação acima da capacidade',
  'alocacao.observacao_lida': 'Leu a observação de necessidade especial',
  'censo_leiaute.salvo': 'Alterou o leiaute de importação do Censo',
  'censo_leiaute.duplicado': 'Duplicou o leiaute de importação do Censo',
  'censo_leiaute.restaurado': 'Restaurou o leiaute de importação do Censo',
  'censo_leiaute.padrao': 'Definiu o leiaute padrão de importação do Censo',
  'censo_leiaute.excluido': 'Excluiu leiaute de importação do Censo',
  'custos.parametros_salvos': 'Alterou parâmetros de custo',
  'custos.parametros_copiados': 'Copiou parâmetros de custo entre anos',
  'custos.exportado': 'Exportou o relatório de custos',
  'fornecedor.criado': 'Cadastrou fornecedor',
  'fornecedor.alterado': 'Alterou fornecedor',
  'fornecedor.excluido': 'Excluiu fornecedor',
  'ordem_servico.aberta': 'Abriu ordem de serviço',
  'ordem_servico.alterada': 'Alterou ordem de serviço',
  'ordem_servico.concluida': 'Concluiu ordem de serviço',
  'ordem_servico.cancelada': 'Cancelou ordem de serviço',
  'manutencao_prevista.criada': 'Registrou manutenção prevista',
  'manutencao_prevista.cancelada': 'Cancelou manutenção prevista',
  'manutencao_prevista.convertida': 'Converteu manutenção prevista em ordem de serviço',
  'manutencao.exportada': 'Exportou o relatório de manutenção',
  'veiculo.km_atualizado': 'Atualizou a quilometragem do veículo',
  'veiculo.hodometro_corrigido': 'Corrigiu o hodômetro do veículo',
};

export const ROTULO_FAIXA: Record<string, string> = { verde: 'Folgada', amarelo: 'No limite', vermelho: 'Superlotada' };

export const ROTULO_AVISO: Record<string, string> = { turno_divergente: 'Turno da turma diferente do turno da rota' };

/** "20 de 40 (50%)", ou "sem veículo" quando a capacidade não é conhecida. */
export function textoOcupacao(o: { alocados: number; capacidade: number | null; percentual: number | null; calculavel: boolean }): string {
  if (!o.calculavel || o.capacidade === null || o.percentual === null) return `${o.alocados} (sem veículo)`;
  return `${o.alocados} de ${o.capacidade} (${o.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)`;
}

export const ROTULO_PENDENCIA: Record<string, string> = {
  sem_alocacao_ativa: 'Aluno que teve alocação no ano e hoje não tem nenhuma ativa',
  rota_sem_veiculo: 'Rota sem veículo',
  rural_sem_declaracao: 'Aluno de rota rural sem a declaração de transporte rural',
  veiculo_nao_adaptado: 'Aluno com necessidade especial em veículo não adaptado',
  sem_codigo_inep: 'Código Inep não cadastrado',
  campo_sem_dado: 'Campo selecionado sem dado cadastrado',
};

export const ROTULO_GRUPO_CENSO: Record<string, string> = { identificacao: 'Identificação', matricula: 'Matrícula e turma', transporte: 'Transporte' };

/** "12.5" → "12,50 km". */
export function km(valor: number): string {
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
}

/** Valor em reais (R$ 1.234,56). */
export function reais(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export const ROTULO_COMPONENTE_CUSTO: Record<string, string> = {
  pessoal: 'Pessoal (motorista e monitor, com encargos)',
  administrativo: 'Administrativo',
  depreciacao: 'Depreciação do veículo',
  remuneracao_capital: 'Remuneração do capital',
  seguro: 'Seguro, licenciamento e IPVA',
  manutencao: 'Manutenção',
  combustivel: 'Combustível',
  lubrificantes: 'Óleo e lubrificantes',
  rodagem: 'Rodagem (pneus e recapagem)',
  pecas: 'Peças e acessórios',
};

/** "faltam 400 km", "passou 600 km". */
export function prazoKm(restante: number): string {
  return restante >= 0 ? `faltam ${restante.toLocaleString('pt-BR')} km` : `passou ${Math.abs(restante).toLocaleString('pt-BR')} km`;
}

export const ROTULO_MODAL: Record<string, string> = { rodoviario: 'Rodoviário', aquaviario: 'Aquaviário' };
