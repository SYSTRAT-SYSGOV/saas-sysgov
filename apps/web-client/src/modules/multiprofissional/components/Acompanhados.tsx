import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Button, Card, CardContent, Checkbox, Input, Modal, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { mensagemDeErro, multiApi, type Aluno, type Opcoes } from '../api';
import { BuscaAluno } from './Selecao';
import { FichaAcompanhado } from './FichaAcompanhado';

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
      setErro(mensagemDeErro(e));
    }
  };

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
        {carga.dados && carga.dados.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum estudante acompanhado.</p>}
        {carga.dados && carga.dados.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudante</TableHead>
                <TableHead>Escola / turma</TableHead>
                {clinico && <TableHead>Condições</TableHead>}
                <TableHead>Profissionais de referência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carga.dados.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => setFicha(a.id)}>
                  <TableCell>
                    <span className="font-medium">{a.aluno?.nome}</span>
                    {a.aluno?.cgm && <span className="block font-mono text-xs tabular-nums text-muted-foreground">CGM {a.aluno.cgm}</span>}
                    {!a.ativo && <Badge variant="secondary">Inativo</Badge>}
                  </TableCell>
                  <TableCell className="text-sm">{a.aluno?.escola}<span className="block text-xs text-muted-foreground">{a.aluno?.turma ?? 'Sem turma'}</span></TableCell>
                  {clinico && (
                    <TableCell><div className="flex flex-wrap gap-1">{(a.condicoes ?? []).map((c) => <Badge key={c.id} variant="outline"><span className="font-mono">{c.cid}</span>{c.cid ? ' ' : ''}{c.nome}</Badge>)}</div></TableCell>
                  )}
                  <TableCell className="text-sm">{a.profissionais.map((p) => p.nome).join(', ') || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
