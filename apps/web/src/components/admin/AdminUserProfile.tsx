import React, { useState } from 'react';
import {
  UserCheck,
  KeyRound,
  ShieldCheck,
  Laptop,
  Smartphone,
  LogOut,
  Save,
  CheckCircle2,
  Lock,
  Mail,
  Building2,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

interface AdminUserProfileProps {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

export const AdminUserProfile: React.FC<AdminUserProfileProps> = ({ onAddToast }) => {
  const { currentUser } = useAuthContext();

  const [profileName, setProfileName] = useState(currentUser?.nome || 'Carlos Eduardo Silva');
  const [profileEmail] = useState(currentUser?.email || 'carlos.silva@sysgov.online');
  const [profileDepartment, setProfileDepartment] = useState('Diretoria de Tecnologia');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Active sessions
  const [sessions, setSessions] = useState([
    {
      id: 'sess-1',
      device: 'Windows 11 (Google Chrome 128)',
      ip: '177.135.88.12 (Curitiba, PR)',
      lastActive: 'Sessão Atual (Ativo agora)',
      isCurrent: true,
      icon: Laptop,
    },
    {
      id: 'sess-2',
      device: 'iPhone 15 Pro (Safari Mobile)',
      ip: '177.135.88.45 (Curitiba, PR)',
      lastActive: 'Há 3 horas',
      isCurrent: false,
      icon: Smartphone,
    },
  ]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onAddToast({
      type: 'success',
      title: 'Perfil Atualizado',
      message: 'Seus dados cadastrais foram salvos com sucesso.',
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      onAddToast({
        type: 'error',
        title: 'Senhas Não Conferem',
        message: 'A nova senha e a confirmação devem ser idênticas.',
      });
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onAddToast({
      type: 'success',
      title: 'Senha Alterada',
      message: 'Sua senha foi redefinida com segurança.',
    });
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    onAddToast({
      type: 'info',
      title: 'Sessão Encerrada',
      message: 'O dispositivo selecionado foi desconectado.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md">
            {profileName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {profileName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              {profileEmail} • Super Administrador Master
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            2FA Criptografado Ativo
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info Form */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-500" />
            Dados Cadastrais
          </h2>

          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome de Exibição
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                E-mail da Conta (Imutável)
              </label>
              <input
                type="email"
                disabled
                value={profileEmail}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Departamento
              </label>
              <input
                type="text"
                value={profileDepartment}
                onChange={(e) => setProfileDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Dados
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            Alterar Senha de Acesso
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Senha Atual
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nova Senha (Mínimo 8 dígitos)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Atualizar Senha
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Laptop className="w-4 h-4 text-cyan-500" />
          Sessões & Dispositivos Conectados
        </h2>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {sessions.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      {s.device}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      IP: {s.ip} • {s.lastActive}
                    </span>
                  </div>
                </div>

                <div>
                  {s.isCurrent ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Sessão Atual
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-[11px] font-semibold transition-colors"
                    >
                      <LogOut className="w-3 h-3" />
                      Desconectar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
