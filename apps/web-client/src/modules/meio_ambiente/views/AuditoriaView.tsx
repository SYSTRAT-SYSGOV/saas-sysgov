import React, { useState } from 'react';
import { Badge, Button, Card, Input, Select } from '@sysgov/ui';
import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { meioAmbienteApi, erroApi, type RegistroAuditoria, type TipoReferenciaAuditoria, type TrilhaAuditoria } from '../api';

const TIPOS: { value: TipoReferenciaAuditoria; label: string }[] = [
  { value: 'processo_licenciamento', label: 'Processo de licenciamento' },
  { value: 'auto_infracao', label: 'Auto de infração ambiental' },
];

/** Campos que mudaram entre `antes` e `depois` — num registro de criação (sem `antes`), nenhum. */
export function camposAlterados(registro: RegistroAuditoria): Array<{ campo: string; de: unknown; para: unknown }> {
  if (!registro.antes || !registro.depois) return [];
  const ignorar = new Set(['updated_at']);
  return Object.keys(registro.depois)
    .filter((campo) => !ignorar.has(campo) && JSON.stringify(registro.antes?.[campo]) !== JSON.stringify(registro.depois?.[campo]))
    .map((campo) => ({ campo, de: registro.antes?.[campo] ?? null, para: registro.depois?.[campo] ?? null }));
}

function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined) return '—';
  return typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
}

/**
 * Trilha de auditoria consolidada de um processo de licenciamento ou de um auto de
 * infração (incluindo o processo sancionatório do módulo Vistoria), em ordem
 * cronológica. Mesma convenção das telas de Fiscalização: a referência é informada
 * pelo número interno (ID).
 */
export const AuditoriaView: React.FC = () => {
  const [tipo, setTipo] = useState<TipoReferenciaAuditoria>('processo_licenciamento');
  const [id, setId] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [trilha, setTrilha] = useState<TrilhaAuditoria | null>(null);

  const consultar = async () => {
    setConsultando(true);
    setErro(null);
    setTrilha(null);
    try {
      setTrilha(await meioAmbienteApi.obterTrilhaAuditoria(tipo, Number(id)));
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setConsultando(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" /> Consultar Trilha de Auditoria</h3>

        {erro && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Referência" value={tipo} onChange={(v) => setTipo(v as TipoReferenciaAuditoria)} options={TIPOS} />
          <Input label="ID" type="number" value={id} onChange={(e) => setId(e.target.value)} />
        </div>

        <Button className="mt-4" onClick={consultar} disabled={consultando || id === ''}>
          {consultando ? 'Consultando...' : 'Consultar'}
        </Button>
      </Card>

      {trilha && (
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold">
            Trilha de <span className="font-mono tabular-nums">{trilha.referencia.numero}</span> — {trilha.auditoria.length} registro(s)
          </h3>

          {trilha.auditoria.length === 0 ? (
            <EmptyState icon={<History className="h-8 w-8" />} title="Nenhum registro de auditoria" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2">Data/hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Recurso</th>
                  <th>Alterações</th>
                </tr>
              </thead>
              <tbody>
                {trilha.auditoria.map((registro) => {
                  const alterados = camposAlterados(registro);
                  return (
                    <tr key={registro.id} className="border-t align-top">
                      <td className="py-2 font-mono tabular-nums">{new Date(registro.registrado_em).toLocaleString('pt-BR')}</td>
                      <td>{registro.usuario?.nome ?? 'Sistema'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {registro.modulo === 'vistoria' && <Badge variant="info">Vistoria</Badge>}
                          <span className="font-mono text-xs">{registro.acao}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs">{registro.recurso}</td>
                      <td className="text-xs">
                        {alterados.length === 0
                          ? '—'
                          : alterados.map((a) => (
                              <div key={a.campo}>
                                <span className="font-semibold">{a.campo}</span>: <span className="font-mono">{formatarValor(a.de)}</span> → <span className="font-mono">{formatarValor(a.para)}</span>
                              </div>
                            ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
};

export default AuditoriaView;
