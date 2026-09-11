import React, { useEffect, useState } from 'react';
import { Sparkles, Save, Wand2, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, Button } from '@sysgov/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScreenState } from '@/components/ui/ScreenState';
import { Field } from '@/components/ui/Field';
import { adminApi } from '@/modules/admin/api';
import type { AiSettings } from '@/modules/admin/types';

interface AdminAiSettingsProps {
  onAddToast: (toast: { type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }) => void;
}

interface FormState {
  enabled: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  apiKey: string;
}

const toForm = (s: AiSettings): FormState => ({
  enabled: s.enabled,
  provider: s.provider,
  baseUrl: s.baseUrl,
  model: s.model,
  maxTokens: s.maxTokens,
  apiKey: '',
});

/**
 * Configuração ÚNICA de IA da plataforma — usada por TODOS os tenants (não
 * existe configuração de IA por tenant). Gerenciável só por administradores
 * da plataforma (is_platform_admin no backend). Provedor hoje: NanoGPT
 * (https://docs.nano-gpt.com), API compatível com o formato de chat
 * completions da OpenAI — por isso os campos são genéricos o bastante
 * (base URL + modelo) para trocar de provedor sem migração de schema.
 */
export const AdminAiSettings: React.FC<AdminAiSettingsProps> = ({ onAddToast }) => {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getAiSettings();
      setSettings(data);
      setForm(toForm(data));
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar a configuração de IA.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setTestResult(null);
    try {
      const updated = await adminApi.updateAiSettings({
        enabled: form.enabled,
        provider: form.provider,
        base_url: form.baseUrl,
        model: form.model,
        max_tokens: Number(form.maxTokens),
        ...(form.apiKey ? { api_key: form.apiKey } : {}),
      });
      setSettings(updated);
      setForm(toForm(updated));
      onAddToast({ type: 'success', title: 'Configuração salva', message: 'A configuração de IA da plataforma foi atualizada.' });
    } catch (err: any) {
      onAddToast({ type: 'error', title: 'Erro ao salvar', message: err?.message || 'Não foi possível salvar a configuração.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!form) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await adminApi.testAiSettings({
        provider: form.provider,
        base_url: form.baseUrl,
        model: form.model,
        ...(form.apiKey ? { api_key: form.apiKey } : {}),
      });
      setTestResult({ ok: result.ok, message: result.message });
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message || 'Não foi possível testar a conexão.' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <ScreenState state="loading" loadingMessage="Carregando configuração de IA...">
        <></>
      </ScreenState>
    );
  }
  if (error || !form || !settings) {
    return (
      <ScreenState state="error" errorMessage={error ?? 'Erro ao carregar a configuração de IA.'} errorAction={{ label: 'Tentar novamente', onClick: load }}>
        <></>
      </ScreenState>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações de IA"
        subtitle="Configuração única de IA da plataforma — usada por todos os tenants. Não existe configuração por órgão."
      />

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Provedor de IA
          </div>

          <Field
            label="Ativar suporte de IA"
            name="enabled"
            type="checkbox"
            value={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: (e.target as HTMLInputElement).checked })}
            help="Quando desativado, nenhum módulo (de nenhum tenant) consegue chamar a IA."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Provedor"
              name="provider"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              placeholder="nanogpt"
              required
              help="Identificador interno do provedor (hoje: nanogpt)."
            />
            <Field
              label="URL base da API"
              name="baseUrl"
              type="url"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://nano-gpt.com/api/v1"
              required
            />
            <Field
              label="Modelo"
              name="model"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="deepseek/deepseek-v4-pro-0813"
              required
              help="Identificador do modelo no provedor (ex.: DeepSeek V4 Pro no NanoGPT)."
            />
            <Field
              label="Máx. de tokens por resposta"
              name="maxTokens"
              type="number"
              min={64}
              max={32000}
              value={form.maxTokens}
              onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
              required
            />
          </div>

          <Field
            label="Chave de API"
            name="apiKey"
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder={settings.apiKeyConfigured ? `Chave atual: ${settings.apiKeyMasked}` : 'Cole aqui a chave de API do provedor'}
            help={
              settings.apiKeyConfigured
                ? `Uma chave já está salva (${settings.apiKeyMasked}). Deixe em branco para mantê-la.`
                : 'Nenhuma chave configurada ainda.'
            }
          />

          {testResult && (
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                testResult.ok
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              {testResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              {testResult.message}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Button type="submit" variant="primary" leftIcon={<Save className="h-4 w-4" />} isLoading={saving}>
              Salvar
            </Button>
            <Button type="button" variant="outline" leftIcon={testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} onClick={handleTest} disabled={testing}>
              Testar conexão
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default AdminAiSettings;
