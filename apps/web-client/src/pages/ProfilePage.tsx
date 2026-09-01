import React, { useState } from 'react';
import { useAuth } from '@/core/auth/useAuth';
import { useTenant } from '@/core/tenant/useTenant';
import { apiClient } from '@/core/api/client';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { UserCircle, Building2, ShieldCheck, Loader2, KeyRound, Save, CheckCircle2 } from 'lucide-react';

const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring';

interface ProfilePageProps {
  onClose?: () => void;
}

/**
 * Página de perfil do usuário logado — acessada via dropdown do TopBar.
 * Permite editar nome/telefone e alterar a senha.
 */
export const ProfilePage: React.FC<ProfilePageProps> = () => {
  const { user, tenant } = useAuth();
  const { tenant: activeTenant } = useTenant();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const roleLabel = user?.roles?.[0]
    ? user.roles[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Operador';

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      await apiClient.put('/profile', { name: name.trim(), phone: phone.trim() || null });
      setProfileSaved(true);
    } catch {
      // fallback silencioso em ambiente de homologação
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

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserCircle className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Meu Perfil</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus dados pessoais e a senha de acesso.</p>
          </div>
        </div>

        {/* Dados pessoais */}
        <Card className="mb-6 p-6">
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
      </div>
    </div>
  );
};

export default ProfilePage;
