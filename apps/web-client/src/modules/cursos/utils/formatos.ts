import type { Modalidade, RegraLiberacao, StatusCurso, StatusInscricao, StatusTentativa, StatusTurma, SituacaoAula, TipoCurso, TipoMaterial, TipoQuestao } from '@sysgov/sdk';
import type { StatusVariant } from '@/components/ui';

export function formatarCargaHoraria(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (resto === 0) return horas === 1 ? '1 hora' : `${horas} horas`;
  if (horas === 0) return `${resto} minutos`;
  return `${horas}h${String(resto).padStart(2, '0')}`;
}

/** "2026-10-01" ou ISO completo → "01/10/2026" (sem deslocar o dia por fuso). */
export function formatarData(valor: string | null | undefined): string {
  if (!valor) return '';
  const [ano, mes, dia] = valor.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHora(valor: string | null | undefined): string {
  if (!valor) return '';
  return new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatarHora(valor: string): string {
  return new Date(valor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Valor para <input type="datetime-local"> a partir de um ISO/"Y-m-d H:i:s". */
export function paraInputDataHora(valor: string | null | undefined): string {
  if (!valor) return '';
  const d = new Date(valor.includes('T') ? valor : valor.replace(' ', 'T'));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatarPercentual(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  return `${Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export const TIPO_CURSO: Record<TipoCurso, string> = { curso: 'Curso', evento: 'Evento' };

export const STATUS_CURSO: Record<StatusCurso, { label: string; variant: StatusVariant }> = {
  rascunho: { label: 'Rascunho', variant: 'neutral' },
  publicado: { label: 'Publicado', variant: 'success' },
  encerrado: { label: 'Encerrado', variant: 'info' },
};

export const STATUS_TURMA: Record<StatusTurma, { label: string; variant: StatusVariant }> = {
  aberta: { label: 'Aberta', variant: 'success' },
  encerrada: { label: 'Encerrada', variant: 'info' },
  cancelada: { label: 'Cancelada', variant: 'danger' },
};

export const STATUS_INSCRICAO: Record<StatusInscricao, { label: string; variant: StatusVariant }> = {
  pendente: { label: 'Pendente', variant: 'warning' },
  confirmada: { label: 'Confirmada', variant: 'success' },
  lista_espera: { label: 'Lista de espera', variant: 'warning' },
  cancelada: { label: 'Cancelada', variant: 'neutral' },
  concluida: { label: 'Concluída', variant: 'primary' },
  nao_concluida: { label: 'Não concluída', variant: 'danger' },
};

export const MODALIDADE: Record<Modalidade, string> = { presencial: 'Presencial', online: 'Online', hibrido: 'Híbrido' };

export const SITUACAO_AULA: Record<SituacaoAula, { label: string; variant: StatusVariant }> = {
  presente: { label: 'Presente', variant: 'success' },
  falta: { label: 'Falta', variant: 'danger' },
  em_andamento: { label: 'Em andamento', variant: 'info' },
  nao_realizada: { label: 'Não realizada', variant: 'neutral' },
};

export function baixarBlob(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const TIPO_MATERIAL: Record<TipoMaterial, string> = { arquivo: 'Arquivo PDF', video: 'Vídeo', link: 'Link externo', texto: 'Texto' };

export const REGRA_LIBERACAO: Record<RegraLiberacao, string> = {
  imediata: 'Imediata',
  inicio_aula: 'No início da aula',
  dias_apos_inicio: 'Dias após o início da turma',
};

export const TIPO_QUESTAO: Record<TipoQuestao, string> = { objetiva: 'Objetiva', dissertativa: 'Dissertativa' };

export const STATUS_TENTATIVA: Record<StatusTentativa, { label: string; variant: StatusVariant }> = {
  em_andamento: { label: 'Em andamento', variant: 'info' },
  aguardando_correcao: { label: 'Aguardando correção', variant: 'warning' },
  corrigida: { label: 'Corrigida', variant: 'success' },
};

/** Nota de 0 a 10 com duas casas e vírgula ("8,75"); "—" quando não há nota. */
export function formatarNota(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatarTamanho(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

/** Texto curto de uma regra de liberação ("7 dias após o início da turma"). */
export function descreverLiberacao(regra: RegraLiberacao, dias: number | null): string {
  if (regra === 'dias_apos_inicio') return dias === 0 ? 'No dia do início da turma' : `${dias} ${dias === 1 ? 'dia' : 'dias'} após o início da turma`;
  return REGRA_LIBERACAO[regra];
}

/** Milissegundos → "mm:ss" (ou "h:mm:ss"), para o cronômetro da avaliação. */
export function formatarContagem(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const seg = total % 60;
  const dois = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dois(m)}:${dois(seg)}` : `${dois(m)}:${dois(seg)}`;
}
