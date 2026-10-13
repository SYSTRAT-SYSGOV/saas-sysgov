import React, { useEffect, useState } from 'react';
import { Palette, Pencil, Plus, Save, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Skeleton, Textarea } from '@sysgov/ui';
import { definirCampanhaAtiva } from '@/core/campanha/campanhaAtiva';
import { erroApi } from '../../escola/api';
import { campanhaApi, type Campanha, type Faixas, type Situacao } from '../api';
import { ROTULO_SITUACAO, SITUACOES, formatarData, formatarNumero } from '../formato';
import { useCarga } from '../../escola/useCarga';
import type { PropsAba } from '../ModuloCampanhaMain';
import { CampanhaFormModal } from './CampanhaForm';
import { vazioParaNulo } from './Comuns';

/** Dados da campanha, candidato, membros e cores/faixas do mapa (spec: Campanhas e candidato, Configuração). */
export const ConfiguracaoCampanha: React.FC<PropsAba> = (props) => {
  const { campanha, permissoes, contexto, recarregarCampanha, avisar } = props;
  const [editando, setEditando] = useState<Campanha | 'nova' | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Campanha</CardTitle>
          {permissoes.gestao && (
            <div className="flex gap-2">
              <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditando(campanha)}>Editar dados</Button>
              <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditando('nova')}>Nova campanha</Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-5">
          <p><span className="block text-xs text-muted-foreground">Nome</span>{campanha.nome}</p>
          <p><span className="block text-xs text-muted-foreground">Cargo</span>{campanha.cargo}</p>
          <p><span className="block text-xs text-muted-foreground">Eleição</span><span className="font-mono tabular-nums">{campanha.ano}</span> · {campanha.uf}</p>
          <p><span className="block text-xs text-muted-foreground">Meta global</span><span className="font-mono tabular-nums">{formatarNumero(campanha.meta_votos_global)}</span></p>
          <p><span className="block text-xs text-muted-foreground">Status</span>{campanha.status === 'ativa' ? 'Ativa' : 'Encerrada'}</p>
        </CardContent>
      </Card>
      <CandidatoCard {...props} />
      {permissoes.gestao && <MembrosCard {...props} />}
      <LgpdCard {...props} />
      <CoresCard {...props} />
      <CampanhaFormModal
        campanha={editando}
        onFechar={() => setEditando(null)}
        onSalva={async (c, nova) => {
          setEditando(null);
          avisar({ type: 'success', title: nova ? 'Campanha criada' : 'Campanha atualizada', message: c.nome });
          if (nova) definirCampanhaAtiva(c.id);
          await contexto.recarregarCampanhas();
          if (!nova) await recarregarCampanha();
        }}
      />
    </div>
  );
};

const CAMPOS_CANDIDATO = ['nome_completo', 'nome_urna', 'partido', 'numero', 'coligacao', 'telefone', 'whatsapp', 'email', 'instagram', 'facebook', 'tiktok', 'youtube', 'site', 'cargo_ultima_eleicao', 'biografia', 'observacoes'] as const;
type CampoCandidato = (typeof CAMPOS_CANDIDATO)[number];

const CandidatoCard: React.FC<PropsAba> = ({ campanha, permissoes, avisar, recarregarCampanha, contexto }) => {
  const c = campanha.candidato;
  const inicial = (): Record<CampoCandidato, string> & { cpf: string; votos: string } => ({
    ...Object.fromEntries(CAMPOS_CANDIDATO.map((k) => [k, (c?.[k] as string | null | undefined) ?? ''])) as Record<CampoCandidato, string>,
    cpf: '', votos: c?.votos_ultima_eleicao ? String(c.votos_ultima_eleicao) : '',
  });
  const [form, setForm] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const campo = (k: CampoCandidato | 'cpf' | 'votos') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const ro = !permissoes.gestao;

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await campanhaApi.salvarCandidato(campanha.id, {
        ...Object.fromEntries(CAMPOS_CANDIDATO.map((k) => [k, k === 'nome_urna' ? form[k].trim() : vazioParaNulo(form[k])])),
        ...(form.cpf.trim() ? { cpf: form.cpf.trim() } : {}),
        votos_ultima_eleicao: form.votos ? Number(form.votos) : null,
      });
      avisar({ type: 'success', title: 'Candidato salvo', message: form.nome_urna });
      setForm((f) => ({ ...f, cpf: '' }));
      await Promise.all([recarregarCampanha(), contexto.recarregarCampanhas()]);
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary" />Candidato</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={salvar} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <Input label={c?.cpf_mascarado ? `CPF (atual ${c.cpf_mascarado})` : 'CPF *'} value={form.cpf} onChange={campo('cpf')} maxLength={14} required={!c} disabled={ro} className="font-mono tabular-nums" />
            <Input label="Nome completo" value={form.nome_completo} onChange={campo('nome_completo')} maxLength={255} disabled={ro || !!c} />
            <Input label="Nome de urna *" value={form.nome_urna} onChange={campo('nome_urna')} required maxLength={200} disabled={ro} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Partido" value={form.partido} onChange={campo('partido')} maxLength={50} disabled={ro} />
              <Input label="Número" value={form.numero} onChange={campo('numero')} maxLength={15} disabled={ro} className="font-mono tabular-nums" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Input label="Coligação" value={form.coligacao} onChange={campo('coligacao')} maxLength={255} disabled={ro} />
            <Input label="Telefone" value={form.telefone} onChange={campo('telefone')} maxLength={20} disabled={ro} className="font-mono tabular-nums" />
            <Input label="WhatsApp" value={form.whatsapp} onChange={campo('whatsapp')} maxLength={20} disabled={ro} className="font-mono tabular-nums" />
            <Input label="E-mail" type="email" value={form.email} onChange={campo('email')} maxLength={150} disabled={ro} />
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            <Input label="Instagram" value={form.instagram} onChange={campo('instagram')} maxLength={100} disabled={ro} />
            <Input label="Facebook" value={form.facebook} onChange={campo('facebook')} maxLength={100} disabled={ro} />
            <Input label="TikTok" value={form.tiktok} onChange={campo('tiktok')} maxLength={100} disabled={ro} />
            <Input label="YouTube" value={form.youtube} onChange={campo('youtube')} maxLength={100} disabled={ro} />
            <Input label="Site" value={form.site} onChange={campo('site')} maxLength={255} disabled={ro} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
            <Input label="Votos na última eleição" type="number" min={0} value={form.votos} onChange={campo('votos')} disabled={ro} className="font-mono tabular-nums" />
            <Input label="Cargo na última eleição" value={form.cargo_ultima_eleicao} onChange={campo('cargo_ultima_eleicao')} maxLength={100} disabled={ro} />
          </div>
          <label className="block space-y-1 text-sm font-medium">Biografia<Textarea rows={3} value={form.biografia} onChange={campo('biografia')} maxLength={10000} disabled={ro} /></label>
          {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
          {!ro && <Button type="submit" leftIcon={<Save className="h-4 w-4" />} isLoading={salvando}>Salvar candidato</Button>}
        </form>
      </CardContent>
    </Card>
  );
};

const MembrosCard: React.FC<PropsAba> = ({ campanha, avisar }) => {
  const [usuarios, setUsuarios] = useState<{ id: number; nome: string; email: string }[] | null>(null);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    Promise.all([campanhaApi.usuariosDisponiveis(campanha.id), campanhaApi.membros(campanha.id)])
      .then(([u, m]) => { if (!cancelado) { setUsuarios(u); setMarcados(new Set(m.map((x) => x.user_id))); } })
      .catch((e) => avisar({ type: 'error', title: 'Não foi possível carregar os membros', message: erroApi(e).mensagem }));
    return () => { cancelado = true; };
  }, [campanha.id, avisar]);

  const salvar = async () => {
    setSalvando(true);
    try {
      const membros = await campanhaApi.definirMembros(campanha.id, [...marcados]);
      avisar({ type: 'success', title: 'Membros atualizados', message: `${membros.length} membro(s) na campanha.` });
    } catch (e) {
      avisar({ type: 'error', title: 'Não foi possível salvar', message: erroApi(e).mensagem });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Membros da campanha</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Os membros acessam esta campanha com os perfis que têm em Usuários & Acessos. A Coordenação Geral acessa todas as campanhas.</p>
        {usuarios === null ? <Skeleton className="h-24 w-full" /> : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {usuarios.map((u) => (
              <label key={u.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <Checkbox checked={marcados.has(u.id)} onCheckedChange={(v) => setMarcados((s) => { const n = new Set(s); if (v) n.add(u.id); else n.delete(u.id); return n; })} aria-label={`Membro: ${u.nome}`} />
                <span><span className="font-medium">{u.nome}</span><span className="block text-xs text-muted-foreground">{u.email}</span></span>
              </label>
            ))}
          </div>
        )}
        <Button leftIcon={<Save className="h-4 w-4" />} onClick={() => void salvar()} isLoading={salvando} disabled={usuarios === null}>Salvar membros</Button>
      </CardContent>
    </Card>
  );
};

const CoresCard: React.FC<PropsAba> = ({ campanha, permissoes, avisar, recarregarCampanha, alterou }) => {
  const [cores, setCores] = useState<Record<Situacao, string>>(campanha.cores);
  const [faixas, setFaixas] = useState<Faixas>(campanha.faixas);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ro = !permissoes.gestao;

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await campanhaApi.configurar({ cores_situacao: cores, faixas_meta: faixas });
      avisar({ type: 'success', title: 'Cores e faixas salvas', message: 'O mapa já usa a nova configuração.' });
      await recarregarCampanha();
      alterou();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />Cores do mapa e faixas de meta</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-5">
          {SITUACOES.map((s) => (
            <Input key={s} label={ROTULO_SITUACAO[s]} type="color" value={cores[s]} disabled={ro} onChange={(e) => setCores((c) => ({ ...c, [s]: e.target.value }))} />
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Faixas de meta de votos (até 9, limites crescentes)</p>
          {faixas.faixas.map((f, i) => (
            <div key={i} className="grid grid-cols-[1fr_8rem_auto] items-end gap-2 sm:w-[28rem]">
              <Input label={`Faixa ${i + 1}: até`} type="number" min={1} value={f.limite} disabled={ro} className="font-mono tabular-nums"
                onChange={(e) => setFaixas((x) => ({ ...x, faixas: x.faixas.map((y, j) => (j === i ? { ...y, limite: Number(e.target.value) } : y)) }))} />
              <Input label="Cor" type="color" value={f.cor} disabled={ro} onChange={(e) => setFaixas((x) => ({ ...x, faixas: x.faixas.map((y, j) => (j === i ? { ...y, cor: e.target.value } : y)) }))} />
              {!ro && <Button size="icon-sm" variant="ghost" aria-label={`Remover faixa ${i + 1}`} disabled={faixas.faixas.length === 1} onClick={() => setFaixas((x) => ({ ...x, faixas: x.faixas.filter((_, j) => j !== i) }))}><Trash2 /></Button>}
            </div>
          ))}
          <div className="grid grid-cols-[1fr_8rem] items-end gap-2 sm:w-[28rem]">
            <p className="pb-2 text-sm text-muted-foreground">Acima de <span className="font-mono tabular-nums">{formatarNumero(faixas.faixas[faixas.faixas.length - 1]?.limite ?? 0)}</span></p>
            <Input label="Cor" type="color" value={faixas.cor_acima} disabled={ro} onChange={(e) => setFaixas((x) => ({ ...x, cor_acima: e.target.value }))} />
          </div>
          {!ro && faixas.faixas.length < 9 && (
            <Button size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setFaixas((x) => ({ ...x, faixas: [...x.faixas, { limite: (x.faixas[x.faixas.length - 1]?.limite ?? 0) + 100, cor: '#8b5cf6' }] }))}>Faixa</Button>
          )}
        </div>
        {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
        {!ro && <Button leftIcon={<Save className="h-4 w-4" />} onClick={() => void salvar()} isLoading={salvando}>Salvar cores e faixas</Button>}
      </CardContent>
    </Card>
  );
};

/** Termo de privacidade, encarregado e prazo de retenção dos eleitores (spec: Anonimização…; D4). */
const LgpdCard: React.FC<PropsAba> = ({ campanha, permissoes, avisar }) => {
  const dados = useCarga(() => campanhaApi.lgpd(campanha.id), [campanha.id]);
  const [form, setForm] = useState<{ termo: string; nome: string; contato: string; dias: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const d = dados.dados;
  if (d && form === null) setForm({ termo: d.lgpd_termo ?? '', nome: d.lgpd_encarregado_nome ?? '', contato: d.lgpd_encarregado_contato ?? '', dias: String(d.lgpd_retencao_dias) });
  const ro = !permissoes.gestao;

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form) return;
    setSalvando(true);
    setErro(null);
    try {
      const salvo = await campanhaApi.salvarLgpd(campanha.id, { lgpd_termo: vazioParaNulo(form.termo), lgpd_encarregado_nome: vazioParaNulo(form.nome), lgpd_encarregado_contato: vazioParaNulo(form.contato), lgpd_retencao_dias: Number(form.dias) || 90 });
      avisar({ type: 'success', title: 'Privacidade salva', message: `Termo na versão ${salvo.lgpd_termo_versao}` });
      setForm(null);
      await dados.recarregar();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Privacidade dos eleitores (LGPD)</CardTitle></CardHeader>
      <CardContent>
        {dados.erro ? <p className="text-sm text-destructive">{dados.erro}</p> : !d || !form ? <Skeleton className="h-40 w-full" /> : (
          <form onSubmit={salvar} className="space-y-3">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <p><span className="block text-xs text-muted-foreground">Versão do termo</span><span className="font-mono tabular-nums">{d.lgpd_termo_versao}</span></p>
              <p><span className="block text-xs text-muted-foreground">Encerrada em</span><span className="font-mono tabular-nums">{formatarData(d.encerrada_em)}</span></p>
              <p><span className="block text-xs text-muted-foreground">Anonimização prevista</span><span className="font-mono tabular-nums">{d.anonimizacao_prevista ? formatarData(d.anonimizacao_prevista) : 'após o encerramento'}</span></p>
            </div>
            <label className="block space-y-1 text-sm font-medium">Termo de privacidade (vazio = texto padrão abaixo)
              <Textarea rows={5} value={form.termo} onChange={(e) => setForm({ ...form, termo: e.target.value })} maxLength={10000} placeholder={d.lgpd_termo ? undefined : d.lgpd_termo_vigente} disabled={ro} />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Encarregado (nome)" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} maxLength={200} disabled={ro} />
              <Input label="Contato do encarregado" value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} maxLength={200} placeholder="e-mail ou telefone" disabled={ro} />
              <Input label="Retenção após o encerramento (dias)" type="number" min={1} max={3650} value={form.dias} onChange={(e) => setForm({ ...form, dias: e.target.value })} className="font-mono tabular-nums" disabled={ro} />
            </div>
            <p className="text-xs text-muted-foreground">Alterar o texto cria uma nova versão; cada eleitor guarda a versão que aceitou. Passado o prazo de retenção depois do encerramento, nome, WhatsApp, nascimento, demanda, IP e navegador são apagados automaticamente.</p>
            {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
            {!ro && <div className="flex justify-end"><Button type="submit" leftIcon={<Save className="h-4 w-4" />} isLoading={salvando}>Salvar privacidade</Button></div>}
          </form>
        )}
      </CardContent>
    </Card>
  );
};
