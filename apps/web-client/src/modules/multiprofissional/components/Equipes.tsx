import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardContent, Input, Modal, Select, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { mensagemDeErro, multiApi, type Equipe, type Opcoes } from '../api';
import { SelecaoMultipla } from './Selecao';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

/** Equipes multiprofissionais: profissionais e escolas atendidas. Equipe com atendimento é desativada ao excluir. */
export const Equipes: React.FC<{ opcoes: Opcoes; avisar: Toast; aoMudar: () => void }> = ({ opcoes, avisar, aoMudar }) => {
  const carga = useCarga(() => multiApi.equipes(), []);
  const [editando, setEditando] = useState<Equipe | 'nova' | null>(null);
  const { tratarErro } = useFormValidationModal();
  const gerenciar = opcoes.permissoes.gerenciar;
  const turno = (v: string | null) => opcoes.turnos.find((t) => t.valor === v)?.rotulo ?? '—';

  const excluir = async (e: Equipe) => {
    try {
      const excluida = await multiApi.excluirEquipe(e.id);
      avisar({ type: 'success', title: 'Equipe', message: excluida ? `“${e.nome}” excluída.` : `“${e.nome}” tem atendimentos e foi desativada.` });
      await carga.recarregar();
      aoMudar();
    } catch (err) {
      if (!tratarErro(err)) avisar({ type: 'error', title: 'Equipe', message: mensagemDeErro(err) });
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {gerenciar && <div className="flex justify-end"><Button onClick={() => setEditando('nova')}><Plus className="mr-1 h-4 w-4" />Nova equipe</Button></div>}
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && carga.dados.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma equipe cadastrada.</p>}
        {carga.dados && carga.dados.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Equipe</TableHead><TableHead className="w-28">Turno</TableHead><TableHead>Profissionais</TableHead><TableHead>Escolas</TableHead>{gerenciar && <TableHead className="w-24" />}</TableRow></TableHeader>
            <TableBody>
              {carga.dados.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nome}{!e.ativo && <Badge variant="secondary" className="ml-2">Inativa</Badge>}</TableCell>
                  <TableCell>{turno(e.turno)}</TableCell>
                  <TableCell className="text-sm">{e.profissionais.map((p) => p.nome).join(', ') || '—'}</TableCell>
                  <TableCell className="text-sm">{e.escolas.map((x) => x.nome).join(', ') || '—'}</TableCell>
                  {gerenciar && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" aria-label={`Editar ${e.nome}`} onClick={() => setEditando(e)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" aria-label={`Excluir ${e.nome}`} onClick={() => void excluir(e)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {editando && (
        <EquipeModal opcoes={opcoes} equipe={editando === 'nova' ? null : editando} aoFechar={() => setEditando(null)}
          aoSalvar={() => { setEditando(null); avisar({ type: 'success', title: 'Equipe', message: 'Equipe salva.' }); void carga.recarregar(); aoMudar(); }} />
      )}
    </Card>
  );
};

const EquipeModal: React.FC<{ opcoes: Opcoes; equipe: Equipe | null; aoFechar: () => void; aoSalvar: () => void }> = ({ opcoes, equipe, aoFechar, aoSalvar }) => {
  const [nome, setNome] = useState(equipe?.nome ?? '');
  const [turno, setTurno] = useState(equipe?.turno ?? 'manha');
  const [ativo, setAtivo] = useState(equipe?.ativo ?? true);
  const [profissionais, setProfissionais] = useState<number[]>(equipe?.profissionais.map((p) => p.id) ?? []);
  const [escolas, setEscolas] = useState<number[]>(equipe?.escolas.map((e) => e.id) ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const { modal: modalValidacao, invalidar, tratarErro } = useFormValidationModal();
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!nome.trim()) return invalidar([['validação', 'Informe o nome da equipe.']]);
    setSalvando(true);
    setErro(null);
    try {
      await multiApi.salvarEquipe(equipe?.id ?? null, { nome: nome.trim(), turno, ativo, profissionais, escolas });
      aoSalvar();
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title={equipe ? 'Editar equipe' : 'Nova equipe'} size="lg"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Nome *" value={nome} maxLength={200} onChange={(e) => setNome(e.target.value)} />
          <Select label="Turno" value={turno} onChange={setTurno} options={opcoes.turnos.map((t) => ({ value: t.valor, label: t.rotulo }))} />
        </div>
        <SelecaoMultipla titulo="Profissionais" itens={opcoes.profissionais} marcados={profissionais} aoMudar={setProfissionais} vazio="Cadastre os profissionais primeiro." />
        <SelecaoMultipla titulo="Escolas atendidas" itens={opcoes.escolas} marcados={escolas} aoMudar={setEscolas} vazio="Nenhuma escola no módulo Escola." />
        <label className="flex items-center gap-2 text-sm"><Switch checked={ativo} onCheckedChange={setAtivo} aria-label="Equipe ativa" />Equipe ativa</label>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
