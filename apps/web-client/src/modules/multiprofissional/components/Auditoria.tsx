import React, { useState } from 'react';
import { Button, Card, CardContent, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { multiApi } from '../api';

export const ACOES: Record<string, string> = {
  'atendimento.registrado': 'Registrou atendimento',
  'atendimento.alterado': 'Alterou atendimento',
  'atendimento.excluido': 'Excluiu atendimento',
  'acompanhado.criado': 'Iniciou acompanhamento',
  'acompanhado.alterado': 'Alterou a ficha do acompanhado',
  'laudo.anexado': 'Anexou laudo',
  'laudo.baixado': 'Abriu laudo',
  'laudo.removido': 'Removeu laudo',
  'profissional.criado': 'Cadastrou profissional',
  'profissional.alterado': 'Alterou profissional',
  'profissional.desativado': 'Desativou profissional',
  'profissional.excluido': 'Excluiu profissional',
  'equipe.criada': 'Criou equipe',
  'equipe.alterada': 'Alterou equipe',
  'equipe.desativada': 'Desativou equipe',
  'equipe.excluida': 'Excluiu equipe',
  'cadastros.padroes_carregados': 'Carregou itens padrão',
};

/** Ação de cadastro simples: "cargos.criado" → "Cargos: criado". */
function rotulo(acao: string): string {
  if (ACOES[acao]) return ACOES[acao];
  const [tipo, verbo] = acao.split('.');
  const nomes: Record<string, string> = { cargos: 'Cargo', condicoes: 'Condição', 'tipos-atendimento': 'Tipo de atendimento' };
  return nomes[tipo] ? `${nomes[tipo]}: ${verbo}` : acao;
}

function resumo(d: Record<string, unknown> | null): string {
  if (!d) return '';
  if (d.descricao) return String(d.descricao);
  if (d.nome) return String(d.nome);
  if (d.data_hora) return new Date(String(d.data_hora)).toLocaleString('pt-BR');
  return '';
}

/** Trilha de auditoria do módulo (audit_logs, imutável). */
export const AuditoriaMulti: React.FC = () => {
  const [acao, setAcao] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const carga = useCarga(() => multiApi.auditoria({ acao: acao === 'todas' ? undefined : acao, page: pagina }), [acao, pagina]);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="w-72"><Select label="Ação" value={acao} onChange={(v) => { setAcao(v); setPagina(1); }} options={[{ value: 'todas', label: 'Todas' }, ...Object.entries(ACOES).map(([v, l]) => ({ value: v, label: l }))]} /></div>
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <>
            <Table>
              <TableHeader><TableRow><TableHead>Data/hora</TableHead><TableHead>Usuário</TableHead><TableHead>Ação</TableHead><TableHead>Recurso</TableHead><TableHead>Detalhes</TableHead></TableRow></TableHeader>
              <TableBody>
                {carga.dados.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-mono tabular-nums">{new Date(r.data).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{r.usuario ?? '—'}</TableCell>
                    <TableCell>{rotulo(r.acao)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.recurso}</TableCell>
                    <TableCell className="text-xs">{resumo(r.detalhes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="font-mono tabular-nums">{carga.dados.total} registro(s) · página {carga.dados.current_page}/{carga.dados.last_page}</span>
              <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={pagina >= carga.dados.last_page} onClick={() => setPagina((p) => p + 1)}>Próxima</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
