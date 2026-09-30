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
  dados?: Record<string, unknown>;
  inicio?: string;
}

export interface PromoverPessoaInput {
  email: string;
  role_id: number;
}

export interface ImportarPessoaInput {
  documento: string;
}
