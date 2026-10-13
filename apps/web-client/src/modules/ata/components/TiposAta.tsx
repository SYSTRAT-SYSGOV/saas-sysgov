import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, Input, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { ataApi, mensagemDeErro, type TipoAta } from '../api';

/** Tipos de ata do tenant. Tipo já usado em ata é desativado em vez de excluído (o servidor decide). */
export const TiposAta: React.FC<{ avisar: Toast; aoMudar: () => void }> = ({ avisar, aoMudar }) => {
  const carga = useCarga(() => ataApi.tipos(), []);
  const [novo, setNovo] = useState('');

  const salvar = async (tipo: { id?: number; nome: string; ativo: boolean }) => {
    try {
      await ataApi.salvarTipo(tipo);
      await carga.recarregar();
      aoMudar();
    } catch (e) {
      avisar({ type: 'error', title: 'Tipo de ata', message: mensagemDeErro(e) });
    }
  };

  const excluir = async (t: TipoAta) => {
    try {
      await ataApi.excluirTipo(t.id);
      await carga.recarregar();
      aoMudar();
      avisar({ type: 'success', title: 'Tipo de ata', message: `“${t.nome}” removido (ou desativado, se já foi usado).` });
    } catch (e) {
      avisar({ type: 'error', title: 'Tipo de ata', message: mensagemDeErro(e) });
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1"><Input label="Novo tipo de ata" value={novo} onChange={(e) => setNovo(e.target.value)} maxLength={150} /></div>
          <Button disabled={!novo.trim()} onClick={() => void salvar({ nome: novo.trim(), ativo: true }).then(() => setNovo(''))}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
        </div>
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="w-28">Ativo</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
            <TableBody>
              {carga.dados.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.nome}</TableCell>
                  <TableCell><Switch checked={t.ativo} onCheckedChange={(v) => void salvar({ ...t, ativo: v })} aria-label={`Ativar ${t.nome}`} /></TableCell>
                  <TableCell><Button variant="ghost" size="sm" aria-label={`Excluir ${t.nome}`} onClick={() => void excluir(t)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
