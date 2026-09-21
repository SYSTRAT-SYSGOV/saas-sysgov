/**
 * Funções utilitárias puras e tipagens para o Portal de Auditoria e Controle Interno (CAPD).
 */

export interface TrilhaForenseItem {
  id: number;
  acao: string;
  modulo: string;
  entidade: string;
  entidade_id: number;
  usuario: string;
  ip: string;
  timestamp: string;
  hash_sha256: string;
  integridade: 'valida' | 'violada';
}

export interface ItemAmostragemAuditoria {
  id: number;
  avaliacao_id: number;
  servidor_nome: string;
  matricula: string;
  cargo: string;
  avaliador_nome: string;
  nota_final: number;
  motivo_auditoria: 'amostragem_10' | 'nota_extrema_baixa' | 'nota_extrema_alta' | 'sem_diario_cit';
  possui_cit: boolean;
  qtd_incidentes_cit: number;
  status_parecer: 'pendente' | 'aprovado' | 'reavaliacao' | 'diligencia';
  parecer_texto?: string | null;
  analisado_em?: string | null;
}

export interface LogAcessoLgpd {
  id: number;
  usuario: string;
  cargo_usuario: string;
  acao: 'visualizacao_espelho' | 'exportacao_dados' | 'consulta_prontuario' | 'emissao_certidao';
  servidor_alvo: string;
  matricula_alvo: string;
  ip: string;
  timestamp: string;
  justificativa: string;
}

export interface AuditoriaKpiSummary {
  impedimentosAtivos: number;
  totalEventosForenses: number;
  totalFilaAmostragem: number;
  taxaIntegridadeSha256: number;
}

/**
 * Valida formato de hash SHA-256 (64 caracteres hexadecimais).
 */
export function isValidSha256(hash?: string | null): boolean {
  if (!hash) return false;
  const trimmed = hash.trim();
  return /^[a-fA-F0-9]{64}$/.test(trimmed);
}

/**
 * Normaliza e busca a assinatura na trilha forense.
 */
export function verificarHashNaTrilha(
  hash: string,
  trilha: TrilhaForenseItem[]
): { valido: boolean; mensagem: string; registro?: TrilhaForenseItem } {
  const limpo = hash.trim().toLowerCase();
  if (!isValidSha256(limpo)) {
    return {
      valido: false,
      mensagem: 'Formato inválido. Um hash SHA-256 deve possuir exatamente 64 caracteres hexadecimais.',
    };
  }

  const registro = trilha.find((t) => t.hash_sha256.toLowerCase() === limpo);
  if (registro) {
    if (registro.integridade === 'violada') {
      return {
        valido: false,
        mensagem: `Alerta Forense: Hash localizado no Log #${registro.id}, porém a integridade foi marcada como VIOLADA!`,
        registro,
      };
    }
    return {
      valido: true,
      mensagem: `Assinatura SHA-256 autêntica e íntegra! Evento registrado no Log #${registro.id} (${registro.modulo}).`,
      registro,
    };
  }

  return {
    valido: false,
    mensagem: 'Hash SHA-256 não localizado nos registros do repositório imutável do município.',
  };
}

/**
 * Consolida os KPIs da esteira de Controle Interno.
 */
export function calculateAuditoriaKpis(
  impedimentos: any[] = [],
  trilha: TrilhaForenseItem[] = [],
  amostragem: ItemAmostragemAuditoria[] = []
): AuditoriaKpiSummary {
  const impedimentosAtivos = impedimentos.filter((i) => i.status === 'ativo').length;
  const totalEventosForenses = trilha.length;
  const totalFilaAmostragem = amostragem.filter((a) => a.status_parecer === 'pendente').length;

  let taxaIntegridadeSha256 = 100;
  if (trilha.length > 0) {
    const validos = trilha.filter((t) => t.integridade === 'valida').length;
    taxaIntegridadeSha256 = Math.round((validos / trilha.length) * 1000) / 10;
  }

  return {
    impedimentosAtivos,
    totalEventosForenses,
    totalFilaAmostragem,
    taxaIntegridadeSha256,
  };
}

/**
 * Mascara CPF para conformidade estrita com a LGPD (Ex: ***.456.789-**).
 */
export function maskCpf(cpf?: string | null): string {
  if (!cpf) return '***.***.***-**';
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11) return '***.***.***-**';
  return `***.${nums.substring(3, 6)}.${nums.substring(6, 9)}-**`;
}

/**
 * Retorna o rótulo amigável do motivo de enquadramento na auditoria/amostragem.
 */
export function getMotivoAmostragemLabel(motivo: ItemAmostragemAuditoria['motivo_auditoria']): string {
  switch (motivo) {
    case 'amostragem_10':
      return 'Sorteio Amostral (10% TCM)';
    case 'nota_extrema_baixa':
      return 'Nota Extrema Baixa (< 4.00)';
    case 'nota_extrema_alta':
      return 'Nota Extrema Alta (>= 9.50)';
    case 'sem_diario_cit':
      return 'Sem Diário CIT Obrigatório';
    default:
      return motivo;
  }
}

/**
 * Retorna o rótulo amigável de ações para log de acesso LGPD.
 */
export function getAcaoLgpdLabel(acao: LogAcessoLgpd['acao']): string {
  switch (acao) {
    case 'visualizacao_espelho':
      return 'Visualização de Espelho Avaliativo';
    case 'consulta_prontuario':
      return 'Consulta de Prontuário Funcional';
    case 'exportacao_dados':
      return 'Exportação de Base de Notas';
    case 'emissao_certidao':
      return 'Emissão de Certidão de Desempenho';
    default:
      return acao;
  }
}

/**
 * Gera CSV com a trilha forense para exportação ao Tribunal de Contas.
 */
export function gerarCsvTrilhaForense(trilha: TrilhaForenseItem[]): string {
  const headers = ['Log_ID', 'Acao', 'Modulo', 'Entidade', 'Entidade_ID', 'Agente', 'IP', 'Carimbo_UTC', 'Hash_SHA256', 'Integridade'];
  const rows = trilha.map((t) => [
    t.id,
    `"${t.acao.replace(/"/g, '""')}"`,
    `"${t.modulo.replace(/"/g, '""')}"`,
    t.entidade,
    t.entidade_id,
    `"${t.usuario.replace(/"/g, '""')}"`,
    t.ip,
    t.timestamp,
    t.hash_sha256,
    t.integridade,
  ]);
  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}

/**
 * Gera CSV com as avaliações auditadas da amostragem e trava anti-leniência.
 */
export function gerarCsvAmostragem(amostragem: ItemAmostragemAuditoria[]): string {
  const headers = ['ID', 'Avaliacao_ID', 'Servidor', 'Matricula', 'Cargo', 'Avaliador', 'Nota_Final', 'Enquadramento', 'Possui_CIT', 'Qtd_CIT', 'Status_Parecer'];
  const rows = amostragem.map((a) => [
    a.id,
    a.avaliacao_id,
    `"${a.servidor_nome.replace(/"/g, '""')}"`,
    a.matricula,
    `"${a.cargo.replace(/"/g, '""')}"`,
    `"${a.avaliador_nome.replace(/"/g, '""')}"`,
    a.nota_final.toFixed(2),
    `"${getMotivoAmostragemLabel(a.motivo_auditoria)}"`,
    a.possui_cit ? 'SIM' : 'NAO',
    a.qtd_incidentes_cit,
    a.status_parecer.toUpperCase(),
  ]);
  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}
