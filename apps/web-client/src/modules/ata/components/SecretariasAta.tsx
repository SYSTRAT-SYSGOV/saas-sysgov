import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ImagePlus, Settings2 } from 'lucide-react';
import { ActionsMenu, Button, Card, CardContent, Checkbox, DataTable, Input, Modal, StatusChip } from '@sysgov/ui';
import type { Toast } from '../../escola/components/AdminModal';
import { EstadoCarga } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { useArquivoAutenticado } from '@/hooks/useArquivoAutenticado';
import { ataApi, mensagemDeErro, type SecretariaOpcao } from '../api';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

/** Secretarias do Organograma (D1): aqui só se configuram a sigla e o papel timbrado usado como fundo do PDF. */
export const SecretariasAta: React.FC<{ avisar: Toast }> = ({ avisar }) => {
  const carga = useCarga(() => ataApi.secretarias(), []);
  const [editando, setEditando] = useState<SecretariaOpcao | null>(null);

  const colunas = useMemo<ColumnDef<SecretariaOpcao, unknown>[]>(() => [
    {
      id: 'acoes',
      header: '',
      size: 56,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ActionsMenu
            triggerLabel="Ações da secretaria"
            items={[{ key: 'configurar', label: 'Configurar', icon: <Settings2 className="h-3.5 w-3.5" />, onSelect: () => setEditando(row.original) }]}
          />
        </div>
      ),
    },
    { id: 'secretaria', header: 'Secretaria', accessorKey: 'nome', meta: { exportHeader: 'Secretaria', exportValue: (s) => s.nome } },
    {
      id: 'sigla',
      header: 'Sigla',
      accessorFn: (s) => s.sigla ?? '',
      cell: ({ row }) => <span className="font-mono">{row.original.sigla ?? '—'}</span>,
      meta: { exportHeader: 'Sigla', exportValue: (s) => s.sigla ?? '' },
    },
    {
      id: 'timbrado',
      header: 'Papel timbrado',
      accessorFn: (s) => (s.tem_timbrado ? 'Configurado' : 'Sem timbrado'),
      cell: ({ row }) => <StatusChip label={row.original.tem_timbrado ? 'Configurado' : 'Sem timbrado'} variant={row.original.tem_timbrado ? 'success' : 'neutral'} />,
      meta: { exportHeader: 'Papel timbrado', exportValue: (s) => (s.tem_timbrado ? 'Configurado' : 'Sem timbrado') },
    },
  ], []);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">As secretarias vêm do Organograma. Para criar ou renomear uma secretaria, use o módulo Organograma.</p>
        <EstadoCarga carregando={carga.carregando && !carga.dados} erro={carga.erro} onTentar={() => void carga.recarregar()} />
        {carga.dados && (
          <DataTable
            columns={colunas}
            data={carga.dados}
            emptyText="Nenhuma secretaria encontrada."
            exportable
            exportFileName="ata-secretarias"
            exportTitle="Atas — Secretarias"
          />
        )}
      </CardContent>
      {editando && (
        <ConfigurarSecretaria secretaria={editando} aoFechar={() => setEditando(null)} aoSalvar={async () => {
          setEditando(null);
          avisar({ type: 'success', title: 'Secretaria', message: 'Configuração salva.' });
          await carga.recarregar();
        }} />
      )}
    </Card>
  );
};

const ConfigurarSecretaria: React.FC<{ secretaria: SecretariaOpcao; aoFechar: () => void; aoSalvar: () => Promise<void> }> = ({ secretaria, aoFechar, aoSalvar }) => {
  const [sigla, setSigla] = useState(secretaria.sigla ?? '');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [remover, setRemover] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { modal: modalValidacao, tratarErro } = useFormValidationModal();
  const atual = useArquivoAutenticado(secretaria.tem_timbrado ? `/ata/secretarias/${secretaria.id}/timbrado` : null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const corpo = new FormData();
      corpo.append('sigla', sigla);
      if (arquivo) corpo.append('timbrado', arquivo);
      if (remover) corpo.append('remover_timbrado', '1');
      await ataApi.salvarSecretaria(secretaria.id, corpo);
      await aoSalvar();
    } catch (e) {
      if (!tratarErro(e)) setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open onClose={aoFechar} title={secretaria.nome} size="lg"
      footer={<><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      {modalValidacao}
      <div className="space-y-4">
        <Input label="Sigla na ata" value={sigla} onChange={(e) => setSigla(e.target.value)} maxLength={30} />
        <div className="space-y-2">
          <span className="text-sm font-medium">Papel timbrado (JPG ou PNG, página A4 inteira, até 4 MB)</span>
          {atual.src && !remover && <img src={atual.src} alt="Papel timbrado atual" className="h-56 rounded border object-contain" />}
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm hover:bg-accent">
            <ImagePlus className="h-4 w-4" />{arquivo ? arquivo.name : 'Escolher imagem…'}
            <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => { setArquivo(e.target.files?.[0] ?? null); setRemover(false); }} />
          </label>
          {secretaria.tem_timbrado && (
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={remover} onCheckedChange={(v) => setRemover(v === true)} />Remover o timbrado atual</label>
          )}
        </div>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
};
