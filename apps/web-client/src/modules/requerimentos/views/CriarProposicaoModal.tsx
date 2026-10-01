import React, { useState } from 'react';
import { Modal, Button, Input, Select, Textarea, Switch } from '@sysgov/ui';
import type { SelectOption } from '@sysgov/ui';
import { FileText, Send, AlertCircle } from 'lucide-react';
import { requerimentosApi } from '../api';
import type { TipoInstrumento } from '../api';

interface CriarProposicaoModalProps {
  tipos: TipoInstrumento[];
  onClose: () => void;
  onCreated: () => void;
}

export const CriarProposicaoModal: React.FC<CriarProposicaoModalProps> = ({ tipos, onClose, onCreated }) => {
  const [tipoSlug, setTipoSlug] = useState('');
  const [ementa, setEmenta] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [areaTematica, setAreaTematica] = useState('');
  const [dispositivosLegais, setDispositivosLegais] = useState('');
  const [poderOrigem, setPoderOrigem] = useState<'camara' | 'prefeitura'>('camara');
  const [partidoBancada, setPartidoBancada] = useState('');
  const [visibilidadePublica, setVisibilidadePublica] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tipoSelecionado = tipos.find((t) => t.slug === tipoSlug);

  const handleSubmit = async () => {
    if (!tipoSlug || !ementa) {
      setError('Selecione o tipo e informe a ementa.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await requerimentosApi.criarProposicao({
        tipo_slug: tipoSlug,
        ementa,
        justificativa: justificativa || undefined,
        conteudo: conteudo || undefined,
        area_tematica: areaTematica || undefined,
        dispositivos_legais: dispositivosLegais || undefined,
        poder_origem: poderOrigem,
        partido_bancada: partidoBancada || undefined,
        visibilidade_publica: visibilidadePublica,
      });
      onCreated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar proposição';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const tipoOptions: SelectOption[] = tipos
    .filter((t) => t.ativo)
    .map((t) => ({ value: t.slug, label: t.nome }));

  const podeEnviar = tipoSlug && ementa.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      icon={<FileText className="h-5 w-5" />}
      title="Nova Proposição"
      description="Preencha os dados para protocolar uma nova proposição legislativa."
    >
      <div className="space-y-5">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de Instrumento *</label>
              <Select
                value={tipoSlug}
                onChange={(val) => {
                  setTipoSlug(val);
                  if (val) {
                    const tipo = tipos.find((t) => t.slug === val);
                    if (tipo) setPoderOrigem(tipo.poder_origem);
                  }
                }}
                options={tipoOptions}
                placeholder="Selecione o tipo..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Poder de Origem</label>
              <Select
                value={poderOrigem}
                onChange={(val) => setPoderOrigem(val as 'camara' | 'prefeitura')}
                options={[
                  { value: 'camara', label: 'Câmara Municipal' },
                  { value: 'prefeitura', label: 'Prefeitura Municipal' },
                ]}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Ementa *</label>
            <Input
              value={ementa}
              onChange={(e) => setEmenta(e.target.value)}
              placeholder="Resumo da proposição (até 500 caracteres)"
              maxLength={500}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Justificativa</label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Justificativa da proposição..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Conteúdo / Texto Integral</label>
            <Textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Texto integral da proposição (ex.: artigo 1º, artigo 2º...)"
              rows={6}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Área Temática</label>
              <Input
                value={areaTematica}
                onChange={(e) => setAreaTematica(e.target.value)}
                placeholder="Ex.: saúde, educação..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Dispositivos Legais</label>
              <Input
                value={dispositivosLegais}
                onChange={(e) => setDispositivosLegais(e.target.value)}
                placeholder="Leis correlatas..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Partido / Bancada</label>
              <Input
                value={partidoBancada}
                onChange={(e) => setPartidoBancada(e.target.value)}
                placeholder="Ex.: Bancada da Saúde"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={visibilidadePublica}
              onCheckedChange={setVisibilidadePublica}
            />
            <label className="text-sm">Visibilidade pública (Portal da Transparência)</label>
          </div>

          {tipoSelecionado?.prazo_regimental_dias && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Prazo regimental para este tipo: {tipoSelecionado.prazo_regimental_dias} dias
            </p>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!podeEnviar || saving} loading={saving}>
            <Send className="h-4 w-4 mr-2" />
            Protocolar
          </Button>
        </div>
      </div>
    </Modal>
  );
};