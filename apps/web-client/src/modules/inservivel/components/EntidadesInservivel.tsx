import React, { useEffect, useState } from 'react';
import { AlertTriangle, Building2, Eye, Plus, Search } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, Select, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type DadosEntidade, type StatusEntidade } from '../api';
import { formatarCnpj, formatarData, ROTULO_STATUS_ENTIDADE, VARIANTE_STATUS_ENTIDADE } from '../formato';
import type { PropsAba } from '../ModuloInservivelMain';
import { CamposEntidadeForm, FORM_ENTIDADE_VAZIO, paraDadosEntidade, type FormEntidade } from './CamposEntidadeForm';
import { Paginacao } from './Comuns';
import { EntidadeFicha } from './EntidadeFicha';

/** Gestão das entidades sem fins lucrativos (spec: Entidades sem fins lucrativos). */
export const EntidadesInservivel: React.FC<PropsAba> = ({ avisar, parametro, limparParametro }) => {
  const [busca, setBusca] = useState('');
  const [aplicada, setAplicada] = useState('');
  const [status, setStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const [versao, setVersao] = useState(0);
  const [ficha, setFicha] = useState<number | null>(null);
  const [cadastrar, setCadastrar] = useState(false);
  const lista = useCarga(() => inservivelApi.entidades({ q: aplicada || undefined, status: (status || undefined) as StatusEntidade | undefined, page: pagina }), [aplicada, status, pagina, versao]);

  useEffect(() => {
    const id = parametro('entidade');
    if (id) { setFicha(Number(id)); limparParametro('entidade'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (ficha !== null) return <EntidadeFicha entidadeId={ficha} avisar={avisar} onVoltar={() => { setFicha(null); setVersao((v) => v + 1); }} />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Entidades sem fins lucrativos</CardTitle>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCadastrar(true)}>Cadastrar entidade</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <form className="grid gap-3 md:grid-cols-[1fr_14rem_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); setPagina(1); setAplicada(busca); }}>
          <Input label="Buscar" placeholder="Razão social, nome fantasia, CNPJ ou representante" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Select placeholder="Todos" label="Status" value={status} onChange={(v) => { setStatus(v); setPagina(1); }}
            options={[{ value: '', label: 'Todos' }, ...(Object.keys(ROTULO_STATUS_ENTIDADE) as StatusEntidade[]).map((s) => ({ value: s, label: ROTULO_STATUS_ENTIDADE[s] }))]} />
          <Button type="submit" variant="outline" leftIcon={<Search className="h-4 w-4" />}>Filtrar</Button>
        </form>
        {lista.erro && <AlertCard priority="danger" title="Não foi possível carregar as entidades" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />}
        {!lista.dados && !lista.erro && <Skeleton className="h-64 w-full" />}
        {lista.dados && (lista.dados.data.length === 0 ? <EmptyState icon={<Building2 className="h-8 w-8" />} title="Nenhuma entidade" description="As entidades se cadastram pela página pública (link em Configurações) ou são cadastradas aqui." /> : (
          <>
            <Table>
              <TableHeader><TableRow><TableHead>Entidade</TableHead><TableHead>CNPJ</TableHead><TableHead>Representante</TableHead><TableHead>Cidade</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Lotes</TableHead><TableHead>Cadastro</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {lista.dados.data.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell><p className="font-medium">{e.razao_social}</p><p className="text-xs text-muted-foreground">{e.nome_fantasia}</p>
                      {e.bloqueada_por_documento && <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5" />Documento vencido</p>}</TableCell>
                    <TableCell className="font-mono tabular-nums">{formatarCnpj(e.cnpj)}</TableCell>
                    <TableCell className="text-sm">{e.representante_legal}</TableCell>
                    <TableCell className="text-sm">{e.cidade}/{e.uf}</TableCell>
                    <TableCell><StatusChip label={e.status_rotulo} variant={VARIANTE_STATUS_ENTIDADE[e.status]} /></TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{e.lotes_ganhos}</TableCell>
                    <TableCell className="font-mono tabular-nums">{formatarData(e.created_at)}</TableCell>
                    <TableCell className="text-right"><Button size="icon-sm" variant="ghost" aria-label={`Abrir ficha de ${e.razao_social}`} onClick={() => setFicha(e.id)}><Eye /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Paginacao pagina={lista.dados.meta.current_page} ultima={lista.dados.meta.last_page} total={lista.dados.meta.total} onMudar={setPagina} />
          </>
        ))}
      </CardContent>
      <CadastrarEntidadeModal aberto={cadastrar} onFechar={() => setCadastrar(false)}
        onCadastrada={(id, nome) => { setCadastrar(false); avisar({ type: 'success', title: 'Entidade cadastrada', message: nome }); setFicha(id); }} />
    </Card>
  );
};

const CadastrarEntidadeModal: React.FC<{ aberto: boolean; onFechar: () => void; onCadastrada: (id: number, nome: string) => void }> = ({ aberto, onFechar, onCadastrada }) => {
  const [form, setForm] = useState<FormEntidade>(FORM_ENTIDADE_VAZIO);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fechar = () => { setForm(FORM_ENTIDADE_VAZIO); setSenha(''); setErro(null); onFechar(); };
  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSalvando(true); setErro(null);
    try {
      const e = await inservivelApi.cadastrarEntidade({ ...(paraDadosEntidade(form) as unknown as DadosEntidade), senha });
      setForm(FORM_ENTIDADE_VAZIO); setSenha('');
      onCadastrada(e.id, e.razao_social);
    } catch (e) { setErro(erroApi(e).mensagem); } finally { setSalvando(false); }
  };
  return (
    <Modal open={aberto} onClose={fechar} title="Cadastrar entidade" icon={<Building2 className="h-5 w-5" />} size="2xl"
      footer={<><Button variant="outline" onClick={fechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-entidade" isLoading={salvando}>Cadastrar</Button></>}>
      <form id="form-entidade" onSubmit={salvar} className="space-y-4">
        {erro && <AlertCard priority="danger" title="Não foi possível cadastrar" description={erro} />}
        <p className="text-sm text-muted-foreground">A entidade ganha uma conta de acesso ao portal com o e-mail informado e a senha inicial abaixo. Os documentos podem ser enviados depois pelo portal.</p>
        <CamposEntidadeForm form={form} onChange={setForm} />
        <Input label="Senha inicial da conta *" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} />
      </form>
    </Modal>
  );
};
