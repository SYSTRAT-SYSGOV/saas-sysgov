import React, { useState } from 'react';
import { Lock, Pencil, Plus, Replace, SlidersHorizontal, Trash2 } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, Select, Skeleton, StatusChip, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type ItemParametro, type TipoParametro } from '../api';
import type { PropsAba } from '../ModuloInservivelMain';

const TIPOS: { id: TipoParametro; rotulo: string; singular: string }[] = [
  { id: 'situacoes', rotulo: 'Situações', singular: 'situação' },
  { id: 'estados-conservacao', rotulo: 'Estados de conservação', singular: 'estado de conservação' },
  { id: 'categorias', rotulo: 'Categorias', singular: 'categoria' },
];

/** Parâmetros do sistema (spec: Parâmetros e situações por papel). */
export const ParametrosInservivel: React.FC<PropsAba> = ({ avisar }) => {
  const [tipo, setTipo] = useState<TipoParametro>('situacoes');
  const [versao, setVersao] = useState(0);
  const [editar, setEditar] = useState<ItemParametro | 'novo' | null>(null);
  const [excluir, setExcluir] = useState<ItemParametro | null>(null);
  const [substituir, setSubstituir] = useState(false);
  const lista = useCarga(() => inservivelApi.parametros(tipo), [tipo, versao]);
  const atual = TIPOS.find((t) => t.id === tipo) ?? TIPOS[0];
  const alterou = () => setVersao((v) => v + 1);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" />Parâmetros do sistema</CardTitle>
        <div className="flex gap-2">
          {tipo !== 'categorias' && <Button variant="outline" leftIcon={<Replace className="h-4 w-4" />} onClick={() => setSubstituir(true)}>Substituir em massa</Button>}
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditar('novo')}>Adicionar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tipo} onValueChange={(v) => setTipo(v as TipoParametro)}>
          <TabsList>{TIPOS.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.rotulo}</TabsTrigger>)}</TabsList>
          {TIPOS.map((t) => (
            <TabsContent key={t.id} value={t.id}>
              {t.id !== tipo ? null : lista.erro ? <AlertCard priority="danger" title="Não foi possível carregar" description={lista.erro} /> : !lista.dados ? <Skeleton className="h-48 w-full" /> : (
                <>
                  {tipo === 'situacoes' && <p className="mb-2 text-xs text-muted-foreground">Situações com cadeado são do sistema: podem ser renomeadas, mas não excluídas nem desativadas. As regras de lote, doação e transferência usam essas situações.</p>}
                  <Table>
                    <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="text-right">Bens</TableHead><TableHead>Ativo</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {lista.dados.itens.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="flex items-center gap-2">{i.papel && <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Situação de sistema" />}{i.nome}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{i.bens}</TableCell>
                          <TableCell><StatusChip label={i.ativo ? 'Ativo' : 'Inativo'} variant={i.ativo ? 'success' : 'neutral'} /></TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            <Button size="icon-sm" variant="ghost" aria-label={`Editar ${i.nome}`} onClick={() => setEditar(i)}><Pencil /></Button>
                            {!i.papel && <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${i.nome}`} onClick={() => setExcluir(i)}><Trash2 /></Button>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <ParametroModal tipo={tipo} singular={atual.singular} item={editar} onFechar={() => setEditar(null)} onSalvo={(n) => { setEditar(null); avisar({ type: 'success', title: 'Salvo', message: n }); alterou(); }} />
      <ConfirmarModal aberto={excluir !== null} titulo={`Excluir ${atual.singular}`} perigo rotuloConfirmar="Excluir" onFechar={() => setExcluir(null)}
        mensagem={<>Excluir <strong>{excluir?.nome}</strong>? Itens usados por bens não podem ser excluídos.</>}
        onConfirmar={async () => {
          if (!excluir) return;
          try { await inservivelApi.excluirParametro(tipo, excluir.id); alterou(); } catch (e) { avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem }); }
        }} />
      {lista.dados && tipo !== 'categorias' && (
        <SubstituirModal aberto={substituir} campo={tipo === 'situacoes' ? 'situacao' : 'estado_conservacao'} itens={lista.dados.itens} onFechar={() => setSubstituir(false)}
          onFeito={(n) => { setSubstituir(false); avisar({ type: 'success', title: 'Substituição concluída', message: `${n} bem(ns) alterado(s).` }); alterou(); }} />
      )}
    </Card>
  );
};

const ParametroModal: React.FC<{ tipo: TipoParametro; singular: string; item: ItemParametro | 'novo' | null; onFechar: () => void; onSalvo: (nome: string) => void }> = ({ tipo, singular, item, onFechar, onSalvo }) => {
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [atual, setAtual] = useState<ItemParametro | 'novo' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if (item !== atual) { setAtual(item); setNome(item && item !== 'novo' ? item.nome : ''); setAtivo(item && item !== 'novo' ? item.ativo : true); setErro(null); }
  const sistema = item !== null && item !== 'novo' && item.papel !== null;
  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSalvando(true); setErro(null);
    try { await inservivelApi.salvarParametro(tipo, item && item !== 'novo' ? item.id : null, { nome: nome.trim(), ativo }); onSalvo(nome.trim()); } catch (e) { setErro(erroApi(e).mensagem); } finally { setSalvando(false); }
  };
  return (
    <Modal open={item !== null} onClose={onFechar} title={item === 'novo' ? `Nova ${singular}` : `Editar ${singular}`} size="md"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-parametro" isLoading={salvando}>Salvar</Button></>}>
      <form id="form-parametro" onSubmit={salvar} className="space-y-3">
        <Input label="Nome *" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} />
        <label className="flex items-center gap-2 text-sm"><Switch checked={ativo} onCheckedChange={setAtivo} disabled={sistema} />Ativo{sistema && ' (situação de sistema: sempre ativa)'}</label>
        {erro && <AlertCard priority="danger" title="Não foi possível salvar" description={erro} />}
      </form>
    </Modal>
  );
};

const SubstituirModal: React.FC<{ aberto: boolean; campo: 'situacao' | 'estado_conservacao'; itens: ItemParametro[]; onFechar: () => void; onFeito: (n: number) => void }> = ({ aberto, campo, itens, onFechar, onFeito }) => {
  const [atualId, setAtualId] = useState('');
  const [novoId, setNovoId] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const opcoes = itens.filter((i) => i.papel !== 'em_lote' && i.papel !== 'em_transferencia').map((i) => ({ value: String(i.id), label: `${i.nome} (${i.bens} bens)` }));
  const fechar = () => { setAtualId(''); setNovoId(''); setErro(null); onFechar(); };
  const enviar = async () => {
    setEnviando(true); setErro(null);
    try { const r = await inservivelApi.substituir(campo, Number(atualId), Number(novoId)); setAtualId(''); setNovoId(''); onFeito(r.bens_alterados); } catch (e) { setErro(erroApi(e).mensagem); } finally { setEnviando(false); }
  };
  return (
    <Modal open={aberto} onClose={fechar} title={`Substituir ${campo === 'situacao' ? 'situação' : 'estado de conservação'} em massa`} size="md"
      footer={<><Button variant="outline" onClick={fechar} disabled={enviando}>Cancelar</Button><Button onClick={() => void enviar()} isLoading={enviando} disabled={!atualId || !novoId || atualId === novoId}>Substituir</Button></>}>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Todos os bens da prefeitura com o valor atual passam para o novo valor.</p>
        <Select label="Valor atual" value={atualId} onChange={setAtualId} options={opcoes} />
        <Select label="Novo valor" value={novoId} onChange={setNovoId} options={opcoes} />
        {erro && <AlertCard priority="danger" title="Não foi possível substituir" description={erro} />}
      </div>
    </Modal>
  );
};
