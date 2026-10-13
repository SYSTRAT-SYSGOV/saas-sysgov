import { apiClient } from '@/core/api/client';
import type { ProtocoloSdk } from '@sysgov/sdk';

export const protocoloApi = {
  // Processos
  listarProcessos: async (params: ProtocoloSdk.ListProcessosParams = {}): Promise<ProtocoloSdk.Paginado<ProtocoloSdk.Processo>> => {
    const res = await apiClient.get<ProtocoloSdk.Paginado<ProtocoloSdk.Processo>>('/protocolo/processos', { params });
    return res.data;
  },

  obterProcesso: async (id: number): Promise<ProtocoloSdk.Processo> => {
    const res = await apiClient.get<ProtocoloSdk.Processo>(`/protocolo/processos/${id}`);
    return res.data;
  },

  criarProcesso: async (formData: FormData): Promise<ProtocoloSdk.Processo> => {
    const res = await apiClient.post<ProtocoloSdk.Processo>('/protocolo/processos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  atualizarProcesso: async (id: number, dados: ProtocoloSdk.UpdateProcessoInput): Promise<ProtocoloSdk.Processo> => {
    const res = await apiClient.put<ProtocoloSdk.Processo>(`/protocolo/processos/${id}`, dados);
    return res.data;
  },

  excluirProcesso: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/protocolo/processos/${id}`);
    return res.data;
  },

  listarFilhos: async (id: number): Promise<ProtocoloSdk.Processo[]> => {
    const res = await apiClient.get<ProtocoloSdk.Processo[]>(`/protocolo/processos/${id}/filhos`);
    return res.data;
  },

  // Andamentos e Tramitação
  listarAndamentos: async (processoId: number): Promise<ProtocoloSdk.Andamento[]> => {
    const res = await apiClient.get<ProtocoloSdk.Andamento[]>(`/protocolo/processos/${processoId}/andamentos`);
    return res.data;
  },

  tramitarProcesso: async (processoId: number, dados: ProtocoloSdk.TramitarProcessoInput): Promise<ProtocoloSdk.Andamento> => {
    const res = await apiClient.post<ProtocoloSdk.Andamento>(`/protocolo/processos/${processoId}/andamentos`, dados);
    return res.data;
  },

  receberProcesso: async (processoId: number, dados: ProtocoloSdk.ReceberProcessoInput = {}): Promise<ProtocoloSdk.Andamento> => {
    const res = await apiClient.post<ProtocoloSdk.Andamento>(`/protocolo/processos/${processoId}/andamentos/atual/receber`, dados);
    return res.data;
  },

  obterLocalizacao: async (processoId: number): Promise<ProtocoloSdk.ProcessoLocalizacao> => {
    const res = await apiClient.get<ProtocoloSdk.ProcessoLocalizacao>(`/protocolo/processos/${processoId}/localizacao`);
    return res.data;
  },

  obterPermanencia: async (processoId: number): Promise<ProtocoloSdk.ProcessoPermanenciaItem[]> => {
    const res = await apiClient.get<ProtocoloSdk.ProcessoPermanenciaItem[]>(`/protocolo/processos/${processoId}/permanencia`);
    return res.data;
  },

  listarPrazosExcedidos: async (): Promise<ProtocoloSdk.PrazoExcedidoItem[]> => {
    const res = await apiClient.get<ProtocoloSdk.PrazoExcedidoItem[]>('/protocolo/prazos/excedidos');
    return res.data;
  },

  // Documentos
  listarDocumentos: async (processoId: number): Promise<ProtocoloSdk.Documento[]> => {
    const res = await apiClient.get<ProtocoloSdk.Documento[]>(`/protocolo/processos/${processoId}/documentos`);
    return res.data;
  },

  anexarDocumento: async (processoId: number, formData: FormData): Promise<ProtocoloSdk.Documento> => {
    const res = await apiClient.post<ProtocoloSdk.Documento>(`/protocolo/processos/${processoId}/documentos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  excluirDocumento: async (processoId: number, documentoId: number): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/protocolo/processos/${processoId}/documentos/${documentoId}`);
    return res.data;
  },

  downloadDocumentoUrl: (documentoId: number): string => {
    return `/api/protocolo/documentos/${documentoId}/download`;
  },

  // Atributos
  listarAtributos: async (processoId: number): Promise<ProtocoloSdk.Atributo[]> => {
    const res = await apiClient.get<ProtocoloSdk.Atributo[]>(`/protocolo/processos/${processoId}/atributos`);
    return res.data;
  },

  salvarAtributo: async (processoId: number, dados: ProtocoloSdk.CreateAtributoInput): Promise<ProtocoloSdk.Atributo> => {
    const res = await apiClient.post<ProtocoloSdk.Atributo>(`/protocolo/processos/${processoId}/atributos`, dados);
    return res.data;
  },

  removerAtributo: async (processoId: number, chave: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/protocolo/processos/${processoId}/atributos/${chave}`);
    return res.data;
  },

  // Vínculos
  listarVinculos: async (processoId: number): Promise<ProtocoloSdk.Vinculo[]> => {
    const res = await apiClient.get<ProtocoloSdk.Vinculo[]>(`/protocolo/processos/${processoId}/vinculos`);
    return res.data;
  },

  criarVinculo: async (processoId: number, dados: ProtocoloSdk.CreateVinculoInput): Promise<ProtocoloSdk.Vinculo> => {
    const res = await apiClient.post<ProtocoloSdk.Vinculo>(`/protocolo/processos/${processoId}/vinculos`, dados);
    return res.data;
  },

  removerVinculo: async (processoId: number, vinculoId: number): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/protocolo/processos/${processoId}/vinculos/${vinculoId}`);
    return res.data;
  },

  // Promoção
  promoverRequerimento: async (dados: ProtocoloSdk.PromoverRequerimentoInput): Promise<ProtocoloSdk.Processo> => {
    const res = await apiClient.post<ProtocoloSdk.Processo>('/protocolo/processos/promover-requerimento', dados);
    return res.data;
  },

  // Dashboard
  obterDashboard: async (filtros: ProtocoloSdk.DashboardFiltros = {}): Promise<ProtocoloSdk.DashboardData> => {
    const res = await apiClient.get<ProtocoloSdk.DashboardData>('/protocolo/dashboard', { params: filtros });
    return res.data;
  },

  // Tipos de Tramitação
  listarTiposTramitacao: async (): Promise<ProtocoloSdk.TipoTramitacao[]> => {
    const res = await apiClient.get<ProtocoloSdk.TipoTramitacao[]>('/protocolo/tipos-tramitacao');
    return res.data;
  },

  criarTipoTramitacao: async (dados: ProtocoloSdk.CreateTipoTramitacaoInput): Promise<ProtocoloSdk.TipoTramitacao> => {
    const res = await apiClient.post<ProtocoloSdk.TipoTramitacao>('/protocolo/tipos-tramitacao', dados);
    return res.data;
  },

  atualizarTipoTramitacao: async (id: number, dados: ProtocoloSdk.UpdateTipoTramitacaoInput): Promise<ProtocoloSdk.TipoTramitacao> => {
    const res = await apiClient.put<ProtocoloSdk.TipoTramitacao>(`/protocolo/tipos-tramitacao/${id}`, dados);
    return res.data;
  },

  removerTipoTramitacao: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/protocolo/tipos-tramitacao/${id}`);
    return res.data;
  },
};
