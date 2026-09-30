import type { ApiRequester, BaseModuleClient } from '../base';
import type {
  CreateIntegracaoInput,
  CreatePessoaInput,
  CreateVinculoInput,
  ImportarPessoaInput,
  ListPessoasParams,
  ListSyncLogsParams,
  Paginado,
  Pessoa,
  PessoaIntegracao,
  PessoaSyncLog,
  PessoaUsuarioVinculo,
  PessoaVinculo,
  PromoverPessoaInput,
  UpdateIntegracaoInput,
  UpdatePessoaInput,
} from './types';

export class PessoasClient implements BaseModuleClient {
  readonly moduleName = 'pessoas';

  constructor(private readonly api: ApiRequester) {}

  async list(params: ListPessoasParams = {}): Promise<{ data: Pessoa[]; total: number; current_page: number; last_page: number }> {
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
