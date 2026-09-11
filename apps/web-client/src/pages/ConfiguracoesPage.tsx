import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/core/auth/useAuth';
import { useCan } from '@/core/rbac/useCan';
import { apiClient } from '@/core/api/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScreenState } from '@/components/ui/ScreenState';
import { Card, Button } from '@sysgov/ui';
import { cn } from '@/lib/utils';
import { Settings2, Building2, Upload, Trash2, Save, CheckCircle2, ImageOff } from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

interface DocumentInfo {
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
}

const emptyInfo: DocumentInfo = { cnpj: '', endereco: '', cidade: '', uf: '', cep: '', telefone: '' };

/**
 * Configurações institucionais do órgão (auto-atendimento pelo próprio
 * admin_tenant): logo e dados institucionais (CNPJ, endereço, telefone)
 * usados no cabeçalho dos documentos gerados pelo sistema — PDF do DFD,
 * da Legislação etc. (ver gerarDfdPdf.ts / gerarLegislacaoPdf.ts).
 *
 * Diferente do painel de branding que a equipe SYSTRAT configura pra
 * cada tenant (cor, título do portal) — este é conteúdo institucional
 * do próprio órgão, não branding da plataforma. A logo, porém,
 * reaproveita a MESMA chave (`settings.customLogoUrl`) já usada pelo
 * Sidebar para exibir a marca — então o upload feito aqui também
 * atualiza a logo do menu lateral.
 */
export const ConfiguracoesPage: React.FC = () => {
  const { tenant, updateSession } = useAuth();
  const { can } = useCan();
  const podeGerenciar = can('tenant.settings.update');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [info, setInfo] = useState<DocumentInfo>(emptyInfo);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/tenant-settings');
      setLogoUrl(res.data.customLogoUrl ?? null);
      setInfo({ ...emptyInfo, ...res.data.documentInfo });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao carregar as configurações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza a sessão em memória (useAuth/useTenant) com o retorno do
  // backend — sem isso, a logo no Sidebar e os dados usados nos PDFs só
  // apareceriam atualizados depois de um novo login (a sessão fica em
  // cache local, e só é buscada de novo no /auth/me do próximo boot).
  const applySessionSettings = (patch: { customLogoUrl?: string | null; documentInfo?: DocumentInfo }) => {
    if (!tenant) return;
    updateSession({
      tenant: {
        ...tenant,
        settings: {
          ...tenant.settings,
          ...(patch.customLogoUrl !== undefined ? { customLogoUrl: patch.customLogoUrl ?? undefined } : {}),
          ...(patch.documentInfo ? { documentInfo: patch.documentInfo } : {}),
        },
      },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await apiClient.put('/tenant-settings', { documentInfo: info });
      setInfo({ ...emptyInfo, ...res.data.documentInfo });
      applySessionSettings({ documentInfo: res.data.documentInfo });
      setSaved(true);
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (file: File) => {
    setUploadingLogo(true);
    setLogoError(null);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      // Content-Type: undefined remove o 'application/json' padrão do
      // apiClient — sem isso o axios manda o boundary do multipart errado
      // (ou nenhum) e o Laravel não consegue ler o arquivo enviado.
      const res = await apiClient.post('/tenant-settings/logo', formData, {
        headers: { 'Content-Type': undefined },
      });
      setLogoUrl(res.data.customLogoUrl ?? null);
      applySessionSettings({ customLogoUrl: res.data.customLogoUrl ?? null });
    } catch (err: any) {
      setLogoError(
        err?.response?.data?.errors?.logo?.[0] || err?.response?.data?.message || err?.message || 'Erro ao enviar a logo.',
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Remover a logo do órgão?')) return;
    setUploadingLogo(true);
    setLogoError(null);
    try {
      const res = await apiClient.delete('/tenant-settings/logo');
      setLogoUrl(res.data.customLogoUrl ?? null);
      applySessionSettings({ customLogoUrl: null });
    } catch (err: any) {
      setLogoError(err?.response?.data?.message || err?.message || 'Erro ao remover a logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) return <ScreenState type="loading" title="Carregando configurações..." />;
  if (error) {
    return <ScreenState type="error" title="Erro ao carregar" description={error} actionLabel="Tentar novamente" onAction={load} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Settings2 className="h-6 w-6" />}
        title="Configurações"
        subtitle="Logo e dados institucionais do órgão — usados nos documentos gerados pelo sistema (PDFs, relatórios)."
      />

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Logo do Órgão</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/30">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo do órgão" className="h-full w-full object-contain" />
            ) : (
              <ImageOff className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          {podeGerenciar && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadLogo(file);
                  e.target.value = '';
                }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Upload className="h-3.5 w-3.5" />}
                  isLoading={uploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoUrl ? 'Trocar Logo' : 'Enviar Logo'}
                </Button>
                {logoUrl && (
                  <Button type="button" variant="ghost" size="icon-sm" onClick={handleRemoveLogo} disabled={uploadingLogo}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG ou WebP — até 2MB.</p>
            </div>
          )}
        </div>
        {logoError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {logoError}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Building2 className="h-4 w-4" /> Dados Institucionais
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Usados no cabeçalho dos documentos gerados (PDF do DFD, da Legislação etc.).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">CNPJ</label>
            <input
              disabled={!podeGerenciar}
              value={info.cnpj ?? ''}
              onChange={(e) => setInfo((f) => ({ ...f, cnpj: e.target.value }))}
              className={inputCls}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Telefone</label>
            <input
              disabled={!podeGerenciar}
              value={info.telefone ?? ''}
              onChange={(e) => setInfo((f) => ({ ...f, telefone: e.target.value }))}
              className={inputCls}
              placeholder="(00) 0000-0000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Endereço</label>
          <input
            disabled={!podeGerenciar}
            value={info.endereco ?? ''}
            onChange={(e) => setInfo((f) => ({ ...f, endereco: e.target.value }))}
            className={inputCls}
            placeholder="Rua, número, bairro"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Cidade</label>
            <input
              disabled={!podeGerenciar}
              value={info.cidade ?? ''}
              onChange={(e) => setInfo((f) => ({ ...f, cidade: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">UF</label>
            <input
              disabled={!podeGerenciar}
              value={info.uf ?? ''}
              maxLength={2}
              onChange={(e) => setInfo((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
              className={cn(inputCls, 'uppercase')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">CEP</label>
            <input
              disabled={!podeGerenciar}
              value={info.cep ?? ''}
              onChange={(e) => setInfo((f) => ({ ...f, cep: e.target.value }))}
              className={inputCls}
              placeholder="00000-000"
            />
          </div>
        </div>

        {saveError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {saveError}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Configurações salvas com sucesso.
          </div>
        )}

        {podeGerenciar ? (
          <div className="flex justify-end pt-2">
            <Button variant="primary" isLoading={saving} leftIcon={<Save className="h-4 w-4" />} onClick={handleSave}>
              Salvar
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Somente o administrador do órgão pode alterar estas configurações.</p>
        )}
      </Card>
    </div>
  );
};

export default ConfiguracoesPage;
