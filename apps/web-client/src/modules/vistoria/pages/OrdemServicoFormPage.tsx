import React, { useEffect, useState } from 'react';
import { Card, Button, Select, Textarea, Input } from '@sysgov/ui';
import { PageHeader, ScreenState, ValidationErrorModal } from '@/components/ui';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import { useOrgUnit } from '@/core/orgunit';
import { vistoriaApi } from '../api';
import type { LocalFiscalizavel, OrdemServico, TipoAcaoOrdemServico, CriticidadeOrdemServico } from '../api';
import { TIPO_ACAO_OPTIONS, CRITICIDADE_OPTIONS } from '../constants';

interface OrdemServicoFormPageProps {
  onBack: () => void;
  onSaved: (ordem: OrdemServico) => void;
}

interface FormState {
  local_id: number | null;
  org_unit_id: number | null;
  tipo_acao: TipoAcaoOrdemServico | '';
  criticidade: CriticidadeOrdemServico | '';
  data_prevista: string;
  roteiro_deslocamento: string;
}

const emptyForm: FormState = {
  local_id: null,
  org_unit_id: null,
  tipo_acao: '',
  criticidade: '',
  data_prevista: '',
  roteiro_deslocamento: '',
};

/**
 * Só cria (não edita) — a API ainda não expõe atualização de OrdemServico.
 * fiscal_id não é exposto: deixado em branco, o backend distribui automaticamente
 * pro fiscal de menor carga na unidade organizacional escolhida.
 */
export const OrdemServicoFormPage: React.FC<OrdemServicoFormPageProps> = ({ onBack, onSaved }) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [locais, setLocais] = useState<LocalFiscalizavel[]>([]);
  const [loadingLocais, setLoadingLocais] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);

  const { unitList, loading: loadingUnits } = useOrgUnit();

  useEffect(() => {
    let cancelado = false;
    vistoriaApi
      .listarLocais({ per_page: 200 })
      .then((res) => { if (!cancelado) setLocais(res.data.data); })
      .catch((err: unknown) => { if (!cancelado) setLoadError(getApiErrorMessage(err, 'Erro ao carregar locais fiscalizáveis.')); })
      .finally(() => { if (!cancelado) setLoadingLocais(false); });
    return () => { cancelado = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setValidationErrors(null);
    try {
      const ordem = (await vistoriaApi.criarOrdemServico({
        local_id: form.local_id as number,
        org_unit_id: form.org_unit_id as number,
        tipo_acao: form.tipo_acao as TipoAcaoOrdemServico,
        criticidade: form.criticidade || undefined,
        data_prevista: form.data_prevista,
        roteiro_deslocamento: form.roteiro_deslocamento || undefined,
      })).data;
      onSaved(ordem);
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) {
        setValidationErrors(fieldErrors);
      } else {
        setFormError(getApiErrorMessage(err, 'Erro ao criar a ordem de serviço.'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return <ScreenState type="error" title="Erro ao carregar" description={loadError} actionLabel="Voltar" onAction={onBack} />;
  }

  const localOptions = locais.map((l) => ({ value: l.id, label: l.nome }));
  const unidadeOptions = unitList.map((u) => ({ value: u.id, label: u.name }));

  const podeEnviar =
    form.local_id !== null &&
    form.org_unit_id !== null &&
    form.tipo_acao !== '' &&
    form.data_prevista.trim().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardList className="h-6 w-6" />}
        title="Nova Ordem de Serviço"
        subtitle="Planejamento de uma vistoria — o fiscal é distribuído automaticamente pela carga de trabalho na unidade"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Local Fiscalizável *</label>
              <Select
                value={form.local_id}
                onChange={(v) => setForm((f) => ({ ...f, local_id: Number(v) }))}
                options={localOptions}
                loading={loadingLocais}
                placeholder="Selecione o local..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unidade Organizacional *</label>
              <Select
                value={form.org_unit_id}
                onChange={(v) => setForm((f) => ({ ...f, org_unit_id: Number(v) }))}
                options={unidadeOptions}
                loading={loadingUnits}
                placeholder="Selecione a unidade..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de Ação *</label>
              <Select
                value={form.tipo_acao || null}
                onChange={(v) => setForm((f) => ({ ...f, tipo_acao: v as TipoAcaoOrdemServico }))}
                options={TIPO_ACAO_OPTIONS}
                placeholder="Selecione o tipo..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Criticidade</label>
              <Select
                value={form.criticidade || null}
                onChange={(v) => setForm((f) => ({ ...f, criticidade: v as CriticidadeOrdemServico }))}
                options={CRITICIDADE_OPTIONS}
                placeholder="Média (padrão)"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data Prevista *</label>
              <Input
                type="date"
                value={form.data_prevista}
                onChange={(e) => setForm((f) => ({ ...f, data_prevista: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Roteiro de Deslocamento</label>
            <Textarea
              value={form.roteiro_deslocamento}
              onChange={(e) => setForm((f) => ({ ...f, roteiro_deslocamento: e.target.value }))}
              placeholder="Observações sobre o trajeto até o local..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!podeEnviar || saving} isLoading={saving}>
              Criar Ordem de Serviço
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default OrdemServicoFormPage;
