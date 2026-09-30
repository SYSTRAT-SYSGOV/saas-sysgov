import React, { useState, useCallback } from 'react';
import { Button, StatusChip, Modal, Input, Field, Switch } from '@/components/ui';
import { Trash2, Edit3, Save, X, Plus } from 'lucide-react';
import type { SucessaoHerdeiro, HerdeiroInput, Parentesco } from '../api';
import { useSucessaoHerdeiros } from '../hooks/useSucessaoHerdeiros';
import { ErroBox } from '../views/comum';
import { PARENTECO_LABELS } from './sucessao.utils';
import { useAcao } from '../views/comum';
import { Mono } from '../views/comum';
import { PessoaPicker } from '@sysgov/ui';
import { usePessoaPicker } from '@/modules/pessoas/hooks';
import { pessoasApi } from '@/modules/pessoas/api';

interface HerdeirosTableProps {
  sucessaoId: number;
  readonly?: boolean;
}

const PARENTESCO_OPTIONS: { value: Parentesco; label: string }[] = [
  { value: 'companheiro', label: 'Cônjuge/Companheiro' },
  { value: 'filho', label: 'Filho(a)' },
  { value: 'pai', label: 'Pai' },
  { value: 'mae', label: 'Mãe' },
  { value: 'irmao', label: 'Irmão/Irmã' },
  { value: 'neto', label: 'Neto(a)' },
  { value: 'avo', label: 'Avô(óvia)' },
  { value: 'tio', label: 'Tio(a)' },
  { value: 'sobrinho', label: 'Sobrinho(a)' },
  { value: 'outro', label: 'Outro' },
  { value: 'representante', label: 'Representante Legal' },
];

export const HerdeirosTable: React.FC<HerdeirosTableProps> = ({ sucessaoId, readonly = false }) => {
  const { herdeiros, carregando, erro, carregar, salvar, remover } = useSucessaoHerdeiros(sucessaoId);
  const { executar } = useAcao();
  const { buscarPessoas, criarPessoaRapido } = usePessoaPicker();

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<SucessaoHerdeiro | null>(null);
  const [form, setForm] = useState<Partial<HerdeiroInput>>({});

  React.useEffect(() => {
    void carregar();
  }, [sucessaoId, carregar]);

  const abrirNovo = () => {
    setEditando(null);
    setForm({
      ordem: herdeiros.length + 1,
      parentesco: 'filho',
      titular_indicado: herdeiros.length === 0,
      direito_representacao: false,
    });
    setModalAberto(true);
  };

  const iniciarEdicao = (h: SucessaoHerdeiro) => {
    setEditando(h);
    setForm({
      pessoa_id: h.pessoa_id,
      nome: h.nome,
      parentesco: h.parentesco,
      documento: h.documento,
      ordem: h.ordem,
      direito_representacao: h.direito_representacao,
      titular_indicado: h.titular_indicado,
      herdeiro_representado_id: h.herdeiro_representado_id ?? undefined,
    });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
    setForm({});
  };

  const salvarHerdeiro = useCallback(async () => {
    if (!form.nome || !form.parentesco) return;

    let todos: HerdeiroInput[];
    if (editando) {
      todos = herdeiros.map((h) =>
        h.id === editando.id
          ? {
              pessoa_id: form.pessoa_id ?? h.pessoa_id,
              nome: form.nome ?? h.nome,
              parentesco: (form.parentesco ?? h.parentesco) as Parentesco,
              documento: form.documento ?? h.documento,
              ordem: form.ordem ?? h.ordem,
              direito_representacao: form.direito_representacao ?? h.direito_representacao,
              titular_indicado: form.titular_indicado ?? h.titular_indicado,
              herdeiro_representado_id: form.herdeiro_representado_id ?? h.herdeiro_representado_id,
            }
          : {
              pessoa_id: h.pessoa_id,
              nome: h.nome,
              parentesco: h.parentesco,
              documento: h.documento,
              ordem: h.ordem,
              direito_representacao: h.direito_representacao,
              titular_indicado: h.titular_indicado,
              herdeiro_representado_id: h.herdeiro_representado_id,
            }
      );
    } else {
      const novo: HerdeiroInput = {
        pessoa_id: form.pessoa_id,
        nome: form.nome,
        parentesco: form.parentesco as Parentesco,
        documento: form.documento,
        ordem: form.ordem ?? (herdeiros.length + 1),
        direito_representacao: form.direito_representacao ?? false,
        titular_indicado: form.titular_indicado ?? false,
        herdeiro_representado_id: form.herdeiro_representado_id,
      };
      todos = [
        ...herdeiros.map((h) => ({
          pessoa_id: h.pessoa_id,
          nome: h.nome,
          parentesco: h.parentesco,
          documento: h.documento,
          ordem: h.ordem,
          direito_representacao: h.direito_representacao,
          titular_indicado: h.titular_indicado,
          herdeiro_representado_id: h.herdeiro_representado_id,
        })),
        novo,
      ];
    }

    await executar(async () => salvar({ herdeiros: todos }));
    fecharModal();
    await carregar();
  }, [form, editando, herdeiros, executar, salvar, carregar]);

  const removerHerdeiro = useCallback(
    async (h: SucessaoHerdeiro) => {
      if (!confirm(`Remover ${h.nome} da lista de herdeiros?`)) return;
      await executar(async () => remover(h.id));
    },
    [remover, executar]
  );

  return (
    <div className="space-y-4">
      <ErroBox erro={erro} />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Herdeiros Qualificados</h3>
          <span className="text-xs text-muted-foreground font-mono">
            {herdeiros.length} {herdeiros.length === 1 ? 'herdeiro' : 'herdeiros'}
          </span>
        </div>
        {!readonly && (
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Herdeiro
          </Button>
        )}
      </div>

      {carregando ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Carregando herdeiros…</div>
      ) : herdeiros.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhum herdeiro qualificado neste processo.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Parentesco</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Documento</th>
                <th className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Ordem</th>
                <th className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Titular Indicado</th>
                <th className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {herdeiros
                .slice()
                .sort((a, b) => a.ordem - b.ordem)
                .map((h) => (
                  <tr key={h.id} className={h.titular_indicado ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{h.nome}</span>
                        {h.pessoa_id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gov-primary/10 text-gov-primary font-medium">
                            Cadastro Central
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {PARENTECO_LABELS[h.parentesco as keyof typeof PARENTECO_LABELS] ?? h.parentesco}
                    </td>
                    <td className="px-4 py-3">
                      <Mono className="text-xs">{h.documento ?? '—'}</Mono>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Mono className="tabular-nums">{h.ordem}</Mono>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {h.titular_indicado ? (
                        <StatusChip label="Titular" variant="success" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!readonly && (
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => iniciarEdicao(h)}
                            className="text-xs text-primary hover:text-primary/80"
                            title="Editar"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removerHerdeiro(h)}
                            className="text-xs text-rose-600 hover:text-rose-700"
                            title="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <Modal
          open={modalAberto}
          onClose={fecharModal}
          title={editando ? 'Editar Herdeiro' : 'Adicionar Herdeiro'}
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={fecharModal}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={salvarHerdeiro} disabled={!form.nome || !form.parentesco}>
                <Save className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Field
              label="Vincular Munícipe (Cadastro Central)"
              hint="Opcional. Selecione o munícipe para preencher automaticamente o nome e o documento."
            >
              <PessoaPicker
                value={form.pessoa_id ?? null}
                onChange={async (id, pessoaOption) => {
                  setForm((prev) => ({
                    ...prev,
                    pessoa_id: id ?? undefined,
                    nome: pessoaOption?.nome || prev.nome,
                    documento: pessoaOption?.cpf_mascarado || prev.documento,
                  }));

                  if (id) {
                    try {
                      const detalhes = await pessoasApi.obter(id);
                      if (detalhes) {
                        setForm((prev) => ({
                          ...prev,
                          pessoa_id: id,
                          nome: detalhes.nome || prev.nome,
                          documento: detalhes.cpf_mascarado || prev.documento,
                        }));
                      }
                    } catch (e) {
                      console.warn('Não foi possível obter detalhes da pessoa:', e);
                    }
                  }
                }}
                onSearch={buscarPessoas}
                onCreatePessoa={criarPessoaRapido}
                placeholder="Buscar munícipe por nome ou CPF no cadastro geral..."
              />
            </Field>

            <Field label="Nome Completo" required>
              <Input
                value={form.nome ?? ''}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do herdeiro"
              />
            </Field>

            <Field label="Parentesco" required>
              <select
                value={form.parentesco ?? ''}
                onChange={(e) => setForm({ ...form, parentesco: e.target.value as Parentesco })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione…</option>
                {PARENTESCO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Documento (CPF)">
              <Input
                value={form.documento ?? ''}
                onChange={(e) => setForm({ ...form, documento: e.target.value || undefined })}
                placeholder="000.000.000-00"
                className="font-mono"
              />
            </Field>

            <Field label="Ordem de Prioridade">
              <Input
                type="number"
                value={form.ordem ?? ''}
                onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
                className="font-mono tabular-nums"
              />
            </Field>

            <div className="flex items-center gap-6">
              <Field label="Titular Indicado">
                <Switch
                  checked={form.titular_indicado ?? false}
                  onCheckedChange={(v) => setForm({ ...form, titular_indicado: v })}
                />
              </Field>
              <Field label="Direito de Representação">
                <Switch
                  checked={form.direito_representacao ?? false}
                  onCheckedChange={(v) => setForm({ ...form, direito_representacao: v })}
                />
              </Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HerdeirosTable;
