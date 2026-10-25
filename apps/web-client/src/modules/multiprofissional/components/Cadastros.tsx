import React, { useState } from 'react';
import { ListPlus, Plus, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { mensagemDeErro, multiApi, type ItemCadastro, type TipoCadastro } from '../api';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

const TITULOS: Record<TipoCadastro, string> = { cargos: 'Cargos', condicoes: 'Condições (CID)', 'tipos-atendimento': 'Tipos de atendimento' };

/** Cadastros simples. Item em uso é desativado em vez de excluído (o servidor decide). */
export const Cadastros: React.FC<{ avisar: Toast; aoMudar: () => void }> = ({ avisar, aoMudar }) => {
  const [versao, setVersao] = useState(0);

  const padroes = async () => {
    try {
      const r = await multiApi.carregarPadroes();
      avisar({ type: 'success', title: 'Itens padrão', message: `${r.cargos} cargo(s) e ${r.tipos} tipo(s) de atendimento criados.` });
      setVersao((v) => v + 1);
      aoMudar();
    } catch (e) {
      avisar({ type: 'error', title: 'Itens padrão', message: mensagemDeErro(e) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="outline" onClick={() => void padroes()}><ListPlus className="mr-1 h-4 w-4" />Carregar itens padrão</Button></div>
      <div className="grid gap-4 xl:grid-cols-3">
        {(Object.keys(TITULOS) as TipoCadastro[]).map((t) => <ListaCadastro key={`${t}-${versao}`} tipo={t} avisar={avisar} aoMudar={aoMudar} />)}
      </div>
    </div>
  );
};

const ListaCadastro: React.FC<{ tipo: TipoCadastro; avisar: Toast; aoMudar: () => void }> = ({ tipo, avisar, aoMudar }) => {
  const carga = useCarga(() => multiApi.cadastro(tipo), [tipo]);
  const [nome, setNome] = useState('');
  const { tratarErro } = useFormValidationModal();
  const [extra, setExtra] = useState('');
  const campoExtra = tipo === 'cargos' ? 'objetivos' : tipo === 'condicoes' ? 'cid' : null;

  const salvar = async (item: Partial<ItemCadastro> & { nome: string }) => {
    try {
      await multiApi.salvarCadastro(tipo, item);
      await carga.recarregar();
      aoMudar();
      return true;
    } catch (e) {
      if (!tratarErro(e)) avisar({ type: 'error', title: TITULOS[tipo], message: mensagemDeErro(e) });
      return false;
    }
  };

  const adicionar = async () => {
    const ok = await salvar({ nome: nome.trim(), ativo: true, ...(campoExtra ? { [campoExtra]: extra.trim() || null } : {}) });
    if (ok) { setNome(''); setExtra(''); }
  };

  const excluir = async (i: ItemCadastro) => {
    try {
      const excluido = await multiApi.excluirCadastro(tipo, i.id);
      avisar({ type: 'success', title: TITULOS[tipo], message: excluido ? `“${i.nome}” excluído.` : `“${i.nome}” está em uso e foi desativado.` });
      await carga.recarregar();
      aoMudar();
    } catch (e) {
      if (!tratarErro(e)) avisar({ type: 'error', title: TITULOS[tipo], message: mensagemDeErro(e) });
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{TITULOS[tipo]}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          {tipo === 'condicoes' && <div className="w-24"><Input label="CID" value={extra} maxLength={20} className="font-mono" onChange={(e) => setExtra(e.target.value)} /></div>}
          <div className="flex-1"><Input label="Novo item" value={nome} maxLength={tipo === 'condicoes' ? 200 : 150} onChange={(e) => setNome(e.target.value)} /></div>
          <Button disabled={!nome.trim()} aria-label={`Adicionar em ${TITULOS[tipo]}`} onClick={() => void adicionar()}><Plus className="h-4 w-4" /></Button>
        </div>
        {tipo === 'cargos' && <Input placeholder="Objetivos do cargo (opcional)" aria-label="Objetivos do cargo" value={extra} maxLength={300} onChange={(e) => setExtra(e.target.value)} />}
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="w-16">Ativo</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
            <TableBody>
              {carga.dados.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    {tipo === 'condicoes' && i.cid && <span className="mr-2 font-mono text-xs tabular-nums">{i.cid}</span>}{i.nome}
                    {i.objetivos && <span className="block text-xs text-muted-foreground">{i.objetivos}</span>}
                  </TableCell>
                  <TableCell><Switch checked={i.ativo} onCheckedChange={(v) => void salvar({ ...i, ativo: v })} aria-label={`Ativar ${i.nome}`} /></TableCell>
                  <TableCell><Button variant="ghost" size="sm" aria-label={`Excluir ${i.nome}`} onClick={() => void excluir(i)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
