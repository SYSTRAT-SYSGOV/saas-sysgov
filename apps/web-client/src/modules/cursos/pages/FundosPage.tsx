import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, FileImage, Trash2, Upload } from 'lucide-react';
import { Button, Card, Input, Select, Switch, DataTable } from '@sysgov/ui';
import { sysgovApi, type FundoCertificado } from '@sysgov/sdk';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { colunaAcoes } from '@/lib/colunaAcoes';
import { ErroFormulario } from '../components/ErroFormulario';
import { prepararFundo } from '../construtor/pdfParaImagem';
import { useFormValidationModal } from '@/lib/useFormValidationModal';

/**
 * Biblioteca de fundos de certificado (D8). O arquivo pode ser PDF (a 1ª página vira imagem no
 * navegador), PNG ou JPEG; a orientação da página sai da proporção da imagem. Fundo em uso por um
 * leiaute não é excluído — só desativado.
 */
export const FundosPage: React.FC = () => {
  const [fundos, setFundos] = useState<FundoCertificado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { modal: modalValidacao, validar, invalidar, tratarErro } = useFormValidationModal();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [campoArquivo, setCampoArquivo] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [excluir, setExcluir] = useState<FundoCertificado | null>(null);

  const carregar = useCallback(async () => {
    try {
      setFundos((await sysgovApi.cursos.listarFundos()).fundos);
    } catch (e) {
      if (!tratarErro(e)) setErro(getApiErrorMessage(e, 'Não foi possível carregar os fundos.'));
      setFundos([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar([['Nome do modelo', nome]])) return;
    if (!arquivo) {
      invalidar([['validação', 'Escolha o arquivo do fundo.']]); return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const { blob, nome: nomeArquivo } = await prepararFundo(arquivo);
      await sysgovApi.cursos.criarFundo({ nome, descricao: descricao || null, ativo }, blob, nomeArquivo);
      setNome('');
      setDescricao('');
      setAtivo(true);
      setArquivo(null);
      setCampoArquivo((n) => n + 1);
      await carregar();
    } catch (err) {
      if (!tratarErro(err)) setErro(getApiErrorMessage(err, 'Não foi possível cadastrar o fundo.'));
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (f: FundoCertificado) => {
    try {
      await sysgovApi.cursos.atualizarFundo(f.id, { ativo: !f.ativo });
      await carregar();
    } catch (e) {
      if (!tratarErro(e)) setErro(getApiErrorMessage(e, 'Não foi possível alterar o fundo.'));
    }
  };

  // Colunas estáveis (o switch não remonta ao gravar); o handler atual vem por ref.
  const ctx = useRef({ alternarAtivo });
  ctx.current = { alternarAtivo };
  const colunas = useMemo<ColumnDef<FundoCertificado, unknown>[]>(() => [
    colunaAcoes<FundoCertificado>((f) => `Ações de ${f.nome}`, (f) => [
      { key: 'ver', label: 'Visualizar', icon: <Eye className="h-3.5 w-3.5" />, onSelect: () => window.open(f.imagem_url, '_blank') },
      { key: 'excluir', label: 'Excluir', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: () => setExcluir(f) },
    ]),
    {
      id: 'nome', header: 'Nome', accessorKey: 'nome',
      cell: ({ row }) => <div><div className="font-medium">{row.original.nome}</div>{row.original.descricao && <div className="text-xs text-muted-foreground">{row.original.descricao}</div>}</div>,
      meta: { exportHeader: 'Nome', exportValue: (f) => f.nome },
    },
    { id: 'pagina', header: 'Página', accessorFn: (f) => (f.orientacao === 'paisagem' ? 'Horizontal' : 'Vertical'), meta: { exportHeader: 'Página', exportValue: (f) => (f.orientacao === 'paisagem' ? 'Horizontal' : 'Vertical') } },
    {
      id: 'status', header: 'Status', accessorFn: (f) => (f.ativo ? 'Ativo' : 'Inativo'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch checked={row.original.ativo} onCheckedChange={() => void ctx.current.alternarAtivo(row.original)} label={`Ativar ${row.original.nome}`} />
          <StatusChip label={row.original.ativo ? 'Ativo' : 'Inativo'} variant={row.original.ativo ? 'success' : 'neutral'} />
        </div>
      ),
      meta: { exportHeader: 'Status', exportValue: (f) => (f.ativo ? 'Ativo' : 'Inativo') },
    },
    {
      id: 'data', header: 'Data', accessorKey: 'created_at',
      cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{row.original.created_at ? new Date(row.original.created_at).toLocaleDateString('pt-BR') : '—'}</span>,
      meta: { exportHeader: 'Data', exportValue: (f) => (f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : '') },
    },
  ], []);

  if (fundos === null) return <ScreenState type="loading" title="Carregando fundos..." />;

  return (
    <div className="space-y-4">
      {modalValidacao}
      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold">Cadastrar novo fundo</h3>
        <form noValidate onSubmit={cadastrar} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
            <Input label="Nome do modelo" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={150} />
            <Select label="Status" value={ativo ? '1' : '0'} onChange={(v) => setAtivo(v === '1')} options={[{ value: '1', label: 'Ativo' }, { value: '0', label: 'Inativo' }]} />
          </div>
          <Input label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={255} />
          <label className="block space-y-1 text-sm">
            <span className="flex items-center gap-2 font-medium"><FileImage className="h-4 w-4 text-primary" /> Arquivo (PDF, PNG ou JPEG — A4 horizontal recomendado)</span>
            <input key={campoArquivo} type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} className="text-xs" />
          </label>
          <ErroFormulario mensagem={erro} />
          <Button type="submit" isLoading={salvando}><Upload className="h-4 w-4" /> Cadastrar</Button>
        </form>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold">Fundos cadastrados</h3>
        {fundos.length === 0 ? (
          <EmptyState icon={<FileImage className="h-8 w-8" />} title="Nenhum fundo cadastrado" description="Cadastre a arte do certificado para usá-la no construtor visual." />
        ) : (
          <DataTable
            columns={colunas}
            data={fundos}
            emptyText="Nenhum fundo."
            exportable
            exportFileName="cursos-fundos"
            exportTitle="Cursos — Fundos de certificado"
          />
        )}
      </Card>

      <ConfirmDialog
        open={excluir !== null}
        onClose={() => setExcluir(null)}
        requireReason={false}
        title="Excluir fundo"
        description={`Excluir "${excluir?.nome ?? ''}"? Se ele estiver no leiaute de algum curso, a exclusão será recusada — desative-o.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          const alvo = excluir;
          setExcluir(null);
          if (alvo) sysgovApi.cursos.excluirFundo(alvo.id).then(carregar).catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível excluir.')));
        }}
      />
    </div>
  );
};

export default FundosPage;
