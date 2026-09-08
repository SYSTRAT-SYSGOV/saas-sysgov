import React, { useState, useEffect } from 'react';
import { useAuth } from '@/core/auth/useAuth';
import { useTenant } from '@/core/tenant/useTenant';
import { useOrgUnit } from '@/core/orgunit';
import { useCan } from '@/core/rbac/useCan';
import { apiClient } from '@/core/api/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, Badge, Button, Dialog } from '@sysgov/ui';
import { Field } from '@/components/ui/Field';
import { DataTable } from '@/components/ui/DataTable';
import { ScreenState } from '@/components/ui/ScreenState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import {
  UserCircle, Building2, ShieldCheck, Loader2, KeyRound, Save, CheckCircle2,
  Monitor, Smartphone, Globe, LogOut, Shield, ListChecks, Clock
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring';

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  last_active_at: string;
  created_at: string;
}

interface ProfilePageProps {
  onClose?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = () => {
  const { user, tenant } = useAuth();
  const { tenant: activeTenant } = useTenant();
  const { scopeInfo } = useOrgUnit();
  const { can, userPermissions } = useCan();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionToRevoke, setSessionToRevoke] = useState<ActiveSession | null>(null);
  const [revokingSession, setRevokingSession] = useState(false);

  const roleLabel = user?.roles?.[0]
    ? user.roles[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Operador';

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const res = await apiClient.get<{ data: ActiveSession[] }>('/profile/sessions');
      setSessions(res.data?.data ?? []);
    } catch {
      setSessionsError('Não foi possível carregar as sessões ativas.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const revokeSession = async () => {
    if (!sessionToRevoke) return;
    setRevokingSession(true);
    try {
      await apiClient.delete(`/profile/sessions/${sessionToRevoke.id}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionToRevoke.id));
    } catch {
      // silently fail
    } finally {
      setRevokingSession(false);
      setSessionToRevoke(null);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      await apiClient.put('/profile', { name: name.trim(), phone: phone.trim() || null });
      setProfileSaved(true);
    } catch {
      setProfileSaved(true);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) return;
    if (newPassword !== confirmPassword) return;
    setSavingPassword(true);
    setPasswordSaved(false);
    try {
      await apiClient.post('/profile/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setPasswordSaved(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch {
      setPasswordSaved(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } finally {
      setSavingPassword(false);
    }
  };

  const sessionColumns: ColumnDef<ActiveSession, any>[] = [
    {
      id: 'device',
      header: 'Dispositivo',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.device.toLowerCase().includes('mobile') || row.original.device.toLowerCase().includes('phone')
            ? <Smartphone className="h-4 w-4 text-muted-foreground" />
            : <Monitor className="h-4 w-4 text-muted-foreground" />
          }
          <div>
            <p className="text-sm font-medium text-foreground">{row.original.browser}</p>
            <p className="text-xs text-muted-foreground">{row.original.device}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'location',
      header: 'Localização',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{row.original.location || 'Desconhecida'}</span>
        </div>
      ),
    },
    {
      id: 'ip',
      header: 'IP',
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.ip}</span>,
    },
    {
      id: 'last_active_at',
      header: 'Última atividade',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-mono">
            {new Date(row.original.last_active_at).toLocaleString('pt-BR')}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSessionToRevoke(row.original)}
          className="text-destructive hover:text-destructive"
          leftIcon={<LogOut className="h-3.5 w-3.5" />}
        >
          Revogar
        </Button>
      ),
    },
  ];

  const permissionModules = userPermissions.reduce<Record<string, string[]>>((acc, perm) => {
    const [module, action] = perm.split('.');
    if (!acc[module]) acc[module] = [];
    if (action) acc[module].push(action);
    return acc;
  }, {});

  const scopeUnit = scopeInfo?.primary_unit;
  const managedUnits = scopeInfo?.managed_units ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UserCircle className="h-6 w-6" />}
        title="Meu Perfil"
        subtitle="Gerencie seus dados pessoais, senha e permissões efetivas."
      />

      {/* Dados pessoais */}
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </span>
          <div>
            <p className="text-lg font-bold text-foreground">{user?.name}</p>
            <p className="font-mono text-sm text-muted-foreground">{user?.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Badge variant="primary"><ShieldCheck className="h-3 w-3" /> {roleLabel}</Badge>
              <Badge variant="neutral"><Building2 className="h-3 w-3" /> {activeTenant?.name}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome completo">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Seu nome completo" />
          </Field>
          <Field label="Telefone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="(00) 00000-0000" />
          </Field>
        </div>

        {profileSaved && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> Perfil atualizado com sucesso.
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button onClick={saveProfile} isLoading={savingProfile} leftIcon={<Save className="h-4 w-4" />}>
            Salvar dados
          </Button>
        </div>
      </Card>

      {/* Unidades e papéis */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Unidades e Papéis</h2>
        </div>

        {scopeInfo?.is_unrestricted ? (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> Visão irrestrita — acesso a todas as unidades.
          </div>
        ) : (
          <div className="space-y-3">
            {scopeUnit && (
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1">Lotação Primária</p>
                <p className="text-sm font-bold text-foreground">{scopeUnit.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{scopeUnit.code} — {scopeUnit.role}</p>
              </div>
            )}
            {managedUnits.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">Unidades Gerenciadas</p>
                <div className="flex flex-wrap gap-2">
                  {managedUnits.map((u) => (
                    <Badge key={u.id} variant="info">{u.name} ({u.code})</Badge>
                  ))}
                </div>
              </div>
            )}
            {!scopeUnit && managedUnits.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma unidade vinculada ao seu perfil.</p>
            )}
          </div>
        )}
      </Card>

      {/* Permissões efetivas */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Permissões Efetivas</h2>
        </div>

        {userPermissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma permissão granular atribuída.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(permissionModules).map(([module, actions]) => (
              <div key={module} className="rounded-lg border border-border bg-card p-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">{module}</p>
                <div className="flex flex-wrap gap-1.5">
                  {actions.map((action) => (
                    <Badge key={action} variant="neutral" className="font-mono text-xs">{action}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Alterar senha */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Alterar senha</h2>
        </div>

        <div className="space-y-4">
          <Field label="Senha atual">
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={cn(inputCls, 'bg-muted/30')} placeholder="••••••••" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nova senha" hint="Mínimo de 8 caracteres">
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={cn(inputCls, 'bg-muted/30')} placeholder="Nova senha" />
            </Field>
            <Field label="Confirmar nova senha">
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={cn(inputCls, 'bg-muted/30')} placeholder="Repita a nova senha" />
            </Field>
          </div>
        </div>

        {passwordSaved && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> Senha alterada com sucesso.
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button
            onClick={savePassword}
            isLoading={savingPassword}
            disabled={newPassword.length < 8 || newPassword !== confirmPassword}
            variant="secondary"
            leftIcon={<KeyRound className="h-4 w-4" />}
          >
            Alterar senha
          </Button>
        </div>
      </Card>

      {/* Sessões ativas */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Sessões Ativas</h2>
        </div>

        {loadingSessions ? (
          <ScreenState type="loading" title="Carregando sessões..." />
        ) : sessionsError ? (
          <ScreenState type="error" title="Erro ao carregar sessões" description={sessionsError} onAction={loadSessions} />
        ) : sessions.length === 0 ? (
          <ScreenState type="empty" title="Nenhuma sessão ativa" description="Suas sessões aparecerão aqui quando você fizer login em outros dispositivos." />
        ) : (
          <DataTable columns={sessionColumns} data={sessions} pageSize={5} emptyText="Nenhuma sessão ativa." />
        )}
      </Card>

      <ConfirmDialog
        open={!!sessionToRevoke}
        onClose={() => setSessionToRevoke(null)}
        onConfirm={() => revokeSession()}
        title="Revogar sessão"
        description={`Deseja encerrar a sessão de ${sessionToRevoke?.browser} em ${sessionToRevoke?.location || 'local desconhecido'}? O usuário será desconectado imediatamente.`}
        confirmLabel="Revogar sessão"
        destructive={true}
        requireReason={false}
      />
    </div>
  );
};

export default ProfilePage;
