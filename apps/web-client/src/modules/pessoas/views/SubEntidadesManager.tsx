import React, { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldAlert, Search, Loader2, MapPin, FileText, Phone } from 'lucide-react';
import { Button, Modal, StatusChip, Input, Field, Select, Switch } from '@/components/ui';
import type { Pessoa, PessoaDocumento, PessoaEndereco, PessoaContato } from '../api';
import { useSubEntidades } from '../hooks/useSubEntidades';
import { useCep } from '../hooks/useCep';
import { ErroBox, Mono, formatarData } from './comum';

interface SubEntidadesManagerProps {
  pessoa: Pessoa;
  podeGerenciar: boolean;
  onAtualizado: () => Promise<void> | void;
}

export const SubEntidadesManager: React.FC<SubEntidadesManagerProps> = ({
  pessoa,
  podeGerenciar,
  onAtualizado,
}) => {
  const {
    salvando,
    excluindo,
    erro,
    limparErro,
    adicionarDocumento,
    atualizarDocumento,
    excluirDocumento,
    adicionarEndereco,
    atualizarEndereco,
    excluirEndereco,
    adicionarContato,
    atualizarContato,
    excluirContato,
  } = useSubEntidades(onAtualizado);

  const { buscando: buscandoCep, erro: erroCep, buscarCep, limparErroCep } = useCep();
  const [cepMensagemSucesso, setCepMensagemSucesso] = useState<string | null>(null);

  // Estados de modal para Documento
  const [modalDoc, setModalDoc] = useState<{ aberto: boolean; item?: PessoaDocumento }>({ aberto: false });
  const [docExcluindo, setDocExcluindo] = useState<PessoaDocumento | null>(null);
  const [formDoc, setFormDoc] = useState({
    tipo: 'rg' as PessoaDocumento['tipo'],
    numero: '',
    orgao_emissor: '',
    uf_emissao: '',
    data_emissao: '',
  });

  // Estados de modal para Endereço
  const [modalEnd, setModalEnd] = useState<{ aberto: boolean; item?: PessoaEndereco }>({ aberto: false });
  const [endExcluindo, setEndExcluindo] = useState<PessoaEndereco | null>(null);
  const [formEnd, setFormEnd] = useState({
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  // Estados de modal para Contato
  const [modalCtc, setModalCtc] = useState<{ aberto: boolean; item?: PessoaContato }>({ aberto: false });
  const [ctcExcluindo, setCtcExcluindo] = useState<PessoaContato | null>(null);
  const [formCtc, setFormCtc] = useState({
    tipo: 'celular' as PessoaContato['tipo'],
    valor: '',
    principal: true,
    autoriza_notificacoes: true,
  });

  // Handlers Documento
  const abrirCriarDoc = () => {
    limparErro();
    setFormDoc({ tipo: 'rg', numero: '', orgao_emissor: '', uf_emissao: '', data_emissao: '' });
    setModalDoc({ aberto: true });
  };

  const abrirEditarDoc = (doc: PessoaDocumento) => {
    limparErro();
    setFormDoc({
      tipo: doc.tipo,
      numero: doc.numero,
      orgao_emissor: doc.orgao_emissor ?? '',
      uf_emissao: doc.uf_emissao ?? '',
      data_emissao: doc.data_emissao ?? '',
    });
    setModalDoc({ aberto: true, item: doc });
  };

  const salvarDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalDoc.item) {
      const res = await atualizarDocumento(pessoa.id, modalDoc.item.id, formDoc);
      if (res) setModalDoc({ aberto: false });
    } else {
      const res = await adicionarDocumento(pessoa.id, formDoc);
      if (res) setModalDoc({ aberto: false });
    }
  };

  const confirmarExcluirDoc = async () => {
    if (!docExcluindo) return;
    const res = await excluirDocumento(pessoa.id, docExcluindo.id);
    if (res) setDocExcluindo(null);
  };

  // Handlers Endereço com Busca de CEP integrada
  const abrirCriarEnd = () => {
    limparErro();
    limparErroCep();
    setCepMensagemSucesso(null);
    setFormEnd({ cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' });
    setModalEnd({ aberto: true });
  };

  const abrirEditarEnd = (end: PessoaEndereco) => {
    limparErro();
    limparErroCep();
    setCepMensagemSucesso(null);
    setFormEnd({
      cep: end.cep ?? '',
      logradouro: end.logradouro ?? '',
      numero: end.numero ?? '',
      complemento: end.complemento ?? '',
      bairro: end.bairro ?? '',
      cidade: end.cidade ?? '',
      uf: end.uf ?? '',
    });
    setModalEnd({ aberto: true, item: end });
  };

  const handleConsultarCep = async (cepParaBuscar?: string) => {
    limparErroCep();
    setCepMensagemSucesso(null);
    const cepAlvo = cepParaBuscar ?? formEnd.cep;
    const res = await buscarCep(cepAlvo);
    if (res) {
      setFormEnd((prev) => ({
        ...prev,
        cep: res.cep || prev.cep,
        logradouro: res.logradouro || prev.logradouro,
        bairro: res.bairro || prev.bairro,
        cidade: res.localidade || prev.cidade,
        uf: res.uf || prev.uf,
      }));
      setCepMensagemSucesso(`Localizado: ${res.localidade}/${res.uf}`);
    }
  };

  const handleCepInput = (valor: string) => {
    const limpo = valor.replace(/\D/g, '').slice(0, 8);
    const formatado = limpo.length > 5 ? `${limpo.slice(0, 5)}-${limpo.slice(5)}` : limpo;
    setFormEnd((e) => ({ ...e, cep: formatado }));

    if (limpo.length === 8) {
      void handleConsultarCep(limpo);
    }
  };

  const salvarEnd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalEnd.item) {
      const res = await atualizarEndereco(pessoa.id, modalEnd.item.id, formEnd);
      if (res) setModalEnd({ aberto: false });
    } else {
      const res = await adicionarEndereco(pessoa.id, formEnd);
      if (res) setModalEnd({ aberto: false });
    }
  };

  const confirmarExcluirEnd = async () => {
    if (!endExcluindo) return;
    const res = await excluirEndereco(pessoa.id, endExcluindo.id);
    if (res) setEndExcluindo(null);
  };

  // Handlers Contato
  const abrirCriarCtc = () => {
    limparErro();
    setFormCtc({ tipo: 'celular', valor: '', principal: true, autoriza_notificacoes: true });
    setModalCtc({ aberto: true });
  };

  const abrirEditarCtc = (ctc: PessoaContato) => {
    limparErro();
    setFormCtc({
      tipo: ctc.tipo,
      valor: ctc.valor,
      principal: ctc.principal,
      autoriza_notificacoes: ctc.autoriza_notificacoes,
    });
    setModalCtc({ aberto: true, item: ctc });
  };

  const salvarCtc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalCtc.item) {
      const res = await atualizarContato(pessoa.id, modalCtc.item.id, formCtc);
      if (res) setModalCtc({ aberto: false });
    } else {
      const res = await adicionarContato(pessoa.id, formCtc);
      if (res) setModalCtc({ aberto: false });
    }
  };

  const confirmarExcluirCtc = async () => {
    if (!ctcExcluindo) return;
    const res = await excluirContato(pessoa.id, ctcExcluindo.id);
    if (res) setCtcExcluindo(null);
  };

  return (
    <div className="space-y-6">
      <ErroBox erro={erro} />

      {/* GRID DE SUB-ENTIDADES */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* SEÇÃO DOCUMENTOS */}
        <div className="flex flex-col rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Documentos</h3>
            </div>
            {podeGerenciar && (
              <Button size="xs" variant="outline" onClick={abrirCriarDoc}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar
              </Button>
            )}
          </div>

          <ul className="flex-1 space-y-2">
            {(pessoa.documentos ?? []).map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 p-2.5 text-sm"
              >
                <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold uppercase text-xs text-muted-foreground">{d.tipo}</span>
                    <Mono className="font-semibold text-foreground">{d.numero}</Mono>
                  </div>
                  <div className="text-xs text-muted-foreground truncate" title={[d.orgao_emissor ? `Órgão: ${d.orgao_emissor}` : null, d.uf_emissao ? `UF: ${d.uf_emissao}` : null, d.data_emissao ? `Emissão: ${formatarData(d.data_emissao)}` : null].filter(Boolean).join(' • ') || 'Sem dados complementares'}>
                    {[
                      d.orgao_emissor ? `Órgão: ${d.orgao_emissor}` : null,
                      d.uf_emissao ? `UF: ${d.uf_emissao}` : null,
                      d.data_emissao ? `Emissão: ${formatarData(d.data_emissao)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' • ') || 'Sem dados complementares'}
                  </div>
                </div>
                {podeGerenciar && (
                  <div className="flex items-center gap-1">
                    <Button size="xs" variant="ghost" onClick={() => abrirEditarDoc(d)} title="Editar documento">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDocExcluindo(d)}
                      title="Excluir documento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
            {(pessoa.documentos ?? []).length === 0 && (
              <li className="py-6 text-center text-xs text-muted-foreground">Nenhum documento cadastrado.</li>
            )}
          </ul>
        </div>

        {/* SEÇÃO ENDEREÇOS */}
        <div className="flex flex-col rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Endereços</h3>
            </div>
            {podeGerenciar && (
              <Button size="xs" variant="outline" onClick={abrirCriarEnd}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar
              </Button>
            )}
          </div>

          <ul className="flex-1 space-y-2">
            {(pessoa.enderecos ?? []).map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 p-2.5 text-sm"
              >
                <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                  <div className="font-medium text-foreground text-xs truncate" title={[e.logradouro, e.numero].filter(Boolean).join(', ') + (e.complemento ? ` - ${e.complemento}` : '')}>
                    {[e.logradouro, e.numero].filter(Boolean).join(', ') || 'Logradouro não informado'}
                    {e.complemento ? ` - ${e.complemento}` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground truncate" title={[e.bairro, [e.cidade, e.uf].filter(Boolean).join('/'), e.cep ? `CEP: ${e.cep}` : null].filter(Boolean).join(' • ')}>
                    {[
                      e.bairro,
                      [e.cidade, e.uf].filter(Boolean).join('/'),
                      e.cep ? `CEP: ${e.cep}` : null,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </div>
                </div>
                {podeGerenciar && (
                  <div className="flex items-center gap-1">
                    <Button size="xs" variant="ghost" onClick={() => abrirEditarEnd(e)} title="Editar endereço">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setEndExcluindo(e)}
                      title="Excluir endereço"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
            {(pessoa.enderecos ?? []).length === 0 && (
              <li className="py-6 text-center text-xs text-muted-foreground">Nenhum endereço cadastrado.</li>
            )}
          </ul>
        </div>

        {/* SEÇÃO CONTATOS */}
        <div className="flex flex-col rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Contatos</h3>
            </div>
            {podeGerenciar && (
              <Button size="xs" variant="outline" onClick={abrirCriarCtc}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar
              </Button>
            )}
          </div>

          <ul className="flex-1 space-y-2">
            {(pessoa.contatos ?? []).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 p-2.5 text-sm"
              >
                <div className="space-y-1 min-w-0 flex-1 mr-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <Mono className="font-medium text-foreground text-xs truncate max-w-[220px]" title={c.valor}>{c.valor}</Mono>
                    <StatusChip label={c.tipo} variant="neutral" />
                    {c.principal && <StatusChip label="Principal" variant="success" />}
                  </div>
                </div>
                {podeGerenciar && (
                  <div className="flex items-center gap-1">
                    <Button size="xs" variant="ghost" onClick={() => abrirEditarCtc(c)} title="Editar contato">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setCtcExcluindo(c)}
                      title="Excluir contato"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
            {(pessoa.contatos ?? []).length === 0 && (
              <li className="py-6 text-center text-xs text-muted-foreground">Nenhum contato cadastrado.</li>
            )}
          </ul>
        </div>
      </div>

      {/* MODAL FORM DOCUMENTO (SIZE LG) */}
      <Modal
        open={modalDoc.aberto}
        onClose={() => setModalDoc({ aberto: false })}
        title={modalDoc.item ? 'Editar documento civil' : 'Adicionar documento civil'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setModalDoc({ aberto: false })}>
              Cancelar
            </Button>
            <Button type="submit" form="form-sub-documento" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar Documento'}
            </Button>
          </div>
        }
      >
        <form id="form-sub-documento" onSubmit={salvarDoc} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Tipo de Documento" required>
                <Select
                  value={formDoc.tipo}
                  onChange={(v) =>
                    setFormDoc({
                      ...formDoc,
                      tipo: (v as PessoaDocumento['tipo']) || 'rg',
                    })
                  }
                  options={[
                    { value: 'rg', label: 'RG — Registro Geral' },
                    { value: 'cnh', label: 'CNH — Carteira Nacional de Habilitação' },
                    { value: 'titulo_eleitor', label: 'Título de Eleitor' },
                  ]}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Número do Documento" required>
                <Input
                  className="font-mono tabular-nums"
                  placeholder="Ex: 12.345.678-9"
                  value={formDoc.numero}
                  onChange={(e) => setFormDoc({ ...formDoc, numero: e.target.value })}
                  required
                />
              </Field>
            </div>

            <div>
              <Field label="Órgão Emissor">
                <Input
                  placeholder="Ex: SSP, DETRAN, Cartório"
                  value={formDoc.orgao_emissor}
                  onChange={(e) => setFormDoc({ ...formDoc, orgao_emissor: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <Field label="UF de Emissão">
                <Input
                  className="font-mono uppercase"
                  maxLength={2}
                  placeholder="PR"
                  value={formDoc.uf_emissao}
                  onChange={(e) => setFormDoc({ ...formDoc, uf_emissao: e.target.value.toUpperCase() })}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Data de Emissão">
                <Input
                  type="date"
                  className="font-mono tabular-nums"
                  value={formDoc.data_emissao}
                  onChange={(e) => setFormDoc({ ...formDoc, data_emissao: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL FORM ENDEREÇO (SIZE XL COM BUSCA DE CEP) */}
      <Modal
        open={modalEnd.aberto}
        onClose={() => setModalEnd({ aberto: false })}
        title={modalEnd.item ? 'Editar endereço' : 'Adicionar endereço'}
        description="Preenchimento automático inteligente com consulta pública de CEP."
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setModalEnd({ aberto: false })}>
              Cancelar
            </Button>
            <Button type="submit" form="form-sub-endereco" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar Endereço'}
            </Button>
          </div>
        }
      >
        <form id="form-sub-endereco" onSubmit={salvarEnd} className="space-y-4">
          {/* BARRA DE CEP COM API INTEGRADA */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-48">
                <Field label="CEP" hint="Digite os 8 dígitos">
                  <Input
                    className="font-mono tabular-nums font-semibold"
                    placeholder="00000-000"
                    value={formEnd.cep}
                    onChange={(e) => handleCepInput(e.target.value)}
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mb-1"
                disabled={buscandoCep}
                onClick={() => void handleConsultarCep()}
              >
                {buscandoCep ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando…
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" /> Consultar CEP
                  </>
                )}
              </Button>
              {cepMensagemSucesso && (
                <span className="mb-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ {cepMensagemSucesso}
                </span>
              )}
              {erroCep && (
                <span className="mb-2 text-xs font-medium text-destructive">
                  ✕ {erroCep}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Logradouro (Rua, Avenida, Praça)">
                <Input
                  placeholder="Ex: Avenida Brasil"
                  value={formEnd.logradouro}
                  onChange={(e) => setFormEnd({ ...formEnd, logradouro: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <Field label="Número">
                <Input
                  className="font-mono tabular-nums"
                  placeholder="123"
                  value={formEnd.numero}
                  onChange={(e) => setFormEnd({ ...formEnd, numero: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <Field label="Complemento">
                <Input
                  placeholder="Apto, Sala, Bloco"
                  value={formEnd.complemento}
                  onChange={(e) => setFormEnd({ ...formEnd, complemento: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <Field label="Bairro">
                <Input
                  placeholder="Centro"
                  value={formEnd.bairro}
                  onChange={(e) => setFormEnd({ ...formEnd, bairro: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <Field label="Cidade">
                <Input
                  placeholder="Curitiba"
                  value={formEnd.cidade}
                  onChange={(e) => setFormEnd({ ...formEnd, cidade: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <Field label="UF">
                <Input
                  className="font-mono uppercase"
                  maxLength={2}
                  placeholder="PR"
                  value={formEnd.uf}
                  onChange={(e) => setFormEnd({ ...formEnd, uf: e.target.value.toUpperCase() })}
                />
              </Field>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL FORM CONTATO (SIZE LG) */}
      <Modal
        open={modalCtc.aberto}
        onClose={() => setModalCtc({ aberto: false })}
        title={modalCtc.item ? 'Editar contato' : 'Adicionar canal de contato'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setModalCtc({ aberto: false })}>
              Cancelar
            </Button>
            <Button type="submit" form="form-sub-contato" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar Contato'}
            </Button>
          </div>
        }
      >
        <form id="form-sub-contato" onSubmit={salvarCtc} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Tipo de Contato" required>
                <Select
                  value={formCtc.tipo}
                  onChange={(v) =>
                    setFormCtc({
                      ...formCtc,
                      tipo: (v as PessoaContato['tipo']) || 'celular',
                    })
                  }
                  options={[
                    { value: 'celular', label: 'Celular (WhatsApp / SMS)' },
                    { value: 'email', label: 'E-mail' },
                    { value: 'telefone', label: 'Telefone Fixo' },
                  ]}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field
                label="Valor do Contato"
                required
                hint={formCtc.tipo === 'email' ? 'Ex: usuario@orgao.gov.br' : 'Ex: (41) 99999-1234'}
              >
                <Input
                  className="font-mono tabular-nums"
                  placeholder={formCtc.tipo === 'email' ? 'contato@dominio.com.br' : '(00) 00000-0000'}
                  value={formCtc.valor}
                  onChange={(e) => setFormCtc({ ...formCtc, valor: e.target.value })}
                  required
                />
              </Field>
            </div>

            <div className="sm:col-span-2 space-y-2 pt-2 border-t border-border">
              <Switch
                label="Definir como contato principal deste tipo"
                checked={formCtc.principal}
                onCheckedChange={(v) => setFormCtc({ ...formCtc, principal: v })}
              />
              <Switch
                label="Autoriza o recebimento de notificações oficiais"
                checked={formCtc.autoriza_notificacoes}
                onCheckedChange={(v) => setFormCtc({ ...formCtc, autoriza_notificacoes: v })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAIS DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal
        open={docExcluindo !== null}
        onClose={() => setDocExcluindo(null)}
        title="Confirmar exclusão de documento"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setDocExcluindo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" type="button" disabled={excluindo} onClick={() => void confirmarExcluirDoc()}>
              {excluindo ? 'Excluindo…' : 'Excluir documento'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Deseja realmente remover o documento <span className="font-semibold uppercase">{docExcluindo?.tipo}</span> de número{' '}
          <Mono className="font-semibold text-foreground">{docExcluindo?.numero}</Mono>?
        </p>
      </Modal>

      <Modal
        open={endExcluindo !== null}
        onClose={() => setEndExcluindo(null)}
        title="Confirmar exclusão de endereço"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setEndExcluindo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" type="button" disabled={excluindo} onClick={() => void confirmarExcluirEnd()}>
              {excluindo ? 'Excluindo…' : 'Excluir endereço'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Deseja realmente remover o endereço{' '}
          <span className="font-semibold text-foreground">
            {[endExcluindo?.logradouro, endExcluindo?.numero, endExcluindo?.bairro].filter(Boolean).join(', ')}
          </span>
          ?
        </p>
      </Modal>

      <Modal
        open={ctcExcluindo !== null}
        onClose={() => setCtcExcluindo(null)}
        title="Confirmar exclusão de contato"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setCtcExcluindo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" type="button" disabled={excluindo} onClick={() => void confirmarExcluirCtc()}>
              {excluindo ? 'Excluindo…' : 'Excluir contato'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Deseja realmente remover o contato{' '}
            <Mono className="font-semibold text-foreground">{ctcExcluindo?.valor}</Mono> ({ctcExcluindo?.tipo})?
          </p>
          {ctcExcluindo?.principal && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Atenção:</strong> Este é o contato principal para o tipo{' '}
                <span className="font-semibold uppercase">{ctcExcluindo?.tipo}</span>. Caso haja outros contatos deste tipo,
                o sistema elegerá automaticamente o próximo como principal.
              </span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SubEntidadesManager;
