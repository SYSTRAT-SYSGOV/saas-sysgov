export type TipoVinculoPessoa =
  | 'servidor_carreira'
  | 'estagiario'
  | 'comissionado'
  | 'clt'
  | 'municipe'
  | 'contribuinte'
  | 'aluno'
  | 'paciente';

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
  cpf_mascarado: string;
  nome: string;
  nome_social?: string | null;
  data_nascimento?: string | null;
  sexo?: string | null;
  nome_mae?: string | null;
  nome_pai?: string | null;
  estado_civil?: string | null;
  nacionalidade?: string | null;
  naturalidade?: string | null;
  nis?: string | null;
  status: 'ativo' | 'inativo';
  vinculos?: PessoaVinculo[];
  documentos?: PessoaDocumento[];
  enderecos?: PessoaEndereco[];
  contatos?: PessoaContato[];
  usuario?: PessoaUsuarioVinculo | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePessoaInput {
  nome: string;
  cpf: string;
  nome_social?: string;
  data_nascimento?: string;
  sexo?: string;
  nome_mae?: string;
  nome_pai?: string;
  estado_civil?: string;
  nacionalidade?: string;
  naturalidade?: string;
  nis?: string;
}

export type UpdatePessoaInput = Partial<CreatePessoaInput> & { status?: 'ativo' | 'inativo' };

export interface ListPessoasParams {
  q?: string;
  tipo_vinculo?: TipoVinculoPessoa;
  status?: 'ativo' | 'inativo';
  per_page?: number;
  page?: number;
}

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
