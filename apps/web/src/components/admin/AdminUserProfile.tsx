import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Laptop, LogOut, Mail, Save, UserCheck } from 'lucide-react';
import { Card } from '@sysgov/ui';
import { useAuthContext } from '../../contexts/AuthContext';
import { ScreenState, ScreenStateType } from '../ui/ScreenState';
import api from '../../api/client';
import { useFormValidationModal } from '@sysgov/ui';

interface AdminUserProfileProps {
  onAddToast?: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

/** Sessão = token de acesso do usuário (o sistema não guarda IP nem dispositivo). */
interface AdminSession {
  id: number;
  name: string;
  created_at: string | null;
  last_used_at: string | null;
  is_current: boolean;
}

const formatDateTime = (iso: string | null): string => {
  if (!iso) return 'nunca usada';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

/**
 * Meu Perfil & Segurança: dados da conta, troca de senha e sessões, todos ligados à API
 * (PUT /me/profile, POST /me/password, GET/DELETE /me/sessions).
 */
export const AdminUserProfile: React.FC<AdminUserProfileProps> = ({ onAddToast }) => {
  const { currentUser, setCurrentUser } = useAuthContext();
  const toast = useCallback(
    (t: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => onAddToast?.(t),
    [onAddToast]
  );

  const [name, setName] = useState(currentUser?.nome ?? '');
  const { modal: modalValidacao, tratarErro } = useFormValidationModal();
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [sessionsState, setSessionsState] = useState<ScreenStateType>('loading');
  const [sessionsError, setSessionsError] = useState('');

  const loadSessions = useCallback(async () => {
    setSessionsState('loading');
    setSessionsError('');
    try {
      const res = await api.get<{ data: AdminSession[] }>('/api/admin/me/sessions');
      setSessions(res.data);
      setSessionsState(res.data.length === 0 ? 'empty' : 'ready');
    } catch (err: any) {
      setSessionsError(err?.message || 'Não foi possível carregar as sessões.');
      setSessionsState('error');
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ type: 'error', title: 'Nome obrigatório', message: 'Informe o seu nome.' });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.put<{ data: { name: string } }>('/api/admin/me/profile', { name: name.trim() });
      if (currentUser) setCurrentUser({ ...currentUser, nome: res.data.name });
      toast({ type: 'success', title: 'Perfil atualizado', message: 'Seu nome foi salvo.' });
    } catch (err: any) {
      if (!tratarErro(err)) toast({ type: 'error', title: 'Falha ao salvar', message: err?.message || 'Não foi possível salvar o perfil.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast({ type: 'error', title: 'Senha atual', message: 'Informe a senha atual.' });
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ type: 'error', title: 'Senhas não conferem', message: 'A nova senha e a confirmação devem ser idênticas.' });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await api.post<{ message: string }>('/api/admin/me/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ type: 'success', title: 'Senha alterada', message: res.message });
      await loadSessions();
    } catch (err: any) {
      if (!tratarErro(err)) toast({ type: 'error', title: 'Senha não alterada', message: err?.message || 'Não foi possível alterar a senha.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRevokeSession = async (session: AdminSession) => {
    try {
      await api.delete(`/api/admin/me/sessions/${session.id}`);
      toast({ type: 'success', title: 'Sessão encerrada', message: 'O acesso dessa sessão foi revogado.' });
      await loadSessions();
    } catch (err: any) {
      if (!tratarErro(err)) toast({ type: 'error', title: 'Falha ao encerrar', message: err?.message || 'Não foi possível encerrar a sessão.' });
    }
  };

  const inputClass =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="space-y-6 animate-fade-in">
      {modalValidacao}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
          <UserCheck className="h-5 w-5 text-primary" /> Meu Perfil &amp; Segurança
        </h1>
        <p className="text-sm text-muted-foreground">Dados da sua conta, senha e sessões ativas.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Dados da conta</h2>
          <form noValidate onSubmit={handleUpdateProfile} className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Nome</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={160} />
            </label>
            <label className="block space-y-1">
              <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> E-mail
              </span>
              <input value={currentUser?.email ?? ''} readOnly disabled className={`${inputClass} font-mono opacity-70`} />
            </label>
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {savingProfile ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <KeyRound className="h-4 w-4 text-primary" /> Alterar senha
          </h2>
          <form noValidate onSubmit={handleChangePassword} className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Senha atual</span>
              <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Nova senha</span>
              <input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
              <span className="text-[11px] text-muted-foreground">Mín. 8 caracteres, com maiúscula, minúscula, número e símbolo.</span>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Confirmar nova senha</span>
              <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
            </label>
            <p className="text-[11px] text-muted-foreground">Ao trocar a senha, as suas outras sessões são encerradas.</p>
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <KeyRound className="h-3.5 w-3.5" /> {savingPassword ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Sessões ativas</h2>
        <p className="mb-4 text-xs text-muted-foreground">Cada sessão é um acesso autenticado da sua conta.</p>
        <ScreenState
          state={sessionsState}
          loadingMessage="Carregando sessões..."
          errorMessage={sessionsError}
          errorAction={{ label: 'Tentar novamente', onClick: () => void loadSessions() }}
          emptyMessage="Nenhuma sessão ativa encontrada."
        >
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <Laptop className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {s.name} {s.is_current && <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">sessão atual</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Criada em {formatDateTime(s.created_at)} • último uso: {formatDateTime(s.last_used_at)}
                    </p>
                  </div>
                </div>
                {!s.is_current && (
                  <button
                    type="button"
                    onClick={() => void handleRevokeSession(s)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Encerrar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </ScreenState>
      </Card>
    </div>
  );
};

export default AdminUserProfile;
