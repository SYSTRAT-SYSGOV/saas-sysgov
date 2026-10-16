import React, { useCallback, useEffect, useState } from 'react';
import { Eye, FileImage, Trash2, Upload } from 'lucide-react';
import { Button, Card, Input, Select, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { sysgovApi, type FundoCertificado } from '@sysgov/sdk';
import { ConfirmDialog, EmptyState, ScreenState, StatusChip } from '@/components/ui';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ErroFormulario } from '../components/ErroFormulario';
import { prepararFundo } from '../construtor/pdfParaImagem';

/**
 * Biblioteca de fundos de certificado (D8). O arquivo pode ser PDF (a 1ª página vira imagem no
 * navegador), PNG ou JPEG; a orientação da página sai da proporção da imagem. Fundo em uso por um
 * leiaute não é excluído — só desativado.
 */
export const FundosPage: React.FC = () => {
  const [fundos, setFundos] = useState<FundoCertificado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
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
      setErro(getApiErrorMessage(e, 'Não foi possível carregar os fundos.'));
      setFundos([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      setErro('Escolha o arquivo do fundo.');
      return;
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
      setErro(getApiErrorMessage(err, 'Não foi possível cadastrar o fundo.'));
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (f: FundoCertificado) => {
    try {
      await sysgovApi.cursos.atualizarFundo(f.id, { ativo: !f.ativo });
      await carregar();
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível alterar o fundo.'));
    }
  };

  if (fundos === null) return <ScreenState type="loading" title="Carregando fundos..." />;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold">Cadastrar novo fundo</h3>
        <form onSubmit={cadastrar} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
            <Input label="Nome do modelo" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={150} />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Página</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fundos.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <div className="font-medium">{f.nome}</div>
                    {f.descricao && <div className="text-xs text-muted-foreground">{f.descricao}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{f.orientacao === 'paisagem' ? 'Horizontal' : 'Vertical'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={f.ativo} onCheckedChange={() => void alternarAtivo(f)} label={`Ativar ${f.nome}`} />
                      <StatusChip label={f.ativo ? 'Ativo' : 'Inativo'} variant={f.ativo ? 'success' : 'neutral'} />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">{f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => window.open(f.imagem_url, '_blank')}><Eye className="h-4 w-4" /> Visualizar</Button>{' '}
                    <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${f.nome}`} onClick={() => setExcluir(f)}><Trash2 /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
