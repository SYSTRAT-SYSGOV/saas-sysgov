import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { accessApi } from '../AccessApi';

interface DefaultPasswordModalProps {
  onClose: () => void;
  notify: (t: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void;
}

export const DefaultPasswordModal: React.FC<DefaultPasswordModalProps> = ({ onClose, notify }) => {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSet, setIsSet] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const status = await accessApi.getDefaultPassword();
        setIsSet(status.set);
        setLastUpdated(status.updated_at);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!password || password.length < 8) {
      notify({ type: 'warning', title: 'Senha fraca', message: 'A senha deve ter pelo menos 8 caracteres.' });
      return;
    }
    if (password !== passwordConfirmation) {
      notify({ type: 'warning', title: 'Senhas diferentes', message: 'A senha e a confirmação não coincidem.' });
      return;
    }
    setSaving(true);
    try {
      const result = await accessApi.setDefaultPassword(password, passwordConfirmation);
      setIsSet(result.set);
      setLastUpdated(result.updated_at);
      setPassword('');
      setPasswordConfirmation('');
      notify({ type: 'success', title: 'Senha padrão salva', message: 'A senha padrão do sistema foi atualizada.' });
      onClose();
    } catch (e: any) {
      notify({ type: 'error', title: 'Falha ao salvar', message: e?.response?.data?.message || e?.message || 'Erro ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gov-border">
          <h2 className="text-lg font-bold text-[#0c326f] dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gov-primary" /> Senha Padrão do Sistema
          </h2>
          <button onClick={onClose} className="text-gov-text-muted hover:text-gov-text-primary"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-gov-text-secondary">
            Define uma senha padrão que será sugerida ao criar novos usuários. Apenas administradores globais têm acesso a esta configuração.
          </p>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-gov-primary" /></div>
          ) : (
            <>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${isSet ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                {isSet && <><CheckCircle2 className="w-4 h-4" /> Senha padrão definida{lastUpdated ? ` em ${new Date(lastUpdated).toLocaleDateString('pt-BR')}` : ''}</>}
                {!isSet && 'Nenhuma senha padrão definida.'}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Nova senha padrão</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mín. 8 caracteres"
                  className="w-full px-3 py-2.5 border border-gov-border rounded-lg text-sm bg-slate-50 dark:bg-slate-800 text-gov-text-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gov-text-secondary mb-1">Confirmar senha</label>
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full px-3 py-2.5 border border-gov-border rounded-lg text-sm bg-slate-50 dark:bg-slate-800 text-gov-text-primary"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gov-border">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gov-border rounded-lg text-gov-text-secondary hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
          <button onClick={handleSave} disabled={saving || loading} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gov-primary text-white rounded-lg disabled:opacity-50 hover:bg-gov-primary-hover">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar senha padrão
          </button>
        </div>
      </div>
    </div>
  );
};
