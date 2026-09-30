import type { ApiRequester, BaseModuleClient } from '../base';
import type {
  CreateContatoInput,
  CreateDocumentoInput,
  CreateEnderecoInput,
  CreateIntegracaoInput,
  CreatePessoaInput,
  CreateVinculoInput,
  ImportarPessoaInput,
  ListPessoasParams,
  ListSyncLogsParams,
  Paginado,
  Pessoa,
  PessoaContato,
  PessoaDocumento,
  PessoaEndereco,
  PessoaIntegracao,
  PessoaSyncLog,
  PessoaUsuarioVinculo,
  PessoaVinculo,
  PromoverPessoaInput,
  UpdateContatoInput,
  UpdateDocumentoInput,
  UpdateEnderecoInput,
  UpdateIntegracaoInput,
  UpdatePessoaInput,
} from './types';

export class PessoasClient implements BaseModuleClient {
  readonly moduleName = 'pessoas';

  constructor(private readonly api: ApiRequester) {}

  async list(params: ListPessoasParams = {}): Promise<Paginado<Pessoa>> {
    const query = new URLSearchParams(params as Record<string, string>).toString();

    return this.api.request(`/${this.moduleName}${query ? `?${query}` : ''}`);
  }

  async get(id: number): Promise<Pessoa> {
    return this.api.request(`/${this.moduleName}/${id}`);
  }

  async create(input: CreatePessoaInput): Promise<Pessoa> {
    return this.api.request(`/${this.moduleName}`, { method: 'POST', body: JSON.stringify(input) });
  }

  async update(id: number, input: UpdatePessoaInput): Promise<Pessoa> {
    return this.api.request(`/${this.moduleName}/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async delete(id: number): Promise<{ deleted: boolean }> {
    return this.api.request(`/${this.moduleName}/${id}`, { method: 'DELETE' });
  }

  async addVinculo(pessoaId: number, input: CreateVinculoInput): Promise<PessoaVinculo> {
    return this.api.request(`/${this.moduleName}/${pessoaId}/vinculos`, { method: 'POST', body: JSON.stringify(input) });
  }

  async encerrarVinculo(pessoaId: number, vinculoId: number, fim?: string): Promise<PessoaVinculo> {
    return this.api.request(`/${this.moduleName}/${pessoaId}/vinculos/${vinculoId}/encerrar`, {
      method: 'POST',
      body: JSON.stringify(fim ? { fim } : {}),
    });
  }

  async addDocumento(pessoaId: number, input: CreateDocumentoInput): Promise<PessoaDocumento> {
    return this.api.request(`/${this.moduleName}/${pessoaId}/documentos`, { method: 'POST', body: JSON.stringify(input) });
  }

  async updateDocumento(pessoaId: number, documentoId: number, input: UpdateDocumentoInput): Promise<PessoaDocumento> {
    return this.api.request(`/${this.moduleName}/${pessoaId}/documentos/${documentoId}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteDocumento(pessoaId: number, documentoId: number): Promise<{ deleted: boolean }> {
    return this.api.request(`/${this.moduleName}/${pessoaId}/documentos/${documentoId}`, { method: 'DELETE' });
  }

  async addEndereco(pessoaId: number, input: CreateEnderecoInput): Promise<PessoaEndereco> {
    return this.api.request(`/${this.moduleName}/${pessoaId}/enderecos`, { method: 'POST', body: JSON.stringify(input) });
  }

  async updateEndereco(pessoaId: number, enderecoId: number, input: UpdateEnderecoInput): Promise<PessoaEndereco> {
    return this.api.request(`/${this.moduleName}/${pessoaId}/enderecos/${enderecoId}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteEndereco(pessoaId: number, enderecoId: number): Promise<{ deleted: boolean }> {
    return this.api.request(`/${this.moduleName}/${pessoaId}/enderecos/${enderecoId}`, { method: 'DELETE' });
  }

  async addContato(pessoaId: number, input: CreateContatoInput): Promise<PessoaContato> {
    return this.api.request(`/${this.moduleName}/${pessoaId}/contatos`, { method: 'POST', body: JSON.stringify(input) });
  }

  async updateContato(pessoaId: number, contatoId: number, input: UpdateContatoInput): Promise<PessoaContato> {
    return this.api.request(`/${this.moduleName}/${pessoaId}/contatos/${contatoId}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteContato(pessoaId: number, contatoId: number): Promise<{ deleted: boolean }> {
    return this.api.request(`/${this.moduleName}/${pessoaId}/contatos/${contatoId}`, { method: 'DELETE' });
  }

  async buscarPorDocumento(documento: string): Promise<Pessoa | null> {
    const res = await this.list({ q: documento, per_page: 1 });
    return res.data && res.data.length > 0 ? res.data[0] : null;
  }

  async promover(pessoaId: number, input: PromoverPessoaInput): Promise<PessoaUsuarioVinculo> {
    return this.api.request(`/${this.moduleName}/${pessoaId}/promover`, { method: 'POST', body: JSON.stringify(input) });
  }

  async importar(input: ImportarPessoaInput): Promise<{ message: string }> {
    return this.api.request(`/${this.moduleName}/importacoes`, { method: 'POST', body: JSON.stringify(input) });
  }

  async listarIntegracoes(): Promise<PessoaIntegracao[]> {
    return this.api.request(`/${this.moduleName}/integracoes`);
  }

  async criarIntegracao(input: CreateIntegracaoInput): Promise<PessoaIntegracao> {
    return this.api.request(`/${this.moduleName}/integracoes`, { method: 'POST', body: JSON.stringify(input) });
  }

  async atualizarIntegracao(id: number, input: UpdateIntegracaoInput): Promise<PessoaIntegracao> {
    return this.api.request(`/${this.moduleName}/integracoes/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async listarSyncLogs(params: ListSyncLogsParams = {}): Promise<Paginado<PessoaSyncLog>> {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();

    return this.api.request(`/${this.moduleName}/sync-logs${query ? `?${query}` : ''}`);
  }

  async reprocessarSyncLog(id: number): Promise<{ message: string }> {
    return this.api.request(`/${this.moduleName}/sync-logs/${id}/reprocessar`, { method: 'POST' });
  }
}
