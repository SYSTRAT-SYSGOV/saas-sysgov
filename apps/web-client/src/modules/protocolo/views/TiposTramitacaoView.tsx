import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Badge,
  Modal,
  Input,
  Select,
} from '@sysgov/ui';
import type { ProtocoloSdk } from '@sysgov/sdk';
import { protocoloApi } from '../api';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert } from 'lucide-react';

export function TiposTramitacaoView() {
  const [tipos, setTipos] = useState<ProtocoloSdk.TipoTramitacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<ProtocoloSdk.TipoTramitacao | null>(null);

  // Formulário
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [prazoDias, setPrazoDias] = useState<string>('');
  const [efeitoStatus, setEfeitoStatus] = useState<string>('');
  const [exigeParecer, setExigeParecer] = useState(false);
  const [permiteAnexo, setPermiteAnexo] = useState(true);
  const [ativo, setAtivo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarTipos = () => {
    setLoading(true);
    protocoloApi.listarTiposTramitacao()
      .then(setTipos)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarTipos();
  }, []);

  const handleOpenModal = (tipo?: ProtocoloSdk.TipoTramitacao) => {
    setErro(null);
    if (tipo) {
      setEditingTipo(tipo);
      setNome(tipo.nome);
      setSlug(tipo.slug);
      setPrazoDias(tipo.prazo_dias ? String(tipo.prazo_dias) : '');
      setEfeitoStatus(tipo.efeito_status || '');
      setExigeParecer(Boolean(tipo.exige_parecer));
      setPermiteAnexo(Boolean(tipo.permite_anexo));
      setAtivo(Boolean(tipo.ativo));
    } else {
      setEditingTipo(null);
      setNome('');
      setSlug('');
      setPrazoDias('');
      setEfeitoStatus('');
      setExigeParecer(false);
      setPermiteAnexo(true);
      setAtivo(true);
    }
    setModalOpen(true);
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      setErro('O nome do tipo de tramitação é obrigatório.');
      return;
    }

    setSubmitting(true);
    setErro(null);

    try {
      if (editingTipo) {
        await protocoloApi.atualizarTipoTramitacao(editingTipo.id, {
          nome: nome.trim(),
          prazo_dias: prazoDias ? Number(prazoDias) : null,
          efeito_status: efeitoStatus ? (efeitoStatus as ProtocoloSdk.ProcessoStatus) : null,
          exige_parecer: exigeParecer,
          permite_anexo: permiteAnexo,
          ativo,
        });
      } else {
        await protocoloApi.criarTipoTramitacao({
          nome: nome.trim(),
          slug: slug.trim() || undefined,
          prazo_dias: prazoDias ? Number(prazoDias) : null,
          efeito_status: efeitoStatus ? (efeitoStatus as ProtocoloSdk.ProcessoStatus) : null,
          exige_parecer: exigeParecer,
          permite_anexo: permiteAnexo,
          ativo,
        });
      }

      setModalOpen(false);
      carregarTipos();
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Falha ao salvar tipo de tramitação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcluir = async (id: number) => {
    if (!confirm('Deseja desativar/remover este tipo de tramitação?')) return;
    try {
      await protocoloApi.removerTipoTramitacao(id);
      carregarTipos();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Falha ao excluir tipo de tramitação.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Catálogo de Tipos de Tramitação</h3>
          <p className="text-xs text-muted-foreground">
            Defina os tipos de despachos, prazos regimentais em dias corridos e efeitos automáticos sobre o status do processo.
          </p>
        </div>
        <Button size="sm" onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Tipo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Prazo Regimental</TableHead>
                <TableHead>Efeito no Status</TableHead>
                <TableHead>Exige Parecer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tipos.map((tipo) => (
                <TableRow key={tipo.id}>
                  <TableCell className="font-semibold text-foreground">{tipo.nome}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{tipo.slug}</TableCell>
                  <TableCell className="font-mono tabular-nums text-sm">
                    {tipo.prazo_dias ? `${tipo.prazo_dias} dias` : <span className="text-muted-foreground">Sem prazo</span>}
                  </TableCell>
                  <TableCell>
                    {tipo.efeito_status ? (
                      <Badge variant="cyan">{tipo.efeito_status}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Mantém status</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {tipo.exige_parecer ? (
                      <Badge variant="warning">Sim</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Não</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tipo.ativo ? 'success' : 'neutral'}>
                      {tipo.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(tipo)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExcluir(tipo.id)}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {tipos.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    Nenhum tipo de tramitação cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Formulário */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTipo ? `Editar Tipo: ${editingTipo.nome}` : 'Cadastrar Tipo de Tramitação'}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} isLoading={submitting}>
              Salvar Tipo
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <Input
            label="Nome do Tipo *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Parecer Jurídico"
            required
          />

          {!editingTipo && (
            <Input
              label="Slug Identificador (Opcional)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Ex: parecer_juridico"
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Prazo Regimental (Dias Corridos)"
              type="number"
              value={prazoDias}
              onChange={(e) => setPrazoDias(e.target.value)}
              placeholder="Ex: 5"
            />

            <Select
              label="Efeito Automático no Status"
              value={efeitoStatus}
              onChange={setEfeitoStatus}
              options={[
                { value: '', label: 'Nenhum (Mantém status atual)' },
                { value: 'aberto', label: 'aberto' },
                { value: 'em_tramitacao', label: 'em_tramitacao' },
                { value: 'aguardando', label: 'aguardando' },
                { value: 'concluido', label: 'concluido (Finaliza processo)' },
                { value: 'arquivado', label: 'arquivado' },
              ]}
            />
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="exigeParecer"
                checked={exigeParecer}
                onChange={(e) => setExigeParecer(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="exigeParecer" className="text-sm font-medium text-foreground cursor-pointer">
                Exige parecer / despacho fundamentado obrigatório
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="ativo" className="text-sm font-medium text-foreground cursor-pointer">
                Tipo ativo para novas tramitações
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
