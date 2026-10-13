import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Select } from '@sysgov/ui';
import { PessoaPicker } from '@sysgov/ui';
import { PageHeader, ScreenState, ValidationErrorModal } from '@/components/ui';
import { ArrowLeft, MapPin } from 'lucide-react';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import { usePessoaPicker } from '@/modules/pessoas/hooks';
import { vistoriaApi } from '../api';
import type { LocalFiscalizavel, TipoLocalFiscalizavel } from '../api';
import { TIPO_LOCAL_OPTIONS } from '../constants';

interface LocalFiscalizavelFormPageProps {
  /** null cria um local novo; um número carrega o local para edição. */
  localId: number | null;
  onBack: () => void;
  onSaved: (local: LocalFiscalizavel) => void;
}

interface FormState {
  proprietario_pessoa_id: number | null;
  proprietario_nome: string;
  nome: string;
  tipo: TipoLocalFiscalizavel | '';
  classificacao_atividade: string;
  latitude: string;
  longitude: string;
  endereco: string;
}

const emptyForm: FormState = {
  proprietario_pessoa_id: null,
  proprietario_nome: '',
  nome: '',
  tipo: '',
  classificacao_atividade: '',
  latitude: '',
  longitude: '',
  endereco: '',
};

export const LocalFiscalizavelFormPage: React.FC<LocalFiscalizavelFormPageProps> = ({ localId, onBack, onSaved }) => {
  const editando = localId !== null;
  const [loading, setLoading] = useState(editando);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);

  const { buscarPessoas, criarPessoaRapido } = usePessoaPicker();

  useEffect(() => {
    if (localId === null) return;
    let cancelado = false;
    setLoading(true);
    setLoadError(null);
    vistoriaApi
      .obterLocal(localId)
      .then((res) => {
        if (cancelado) return;
        const l = res.data;
        setForm({
          proprietario_pessoa_id: l.proprietario_pessoa_id,
          proprietario_nome: l.proprietario?.nome ?? '',
          nome: l.nome,
          tipo: l.tipo,
          classificacao_atividade: l.classificacao_atividade ?? '',
          latitude: String(l.latitude),
          longitude: String(l.longitude),
          endereco: l.endereco ?? '',
        });
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setLoadError(getApiErrorMessage(err, 'Erro ao carregar o local fiscalizável.'));
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [localId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setValidationErrors(null);
    try {
      const payload = {
        proprietario_pessoa_id: form.proprietario_pessoa_id as number,
        nome: form.nome,
        tipo: form.tipo as TipoLocalFiscalizavel,
        classificacao_atividade: form.classificacao_atividade || null,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        endereco: form.endereco || null,
      };
      const local = editando
        ? (await vistoriaApi.atualizarLocal(localId, payload)).data
        : (await vistoriaApi.criarLocal(payload)).data;
      onSaved(local);
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setFormError(getApiErrorMessage(err, 'Erro ao salvar o local fiscalizável.'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ScreenState type="loading" title="Carregando local fiscalizável..." />;
  if (loadError) {
    return <ScreenState type="error" title="Erro ao carregar" description={loadError} actionLabel="Voltar" onAction={onBack} />;
  }

  const podeEnviar =
    form.proprietario_pessoa_id !== null &&
    form.nome.trim().length > 0 &&
    form.tipo !== '' &&
    form.latitude.trim().length > 0 &&
    form.longitude.trim().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MapPin className="h-6 w-6" />}
        title={editando ? `Editar ${form.nome}` : 'Novo Local Fiscalizável'}
        subtitle="Cadastro de propriedades, estabelecimentos e eventos sujeitos à fiscalização de campo"
        actions={
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Voltar
          </Button>
        }
      />

      <ValidationErrorModal
        open={validationErrors !== null}
        onClose={() => setValidationErrors(null)}
        errors={validationErrors ?? []}
      />

      <Card className="p-6 space-y-5">
        {formError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Proprietário *</label>
            <PessoaPicker
              value={form.proprietario_pessoa_id}
              selectedPessoa={
                form.proprietario_pessoa_id
                  ? { id: form.proprietario_pessoa_id, nome: form.proprietario_nome, cpf_mascarado: '' }
                  : null
              }
              onChange={(id, pessoa) =>
                setForm((f) => ({
                  ...f,
                  proprietario_pessoa_id: id,
                  proprietario_nome: pessoa?.nome ?? f.proprietario_nome,
                }))
              }
              onSearch={buscarPessoas}
              onCreatePessoa={criarPessoaRapido}
              placeholder="Buscar proprietário no Cadastro Único..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome do Local *</label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Fazenda Boa Vista"
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo *</label>
              <Select
                value={form.tipo || null}
                onChange={(v) => setForm((f) => ({ ...f, tipo: v as TipoLocalFiscalizavel }))}
                options={TIPO_LOCAL_OPTIONS}
                placeholder="Selecione o tipo..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Classificação da Atividade</label>
            <Input
              value={form.classificacao_atividade}
              onChange={(e) => setForm((f) => ({ ...f, classificacao_atividade: e.target.value }))}
              placeholder="Ex.: producao_animal"
              maxLength={60}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Endereço</label>
            <Input
              value={form.endereco}
              onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
              placeholder="Endereço do local"
              maxLength={255}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Latitude *</label>
              <Input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                placeholder="-25.4284"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Longitude *</label>
              <Input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                placeholder="-49.2733"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!podeEnviar || saving} isLoading={saving}>
              {editando ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default LocalFiscalizavelFormPage;
