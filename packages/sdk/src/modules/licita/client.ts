import type { ApiRequester, BaseModuleClient } from '../base';
import type { Paginated } from '../../index';
import type {
  AprovacaoFinal,
  CampoConfig,
  CampoConfiguracao,
  CreateDfdInput,
  CreateEtpInput,
  CreateLegalDocumentoInput,
  CreateMapaRiscoInput,
  CreatePesquisaPrecoInput,
  CreateProcessoInput,
  CreateTrInput,
  Dfd,
  Etp,
  LegalDocumento,
  MapaRisco,
  MembroEquipePlanejamento,
  PesquisaPreco,
  Processo,
  ProcessoFilters,
  SugerirCotacoesPesquisaPrecoOutput,
  SugerirItensDfdInput,
  SugerirItensDfdOutput,
  SugerirJustificativaDfdInput,
  SugerirJustificativaDfdOutput,
  SugerirRiscosMapaRiscoOutput,
  SugerirTextoIaInput,
  SugerirTextoIaOutput,
  TipoDocumentoConfiguravel,
  Tr,
  UpdateDfdInput,
  UpdateEtpInput,
  UpdateMapaRiscoInput,
  UpdatePesquisaPrecoInput,
  UpdateTrInput,
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

  /** Só o aprovador pode chamar (mesma permissão de aprovar/rejeitar) e só enquanto o DFD está em revisão — ver DfdPolicy::alterarEquipe. */
  async alterarEquipePlanejamentoDfd(id: number, equipe: MembroEquipePlanejamento[]): Promise<Dfd> {
    return this.api.request(`/licita/dfds/${id}/equipe-planejamento`, {
      method: 'PUT',
      body: JSON.stringify({ equipe_planejamento: equipe }),
    });
  }

  async createEtp(processoId: number, input: CreateEtpInput): Promise<Etp> {
    return this.api.request(`/licita/processos/${processoId}/etp`, { method: 'POST', body: JSON.stringify(input) });
  }

  async getEtp(id: number): Promise<Etp> {
    return this.api.request(`/licita/etps/${id}`);
  }

  async updateEtp(id: number, input: UpdateEtpInput): Promise<Etp> {
    return this.api.request(`/licita/etps/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async createMapaRisco(processoId: number, input: CreateMapaRiscoInput): Promise<MapaRisco> {
    return this.api.request(`/licita/processos/${processoId}/mapa-riscos`, { method: 'POST', body: JSON.stringify(input) });
  }

  async getMapaRisco(id: number): Promise<MapaRisco> {
    return this.api.request(`/licita/mapas-riscos/${id}`);
  }

  async updateMapaRisco(id: number, input: UpdateMapaRiscoInput): Promise<MapaRisco> {
    return this.api.request(`/licita/mapas-riscos/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  /** Gera riscos por IA a partir do objeto/DFD/ETP do processo — a lista retornada deve ser somada aos riscos já existentes no formulário, nunca substituí-los. */
  async sugerirRiscosMapaRisco(processoId: number): Promise<SugerirRiscosMapaRiscoOutput> {
    return this.api.request(`/licita/processos/${processoId}/mapa-riscos/ia/sugerir-riscos`, { method: 'POST' });
  }

  async createPesquisaPreco(processoId: number, input: CreatePesquisaPrecoInput): Promise<PesquisaPreco> {
    return this.api.request(`/licita/processos/${processoId}/pesquisas-precos`, { method: 'POST', body: JSON.stringify(input) });
  }

  async getPesquisaPreco(id: number): Promise<PesquisaPreco> {
    return this.api.request(`/licita/pesquisas-precos/${id}`);
  }

  async updatePesquisaPreco(id: number, input: UpdatePesquisaPrecoInput): Promise<PesquisaPreco> {
    return this.api.request(`/licita/pesquisas-precos/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  /** Busca preços reais no Compras.gov.br/PNCP por item (CATMAT/CATSER) e sugere cotações saneadas estatisticamente — o resultado deve ser somado às cotações já existentes no formulário, nunca substituí-las. */
  async sugerirCotacoesPesquisaPreco(processoId: number): Promise<SugerirCotacoesPesquisaPrecoOutput> {
    return this.api.request(`/licita/processos/${processoId}/pesquisas-precos/ia/sugerir-cotacoes`, { method: 'POST' });
  }

  async createTr(processoId: number, input: CreateTrInput): Promise<Tr> {
    return this.api.request(`/licita/processos/${processoId}/tr`, { method: 'POST', body: JSON.stringify(input) });
  }

  async getTr(id: number): Promise<Tr> {
    return this.api.request(`/licita/trs/${id}`);
  }

  async updateTr(id: number, input: UpdateTrInput): Promise<Tr> {
    return this.api.request(`/licita/trs/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async solicitarAprovacaoFinal(processoId: number): Promise<AprovacaoFinal> {
    return this.api.request(`/licita/processos/${processoId}/aprovacao-final/solicitar`, { method: 'POST' });
  }

  async aprovarFinal(processoId: number, parecer?: string): Promise<AprovacaoFinal> {
    return this.api.request(`/licita/processos/${processoId}/aprovacao-final/aprovar`, {
      method: 'POST',
      body: JSON.stringify({ parecer }),
    });
  }

  async rejeitarFinal(processoId: number, motivo: string): Promise<AprovacaoFinal> {
    return this.api.request(`/licita/processos/${processoId}/aprovacao-final/rejeitar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  }

  async sugerirJustificativaDfd(input: SugerirJustificativaDfdInput): Promise<SugerirJustificativaDfdOutput> {
    return this.api.request('/licita/dfds/ia/sugerir-justificativa', { method: 'POST', body: JSON.stringify(input) });
  }

  /** Gera itens (materiais/serviços) para o DFD a partir do Objeto/Área/Justificativa — a lista retornada deve ser somada aos itens já existentes no formulário, nunca substituí-los. */
  async sugerirItensDfd(input: SugerirItensDfdInput): Promise<SugerirItensDfdOutput> {
    return this.api.request('/licita/dfds/ia/sugerir-itens', { method: 'POST', body: JSON.stringify(input) });
  }

  /** "Sugerir com IA" genérico — usado por qualquer campo de texto rico do Licita sem prompt dedicado. */
  async sugerirTextoIa(input: SugerirTextoIaInput): Promise<SugerirTextoIaOutput> {
    return this.api.request('/licita/ia/sugerir-texto', { method: 'POST', body: JSON.stringify(input) });
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

  async getCamposConfiguracao(tipoDocumento: TipoDocumentoConfiguravel): Promise<CampoConfiguracao> {
    return this.api.request(`/licita/campos-configuracao/${tipoDocumento}`);
  }

  async salvarCamposConfiguracao(tipoDocumento: TipoDocumentoConfiguravel, campos: CampoConfig[]): Promise<CampoConfiguracao> {
    return this.api.request(`/licita/campos-configuracao/${tipoDocumento}`, {
      method: 'PUT',
      body: JSON.stringify({ campos }),
    });
  }
}
