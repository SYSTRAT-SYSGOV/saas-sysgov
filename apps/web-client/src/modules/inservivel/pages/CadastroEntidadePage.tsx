import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Building2, CheckCircle2, ShieldX } from 'lucide-react';
import { AlertCard, Button, Card, Checkbox, Input, Skeleton } from '@sysgov/ui';
import { cadastroPublicoApi, type FormularioPublico } from '../api';
import { CamposEntidadeForm, FORM_ENTIDADE_VAZIO, paraDadosEntidade, type FormEntidade } from '../components/CamposEntidadeForm';

type Estado = { tipo: 'carregando' } | { tipo: 'indisponivel' } | { tipo: 'formulario'; dados: FormularioPublico } | { tipo: 'enviado'; dados: FormularioPublico; mensagem: string };

const mensagemDeErro = (e: unknown): string => {
  const r = (e as { response?: { status?: number; data?: { error?: string; message?: string; errors?: Record<string, string[]> } } }).response;
  if (r?.status === 429) return 'Muitos envios em pouco tempo. Aguarde um minuto e tente de novo.';
  const primeiro = r?.data?.errors ? Object.values(r.data.errors)[0]?.[0] : undefined;
  return primeiro ?? r?.data?.error ?? r?.data?.message ?? 'Não foi possível enviar. Verifique a conexão e tente de novo.';
};

/**
 * Cadastro público da entidade sem fins lucrativos (sem login; spec: Cadastro público da entidade; D7).
 * Cria a entidade (Pendente) e a conta com o perfil Entidade; depois a entidade entra pelo login normal.
 */
export const CadastroEntidadePage: React.FC = () => {
  const { tenantSlug = '' } = useParams();
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [form, setForm] = useState<FormEntidade>(FORM_ENTIDADE_VAZIO);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [documentos, setDocumentos] = useState<Record<string, File>>({});
  const [validades, setValidades] = useState<Record<string, string>>({});
  const [aceite, setAceite] = useState(false);
  const [isca, setIsca] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    cadastroPublicoApi.formulario(tenantSlug)
      .then((dados) => { if (!cancelado) setEstado({ tipo: 'formulario', dados }); })
      .catch(() => { if (!cancelado) setEstado({ tipo: 'indisponivel' }); });
    return () => { cancelado = true; };
  }, [tenantSlug]);

  if (estado.tipo === 'carregando') return <Moldura><Skeleton className="h-96 w-full" /></Moldura>;
  if (estado.tipo === 'indisponivel') {
    return <Moldura><Card className="space-y-3 p-6 text-center"><ShieldX className="mx-auto h-10 w-10 text-muted-foreground" /><p className="font-semibold">Cadastro indisponível</p><p className="text-sm text-muted-foreground">Confira o endereço com a prefeitura.</p></Card></Moldura>;
  }
  const { dados } = estado;
  const cabecalho = (
    <div className="flex items-center gap-3 border-b border-border pb-3">
      {dados.orgao.logo_url ? <img src={dados.orgao.logo_url} alt="" className="h-12 w-12 object-contain" /> : <Building2 className="h-10 w-10 text-primary" />}
      <div><p className="text-xs uppercase text-muted-foreground">{dados.orgao.nome}</p><h1 className="text-lg font-bold">Cadastro de entidade sem fins lucrativos</h1></div>
    </div>
  );

  if (estado.tipo === 'enviado') {
    return (
      <Moldura>
        <Card className="space-y-4 p-6 text-center">
          {cabecalho}
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <p className="text-lg font-semibold">Cadastro recebido!</p>
          <p className="text-sm text-muted-foreground">{estado.mensagem}</p>
          <Link to="/login" className="inline-block"><Button>Ir para o login</Button></Link>
        </Card>
      </Moldura>
    );
  }

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErro(null);
    if (senha.length < 8) { setErro('A senha precisa ter pelo menos 8 caracteres.'); return; }
    if (senha !== confirmacao) { setErro('A confirmação da senha não confere.'); return; }
    const faltando = dados.documentos_exigidos.filter((d) => d.obrigatorio && !documentos[d.chave]);
    if (faltando.length > 0) { setErro(`Envie os documentos obrigatórios: ${faltando.map((d) => d.nome).join(', ')}.`); return; }
    if (!aceite) { setErro('É preciso aceitar o termo de privacidade.'); return; }
    const corpo = new FormData();
    Object.entries(paraDadosEntidade(form)).forEach(([k, v]) => { if (v !== null && v !== '') corpo.append(k, String(v)); });
    corpo.append('senha', senha);
    corpo.append('senha_confirmation', confirmacao);
    corpo.append('aceite_privacidade', '1');
    corpo.append('website', isca);
    Object.entries(documentos).forEach(([chave, arquivo]) => corpo.append(`documentos[${chave}]`, arquivo));
    Object.entries(validades).forEach(([chave, data]) => { if (data) corpo.append(`validades[${chave}]`, data); });
    setEnviando(true);
    try {
      const r = await cadastroPublicoApi.enviar(tenantSlug, corpo);
      setEstado({ tipo: 'enviado', dados, mensagem: r.mensagem });
    } catch (e) { setErro(mensagemDeErro(e)); } finally { setEnviando(false); }
  };

  return (
    <Moldura>
      <Card className="space-y-4 p-5">
        {cabecalho}
        <p className="text-sm text-muted-foreground">Preencha os dados da entidade e envie os documentos. O Departamento de Patrimônio analisa o cadastro; só entidades habilitadas participam dos lotes de doação.</p>
        <form onSubmit={enviar} className="space-y-5">
          <CamposEntidadeForm form={form} onChange={setForm} />
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Acesso ao portal</legend>
            <p className="text-xs text-muted-foreground">O login é o e-mail informado acima.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Senha * (mínimo 8 caracteres)" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} />
              <Input label="Confirmar senha *" type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required />
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Documentos (PDF, JPEG ou PNG, até 5 MB)</legend>
            {dados.documentos_exigidos.map((d) => (
              <div key={d.chave} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_11rem]">
                <label className="block space-y-1 text-sm font-medium">{d.nome}{d.obrigatorio ? ' *' : ' (opcional)'}
                  <input type="file" accept="application/pdf,image/jpeg,image/png" className="block w-full text-sm font-normal"
                    onChange={(e) => { const f = e.target.files?.[0]; setDocumentos((m) => { const n = { ...m }; if (f) n[d.chave] = f; else delete n[d.chave]; return n; }); }} />
                </label>
                <Input label="Validade (se houver)" type="date" value={validades[d.chave] ?? ''} onChange={(e) => setValidades((v) => ({ ...v, [d.chave]: e.target.value }))} className="font-mono" />
              </div>
            ))}
          </fieldset>
          <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={isca} onChange={(e) => setIsca(e.target.value)} /></label></div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={aceite} onCheckedChange={(v) => setAceite(v === true)} className="mt-0.5" />
            <span>Declaro que as informações são verdadeiras e autorizo o tratamento dos dados da entidade e do representante pela prefeitura para a análise do cadastro e os processos de doação (LGPD).</span>
          </label>
          {erro && <AlertCard priority="danger" title="Não foi possível enviar" description={erro} />}
          <Button type="submit" className="w-full" isLoading={enviando}>Enviar cadastro</Button>
          <p className="text-center text-sm text-muted-foreground">Já tem cadastro? <Link to="/login" className="text-primary underline">Entrar</Link></p>
        </form>
      </Card>
    </Moldura>
  );
};

const Moldura: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="min-h-screen bg-background px-4 py-6"><div className="mx-auto w-full max-w-3xl">{children}</div></main>
);

export default CadastroEntidadePage;
