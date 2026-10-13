import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, LocateFixed, ShieldCheck, ShieldX, Vote } from 'lucide-react';
import { Button, Card, Checkbox, Input, Select, Skeleton, Textarea } from '@sysgov/ui';
import { cadastroPublicoApi, type FormularioPublico } from '../api';

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'indisponivel'; mensagem: string }
  | { tipo: 'formulario'; dados: FormularioPublico }
  | { tipo: 'enviado'; atualizado: boolean; dados: FormularioPublico };

type Local = { latitude: number; longitude: number; precisao_m: number } | null;

const mensagemDeErro = (e: unknown): string => {
  const r = (e as { response?: { status?: number; data?: { error?: string; message?: string; errors?: Record<string, string[]> } } }).response;
  if (r?.status === 429) return 'Muitos envios em pouco tempo. Aguarde um minuto e tente de novo.';
  const primeiro = r?.data?.errors ? Object.values(r.data.errors)[0]?.[0] : undefined;
  return primeiro ?? r?.data?.error ?? r?.data?.message ?? 'Não foi possível enviar. Verifique a conexão e tente de novo.';
};

/**
 * Formulário público de apoio (sem login), aberto pelo link ou QR Code do coordenador/cabo eleitoral (D8).
 * A localização só é pedida quando o eleitor toca no botão; o envio exige o aceite do termo.
 */
export const CadastroApoioPage: React.FC = () => {
  const { codigo = '' } = useParams();
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [form, setForm] = useState({ nome: '', codigo_ibge: null as number | null, bairro: '', zona: '', secao: '', whatsapp: '', data_nascimento: '', demanda: '', site: '' });
  const [aceite, setAceite] = useState(false);
  const [local, setLocal] = useState<Local>(null);
  const [localizando, setLocalizando] = useState(false);
  const [avisoLocal, setAvisoLocal] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    cadastroPublicoApi.formulario(codigo)
      .then((dados) => { if (!cancelado) setEstado(dados.ativo ? { tipo: 'formulario', dados } : { tipo: 'indisponivel', mensagem: dados.mensagem ?? 'Este link não está disponível.' }); })
      .catch((e: { response?: { status?: number } }) => { if (!cancelado) setEstado({ tipo: 'indisponivel', mensagem: e.response?.status === 404 ? 'Link de cadastro não encontrado. Confira o endereço.' : 'Não foi possível abrir o cadastro agora. Tente de novo em instantes.' }); });
    return () => { cancelado = true; };
  }, [codigo]);

  const localizar = () => {
    if (!navigator.geolocation) { setAvisoLocal('Este aparelho não informa a localização.'); return; }
    setLocalizando(true);
    setAvisoLocal(null);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocal({ latitude: p.coords.latitude, longitude: p.coords.longitude, precisao_m: p.coords.accuracy }); setLocalizando(false); },
      () => { setAvisoLocal('Localização não permitida — tudo bem, ela é opcional.'); setLocalizando(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  if (estado.tipo === 'carregando') return <Moldura><Skeleton className="h-96 w-full" /></Moldura>;
  if (estado.tipo === 'indisponivel') {
    return <Moldura><Card className="space-y-2 p-6 text-center"><ShieldX className="mx-auto h-10 w-10 text-muted-foreground" /><p className="font-semibold">Cadastro indisponível</p><p className="text-sm text-muted-foreground">{estado.mensagem}</p></Card></Moldura>;
  }

  const dados = estado.dados;
  const quem = dados.candidato?.nome_urna ?? dados.campanha.nome;
  const cabecalho = (
    <div className="space-y-1 text-center">
      <Vote className="mx-auto h-9 w-9 text-primary" />
      <h1 className="text-xl font-bold text-foreground">{quem}{dados.candidato?.numero ? <span className="font-mono tabular-nums"> {dados.candidato.numero}</span> : null}</h1>
      <p className="text-sm text-muted-foreground">{dados.campanha.cargo} · <span className="font-mono tabular-nums">{dados.campanha.ano}</span>{dados.candidato?.partido ? ` · ${dados.candidato.partido}` : ''}</p>
      <p className="text-sm text-muted-foreground">Indicação de <strong>{dados.responsavel}</strong></p>
    </div>
  );

  if (estado.tipo === 'enviado') {
    return (
      <Moldura>
        <Card className="space-y-4 p-6 text-center">
          {cabecalho}
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <p className="text-lg font-semibold">{estado.atualizado ? 'Cadastro atualizado!' : 'Cadastro recebido!'}</p>
          <p className="text-sm text-muted-foreground">Obrigado pelo apoio. Para pedir acesso, correção ou exclusão dos seus dados, fale com {dados.encarregado?.nome ?? 'a coordenação da campanha'}{dados.encarregado?.contato ? ` (${dados.encarregado.contato})` : ''}.</p>
        </Card>
      </Moldura>
    );
  }

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!aceite) { setErro('Para enviar, marque que leu e aceita o termo de privacidade.'); return; }
    if (form.codigo_ibge === null) { setErro('Escolha o seu município.'); return; }
    setEnviando(true);
    setErro(null);
    try {
      const r = await cadastroPublicoApi.enviar(codigo, {
        nome: form.nome.trim(), codigo_ibge: form.codigo_ibge, bairro: form.bairro.trim(),
        zona: form.zona ? Number(form.zona) : null, secao: form.secao ? Number(form.secao) : null,
        whatsapp: form.whatsapp.trim() || null, data_nascimento: form.data_nascimento || null, demanda: form.demanda.trim() || null,
        latitude: local?.latitude ?? null, longitude: local?.longitude ?? null, precisao_m: local?.precisao_m ?? null,
        aceite, iniciado_em: dados.iniciado_em ?? '', site: form.site,
      });
      setEstado({ tipo: 'enviado', atualizado: r.atualizado, dados });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  };
  const texto = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <Moldura>
      <Card className="space-y-4 p-5">
        {cabecalho}
        <form onSubmit={enviar} className="space-y-3" noValidate>
          <Input label="Nome completo *" value={form.nome} onChange={texto('nome')} required maxLength={200} autoComplete="name" />
          <Select label="Município *" value={form.codigo_ibge} placeholder="Escolha o seu município" onChange={(v) => setForm((f) => ({ ...f, codigo_ibge: Number(v) }))} options={(dados.municipios ?? []).map((m) => ({ value: m.codigo_ibge, label: m.nome }))} />
          <Input label="Bairro *" value={form.bairro} onChange={texto('bairro')} required maxLength={150} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Zona eleitoral" inputMode="numeric" value={form.zona} onChange={texto('zona')} maxLength={4} className="font-mono tabular-nums" />
            <Input label="Seção" inputMode="numeric" value={form.secao} onChange={texto('secao')} maxLength={4} className="font-mono tabular-nums" />
          </div>
          <Input label="WhatsApp (com DDD)" type="tel" inputMode="tel" value={form.whatsapp} onChange={texto('whatsapp')} maxLength={20} autoComplete="tel" className="font-mono tabular-nums" />
          <Input label="Data de nascimento" type="date" value={form.data_nascimento} onChange={texto('data_nascimento')} />
          <label className="block space-y-1 text-sm font-medium">Qual a principal necessidade do seu bairro?<Textarea rows={3} value={form.demanda} onChange={texto('demanda')} maxLength={2000} /></label>
          {/* Campo-armadilha: invisível para pessoas; robôs costumam preenchê-lo. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden"><label>Site<input tabIndex={-1} autoComplete="off" value={form.site} onChange={texto('site')} /></label></div>
          <div className="space-y-1">
            <Button type="button" variant="outline" className="w-full" leftIcon={<LocateFixed className="h-4 w-4" />} isLoading={localizando} onClick={localizar}>
              {local ? 'Localização registrada' : 'Compartilhar minha localização (opcional)'}
            </Button>
            {local && <p className="text-xs text-muted-foreground">Precisão aproximada de <span className="font-mono tabular-nums">{Math.round(local.precisao_m)} m</span>. <button type="button" className="underline" onClick={() => setLocal(null)}>Remover</button></p>}
            {avisoLocal && <p className="text-xs text-muted-foreground">{avisoLocal}</p>}
          </div>
          <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Termo de privacidade</p>
            <p className="max-h-40 overflow-y-auto whitespace-pre-line text-xs text-muted-foreground">{dados.termo}</p>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={aceite} onCheckedChange={(v) => setAceite(v === true)} aria-label="Li e aceito o termo de privacidade" />
              <span>Li e aceito o termo de privacidade e autorizo o uso dos meus dados pela campanha.</span>
            </label>
          </div>
          {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
          <Button type="submit" className="w-full" isLoading={enviando} disabled={!aceite}>Enviar cadastro</Button>
        </form>
      </Card>
    </Moldura>
  );
};

const Moldura: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="min-h-screen bg-background px-4 py-6"><div className="mx-auto w-full max-w-md">{children}</div></main>
);

export default CadastroApoioPage;
