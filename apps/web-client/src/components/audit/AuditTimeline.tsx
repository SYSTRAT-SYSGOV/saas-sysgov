import React from 'react';
import { Clock, User, Edit3, Plus, Trash2, Ban, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScreenState } from '@/components/ui/ScreenState';

export type AuditEventType = 'create' | 'update' | 'delete' | 'activate' | 'deactivate' | 'revoke' | 'grant' | 'login' | 'logout' | 'custom';

export interface AuditEntry {
  id: string;
  event: AuditEventType;
  description: string;
  author: string;
  authorEmail?: string;
  occurredAt: string;
  changes?: Record<string, { old: any; new: any }>;
}

interface AuditTimelineProps {
  entries: AuditEntry[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const eventConfig: Record<AuditEventType, { icon: React.ReactNode; color: string; label: string }> = {
  create:     { icon: <Plus className="h-3.5 w-3.5" />,       color: 'text-success',         label: 'Criação' },
  update:     { icon: <Edit3 className="h-3.5 w-3.5" />,     color: 'text-primary',          label: 'Edição' },
  delete:     { icon: <Trash2 className="h-3.5 w-3.5" />,    color: 'text-destructive',     label: 'Exclusão' },
  activate:   { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-success',    label: 'Ativação' },
  deactivate: { icon: <XCircle className="h-3.5 w-3.5" />,   color: 'text-warning',         label: 'Desativação' },
  revoke:     { icon: <Ban className="h-3.5 w-3.5" />,       color: 'text-warning',         label: 'Revogação' },
  grant:      { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-success',    label: 'Concessão' },
  login:      { icon: <User className="h-3.5 w-3.5" />,      color: 'text-muted-foreground', label: 'Login' },
  logout:     { icon: <User className="h-3.5 w-3.5" />,      color: 'text-muted-foreground', label: 'Logout' },
  custom:     { icon: <Edit3 className="h-3.5 w-3.5" />,    color: 'text-muted-foreground', label: 'Alteração' },
};

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ entries, loading, error, onRetry }) => {
  if (loading) return <ScreenState type="loading" title="Carregando histórico..." />;
  if (error) return <ScreenState type="error" title="Erro ao carregar histórico" description={error} onAction={onRetry} />;
  if (entries.length === 0) return <ScreenState type="empty" title="Nenhum registro de auditoria" description="Histórico de alterações aparecerá aqui." />;

  return (
    <div className="space-y-0">
      {entries.map((entry, idx) => {
        const cfg = eventConfig[entry.event] ?? eventConfig.custom;
        const isLast = idx === entries.length - 1;
        return (
          <div key={entry.id} className="relative pl-6">
            {!isLast && (
              <div className="absolute left-[9px] top-3 bottom-0 w-px bg-border" aria-hidden="true" />
            )}
            <div className="absolute left-0 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent">
              <span className={cfg.color}>{cfg.icon}</span>
            </div>
            <div className={`flex flex-col gap-1 pb-4 ${isLast ? '' : 'pb-3'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">{entry.description}</span>
                <Badge variant="neutral" className="text-[10px]">{cfg.label}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {entry.author}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(entry.occurredAt).toLocaleString('pt-BR')}
                </span>
              </div>
              {entry.changes && Object.keys(entry.changes).length > 0 && (
                <div className="mt-1 rounded border border-border bg-muted/30 p-2 space-y-1">
                  {Object.entries(entry.changes).map(([field, { old: oldVal, new: newVal }]) => (
                    <div key={field} className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-semibold text-muted-foreground">{field}:</span>
                      <span className="text-destructive line-through">{oldVal === null || oldVal === undefined ? '—' : String(oldVal)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-success">{newVal === null || newVal === undefined ? '—' : String(newVal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AuditTimeline;
