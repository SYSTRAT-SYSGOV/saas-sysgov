import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@sysgov/ui';
import { Loader2 } from 'lucide-react';
import { portalConcessionarioApi, tokenPortal } from '../api';

const SLUG_KEY = 'sysgov_portal_cemiterios_slug';

/** Callback do login Gov.br: troca code/state pelo token do portal e volta ao painel (RF-27). */
export const PortalCallbackPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const slug = sessionStorage.getItem(SLUG_KEY);
    const code = params.get('code');
    const state = params.get('state');
    if (!slug || !code || !state) {
      setErro('Retorno de autenticação inválido.');
      return;
    }
    portalConcessionarioApi(slug).callbackGovBr(code, state)
      .then(({ token }) => { tokenPortal.salvar(token); navigate(`/cemiterios/portal/${slug}`, { replace: true }); })
      .catch(() => setErro('Não foi possível concluir a autenticação. Tente novamente.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gov-page p-6">
      <Card className="max-w-md p-6 text-center">
        {erro ? <p className="text-sm text-red-600">{erro}</p> : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-gov-primary" />
            <p className="text-sm text-gov-text-muted">Concluindo autenticação…</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PortalCallbackPage;
