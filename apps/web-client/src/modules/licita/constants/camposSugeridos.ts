import type { CampoConfig, TipoDocumentoConfiguravel } from '@sysgov/sdk';

/**
 * Catálogo de campos extras sugeridos pelo sistema, por tipo de documento —
 * ponto de partida opcional para o órgão configurar os campos exigidos
 * pela legislação/procedimento local (ver CamposConfiguracaoPage). O órgão
 * decide o que usar: cada sugestão só entra na configuração quando o
 * usuário clica em "Adicionar" e, a partir daí, é um campo normal — pode
 * renomear o rótulo, mudar o tipo, marcar/desmarcar obrigatório ou excluir,
 * como qualquer campo criado do zero.
 *
 * `ordem` não é definido aqui — é calculado no momento em que a sugestão é
 * adicionada (fim da lista atual).
 */
export const CAMPOS_SUGERIDOS: Partial<Record<TipoDocumentoConfiguravel, Omit<CampoConfig, 'ordem'>[]>> = {
  dfd: [
    {
      key: 'responsavel_tecnico',
      label: 'Responsável Técnico',
      tipo: 'texto',
      obrigatorio: false,
      ajuda: 'Nome do servidor responsável técnico pelo planejamento da contratação.',
    },
    {
      key: 'base_legal_municipal',
      label: 'Base Legal Municipal Aplicável',
      tipo: 'texto',
      obrigatorio: false,
      ajuda: 'Decreto, instrução normativa ou lei municipal que fundamenta a contratação, além da Lei 14.133/2021.',
    },
    {
      key: 'observacoes_adicionais',
      label: 'Observações Adicionais',
      tipo: 'texto_longo',
      obrigatorio: false,
    },
    {
      key: 'valor_estimado_referencia',
      label: 'Valor Estimado de Referência (R$)',
      tipo: 'numero',
      obrigatorio: false,
    },
    {
      key: 'data_limite_interna',
      label: 'Data Limite Interna',
      tipo: 'data',
      obrigatorio: false,
      ajuda: 'Prazo interno do órgão, distinto da data prevista de contratação.',
    },
    {
      key: 'modalidade_sugerida',
      label: 'Modalidade Sugerida',
      tipo: 'selecao',
      opcoes: ['Pregão Eletrônico', 'Concorrência', 'Dispensa', 'Inexigibilidade'],
      obrigatorio: false,
    },
    {
      key: 'possui_recursos_orcamentarios',
      label: 'Possui Recursos Orçamentários Reservados?',
      tipo: 'booleano',
      obrigatorio: false,
    },
  ],
  dfd_item_material: [
    {
      key: 'marca_modelo_referencia',
      label: 'Marca/Modelo de Referência',
      tipo: 'texto',
      obrigatorio: false,
      ajuda: 'Apenas como parâmetro de pesquisa de preços — não vincula a marca na contratação.',
    },
    {
      key: 'especificacao_tecnica',
      label: 'Especificação Técnica Detalhada',
      tipo: 'texto_longo',
      obrigatorio: false,
    },
  ],
  dfd_item_servico: [
    {
      key: 'local_prestacao',
      label: 'Local de Prestação do Serviço',
      tipo: 'texto',
      obrigatorio: false,
    },
    {
      key: 'periodicidade',
      label: 'Periodicidade',
      tipo: 'selecao',
      opcoes: ['Única', 'Mensal', 'Trimestral', 'Semestral', 'Anual', 'Contínua'],
      obrigatorio: false,
    },
  ],
};
