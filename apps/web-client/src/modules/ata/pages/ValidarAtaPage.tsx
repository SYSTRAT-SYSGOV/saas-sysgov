import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, FileSearch, XCircle } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@sysgov/ui';
import { validacaoApi, type ResultadoValidacao } from '../api';

/** Validação pública da ata (sem login): o QR Code do PDF aponta para /validar-ata/{prefeitura}/{código}. */
export const ValidarAtaPage: React.FC = () => {
  const { tenantSlug = '', codigo: doLink = '' } = useParams();
  const navegar = useNavigate();
  const [codigo, setCodigo] = useState(doLink);
  const [resultado, setResultado] = useState<ResultadoValidacao | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!tenantSlug || !doLink) return;
    setCarregando(true);
    validacaoApi.validar(tenantSlug, doLink)
      .then(setResultado)
      .catch(() => setResultado({ valido: false, mensagem: 'Não foi possível consultar agora. Tente novamente.' }))
      .finally(() => setCarregando(false));
  }, [tenantSlug, doLink]);

  return (
    <div className="flex min-h-screen items-start justify-center bg-gov-bg p-4 sm:items-center">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2"><FileSearch className="h-6 w-6 text-gov-primary" /><h1 className="text-lg font-bold">Validação de ata</h1></div>
          <p className="text-sm text-muted-foreground">Informe o código de validação impresso no rodapé do PDF da ata.</p>
          <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) navegar(`/validar-ata/${tenantSlug}/${codigo.trim().toUpperCase()}`); }}>
            <div className="flex-1"><Input label="Código de validação" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="ATA-2026-XXXXXXXXXXXXXXXX" className="font-mono" /></div>
            <Button type="submit" isLoading={carregando}>Verificar</Button>
          </form>
          {resultado && (resultado.valido ? (
            <div role="status" className="space-y-2 rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" />{resultado.mensagem}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="font-medium">Ata nº</dt><dd className="font-mono tabular-nums">{resultado.numero}</dd>
                <dt className="font-medium">Secretaria</dt><dd>{resultado.secretaria}</dd>
                {resultado.titulo && <><dt className="font-medium">Título</dt><dd>{resultado.titulo}</dd></>}
                {resultado.redator && <><dt className="font-medium">Redator</dt><dd>{resultado.redator}</dd></>}
                <dt className="font-medium">Finalizada em</dt><dd className="font-mono tabular-nums">{resultado.finalizada_em ? new Date(resultado.finalizada_em).toLocaleString('pt-BR') : '—'}</dd>
                <dt className="font-medium">Código</dt><dd className="break-all font-mono">{resultado.codigo}</dd>
              </dl>
              {resultado.sigilosa && <p className="text-xs">Ata sigilosa: o título e o redator não são exibidos.</p>}
            </div>
          ) : (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />{resultado.mensagem}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidarAtaPage;
