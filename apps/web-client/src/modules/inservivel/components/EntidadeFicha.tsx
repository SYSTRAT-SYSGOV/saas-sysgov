import React, { useState } from 'react';
import { AlertTriangle, ArrowLeft, FileCheck2, FileText, KeyRound, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Modal, Select, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sysgov/ui';
import { erroApi } from '../../escola/api';
import type { Toast } from '../../escola/components/AdminModal';
import { useCarga } from '../../escola/useCarga';
import { inservivelApi, type DocumentoEntidade, type Entidade, type SituacaoDocumento, type StatusEntidade } from '../api';
import {
  abrirArquivo, formatarCnpj, formatarData, formatarDataHora, ROTULO_DOCUMENTO, ROTULO_STATUS_ENTIDADE, textoValidade, vazioParaNulo,
  VARIANTE_DOCUMENTO, VARIANTE_STATUS_ENTIDADE, VARIANTE_STATUS_LOTE,
} from '../formato';
import { CamposEntidadeForm, FORM_ENTIDADE_VAZIO, paraDadosEntidade, type FormEntidade } from './CamposEntidadeForm';
import { CampoTexto } from './Comuns';

/** Ficha da entidade para o Gestor: dados, documentos, status, lotes, senha e exclusão (spec: Entidades; Validade). */
export const EntidadeFicha: React.FC<{ entidadeId: number; avisar: Toast; onVoltar: () => void }> = ({ entidadeId, avisar, onVoltar }) => {
  const carga = useCarga(() => inservivelApi.entidade(entidadeId), [entidadeId]);
  const [status, setStatus] = useState(false);
  const [editar, setEditar] = useState(false);
  const [senha, setSenha] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const [documento, setDocumento] = useState<DocumentoEntidade | null>(null);

  if (carga.erro) return <AlertCard priority="danger" title="Não foi possível carregar a entidade" description={carga.erro} actionLabel="Voltar" onAction={onVoltar} />;
  if (!carga.dados) return <Skeleton className="h-96 w-full" />;
  const e = carga.dados;
  const atualizar = (nova: Entidade) => carga.definir(nova);
  const abrir = async (docId: number) => {
    try { abrirArquivo(await inservivelApi.documentoEntidade(e.id, docId)); } catch (err) { avisar({ type: 'error', title: 'Não foi possível abrir o documento', message: erroApi(err).mensagem }); }
  };
  const exigidos = new Map(e.documentos_exigidos.map((d) => [d.chave, d]));
  const tiposEnviados = new Set(e.documentos.map((d) => d.tipo));
  const faltando = e.documentos_exigidos.filter((d) => d.obrigatorio && !tiposEnviados.has(d.chave));

  return (
    <div className="space-y-4">
      <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onVoltar}>Voltar às entidades</Button>
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3"><h2 className="text-xl font-bold">{e.razao_social}</h2><StatusChip label={e.status_rotulo} variant={VARIANTE_STATUS_ENTIDADE[e.status]} /></div>
              <p className="text-sm text-muted-foreground">{e.nome_fantasia} · CNPJ <span className="font-mono tabular-nums">{formatarCnpj(e.cnpj)}</span> · {e.email}</p>
              <p className="text-xs text-muted-foreground">Cadastrada em <span className="font-mono tabular-nums">{formatarDataHora(e.created_at)}</span> · lotes recebidos: <span className="font-mono tabular-nums">{e.lotes_ganhos}</span></p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button leftIcon={<ShieldCheck className="h-4 w-4" />} onClick={() => setStatus(true)}>Alterar status</Button>
              <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditar(true)}>Editar</Button>
              <Button variant="outline" leftIcon={<KeyRound className="h-4 w-4" />} onClick={() => setSenha(true)}>Senha</Button>
              <Button variant="outline" leftIcon={<Trash2 className="h-4 w-4 text-destructive" />} onClick={() => setExcluir(true)}>Excluir</Button>
            </div>
          </div>
          {e.motivo_reprovacao && <AlertCard priority="warning" title="Motivo registrado" description={e.motivo_reprovacao} />}
          {e.bloqueios.length > 0 && (
            <AlertCard priority="danger" title="Bloqueada por documento vencido" description={`${e.bloqueios.map((b) => `${b.nome} (venceu em ${formatarData(b.validade)})`).join('; ')}. A entidade não participa de lotes nem concorre nos sorteios até enviar o documento atualizado.`} />
          )}
          {e.bloqueios.length === 0 && e.alertas_documentos.length > 0 && (
            <AlertCard priority="warning" title="Documento perto de vencer" description={e.alertas_documentos.map((a) => `${a.nome}: ${formatarData(a.validade)} (${textoValidade(a.validade)})`).join('; ')} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-primary" />Documentos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {faltando.length > 0 && <p className="flex items-center gap-1 text-sm text-destructive"><AlertTriangle className="h-4 w-4" />Obrigatórios não enviados: {faltando.map((d) => d.nome).join(', ')}</p>}
          {e.documentos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento enviado.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Envio</TableHead><TableHead>Validade</TableHead><TableHead>Situação</TableHead><TableHead>Observação</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {e.documentos.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.nome}{exigidos.get(d.tipo)?.obrigatorio && <span className="ml-1 text-xs text-muted-foreground">(obrigatório)</span>}</TableCell>
                    <TableCell className="font-mono tabular-nums">{formatarData(d.data_envio)}</TableCell>
                    <TableCell className="font-mono tabular-nums">{d.validade ? <>{formatarData(d.validade)}<span className="block text-xs text-muted-foreground">{textoValidade(d.validade)}</span></> : '—'}</TableCell>
                    <TableCell><StatusChip label={ROTULO_DOCUMENTO[d.situacao]} variant={VARIANTE_DOCUMENTO[d.situacao]} /></TableCell>
                    <TableCell className="max-w-xs text-sm">{d.observacao_prefeitura ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button size="sm" variant="ghost" leftIcon={<FileText className="h-4 w-4" />} onClick={() => void abrir(d.id)}>Abrir</Button>
                      <Button size="sm" variant="outline" onClick={() => setDocumento(d)}>Analisar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Dados da entidade</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Dado rotulo="Endereço" valor={`${e.endereco}, ${e.cidade}/${e.uf} — CEP ${e.cep}`} />
              <Dado rotulo="Contato" valor={[e.telefone, e.celular].filter(Boolean).join(' · ')} mono />
              <Dado rotulo="Representante" valor={`${e.representante_legal} (${e.cargo_representante})`} />
              <Dado rotulo="CPF do representante" valor={e.cpf_representante_mascarado} mono />
              <Dado rotulo="Área de atuação" valor={e.area_atuacao} />
              <Dado rotulo="Funcionamento / beneficiários" valor={`${e.tempo_funcionamento_anos} ano(s) · ${e.numero_beneficiarios} beneficiário(s)`} />
              <Dado rotulo="Finalidade" valor={e.finalidade} />
              <Dado rotulo="Dados bancários" valor={[e.banco, e.agencia && `Ag. ${e.agencia}`, e.conta && `C/C ${e.conta}`, e.chave_pix && `PIX ${e.chave_pix}`].filter(Boolean).join(' · ')} />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Participação em lotes</CardTitle></CardHeader>
          <CardContent>
            {(e.lotes ?? []).length === 0 ? <p className="text-sm text-muted-foreground">A entidade ainda não se inscreveu em lotes.</p> : (
              <ul className="divide-y divide-border text-sm">
                {(e.lotes ?? []).map((l) => (
                  <li key={l.lote_id} className="flex items-center justify-between py-2">
                    <span className="font-mono tabular-nums">Lote {l.numero}</span>
                    <span className="flex items-center gap-2">{l.vencedora && <StatusChip label="Contemplada" variant="success" />}<StatusChip label={l.status_rotulo} variant={VARIANTE_STATUS_LOTE[l.status]} /></span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <StatusModal aberto={status} entidade={e} onFechar={() => setStatus(false)} onSalvo={(n) => { atualizar(n); setStatus(false); avisar({ type: 'success', title: 'Status atualizado', message: n.status_rotulo }); }} />
      <AnalisarDocumentoModal entidadeId={e.id} documento={documento} onFechar={() => setDocumento(null)} onSalvo={(n) => { atualizar(n); setDocumento(null); avisar({ type: 'success', title: 'Documento analisado', message: '' }); }} />
      <EditarEntidadeModal entidade={editar ? e : null} onFechar={() => setEditar(false)} onSalvo={(n) => { atualizar(n); setEditar(false); avisar({ type: 'success', title: 'Entidade atualizada', message: n.razao_social }); }} />
      <SenhaModal aberto={senha} titulo={`Nova senha de ${e.nome_fantasia}`} onFechar={() => setSenha(false)}
        onEnviar={async (s) => { await inservivelApi.redefinirSenhaEntidade(e.id, s); avisar({ type: 'success', title: 'Senha redefinida', message: e.email }); setSenha(false); }} />
      <SenhaModal aberto={excluir} titulo="Excluir entidade" perigo rotulo="Confirme com a sua senha" botao="Excluir"
        aviso={<>Excluir <strong>{e.razao_social}</strong>? A conta de acesso é desligada e os documentos apagados. Entidade que já venceu sorteio não pode ser excluída.</>}
        onFechar={() => setExcluir(false)}
        onEnviar={async (s) => { await inservivelApi.excluirEntidade(e.id, s); avisar({ type: 'success', title: 'Entidade excluída', message: e.razao_social }); onVoltar(); }} />
    </div>
  );
};

const Dado: React.FC<{ rotulo: string; valor: React.ReactNode; mono?: boolean }> = ({ rotulo, valor, mono }) => (
  <div><dt className="text-xs font-semibold uppercase text-muted-foreground">{rotulo}</dt><dd className={mono ? 'font-mono tabular-nums' : ''}>{valor || '—'}</dd></div>
);

const StatusModal: React.FC<{ aberto: boolean; entidade: Entidade; onFechar: () => void; onSalvo: (e: Entidade) => void }> = ({ aberto, entidade, onFechar, onSalvo }) => {
  const [status, setStatus] = useState<StatusEntidade>(entidade.status);
  const [faltantes, setFaltantes] = useState<string[]>([]);
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [foiAberto, setFoiAberto] = useState(false);
  if (aberto !== foiAberto) { setFoiAberto(aberto); if (aberto) { setStatus(entidade.status); setFaltantes([]); setObservacao(''); setErro(null); } }
  const exigeMotivo = status === 'reprovada' || status === 'desabilitada';
  const salvar = async () => {
    setSalvando(true); setErro(null);
    try { onSalvo(await inservivelApi.alterarStatusEntidade(entidade.id, status, exigeMotivo ? faltantes : [], exigeMotivo ? vazioParaNulo(observacao) : null)); } catch (e) { setErro(erroApi(e).mensagem); } finally { setSalvando(false); }
  };
  return (
    <Modal open={aberto} onClose={onFechar} title="Alterar status da entidade" size="lg"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar</Button></>}>
      <div className="space-y-3">
        <Select label="Novo status" value={status} onChange={(v) => setStatus(v as StatusEntidade)}
          options={(Object.keys(ROTULO_STATUS_ENTIDADE) as StatusEntidade[]).map((s) => ({ value: s, label: ROTULO_STATUS_ENTIDADE[s] }))} />
        {exigeMotivo && (
          <>
            <p className="text-sm font-medium">Documentos faltantes ou inconformes</p>
            <div className="space-y-1">
              {entidade.documentos_exigidos.map((d) => (
                <label key={d.chave} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={faltantes.includes(d.nome)} onCheckedChange={(v) => setFaltantes((f) => (v ? [...f, d.nome] : f.filter((x) => x !== d.nome)))} />{d.nome}
                </label>
              ))}
            </div>
            <CampoTexto rotulo="Observações" value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} maxLength={5000} />
            <p className="text-xs text-muted-foreground">O motivo fica visível para a entidade no portal; o aviso por e-mail fica registrado para envio.</p>
          </>
        )}
        {erro && <AlertCard priority="danger" title="Não foi possível alterar" description={erro} />}
      </div>
    </Modal>
  );
};

const AnalisarDocumentoModal: React.FC<{ entidadeId: number; documento: DocumentoEntidade | null; onFechar: () => void; onSalvo: (e: Entidade) => void }> = ({ entidadeId, documento, onFechar, onSalvo }) => {
  const [situacao, setSituacao] = useState<SituacaoDocumento>('aprovado');
  const [observacao, setObservacao] = useState('');
  const [validade, setValidade] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [atual, setAtual] = useState<number | null>(null);
  if ((documento?.id ?? null) !== atual) {
    setAtual(documento?.id ?? null);
    if (documento) { setSituacao(documento.situacao === 'pendente' ? 'aprovado' : documento.situacao); setObservacao(documento.observacao_prefeitura ?? ''); setValidade(documento.validade ?? ''); setErro(null); }
  }
  const salvar = async () => {
    if (!documento) return;
    setSalvando(true); setErro(null);
    try { onSalvo(await inservivelApi.analisarDocumento(entidadeId, documento.id, { situacao, observacao: vazioParaNulo(observacao), validade: vazioParaNulo(validade) })); } catch (e) { setErro(erroApi(e).mensagem); } finally { setSalvando(false); }
  };
  return (
    <Modal open={documento !== null} onClose={onFechar} title={`Analisar: ${documento?.nome ?? ''}`} size="md"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button onClick={() => void salvar()} isLoading={salvando}>Salvar análise</Button></>}>
      <div className="space-y-3">
        <Select label="Situação" value={situacao} onChange={(v) => setSituacao(v as SituacaoDocumento)}
          options={(Object.keys(ROTULO_DOCUMENTO) as SituacaoDocumento[]).map((s) => ({ value: s, label: ROTULO_DOCUMENTO[s] }))} />
        <Input label="Validade do documento" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} className="font-mono" />
        <CampoTexto rotulo="Observação para a entidade" value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} maxLength={2000} />
        {erro && <AlertCard priority="danger" title="Não foi possível salvar" description={erro} />}
      </div>
    </Modal>
  );
};

function paraForm(e: Entidade): FormEntidade {
  const s = (v: string | number | null | undefined) => (v === null || v === undefined ? '' : String(v));
  return {
    ...FORM_ENTIDADE_VAZIO, razao_social: e.razao_social, nome_fantasia: e.nome_fantasia, cnpj: e.cnpj, inscricao_estadual: s(e.inscricao_estadual), inscricao_municipal: s(e.inscricao_municipal),
    endereco: e.endereco, cep: e.cep, cidade: e.cidade, uf: e.uf, telefone: s(e.telefone), celular: e.celular, email: e.email, representante_legal: e.representante_legal,
    rg_representante: s(e.rg_representante), cargo_representante: e.cargo_representante, tempo_funcionamento_anos: s(e.tempo_funcionamento_anos), area_atuacao: e.area_atuacao,
    finalidade: e.finalidade, numero_beneficiarios: s(e.numero_beneficiarios), certificacoes: s(e.certificacoes), banco: s(e.banco), agencia: s(e.agencia), conta: s(e.conta), chave_pix: s(e.chave_pix),
  };
}

/** Dados enviados na edição: sem e-mail (é o login) e sem CPF quando não foi redigitado. */
export function dadosEdicao(form: FormEntidade, comCnpj: boolean): Record<string, string | number | null> {
  const dados = paraDadosEntidade(form);
  delete dados.email;
  if (!form.cpf_representante.trim()) delete dados.cpf_representante;
  if (!comCnpj) delete dados.cnpj;
  return dados;
}

export { paraForm as entidadeParaForm };

const EditarEntidadeModal: React.FC<{ entidade: Entidade | null; onFechar: () => void; onSalvo: (e: Entidade) => void }> = ({ entidade, onFechar, onSalvo }) => {
  const [form, setForm] = useState<FormEntidade>(FORM_ENTIDADE_VAZIO);
  const [atual, setAtual] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if ((entidade?.id ?? null) !== atual) { setAtual(entidade?.id ?? null); if (entidade) setForm(paraForm(entidade)); setErro(null); }
  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!entidade) return;
    setSalvando(true); setErro(null);
    try { onSalvo(await inservivelApi.atualizarEntidade(entidade.id, dadosEdicao(form, true))); } catch (e) { setErro(erroApi(e).mensagem); } finally { setSalvando(false); }
  };
  return (
    <Modal open={entidade !== null} onClose={onFechar} title="Editar entidade" size="2xl"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-editar-entidade" isLoading={salvando}>Salvar</Button></>}>
      <form id="form-editar-entidade" onSubmit={salvar} className="space-y-3">
        {erro && <AlertCard priority="danger" title="Não foi possível salvar" description={erro} />}
        <p className="text-xs text-muted-foreground">O e-mail é o login da entidade e não muda aqui. O CPF atual é {entidade?.cpf_representante_mascarado}; preencha só para trocar.</p>
        <CamposEntidadeForm form={form} onChange={setForm} bloquear={['email']} cpfOpcional />
      </form>
    </Modal>
  );
};

const SenhaModal: React.FC<{
  aberto: boolean; titulo: string; onFechar: () => void; onEnviar: (senha: string) => Promise<void>;
  perigo?: boolean; rotulo?: string; botao?: string; aviso?: React.ReactNode;
}> = ({ aberto, titulo, onFechar, onEnviar, perigo = false, rotulo = 'Nova senha (mínimo 8 caracteres)', botao = 'Salvar', aviso }) => {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fechar = () => { setSenha(''); setErro(null); onFechar(); };
  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setEnviando(true); setErro(null);
    try { await onEnviar(senha); setSenha(''); } catch (e) { setErro(erroApi(e).mensagem); } finally { setEnviando(false); }
  };
  return (
    <Modal open={aberto} onClose={fechar} title={titulo} size="md"
      footer={<><Button variant="outline" onClick={fechar} disabled={enviando}>Cancelar</Button><Button variant={perigo ? 'destructive' : 'primary'} type="submit" form={`form-senha-${botao}`} isLoading={enviando} disabled={!senha}>{botao}</Button></>}>
      <form id={`form-senha-${botao}`} onSubmit={enviar} className="space-y-3 text-sm">
        {aviso && <p>{aviso}</p>}
        <Input label={rotulo} type="password" autoComplete={perigo ? 'current-password' : 'new-password'} value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={perigo ? undefined : 8} />
        {erro && <AlertCard priority="danger" title="Não foi possível concluir" description={erro} />}
      </form>
    </Modal>
  );
};
