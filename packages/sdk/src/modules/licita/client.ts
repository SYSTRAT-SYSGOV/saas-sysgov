import type { ApiRequester, BaseModuleClient } from '../base';
import type { Paginated } from '../../index';
import type {
  CampoConfig,
  CampoConfiguracao,
  CreateDfdInput,
  CreateLegalDocumentoInput,
  CreateProcessoInput,
  Dfd,
  FaseLicita,
  LegalDocumento,
  Processo,
  ProcessoFilters,
  UpdateDfdInput,
  UpdateLegalDocumentoInput,
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

  async reabrirDfd(id: number): Promise<Dfd> {
    return this.api.request(`/licita/dfds/${id}/reabrir`, { method: 'POST' });
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

  async listLegislacao(filters: { tipo?: string; search?: string } = {}): Promise<{ data: LegalDocumento[] }> {
    const params = new URLSearchParams();
    if (filters.tipo) params.set('tipo', filters.tipo);
    if (filters.search) params.set('search', filters.search);
    const query = params.toString();

    return this.api.request(`/licita/legislacao${query ? `?${query}` : ''}`);
  }

  async getLegislacao(id: number): Promise<LegalDocumento> {
    return this.api.request(`/licita/legislacao/${id}`);
  }

  async createLegislacao(input: CreateLegalDocumentoInput): Promise<LegalDocumento> {
    return this.api.request('/licita/legislacao', { method: 'POST', body: JSON.stringify(input) });
  }

  async updateLegislacao(id: number, input: UpdateLegalDocumentoInput): Promise<LegalDocumento> {
    return this.api.request(`/licita/legislacao/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async deleteLegislacao(id: number): Promise<void> {
    await this.api.request(`/licita/legislacao/${id}`, { method: 'DELETE' });
  }

  async getCamposConfiguracao(tipoDocumento: FaseLicita): Promise<CampoConfiguracao> {
    return this.api.request(`/licita/campos-configuracao/${tipoDocumento}`);
  }

  async salvarCamposConfiguracao(tipoDocumento: FaseLicita, campos: CampoConfig[]): Promise<CampoConfiguracao> {
    return this.api.request(`/licita/campos-configuracao/${tipoDocumento}`, {
      method: 'PUT',
      body: JSON.stringify({ campos }),
    });
  }
}
