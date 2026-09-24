import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, ExternalLink, Ban } from 'lucide-react';
import { ActionsMenu, type ActionsMenuItem } from '@sysgov/ui';
import { ConfirmDialog, DataTable, ScreenState, SearchInput, StatusChip } from '@/components/ui';
import { sysgovApi, type Certificado } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ErroFormulario } from '../components/ErroFormulario';
import { baixarBlob, formatarData } from '../utils/formatos';

/** Certificados emitidos pelo órgão: consulta, download e revogação. */
export const CertificadosPage: React.FC = () => {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [revogando, setRevogando] = useState<Certificado | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setCertificados((await sysgovApi.cursos.listarCertificados({ busca })).data);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível carregar os certificados.'));
    } finally {
      setCarregando(false);
    }
  }, [busca]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const colunas = useMemo<ColumnDef<Certificado>[]>(
    () => [
      { id: 'codigo', header: 'Código', size: 160, meta: { exportValue: (c) => c.codigo }, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.codigo}</span> },
      { id: 'participante', header: 'Participante', size: 220, meta: { exportValue: (c) => c.participante ?? '' }, cell: ({ row }) => <span className="block truncate text-left">{row.original.participante}</span> },
      { id: 'curso', header: 'Curso / formação', size: 260, meta: { exportValue: (c) => c.curso ?? '' }, cell: ({ row }) => <span className="block truncate text-left">{row.original.curso}</span> },
      { id: 'carga', header: 'Carga horária', size: 110, meta: { exportValue: (c) => c.carga_horaria ?? '' }, cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.carga_horaria}</span> },
      { id: 'emissao', header: 'Emissão', size: 110, meta: { exportValue: (c) => formatarData(c.emitido_em), sortValue: (c) => c.emitido_em }, cell: ({ row }) => <span className="font-mono tabular-nums">{formatarData(row.original.emitido_em)}</span> },
      {
        id: 'status',
        header: 'Situação',
        size: 110,
        meta: { exportValue: (c) => (c.revogado_em ? 'Revogado' : 'Válido') },
        cell: ({ row }) => <StatusChip label={row.original.revogado_em ? 'Revogado' : 'Válido'} variant={row.original.revogado_em ? 'danger' : 'success'} />,
      },
      {
        id: 'acoes',
        header: '',
        size: 60,
        cell: ({ row }) => {
          const c = row.original;
          const itens: ActionsMenuItem[] = [
            { key: 'validar', label: 'Abrir página de validação', icon: <ExternalLink className="h-4 w-4" />, onSelect: () => window.open(c.url_validacao, '_blank', 'noopener') },
          ];
          if (!c.revogado_em) {
            itens.unshift({
              key: 'baixar',
              label: 'Baixar PDF',
              icon: <Download className="h-4 w-4" />,
              onSelect: () => void sysgovApi.cursos.baixarCertificado(c.id).then((b) => baixarBlob(b, `certificado-${c.codigo}.pdf`)).catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível baixar.'))),
            });
            itens.push({ key: 'revogar', label: 'Revogar', icon: <Ban className="h-4 w-4" />, onSelect: () => setRevogando(c) });
          }
          return <ActionsMenu items={itens} triggerLabel={`Ações do certificado ${c.codigo}`} />;
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <SearchInput value={busca} onChange={setBusca} placeholder="Buscar por código ou participante..." />
      <ErroFormulario mensagem={erro} />
      {carregando && certificados.length === 0 ? (
        <ScreenState type="loading" title="Carregando certificados..." />
      ) : (
        <DataTable columns={colunas} data={certificados} emptyText="Nenhum certificado emitido." exportable exportFileName="certificados" />
      )}
      <ConfirmDialog
        open={revogando !== null}
        onClose={() => setRevogando(null)}
        title="Revogar certificado"
        description={`Revogar o certificado ${revogando?.codigo ?? ''} de ${revogando?.participante ?? ''}? Ele continua consultável na validação pública, com a situação "revogado", e deixa de poder ser baixado.`}
        confirmLabel="Revogar"
        reasonPlaceholder="Motivo da revogação"
        onConfirm={(motivo) => {
          const alvo = revogando;
          setRevogando(null);
          if (alvo) sysgovApi.cursos.revogarCertificado(alvo.id, motivo).then(carregar).catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível revogar.')));
        }}
      />
    </div>
  );
};

export default CertificadosPage;
