import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, Plus } from 'lucide-react';
import { ActionsMenu, Badge, Button, Card, CardContent, Checkbox, DataTable, Input, Modal, Select } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { mensagemDeErro, multiApi, type Acompanhado, type Aluno, type Opcoes } from '../api';
import { BuscaAluno } from './Selecao';
import { FichaAcompanhado } from './FichaAcompanhado';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

const textoCondicoes = (a: Acompanhado) => (a.condicoes ?? []).map((c) => `${c.cid ?? ''} ${c.nome}`.trim()).join('; ');

/** Só entra na grade para quem tem acesso clínico (D7). */
const colCondicoes: ColumnDef<Acompanhado, unknown> = {
  id: 'condicoes',
  header: 'Condições',
  accessorFn: textoCondicoes,
  cell: ({ row }) => (
    <div className="flex flex-wrap gap-1">{(row.original.condicoes ?? []).map((c) => <Badge key={c.id} variant="outline"><span className="font-mono">{c.cid}</span>{c.cid ? ' ' : ''}{c.nome}</Badge>)}</div>
  ),
  meta: { exportHeader: 'Condições', exportValue: textoCondicoes },
};

/** Estudantes acompanhados. Coluna de condições só aparece para quem acompanha (D7). */
export const Acompanhados: React.FC<{ opcoes: Opcoes; avisar: Toast }> = ({ opcoes, avisar }) => {
  const [filtros, setFiltros] = useState({ q: '', escola_id: 0, condicao_id: 0, ativos: true });
  const carga = useCarga(
    () => multiApi.acompanhados({ q: filtros.q || undefined, escola_id: filtros.escola_id || undefined, condicao_id: filtros.condicao_id || undefined, ativos: filtros.ativos }),
    [JSON.stringify(filtros)],
  );
  const [ficha, setFicha] = useState<number | null>(null);
  const [novo, setNovo] = useState(false);
  const [escolhido, setEscolhido] = useState<Aluno | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { tratarErro } = useFormValidationModal();
  const clinico = opcoes.permissoes.acompanhar;

  const criar = async () => {
    if (!escolhido) return;
    setErro(null);
    try {
      const { id } = await multiApi.salvarAcompanhado(null, { aluno_id: escolhido.id });
      setNovo(false);
      setEscolhido(null);
      await carga.recarregar();
      setFicha(id);
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    }
  };

  // `clinico` é fixo na sessão; setFicha é estável.
  const colunas = useMemo<ColumnDef<Acompanhado, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel={`Ações de ${row.original.aluno?.nome ?? 'estudante'}`}
            items={[{ key: 'ficha', label: 'Abrir ficha', icon: <FileText className="h-3.5 w-3.5" />, onSelect: () => setFicha(row.original.id) }]}
          />
        </div>
      ),
    },
    {
      id: 'estudante',
      header: 'Estudante',
      accessorFn: (a) => a.aluno?.nome ?? '',
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.aluno?.nome}</span>
          {row.original.aluno?.cgm && <span className="block font-mono text-xs tabular-nums text-muted-foreground">CGM {row.original.aluno.cgm}</span>}
          {!row.original.ativo && <Badge variant="secondary">Inativo</Badge>}
        </div>
      ),
      meta: { exportHeader: 'Estudante', exportValue: (a) => a.aluno?.nome ?? '' },
    },
    {
      id: 'escola',
      header: 'Escola / turma',
      accessorFn: (a) => `${a.aluno?.escola ?? ''} ${a.aluno?.turma ?? ''}`.trim(),
      cell: ({ row }) => <span className="text-sm">{row.original.aluno?.escola}<span className="block text-xs text-muted-foreground">{row.original.aluno?.turma ?? 'Sem turma'}</span></span>,
      meta: { exportHeader: 'Escola / turma', exportValue: (a) => `${a.aluno?.escola ?? ''} — ${a.aluno?.turma ?? 'Sem turma'}` },
    },
    ...(clinico ? [colCondicoes] : []),
    {
      id: 'profissionais',
      header: 'Profissionais de referência',
      accessorFn: (a) => a.profissionais.map((p) => p.nome).join(', ') || '—',
      cell: ({ row }) => <span className="text-sm">{row.original.profissionais.map((p) => p.nome).join(', ') || '—'}</span>,
      meta: { exportHeader: 'Profissionais de referência', exportValue: (a) => a.profissionais.map((p) => p.nome).join(', ') },
    },
  ], [clinico]);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64"><Input label="Estudante (nome ou CGM)" value={filtros.q} onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))} /></div>
          <div className="w-56"><Select label="Escola" value={filtros.escola_id} onChange={(v) => setFiltros((f) => ({ ...f, escola_id: Number(v) }))}
            options={[{ value: 0, label: 'Todas' }, ...opcoes.escolas.map((e) => ({ value: e.id, label: e.nome }))]} /></div>
          {clinico && (
            <div className="w-64"><Select label="Condição" value={filtros.condicao_id} onChange={(v) => setFiltros((f) => ({ ...f, condicao_id: Number(v) }))}
              options={[{ value: 0, label: 'Todas' }, ...opcoes.condicoes.map((c) => ({ value: c.id, label: c.cid ? `${c.cid} — ${c.nome}` : c.nome }))]} /></div>
          )}
          <div className="pb-2"><Checkbox label="Só ativos" checked={filtros.ativos} onCheckedChange={(v) => setFiltros((f) => ({ ...f, ativos: v === true }))} /></div>
          {clinico && <Button className="ml-auto" onClick={() => setNovo(true)}><Plus className="mr-1 h-4 w-4" />Novo acompanhamento</Button>}
        </div>

        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <DataTable
            columns={colunas}
            data={carga.dados}
            emptyText="Nenhum estudante acompanhado."
            onRowClick={(a) => setFicha(a.id)}
            exportable
            exportFileName="multiprofissional-acompanhados"
            exportTitle="Multiprofissional — Estudantes acompanhados"
          />
        )}
      </CardContent>

      {novo && (
        <Modal open onClose={() => setNovo(false)} title="Novo acompanhamento" size="md"
          footer={<><Button variant="outline" onClick={() => setNovo(false)}>Cancelar</Button><Button disabled={!escolhido} onClick={() => void criar()}>Criar e abrir a ficha</Button></>}>
          <div className="space-y-3">
            <BuscaAluno aoEscolher={setEscolhido} />
            {escolhido && <p className="rounded-md border p-3 text-sm"><span className="font-medium">{escolhido.nome}</span> — {escolhido.escola}{escolhido.turma ? `, ${escolhido.turma}` : ''}</p>}
            <p className="text-xs text-muted-foreground">O estudante precisa estar cadastrado no módulo Escola.</p>
            {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
          </div>
        </Modal>
      )}
      {ficha && <FichaAcompanhado id={ficha} opcoes={opcoes} avisar={avisar} aoFechar={() => setFicha(null)} aoMudar={() => void carga.recarregar()} />}
    </Card>
  );
};
