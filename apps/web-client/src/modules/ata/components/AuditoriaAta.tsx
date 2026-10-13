import React, { useState } from 'react';
import { Button, Card, CardContent, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { ataApi } from '../api';

export const ACOES: Record<string, string> = {
  'ata.criada': 'Criou a ata',
  'ata.editada': 'Editou os dados',
  'ata.texto_salvo': 'Salvou o texto',
  'ata.rascunho_salvo': 'Salvou o rascunho (texto travado)',
  'ata.assinada': 'Registrou assinatura',
  'ata.finalizada': 'Finalizou e gerou o PDF',
  'ata.pdf_baixado': 'Abriu/baixou o PDF',
  'ata.sigilosa_acessada': 'Abriu ata sigilosa',
  'ata.ia_gerada': 'Usou o Assistente IA',
  'ata.excluida': 'Excluiu a ata',
  'tipo.criado': 'Criou tipo de ata',
  'tipo.editado': 'Editou tipo de ata',
  'tipo.desativado': 'Desativou tipo de ata',
  'tipo.excluido': 'Excluiu tipo de ata',
  'secretaria.configurada': 'Configurou secretaria',
};

function resumo(acao: string, d: Record<string, unknown> | null): string {
  if (!d) return '';
  if (acao === 'ata.assinada') return String(d.participante ?? '');
  if (d.titulo) return `${String(d.numero ?? '').padStart(2, '0')}/${String(d.ano ?? '')} — ${String(d.titulo)}`;
  if (d.nome) return String(d.nome);
  if (d.codigo) return String(d.codigo);
  return '';
}

/** Trilha de auditoria do módulo (audit_logs, imutável). */
export const AuditoriaAta: React.FC = () => {
  const [acao, setAcao] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const carga = useCarga(() => ataApi.auditoria({ acao: acao === 'todas' ? undefined : acao, page: pagina }), [acao, pagina]);

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
                    <TableCell>{ACOES[r.acao] ?? r.acao}</TableCell>
                    <TableCell className="font-mono text-xs">{r.recurso}</TableCell>
                    <TableCell className="text-xs">{resumo(r.acao, r.detalhes)}</TableCell>
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
