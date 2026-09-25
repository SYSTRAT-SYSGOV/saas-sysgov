import type { Modalidade, StatusCurso, StatusInscricao, StatusTurma, SituacaoAula, TipoCurso } from '@sysgov/sdk';
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
