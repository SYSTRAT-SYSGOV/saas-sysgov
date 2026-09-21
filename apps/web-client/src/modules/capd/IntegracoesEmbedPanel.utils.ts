/**
 * Utilitários puros e tipagens para a aba de Integrações RH & Embed (CAPD).
 */

export interface RhConector {
  id: number;
  nome: string;
  driver: 'betha' | 'ipm' | 'senior' | 'totvs' | 'generic_rest';
  api_key: string;
  api_url?: string | null;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  is_active: boolean;
  ultima_sincronizacao_em?: string | null;
  logs_count?: number;
}

export interface RhSyncLogItem {
  id: number;
  integracao_id?: number | null;
  integracao?: {
    id: number;
    nome: string;
    driver: string;
  };
  tipo: 'servidores' | 'frequencia' | 'afastamentos' | 'homologacao' | 'webhook';
  direcao: 'inbound' | 'outbound';
  status: 'sucesso' | 'erro' | 'parcial';
  registros_processados: number;
  registros_sucesso: number;
  registros_falha: number;
  detalhes?: Record<string, unknown> | null;
  created_at: string;
}

export interface EmbedConfig {
  identificador: string;
  mode: 'autoavaliacao' | 'diario-bordo' | 'espelho' | 'recurso';
  ttlMinutes: number;
}

export interface EmbedGenerated {
  token: string;
  url: string;
  expiresInMinutes: number;
  iframeSnippet: string;
  generatedAt: string;
}

export interface IntegracoesKpiSummary {
  totalConectores: number;
  conectoresAtivos: number;
  totalSincronizacoes: number;
  taxaSucesso: number;
  totalEmbedAtivos: number;
}

/**
 * Mascara chave de API preservando prefixo e sufixo para auditoria visual segura.
 */
export function maskApiKey(key?: string | null): string {
  if (!key) return '••••••••••••••••';
  const trimmed = key.trim();
  if (trimmed.length <= 10) return '••••••••••••';
  const prefix = trimmed.slice(0, 6);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••••••${suffix}`;
}

/**
 * Calcula os KPIs de desempenho das integrações e do gateway embed.
 */
export function calculateKpis(
  conectores: RhConector[] = [],
  logs: RhSyncLogItem[] = [],
  embedAtivosCount = 0
): IntegracoesKpiSummary {
  const totalConectores = conectores.length;
  const conectoresAtivos = conectores.filter((c) => c.is_active).length;
  const totalSincronizacoes = logs.length;

  let taxaSucesso = 100;
  if (totalSincronizacoes > 0) {
    const sucessos = logs.filter((l) => l.status === 'sucesso').length;
    taxaSucesso = Math.round((sucessos / totalSincronizacoes) * 1000) / 10;
  }

  return {
    totalConectores,
    conectoresAtivos,
    totalSincronizacoes,
    taxaSucesso,
    totalEmbedAtivos: embedAtivosCount,
  };
}

/**
 * Gera snippet seguro de iframe para embutimento em portais externos.
 */
export function generateIframeSnippet(embedUrl: string, title = 'SYSGOV - Avaliação CAPD'): string {
  if (!embedUrl) return '';
  return `<iframe
  src="${embedUrl}"
  title="${title}"
  width="100%"
  height="700"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);"
  sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
  loading="lazy"
></iframe>`;
}

/**
 * Validação simplificada de URL HTTP/HTTPS.
 */
export function isValidHttpUrl(urlString?: string | null): boolean {
  if (!urlString) return false;
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Retorna rótulo legível do driver de integração ERP.
 */
export function getDriverLabel(driver?: string): string {
  switch (driver) {
    case 'betha':
      return 'Betha Sistemas (Fly)';
    case 'ipm':
      return 'IPM Atende.net';
    case 'senior':
      return 'Senior Ronda / Gestão de Pessoas';
    case 'totvs':
      return 'TOTVS Protheus RH';
    case 'generic_rest':
      return 'REST API Genérico';
    default:
      return driver ? String(driver).toUpperCase() : 'Desconhecido';
  }
}

/**
 * Formata data ISO para pt-BR em JetBrains Mono.
 */
export function formatIsoDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
