import React, { useState } from 'react';
import { Modal, Button } from '@sysgov/ui';
import { FileText, CheckCircle2, XCircle, Send } from 'lucide-react';
import { StatusChip } from '@/components/ui';
import { useAuth } from '@/core/auth/useAuth';
import { sysgovApi, type CreateDfdInput, type Dfd, type Processo, type StatusDfd } from '@sysgov/sdk';
import { DfdForm } from './DfdForm';

const STATUS_LABEL: Record<StatusDfd, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

const STATUS_VARIANT: Record<StatusDfd, 'neutral' | 'warning' | 'success' | 'danger'> = {
  rascunho: 'neutral',
  em_revisao: 'warning',
  aprovado: 'success',
  rejeitado: 'danger',
};

const ACAO_LABEL: Record<string, string> = {
  criado: 'Criado',
  revisado: 'Revisado',
  enviado_revisao: 'Enviado para revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

interface DfdWorkspaceModalProps {
  processo: Processo;
  open: boolean;
  onClose: () => void;
  onChanged: (processo: Processo) => void;
}

export const DfdWorkspaceModal: React.FC<DfdWorkspaceModalProps> = ({ processo, open, onClose, onChanged }) => {
  const { user, permissions } = useAuth();
  const [dfd, setDfd] = useState<Dfd | null>(processo.dfd);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [showRejeitar, setShowRejeitar] = useState(false);

  const podeAprovar = permissions.includes('licita.aprovar') && dfd?.elaborado_por !== user?.id;
  const editavel = dfd ? ['rascunho', 'em_revisao', 'rejeitado'].includes(dfd.status) : true;

  const refreshProcesso = async () => {
    const atualizado = await sysgovApi.licita.getProcesso(processo.id);
    onChanged(atualizado);
  };

  const handleCreate = async (data: CreateDfdInput) => {
    const novoDfd = await sysgovApi.licita.createDfd(processo.id, data);
    setDfd(novoDfd);
    await refreshProcesso();
  };

  const handleUpdate = async (data: CreateDfdInput) => {
    if (!dfd) return;
    const atualizado = await sysgovApi.licita.updateDfd(dfd.id, data);
    setDfd(atualizado);
    await refreshProcesso();
  };

  const runAction = async (action: () => Promise<Dfd>) => {
    setActionError(null);
    setActionLoading(true);
    try {
      const atualizado = await action();
      setDfd(atualizado);
      await refreshProcesso();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'Erro ao executar ação.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Processo ${processo.numero}/${processo.ano} — DFD`}
      icon={<FileText className="h-5 w-5" />}
      size="xl"
    >
      <div className="space-y-5">
        {dfd && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <StatusChip label={STATUS_LABEL[dfd.status]} variant={STATUS_VARIANT[dfd.status]} />
              <span className="text-xs text-muted-foreground">
                Elaborado por <span className="font-medium text-foreground">{dfd.elaborador?.name ?? '—'}</span>
              </span>
              {dfd.aprovador && (
                <span className="text-xs text-muted-foreground">
                  Aprovado por <span className="font-medium text-foreground">{dfd.aprovador.name}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {dfd.status === 'rascunho' && (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                  isLoading={actionLoading}
                  onClick={() => runAction(() => sysgovApi.licita.enviarDfdParaRevisao(dfd.id))}
                >
                  Enviar para Revisão
                </Button>
              )}
              {dfd.status === 'em_revisao' && podeAprovar && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    isLoading={actionLoading}
                    onClick={() => runAction(() => sysgovApi.licita.aprovarDfd(dfd.id))}
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    leftIcon={<XCircle className="h-3.5 w-3.5" />}
                    onClick={() => setShowRejeitar((v) => !v)}
                  >
                    Rejeitar
                  </Button>
                </>
              )}
              {dfd.status === 'em_revisao' && !podeAprovar && (
                <span className="text-xs text-muted-foreground italic">
                  Aguardando aprovação de outro responsável (segregação de funções).
                </span>
              )}
            </div>
          </div>
        )}

        {showRejeitar && dfd && (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <label className="block text-sm font-medium text-foreground">Motivo da rejeição *</label>
            <textarea
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowRejeitar(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!motivoRejeicao.trim()}
                isLoading={actionLoading}
                onClick={() =>
                  runAction(() => sysgovApi.licita.rejeitarDfd(dfd.id, motivoRejeicao)).then(() => {
                    setShowRejeitar(false);
                    setMotivoRejeicao('');
                  })
                }
              >
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        )}

        {actionError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError}
          </div>
        )}

        <DfdForm
          key={dfd?.id ?? 'novo'}
          initialValue={dfd ? { ...dfd, equipe_planejamento: dfd.equipe_planejamento ?? undefined } : undefined}
          disabled={!editavel}
          submitLabel={dfd ? 'Salvar Alterações' : 'Criar DFD'}
          onSubmit={dfd ? handleUpdate : handleCreate}
        />

        {dfd && (dfd.versoes?.length ?? 0) > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Histórico de Versões</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {[...dfd.versoes].reverse().map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs">
                  <span className="font-mono tabular-nums text-muted-foreground">v{v.versao}</span>
                  <span className="text-foreground">{ACAO_LABEL[v.acao] ?? v.acao}</span>
                  <span className="text-muted-foreground">{v.usuario?.name ?? '—'}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {new Date(v.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DfdWorkspaceModal;
