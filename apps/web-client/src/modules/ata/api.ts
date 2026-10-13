import { apiClient } from '@/core/api/client';

/* Tipos — espelham o JSON de api/ata (Modules/Ata/Support/FormataAta.php). */

export type StatusAta = 'em_redacao' | 'rascunho' | 'finalizada';

export interface Ref { id: number; nome: string }
export interface SecretariaOpcao { id: number; nome: string; sigla: string | null; tem_timbrado: boolean }

export interface Opcoes {
  tipos: Ref[];
  secretarias: SecretariaOpcao[];
  ia_disponivel: boolean;
  modos_ia: { valor: number; rotulo: string }[];
  permissoes: { criar: boolean; gerenciar: boolean; auditar: boolean };
  redator_sugerido: string;
}

export interface AtaResumo {
  id: number;
  numero: string;
  titulo: string;
  secretaria: { id: number; nome: string | null };
  tipo: Ref | null;
  sigilosa: boolean;
  status: StatusAta;
  status_rotulo: string;
  pode_abrir: boolean;
  data_reuniao: string | null;
  autor: string | null;
  assinaturas: { feitas: number; total: number } | null;
  criado_em: string | null;
}

export interface Participante {
  id: number;
  pessoa_id: number | null;
  nome: string;
  cargo: string | null;
  assinou: boolean;
  assinado_em: string | null;
}

export interface AtaDetalhe extends AtaResumo {
  local: string | null;
  cidade: string | null;
  redator: string;
  conteudo_html: string | null;
  codigo_validacao: string;
  tem_pdf: boolean;
  rascunho_em: string | null;
  finalizada_em: string | null;
  editavel: boolean;
  aceita_assinatura: boolean;
  ia_disponivel: boolean;
  participantes: Participante[];
}

export interface Indicadores { total: number; em_redacao: number; rascunhos: number; finalizadas: number; sigilosas: number }

export interface ParticipanteEntrada { pessoa_id?: number | null; nome?: string; cargo?: string | null }

export interface AtaEntrada {
  org_unit_id: number;
  tipo_id: number | null;
  titulo: string;
  data_reuniao: string;
  local: string;
  cidade: string;
  redator: string;
  sigilosa: boolean;
  participantes: ParticipanteEntrada[];
}

export interface TipoAta { id: number; nome: string; ativo: boolean }

export interface RegistroAuditoria {
  id: number;
  data: string;
  usuario: string | null;
  acao: string;
  recurso: string;
  detalhes: Record<string, unknown> | null;
  ip: string | null;
}

export interface ResultadoValidacao {
  valido: boolean;
  mensagem: string;
  codigo?: string;
  numero?: string;
  secretaria?: string | null;
  finalizada_em?: string | null;
  sigilosa?: boolean;
  titulo?: string | null;
  redator?: string | null;
  pdf_sha256?: string | null;
}

/** Mensagem de erro da API ({"error"} das regras de negócio ou {"message"} da validação). */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível concluir a operação.'): string {
  const dados = (erro as { response?: { data?: unknown } })?.response?.data;
  if (dados && typeof dados === 'object') {
    const d = dados as { error?: string; message?: string };
    if (d.error) return d.error;
    if (d.message) return d.message;
  }
  return padrao;
}

export const ataApi = {
  opcoes: async () => (await apiClient.get<Opcoes>('/ata/opcoes')).data,
  listar: async (filtros: { status?: string; org_unit_id?: number; q?: string } = {}) =>
    (await apiClient.get<{ data: AtaResumo[]; indicadores: Indicadores }>('/ata/atas', { params: filtros })).data,
  obter: async (id: number) => (await apiClient.get<AtaDetalhe>(`/ata/atas/${id}`)).data,
  criar: async (dados: AtaEntrada) => (await apiClient.post<AtaDetalhe>('/ata/atas', dados)).data,
  atualizar: async (id: number, dados: Partial<AtaEntrada>) => (await apiClient.put<AtaDetalhe>(`/ata/atas/${id}`, dados)).data,
  excluir: async (id: number) => { await apiClient.delete(`/ata/atas/${id}`); },
  salvarTexto: async (id: number, conteudo_html: string) => (await apiClient.put<AtaDetalhe>(`/ata/atas/${id}/conteudo`, { conteudo_html })).data,
  salvarRascunho: async (id: number, conteudo_html: string) => (await apiClient.post<AtaDetalhe>(`/ata/atas/${id}/rascunho`, { conteudo_html })).data,
  pendentes: async (id: number) => (await apiClient.get<{ data: { id: number; nome: string; cargo: string | null }[] }>(`/ata/atas/${id}/assinaturas/pendentes`)).data.data,
  assinar: async (id: number, participante_id: number, imagem: string) => { await apiClient.post(`/ata/atas/${id}/assinaturas`, { participante_id, imagem }); },
  finalizar: async (id: number) => (await apiClient.post<AtaDetalhe>(`/ata/atas/${id}/finalizar`)).data,
  previewPdf: async (id: number) => (await apiClient.get<Blob>(`/ata/atas/${id}/preview`, { responseType: 'blob' })).data,
  pdf: async (id: number) => (await apiClient.get<Blob>(`/ata/atas/${id}/pdf`, { params: { baixar: 1 }, responseType: 'blob' })).data,
  gerarComIa: async (id: number, modo: number, audios: Blob[]) => {
    const corpo = new FormData();
    corpo.append('modo', String(modo));
    audios.forEach((a, i) => corpo.append('audio[]', a, `bloco_${i}.webm`));
    return (await apiClient.post<{ texto: string }>(`/ata/atas/${id}/ia`, corpo, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 })).data.texto;
  },
  pessoas: async (q: string) => (await apiClient.get<{ data: Ref[] }>('/ata/pessoas', { params: { q } })).data.data,
  tipos: async () => (await apiClient.get<{ data: TipoAta[] }>('/ata/tipos')).data.data,
  salvarTipo: async (tipo: { id?: number; nome: string; ativo: boolean }) =>
    tipo.id ? (await apiClient.put<TipoAta>(`/ata/tipos/${tipo.id}`, tipo)).data : (await apiClient.post<TipoAta>('/ata/tipos', tipo)).data,
  excluirTipo: async (id: number) => { await apiClient.delete(`/ata/tipos/${id}`); },
  secretarias: async () => (await apiClient.get<{ data: SecretariaOpcao[] }>('/ata/secretarias')).data.data,
  salvarSecretaria: async (id: number, corpo: FormData) =>
    (await apiClient.post<{ data: SecretariaOpcao }>(`/ata/secretarias/${id}`, corpo, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data,
  auditoria: async (params: { acao?: string; ata_id?: number; page?: number }) =>
    (await apiClient.get<{ data: RegistroAuditoria[]; current_page: number; last_page: number; total: number }>('/ata/auditoria', { params })).data,
};

/** Validação pública (sem login): o slug da prefeitura vem do QR Code. */
export const validacaoApi = {
  validar: async (slug: string, codigo: string) =>
    (await apiClient.get<ResultadoValidacao>(`/public/ata/${encodeURIComponent(slug)}/validar/${encodeURIComponent(codigo)}`, { validateStatus: (s) => s === 200 || s === 404 })).data,
};

/** Salva um Blob como arquivo (download no navegador). */
export function baixarBlob(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
