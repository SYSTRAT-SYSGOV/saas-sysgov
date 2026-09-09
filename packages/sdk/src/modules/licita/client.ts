import type { ApiRequester, BaseModuleClient } from '../base';
import type { Paginated } from '../../index';
import type {
  CreateDfdInput,
  CreateProcessoInput,
  Dfd,
  Processo,
  ProcessoFilters,
  UpdateDfdInput,
} from './types';

export class LicitaModuleClient implements BaseModuleClient {
  readonly moduleName = 'licita';

  constructor(private readonly api: ApiRequester) {}

  async listProcessos(filters: ProcessoFilters = {}): Promise<Paginated<Processo>> {
    const params = new URLSearchParams();
    if (filters.fase_atual) params.set('fase_atual', filters.fase_atual);
    if (filters.status_geral) params.set('status_geral', filters.status_geral);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.per_page) params.set('per_page', String(filters.per_page));
    const query = params.toString();

    return this.api.request(`/licita/processos${query ? `?${query}` : ''}`);
  }

  async getProcesso(id: number): Promise<Processo> {
    return this.api.request(`/licita/processos/${id}`);
  }

  async createProcesso(input: CreateProcessoInput): Promise<Processo> {
    return this.api.request('/licita/processos', { method: 'POST', body: JSON.stringify(input) });
  }

  async createDfd(processoId: number, input: CreateDfdInput): Promise<Dfd> {
    return this.api.request(`/licita/processos/${processoId}/dfd`, { method: 'POST', body: JSON.stringify(input) });
  }

  async getDfd(id: number): Promise<Dfd> {
    return this.api.request(`/licita/dfds/${id}`);
  }

  async updateDfd(id: number, input: UpdateDfdInput): Promise<Dfd> {
    return this.api.request(`/licita/dfds/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async enviarDfdParaRevisao(id: number, mensagem?: string): Promise<Dfd> {
    return this.api.request(`/licita/dfds/${id}/enviar-revisao`, {
      method: 'POST',
      body: JSON.stringify({ mensagem }),
    });
  }

  async aprovarDfd(id: number, parecer?: string): Promise<Dfd> {
    return this.api.request(`/licita/dfds/${id}/aprovar`, { method: 'POST', body: JSON.stringify({ parecer }) });
  }

  async rejeitarDfd(id: number, motivo: string): Promise<Dfd> {
    return this.api.request(`/licita/dfds/${id}/rejeitar`, { method: 'POST', body: JSON.stringify({ motivo }) });
  }
}
