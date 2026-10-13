import React, { useState } from 'react';
import { CheckCircle2, FilePen, FileText, Lock, Plus } from 'lucide-react';
import { Button, Card, CardContent, Input, KpiCard, Select, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { ataApi, type Opcoes, type StatusAta } from '../api';
import { NovaAtaModal } from './NovaAtaModal';

/** O Select do Radix não aceita valor vazio: "todas" é o filtro desligado. */
const TODAS = 'todas';

export const VARIANTE_STATUS: Record<StatusAta, 'warning' | 'info' | 'success'> = { em_redacao: 'warning', rascunho: 'info', finalizada: 'success' };

export const PainelAtas: React.FC<{ opcoes: Opcoes; avisar: Toast; abrir: (id: number) => void }> = ({ opcoes, avisar, abrir }) => {
  const [status, setStatus] = useState(TODAS);
  const [secretaria, setSecretaria] = useState(TODAS);
  const [busca, setBusca] = useState('');
  const [nova, setNova] = useState(false);
  const carga = useCarga(() => ataApi.listar({ status: status === TODAS ? undefined : status, org_unit_id: secretaria === TODAS ? undefined : Number(secretaria), q: busca.trim() || undefined }), [status, secretaria, busca]);
  const ind = carga.dados?.indicadores;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total de atas" value={ind?.total ?? '—'} icon={<FileText className="h-5 w-5" />} />
        <KpiCard title="Em redação / rascunho" value={ind ? ind.em_redacao + ind.rascunhos : '—'} subtitle={ind ? `${ind.rascunhos} aguardando assinaturas` : undefined} icon={<FilePen className="h-5 w-5" />} />
        <KpiCard title="Finalizadas" value={ind?.finalizadas ?? '—'} icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard title="Sigilosas" value={ind?.sigilosas ?? '—'} icon={<Lock className="h-5 w-5" />} />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1"><Input label="Buscar pelo título" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: conselho escolar" /></div>
            <div className="w-56"><Select label="Situação" value={status} onChange={setStatus} options={[{ value: TODAS, label: 'Todas' }, { value: 'em_redacao', label: 'Em redação' }, { value: 'rascunho', label: 'Rascunho' }, { value: 'finalizada', label: 'Finalizada' }]} /></div>
            <div className="w-64"><Select label="Secretaria" value={secretaria} onChange={setSecretaria} options={[{ value: TODAS, label: 'Todas' }, ...opcoes.secretarias.map((s) => ({ value: s.id, label: s.sigla ? `${s.sigla} — ${s.nome}` : s.nome }))]} /></div>
            {opcoes.permissoes.criar && <Button onClick={() => setNova(true)}><Plus className="mr-1 h-4 w-4" />Nova ata</Button>}
          </div>

          <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
          {carga.dados && (carga.dados.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma ata encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead><TableHead>Título</TableHead><TableHead>Secretaria</TableHead><TableHead>Reunião</TableHead><TableHead>Assinaturas</TableHead><TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carga.dados.data.map((a) => (
                  <TableRow key={a.id} className={a.pode_abrir ? 'cursor-pointer' : 'opacity-70'} onClick={() => a.pode_abrir && abrir(a.id)}>
                    <TableCell className="font-mono tabular-nums">{a.numero}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">{a.sigilosa && <Lock className="h-3.5 w-3.5 text-amber-600" aria-label="Sigilosa" />}{a.titulo}</span>
                      {a.tipo && <div className="text-xs text-muted-foreground">{a.tipo.nome}</div>}
                    </TableCell>
                    <TableCell>{a.secretaria.nome}</TableCell>
                    <TableCell className="font-mono tabular-nums">{a.data_reuniao ? new Date(a.data_reuniao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</TableCell>
                    <TableCell className="font-mono tabular-nums">{a.assinaturas ? `${a.assinaturas.feitas}/${a.assinaturas.total}` : '—'}</TableCell>
                    <TableCell><StatusChip label={a.status === 'rascunho' ? 'Rascunho' : a.status_rotulo} variant={VARIANTE_STATUS[a.status]} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
        </CardContent>
      </Card>

      {nova && (
        <NovaAtaModal
          opcoes={opcoes}
          aoFechar={() => setNova(false)}
          aoCriar={(id) => {
            setNova(false);
            avisar({ type: 'success', title: 'Ata criada', message: 'Agora escreva o texto da ata.' });
            abrir(id);
          }}
        />
      )}
    </div>
  );
};
