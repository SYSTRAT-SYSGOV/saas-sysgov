export type TipoVinculoPessoa =
  | 'servidor_carreira'
  | 'estagiario'
  | 'comissionado'
  | 'clt'
  | 'municipe'
  | 'contribuinte'
  | 'aluno'
  | 'paciente'
  | 'fornecedor'
  | 'contratada'
  | 'concessionaria'
  | 'permissionaria'
  | 'credenciada';

export type TipoPessoa = 'fisica' | 'juridica';

export type PapelSocio = 'socio' | 'socio_administrador' | 'representante_legal';

export interface PessoaSocio {
  id: number;
  pessoa_id: number;
  socio_pessoa_id: number;
  socio_nome?: string | null;
  socio_documento_mascarado?: string | null;
  percentual_participacao?: string | null;
  papel: PapelSocio;
  data_entrada?: string | null;
  data_saida?: string | null;
}

export interface PessoaVinculo {
  id: number;
  pessoa_id: number;
  tipo_vinculo: TipoVinculoPessoa;
  matricula?: string | null;
  dados?: Record<string, unknown> | null;
  inicio?: string | null;
  fim?: string | null;
}

export interface PessoaDocumento {
  id: number;
  pessoa_id: number;
  tipo: 'rg' | 'cnh' | 'titulo_eleitor';
  numero: string;
  orgao_emissor?: string | null;
  uf_emissao?: string | null;
  data_emissao?: string | null;
}

export interface PessoaEndereco {
  id: number;
  pessoa_id: number;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  tipo_endereco: string;
}

export interface PessoaContato {
  id: number;
  pessoa_id: number;
  tipo: 'celular' | 'email' | 'telefone';
  valor: string;
  principal: boolean;
  autoriza_notificacoes: boolean;
}

export interface PessoaUsuarioVinculo {
  id: number;
  pessoa_id: number;
  user_id: number;
  promovido_em: string;
  promovido_por?: number | null;
}

export interface Pessoa {
  id: number;
  tenant_id: number;
  tipo: TipoPessoa;
  cpf_mascarado: string;
  documento_mascarado?: string;
  nome: string;
  nome_social?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  porte?: 'ME' | 'EPP' | 'DEMAIS' | null;
  natureza_juridica?: string | null;
  responsavel_id?: number | null;
  data_nascimento?: string | null;
  sexo?: string | null;
  nome_mae?: string | null;
  nome_pai?: string | null;
  estado_civil?: string | null;
  nacionalidade?: string | null;
  naturalidade?: string | null;
  nis?: string | null;
  /** Pessoa física sem CPF informado: aguarda regularização do documento. */
  documento_pendente?: boolean;
  status: 'ativo' | 'inativo';
  vinculos?: PessoaVinculo[];
  documentos?: PessoaDocumento[];
  enderecos?: PessoaEndereco[];
  contatos?: PessoaContato[];
  socios?: PessoaSocio[];
  usuario?: PessoaUsuarioVinculo | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePessoaInput {
  tipo?: TipoPessoa;
  nome?: string;
  cpf?: string;
  razao_social?: string;
  cnpj?: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  porte?: 'ME' | 'EPP' | 'DEMAIS';
  natureza_juridica?: string;
  responsavel_id?: number;
  nome_social?: string;
  data_nascimento?: string;
  sexo?: string;
  nome_mae?: string;
  nome_pai?: string;
  estado_civil?: string;
  nacionalidade?: string;
  naturalidade?: string;
  nis?: string;
  /** Confirma que não é a pessoa semelhante já cadastrada (cadastro sem CPF). */
  confirmar_novo?: boolean;
}

export type UpdatePessoaInput = Partial<CreatePessoaInput> & { status?: 'ativo' | 'inativo' };

export interface PessoaCompacta {
  id: number;
  tipo?: TipoPessoa;
  nome: string;
  nome_social?: string | null;
  cpf_mascarado: string;
  documento_pendente?: boolean;
  status: 'ativo' | 'inativo';
}

export interface ListPessoasParams {
  q?: string;
  tipo?: TipoPessoa;
  tipo_vinculo?: TipoVinculoPessoa;
  status?: 'ativo' | 'inativo';
  falecido?: boolean;
  sexo?: string;
  data_nascimento_de?: string;
  data_nascimento_ate?: string;
  documento_pendente?: boolean;
  per_page?: number;
  page?: number;
  compact?: boolean;
}

export interface CreateSocioInput {
  socio_pessoa_id: number;
  percentual_participacao?: number;
  papel?: PapelSocio;
  data_entrada?: string;
}

export type UpdateSocioInput = Partial<Omit<CreateSocioInput, 'socio_pessoa_id'>> & { data_saida?: string | null };


export interface CreateVinculoInput {
  tipo_vinculo: TipoVinculoPessoa;
  matricula?: string;
  dados?: Record<string, unknown>;
  inicio?: string;
  fim?: string;
}

export interface CreateDocumentoInput {
  tipo: 'rg' | 'cnh' | 'titulo_eleitor';
  numero: string;
  orgao_emissor?: string;
  uf_emissao?: string;
  data_emissao?: string;
}

export type UpdateDocumentoInput = Partial<CreateDocumentoInput>;

export interface CreateEnderecoInput {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  tipo_endereco?: string;
}

export type UpdateEnderecoInput = Partial<CreateEnderecoInput>;

export interface CreateContatoInput {
  tipo: 'celular' | 'email' | 'telefone';
  valor: string;
  principal?: boolean;
  autoriza_notificacoes?: boolean;
}

export type UpdateContatoInput = Partial<CreateContatoInput>;

export interface PromoverPessoaInput {
  email: string;
  role_id: number;
}

export interface ImportarPessoaInput {
  documento: string;
}

export interface Paginado<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page?: number;
}

export interface PessoaIntegracao {
  id: number;
  tenant_id: number;
  nome: string;
  driver: string;
  api_url: string | null;
  api_token_mascarado: string | null;
  field_mappings: Record<string, string> | null;
  is_active: boolean;
  ultima_sincronizacao_em: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateIntegracaoInput {
  nome: string;
  api_url?: string;
  api_token?: string;
  field_mappings?: Record<string, string>;
  is_active?: boolean;
}

export type UpdateIntegracaoInput = Partial<CreateIntegracaoInput>;

export type StatusSyncLog = 'sucesso' | 'erro' | 'nao_encontrado';

export interface PessoaSyncLog {
  id: number;
  tenant_id: number;
  integracao_id: number | null;
  tipo: string;
  direcao: string;
  status: StatusSyncLog;
  registros_processados: number;
  registros_sucesso: number;
  registros_falha: number;
  detalhes: Record<string, unknown> | null;
  created_at?: string;
}

export interface ListSyncLogsParams {
  integracao_id?: number;
  status?: StatusSyncLog;
  per_page?: number;
  page?: number;
}

/** Pessoa já cadastrada com o mesmo nome e nascimento, sugerida antes de criar um cadastro sem CPF. */
export interface PessoaSemelhante {
  id: number;
  nome: string;
  cpf_mascarado: string;
  documento_pendente: boolean;
}

export type DecisaoDivergencia = 'modulo' | 'mdm';

/** Conflito entre o dado civil de um módulo e o do cadastro central, aguardando decisão. */
export interface PessoaDivergencia {
  id: number;
  pessoa_id: number;
  pessoa_nome?: string | null;
  modulo: string;
  tabela: string;
  registro_id: number;
  campo: string;
  valor_modulo: string | null;
  valor_mdm: string | null;
  estado: 'aberta' | 'resolvida';
  decisao: DecisaoDivergencia | null;
  resolvida_em: string | null;
}

export interface ListDivergenciasParams {
  modulo?: string;
  estado?: 'aberta' | 'resolvida';
  per_page?: number;
  page?: number;
}

/** Adoção do cadastro central por módulo: só totais, sem dado civil individual. */
export interface AdocaoModulo {
  modulo: string;
  tabela: string;
  total: number;
  vinculados: number;
  sem_vinculo: number;
  documento_pendente: number;
  divergencias_abertas: number;
}

export interface AdocaoPessoas {
  modulos: AdocaoModulo[];
  totais: Omit<AdocaoModulo, 'modulo' | 'tabela'>;
}
