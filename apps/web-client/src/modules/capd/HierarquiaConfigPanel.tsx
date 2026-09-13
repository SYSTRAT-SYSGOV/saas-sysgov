import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, Button, Badge, Input, Select, Switch, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@sysgov/ui';
import { Field, EmptyState } from '@/components/ui';
import { Network, Plus, RefreshCw, Trash2, Crown } from 'lucide-react';
import { SysgovApi } from '@sysgov/sdk';
import type { ApiNivelHierarquia } from '@sysgov/sdk';

const api = new SysgovApi();

const REGRAS = [
  { value: 'superior_hierarquico', label: 'Superior Hierárquico (sobe a árvore)' },
  { value: 'substituto_legal', label: 'Substituto Legal (formalmente designado)' },
];

type FormState = {
  nivel: number;
  nome: string;
  cargo_referencia: string;
  regra_substituicao: 'substituto_legal' | 'superior_hierarquico';
  is_topo: boolean;
  avaliador_topo_user_id: string;
  avaliador_topo_role: string;
};

const ESTADO_INICIAL: FormState = {
  nivel: 0,
  nome: '',
  cargo_referencia: '',
  regra_substituicao: 'superior_hierarquico',
  is_topo: false,
  avaliador_topo_user_id: '',
  avaliador_topo_role: '',
};

export const HierarquiaConfigPanel: React.FC = () => {
  const [niveis, setNiveis] = useState<ApiNivelHierarquia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(ESTADO_INICIAL);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.capd.listNiveisHierarquia();
      setNiveis(data.sort((a, b) => a.nivel - b.nivel));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(ESTADO_INICIAL);
    setErro(null);
    setModalAberto(true);
  };

  const abrirEdicao = (nivel: ApiNivelHierarquia) => {
    setEditandoId(nivel.id);
    setForm({
      nivel: nivel.nivel,
      nome: nivel.nome,
      cargo_referencia: nivel.cargo_referencia ?? '',
      regra_substituicao: nivel.regra_substituicao,
      is_topo: nivel.is_topo,
      avaliador_topo_user_id: nivel.avaliador_topo_user_id ? String(nivel.avaliador_topo_user_id) : '',
      avaliador_topo_role: nivel.avaliador_topo_role ?? '',
    });
    setErro(null);
    setModalAberto(true);
  };

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const payload = {
        nivel: form.nivel,
        nome: form.nome,
        cargo_referencia: form.cargo_referencia || null,
        regra_substituicao: form.regra_substituicao,
        is_topo: form.is_topo,
        avaliador_topo_user_id: form.avaliador_topo_user_id ? Number(form.avaliador_topo_user_id) : null,
        avaliador_topo_role: form.avaliador_topo_role || null,
      };

      if (editandoId) {
        await api.capd.updateNivelHierarquia(editandoId, payload);
      } else {
        await api.capd.createNivelHierarquia(payload);
      }

      setModalAberto(false);
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar o nível hierárquico.');
    } finally {
      setSalvando(false);
    }
  };

  const desativar = async (id: number) => {
    if (!window.confirm('Desativar este nível hierárquico?')) return;
    await api.capd.deleteNivelHierarquia(id);
    await carregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Níveis Hierárquicos de Avaliação</h3>
          <p className="text-xs text-muted-foreground">
            Define quantos níveis a resolução do avaliador sobe na árvore organizacional e quem avalia o topo da hierarquia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Nível
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs">Nível</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Regra de Substituição</TableHead>
                <TableHead>Topo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {niveis.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12">
                    <EmptyState
                      icon={<Network className="h-8 w-8 text-muted-foreground" />}
                      title="Nenhum nível hierárquico configurado"
                      description="Cadastre ao menos um nível para permitir a resolução automática do avaliador."
                    />
                  </TableCell>
                </TableRow>
              )}
              {niveis.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-mono tabular-nums text-xs">{n.nivel}</TableCell>
                  <TableCell>
                    <div className="font-medium">{n.nome}</div>
                    {n.cargo_referencia && <div className="text-xs text-muted-foreground">{n.cargo_referencia}</div>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {REGRAS.find((r) => r.value === n.regra_substituicao)?.label ?? n.regra_substituicao}
                  </TableCell>
                  <TableCell>
                    {n.is_topo && (
                      <Badge variant="secondary">
                        <Crown className="h-3 w-3 mr-1" /> Topo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={n.ativo ? 'default' : 'outline'}>{n.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(n)}>Editar</Button>
                    {n.ativo && (
                      <Button variant="ghost" size="sm" onClick={() => desativar(n.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {modalAberto && (
        <Modal
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          title={editandoId ? 'Editar Nível Hierárquico' : 'Novo Nível Hierárquico'}
          size="md"
        >
          <div className="space-y-4">
            {erro && <div className="text-sm text-destructive">{erro}</div>}

            <Field label="Nível (0 = mais próximo do servidor)">
              <Input
                type="number"
                min={0}
                value={form.nivel}
                onChange={(e) => setForm({ ...form, nivel: Number(e.target.value) })}
              />
            </Field>

            <Field label="Nome">
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Departamento" />
            </Field>

            <Field label="Cargo de referência (opcional, apenas informativo)">
              <Input
                value={form.cargo_referencia}
                onChange={(e) => setForm({ ...form, cargo_referencia: e.target.value })}
                placeholder="Ex.: Chefe de Departamento"
              />
            </Field>

            <Field label="Regra de Substituição em Afastamentos">
              <Select
                value={form.regra_substituicao}
                onChange={(val) => setForm({ ...form, regra_substituicao: val as FormState['regra_substituicao'] })}
                options={REGRAS}
              />
            </Field>

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <div className="text-sm font-medium">Nível Topo da Hierarquia</div>
                <div className="text-xs text-muted-foreground">Quem avalia o gestor máximo do órgão, quando não há superior acima.</div>
              </div>
              <Switch checked={form.is_topo} onCheckedChange={(checked) => setForm({ ...form, is_topo: checked })} />
            </div>

            {form.is_topo && (
              <>
                <Field label="ID do usuário avaliador do topo (opcional)">
                  <Input
                    type="number"
                    value={form.avaliador_topo_user_id}
                    onChange={(e) => setForm({ ...form, avaliador_topo_user_id: e.target.value })}
                    placeholder="Ex.: 42"
                  />
                </Field>
                <Field label="Ou papel/role RBAC responsável pelo topo (opcional)">
                  <Input
                    value={form.avaliador_topo_role}
                    onChange={(e) => setForm({ ...form, avaliador_topo_role: e.target.value })}
                    placeholder="Ex.: controladoria"
                  />
                </Field>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button onClick={salvar} disabled={salvando || !form.nome}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
