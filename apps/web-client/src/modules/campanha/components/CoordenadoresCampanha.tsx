import React, { useState } from 'react';
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { AlertCard, Button, Card, CardContent, Input, Modal, Select, Skeleton, StatusChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@sysgov/ui';
import { EmptyState } from '@/components/ui';
import { erroApi } from '../../escola/api';
import { ConfirmarModal } from '../../escola/components/ConfirmarModal';
import { useCarga } from '../../escola/useCarga';
import { campanhaApi, type Coordenador, type TipoCoordenador } from '../api';
import { ROTULO_TIPO_COORDENADOR, formatarNumero } from '../formato';
import type { PropsAba } from '../ModuloCampanhaMain';
import { SelectMunicipio, nomeDoMunicipio, useMunicipiosDaCampanha, vazioParaNulo } from './Comuns';

const VAZIO = { nome: '', tipo: 'regional' as TipoCoordenador, cpf: '', codigo_ibge: null as number | null, regiao: '', meta_votos: '0', telefone: '', whatsapp: '', email: '', observacoes: '' };

/** Coordenadores estaduais, regionais e municipais da campanha (spec: Coordenadores e cabos eleitorais). */
export const CoordenadoresCampanha: React.FC<PropsAba> = ({ campanha, permissoes, avisar, alterou, versao }) => {
  const lista = useCarga(() => campanhaApi.coordenadores(), [campanha.id, versao]);
  const municipios = useMunicipiosDaCampanha(campanha.id);
  const [editando, setEditando] = useState<Coordenador | 'novo' | null>(null);
  const [excluir, setExcluir] = useState<Coordenador | null>(null);

  if (lista.erro) return <AlertCard priority="danger" title="Não foi possível carregar os coordenadores" description={lista.erro} actionLabel="Tentar novamente" onAction={() => void lista.recarregar()} />;
  if (!lista.dados) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground"><span className="font-mono tabular-nums">{lista.dados.length}</span> coordenador(es)</p>
          {permissoes.equipes && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditando('novo')}>Novo coordenador</Button>}
        </div>
        {lista.dados.length === 0 ? <EmptyState icon={<UserCog className="h-8 w-8" />} title="Nenhum coordenador" description="Cadastre os coordenadores estaduais, regionais e municipais da campanha." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Atuação</TableHead><TableHead className="text-right">Meta</TableHead><TableHead>WhatsApp</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {lista.dados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}{c.cpf_mascarado && <p className="font-mono text-xs tabular-nums text-muted-foreground">CPF {c.cpf_mascarado}</p>}</TableCell>
                  <TableCell><StatusChip label={ROTULO_TIPO_COORDENADOR[c.tipo]} variant={c.tipo === 'estadual' ? 'primary' : c.tipo === 'regional' ? 'info' : 'neutral'} /></TableCell>
                  <TableCell className="text-sm">{c.codigo_ibge ? nomeDoMunicipio(municipios.dados, c.codigo_ibge) : c.regiao ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatarNumero(c.meta_votos)}</TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">{c.whatsapp ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {permissoes.equipes && (<>
                      <Button size="icon-sm" variant="ghost" aria-label={`Editar ${c.nome}`} onClick={() => setEditando(c)}><Pencil /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label={`Excluir ${c.nome}`} onClick={() => setExcluir(c)}><Trash2 /></Button>
                    </>)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CoordenadorModal registro={editando} municipios={municipios.dados} onFechar={() => setEditando(null)} onSalvo={(nome) => { setEditando(null); avisar({ type: 'success', title: 'Coordenador salvo', message: nome }); alterou(); }} />
      <ConfirmarModal
        aberto={excluir !== null}
        titulo="Excluir coordenador"
        mensagem={<>Excluir <strong>{excluir?.nome}</strong>? Coordenador responsável por municípios ou cabos precisa ser trocado antes.</>}
        rotuloConfirmar="Excluir"
        perigo
        onFechar={() => setExcluir(null)}
        onConfirmar={async () => {
          if (!excluir) return;
          try {
            await campanhaApi.excluirCoordenador(excluir.id);
            alterou();
          } catch (e) {
            avisar({ type: 'error', title: 'Não foi possível excluir', message: erroApi(e).mensagem });
          }
        }}
      />
    </Card>
  );
};

const CoordenadorModal: React.FC<{ registro: Coordenador | 'novo' | null; municipios: Parameters<typeof SelectMunicipio>[0]['municipios']; onFechar: () => void; onSalvo: (nome: string) => void }> = ({ registro, municipios, onFechar, onSalvo }) => {
  const [form, setForm] = useState(VAZIO);
  const [atual, setAtual] = useState<Coordenador | 'novo' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  if (registro !== atual) {
    setAtual(registro);
    setForm(registro && registro !== 'novo' ? {
      nome: registro.nome, tipo: registro.tipo, cpf: '', codigo_ibge: registro.codigo_ibge, regiao: registro.regiao ?? '', meta_votos: String(registro.meta_votos),
      telefone: registro.telefone ?? '', whatsapp: registro.whatsapp ?? '', email: registro.email ?? '', observacoes: registro.observacoes ?? '',
    } : VAZIO);
    setErro(null);
  }
  const texto = (campo: keyof typeof VAZIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const salvo = await campanhaApi.salvarCoordenador(registro && registro !== 'novo' ? registro.id : null, {
        nome: form.nome.trim(), tipo: form.tipo, ...(form.cpf.trim() ? { cpf: form.cpf.trim() } : {}), codigo_ibge: form.codigo_ibge, regiao: vazioParaNulo(form.regiao),
        meta_votos: Number(form.meta_votos) || 0, telefone: vazioParaNulo(form.telefone), whatsapp: vazioParaNulo(form.whatsapp), email: vazioParaNulo(form.email), observacoes: vazioParaNulo(form.observacoes),
      });
      onSalvo(salvo.nome);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={registro !== null} onClose={onFechar} title={registro === 'novo' ? 'Novo coordenador' : 'Editar coordenador'} icon={<UserCog className="h-5 w-5" />} size="lg"
      footer={<><Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button><Button type="submit" form="form-coordenador" isLoading={salvando}>Salvar</Button></>}>
      <form id="form-coordenador" onSubmit={salvar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Input label="Nome *" value={form.nome} onChange={texto('nome')} required maxLength={200} />
          <Select label="Tipo" value={form.tipo} onChange={(v) => setForm((f) => ({ ...f, tipo: v as TipoCoordenador }))} options={(Object.keys(ROTULO_TIPO_COORDENADOR) as TipoCoordenador[]).map((t) => ({ value: t, label: ROTULO_TIPO_COORDENADOR[t] }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={registro !== 'novo' && registro?.cpf_mascarado ? `CPF (atual ${registro.cpf_mascarado})` : 'CPF (opcional)'} value={form.cpf} onChange={texto('cpf')} maxLength={14} className="font-mono tabular-nums" />
          <SelectMunicipio label="Município de atuação" municipios={municipios} value={form.codigo_ibge} onChange={(v) => setForm((f) => ({ ...f, codigo_ibge: v }))} opcional />
          <Input label="Região" value={form.regiao} onChange={texto('regiao')} maxLength={150} placeholder="Ex.: Norte Pioneiro" />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Meta de votos" type="number" min={0} value={form.meta_votos} onChange={texto('meta_votos')} className="font-mono tabular-nums" />
          <Input label="Telefone" value={form.telefone} onChange={texto('telefone')} maxLength={20} className="font-mono tabular-nums" />
          <Input label="WhatsApp" value={form.whatsapp} onChange={texto('whatsapp')} maxLength={20} className="font-mono tabular-nums" />
          <Input label="E-mail" type="email" value={form.email} onChange={texto('email')} maxLength={150} />
        </div>
        <label className="block space-y-1 text-sm font-medium">Observações<Textarea rows={2} value={form.observacoes} onChange={texto('observacoes')} maxLength={5000} /></label>
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
};
