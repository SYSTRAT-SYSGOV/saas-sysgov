// ═════════════════════════════════════════════════════════════════════════════
// MÓDULO CEMITÉRIOS — SDK CLIENT
// ═════════════════════════════════════════════════════════════════════════════

import type { ApiRequester } from '../base';
import type {
  ApiSucessao,
  ApiSucessaoPaginado,
  ApiSucessaoHerdeiro,
  ApiSucessaoDocumento,
  ApiSucessaoHistorico,
  ApiDashboardPendentes,
  ApiDashboardRegularizacao,
  AbrirSucessaoInput,
  AtualizarSucessaoInput,
  TransicaoSucessaoInput,
  HerdeirosSucessaoInput,
  DocumentoSucessaoInput,
  SucessaoFiltros,
} from './types';

const BASE_PATH = '/cemiterios/sucessoes';

/**
 * Cliente para o módulo de Sucessão Hereditária do SIGCM.
 */
export const sucessaoApi = {
  /**
   * Lista processos de sucessão com filtros e paginação.
   */
  list: async (filtros: SucessaoFiltros = {}): Promise<ApiSucessaoPaginado> => {
    // This will be implemented by the consuming app via ApiRequester
    throw new Error('sucessaoApi.list must be implemented by consuming app');
  },

  /**
   * Obtém detalhes completos de um processo de sucessão.
   */
  show: async (id: number): Promise<ApiSucessao> => {
    throw new Error('sucessaoApi.show must be implemented by consuming app');
  },

  /**
   * Cria um novo processo de sucessão.
   */
  create: async (data: AbrirSucessaoInput): Promise<ApiSucessao> => {
    throw new Error('sucessaoApi.create must be implemented by consuming app');
  },

  /**
   * Atualiza dados cadastrais do processo.
   */
  update: async (id: number, data: AtualizarSucessaoInput): Promise<ApiSucessao> => {
    throw new Error('sucessaoApi.update must be implemented by consuming app');
  },

  /**
   * Exclui um processo (apenas estados terminais).
   */
  delete: async (id: number): Promise<{ message: string }> => {
    throw new Error('sucessaoApi.delete must be implemented by consuming app');
  },

  /**
   * Executa transição de estado do processo.
   */
  transition: async (id: number, data: TransicaoSucessaoInput): Promise<ApiSucessao> => {
    throw new Error('sucessaoApi.transition must be implemented by consuming app');
  },

  /**
   * Adiciona ou atualiza herdeiros do processo.
   */
  addHerdeiros: async (id: number, data: HerdeirosSucessaoInput): Promise<ApiSucessaoHerdeiro[]> => {
    throw new Error('sucessaoApi.addHerdeiros must be implemented by consuming app');
  },

  /**
   * Remove um herdeiro do processo.
   */
  removeHerdeiro: async (id: number, herdeiroId: number): Promise<{ message: string }> => {
    throw new Error('sucessaoApi.removeHerdeiro must be implemented by consuming app');
  },

  /**
   * Faz upload de documento para o processo.
   */
  uploadDocument: async (id: number, data: DocumentoSucessaoInput): Promise<ApiSucessaoDocumento> => {
    throw new Error('sucessaoApi.uploadDocument must be implemented by consuming app');
  },

  /**
   * Obtém detalhes de um documento.
   */
  getDocument: async (id: number, documentoId: number): Promise<ApiSucessaoDocumento> => {
    throw new Error('sucessaoApi.getDocument must be implemented by consuming app');
  },

  /**
   * Obtém URL assinada para download do documento.
   */
  downloadDocument: async (id: number, documentoId: number): Promise<{ download_url: string; expires_at: string }> => {
    throw new Error('sucessaoApi.downloadDocument must be implemented by consuming app');
  },

  /**
   * Remove um documento do processo.
   */
  deleteDocument: async (id: number, documentoId: number): Promise<{ message: string }> => {
    throw new Error('sucessaoApi.deleteDocument must be implemented by consuming app');
  },

  /**
   * Obtém histórico append-only do processo.
   */
  getHistorico: async (id: number): Promise<ApiSucessaoHistorico[]> => {
    throw new Error('sucessaoApi.getHistorico must be implemented by consuming app');
  },

  /**
   * Obtém dashboard de processos pendentes.
   */
  pendentes: async (parkId?: number): Promise<ApiDashboardPendentes> => {
    throw new Error('sucessaoApi.pendentes must be implemented by consuming app');
  },

  /**
   * Obtém dashboard de regularização.
   */
  regularizacao: async (parkId?: number): Promise<ApiDashboardRegularizacao> => {
    throw new Error('sucessaoApi.regularizacao must be implemented by consuming app');
  },
};

// Exporta enums e tipos para conveniência
export type { ApiSucessao, ApiSucessaoHerdeiro, ApiSucessaoDocumento, ApiSucessaoHistorico };
export { ViaSucessao, EstadoSucessao, TipoDocumentoSucessao, Parentesco } from './types';