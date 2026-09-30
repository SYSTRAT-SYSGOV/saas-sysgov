import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button, Card, Input } from '@sysgov/ui';
import { ScreenState, ValidationErrorModal } from '@/components/ui';
import { sysgovApi } from '@sysgov/sdk';
import { getApiErrorMessage, getApiValidationErrors, type ApiFieldError } from '@/lib/apiErrors';
import { usePaginaOrgao } from '../utils/usePaginaOrgao';
import { PaginaPublicaLayout } from '../components/PaginaPublicaLayout';

interface FormState {
  nome: string;
  email: string;
  senha: string;
  senha_confirmation: string;
  documento: string;
  aceite: boolean;
  /** Campo isca (design D8) — nunca preenchido por gente de verdade, só bot. */
  website: string;
}

const VAZIO: FormState = { nome: '', email: '', senha: '', senha_confirmation: '', documento: '', aceite: false, website: '' };

/**
 * Cadastro público do participante externo (design D6/D8): resposta sempre igual, aceite do
 * termo obrigatório, campo isca oculto por CSS (nunca `type="hidden"` — um bot que ignora CSS
 * ainda preenche um input visível-no-DOM).
 */
export const CadastroExternoPage: React.FC = () => {
  const { orgao } = useParams();
  const { carregando: carregandoPagina, pagina, naoEncontrado } = usePaginaOrgao(orgao);
  const [form, setForm] = useState<FormState>(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAceite, setErroAceite] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ApiFieldError[] | null>(null);

  const campo = (nome: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [nome]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.aceite) {
      setErroAceite(true);
      return;
    }
    if (!orgao) return;

    setEnviando(true);
    setErro(null);
    setErroAceite(false);
    try {
      await sysgovApi.cursos.cadastrarExterno(orgao, {
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        senha_confirmation: form.senha_confirmation,
        documento: form.documento.trim() || null,
        aceite: form.aceite,
        website: form.website,
      });
      setEnviado(true);
    } catch (err) {
      const fieldErrors = getApiValidationErrors(err);
      if (fieldErrors) setValidationErrors(fieldErrors);
      else setErro(getApiErrorMessage(err, 'Não foi possível concluir o cadastro. Tente novamente.'));
    } finally {
      setEnviando(false);
    }
  };

  if (carregandoPagina) return <ScreenState type="loading" title="Carregando..." />;
  if (naoEncontrado || !pagina) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gov-page p-6">
        <Card className="max-w-md p-6 text-center">
          <p className="font-bold text-gov-text-secondary">Página de inscrição não disponível para este órgão.</p>
        </Card>
      </div>
    );
  }

  return (
    <PaginaPublicaLayout pagina={pagina}>
      <ValidationErrorModal open={validationErrors !== null} onClose={() => setValidationErrors(null)} errors={validationErrors ?? []} />

      {enviado ? (
        <Card className="flex flex-col items-center gap-3 p-6 text-center" data-testid="cadastro-concluido">
          <MailCheck className="h-10 w-10 text-status-success" />
          <p className="font-semibold text-foreground">Se os dados estiverem corretos, você vai receber um e-mail com as próximas instruções.</p>
          <p className="text-sm text-muted-foreground">Confira sua caixa de entrada (e o spam) para confirmar o e-mail e concluir o cadastro.</p>
        </Card>
      ) : (
        <Card className="p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Criar cadastro</h2>
          <form onSubmit={enviar} className="space-y-4" noValidate>
            <Input label="Nome completo" value={form.nome} onChange={campo('nome')} required />
            <Input label="E-mail" type="email" value={form.email} onChange={campo('email')} required />
            <Input label="Senha" type="password" value={form.senha} onChange={campo('senha')} required helperText="Mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo." />
            <Input label="Confirme a senha" type="password" value={form.senha_confirmation} onChange={campo('senha_confirmation')} required />
            <Input label="CPF (opcional)" value={form.documento} onChange={campo('documento')} maxLength={20} />

            {/* Campo isca: oculto por CSS, fora da ordem de tabulação, autoComplete desligado. */}
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Site</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={campo('website')} />
            </div>

            <label className="flex items-start gap-2 text-sm text-foreground">
              <input type="checkbox" className="mt-0.5" checked={form.aceite} onChange={campo('aceite')} />
              <span>Li e aceito o termo de uso e privacidade para participar dos cursos deste órgão.</span>
            </label>
            {erroAceite && <p className="text-sm text-destructive">É preciso aceitar o termo para continuar.</p>}

            {erro && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {erro}
              </div>
            )}

            <Button type="submit" isLoading={enviando} className="w-full">
              Cadastrar
            </Button>
          </form>
        </Card>
      )}

      <p className="text-center text-sm text-gov-text-muted">
        Já tem cadastro?{' '}
        <Link to="/login" className="font-medium text-gov-primary hover:underline">
          Entrar
        </Link>
      </p>
    </PaginaPublicaLayout>
  );
};

export default CadastroExternoPage;
