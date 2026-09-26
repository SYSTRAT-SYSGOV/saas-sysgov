import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, SearchCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Button, Card, Input } from '@sysgov/ui';
import { sysgovApi, type CertificadoPublico } from '@sysgov/sdk';

type Resultado = { tipo: 'encontrado'; certificado: CertificadoPublico } | { tipo: 'nao_encontrado' } | { tipo: 'erro'; mensagem: string };

/**
 * Página pública (sem login) de validação de certificado — o QR code do
 * PDF aponta para cá. Mostra só os campos que a API pública devolve.
 */
export const ValidarCertificadoPage: React.FC = () => {
  const { codigo: codigoDaUrl } = useParams();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState(codigoDaUrl ?? '');
  const [consultando, setConsultando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    if (!codigoDaUrl) {
      setResultado(null);
      return;
    }
    setCodigo(codigoDaUrl);
    setConsultando(true);
    sysgovApi.cursos
      .validarCertificado(codigoDaUrl)
      .then((r) => setResultado(r.encontrado ? { tipo: 'encontrado', certificado: r.certificado } : { tipo: 'nao_encontrado' }))
      .catch((e: { response?: { status?: number } }) => {
        if (e?.response?.status === 404) setResultado({ tipo: 'nao_encontrado' });
        else if (e?.response?.status === 429) setResultado({ tipo: 'erro', mensagem: 'Muitas consultas seguidas. Aguarde um minuto e tente de novo.' });
        else setResultado({ tipo: 'erro', mensagem: 'Não foi possível consultar agora. Tente novamente.' });
      })
      .finally(() => setConsultando(false));
  }, [codigoDaUrl]);

  const consultar = (e: React.FormEvent) => {
    e.preventDefault();
    const limpo = codigo.trim();
    if (limpo) navigate(`/validar-certificado/${encodeURIComponent(limpo)}`);
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-gov-page px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <SearchCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Validação de certificado</h1>
          <p className="text-sm text-muted-foreground">Confira a autenticidade de um certificado emitido pelo SYSGOV.</p>
        </div>

        <Card className="p-4">
          <form onSubmit={consultar} className="flex items-end gap-2">
            <Input label="Código do certificado" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="XXXX-XXXX-XXXX" className="font-mono uppercase tabular-nums" maxLength={20} />
            <Button type="submit" isLoading={consultando}>
              Validar
            </Button>
          </form>
        </Card>

        {resultado?.tipo === 'encontrado' && (
          <Card className="space-y-4 p-6" data-testid="certificado-encontrado">
            {resultado.certificado.status === 'valido' ? (
              <p className="flex items-center gap-2 font-semibold text-status-success">
                <BadgeCheck className="h-6 w-6" /> Certificado válido
              </p>
            ) : (
              <p className="flex items-center gap-2 font-semibold text-destructive">
                <ShieldX className="h-6 w-6" /> Certificado revogado pelo órgão emissor
              </p>
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Participante</dt>
              <dd className="font-medium text-foreground">{resultado.certificado.participante}</dd>
              <dt className="text-muted-foreground">{resultado.certificado.tipo === 'formacao' ? 'Formação' : 'Curso'}</dt>
              <dd className="text-foreground">{resultado.certificado.curso}</dd>
              <dt className="text-muted-foreground">Carga horária</dt>
              <dd className="font-mono tabular-nums text-foreground">{resultado.certificado.carga_horaria}</dd>
              <dt className="text-muted-foreground">Período</dt>
              <dd className="font-mono tabular-nums text-foreground">{resultado.certificado.periodo}</dd>
              <dt className="text-muted-foreground">Emissão</dt>
              <dd className="font-mono tabular-nums text-foreground">{resultado.certificado.data_emissao}</dd>
              <dt className="text-muted-foreground">Órgão emissor</dt>
              <dd className="text-foreground">{resultado.certificado.orgao}</dd>
              <dt className="text-muted-foreground">Código</dt>
              <dd className="font-mono tabular-nums text-foreground">{resultado.certificado.codigo}</dd>
            </dl>
          </Card>
        )}

        {resultado?.tipo === 'nao_encontrado' && (
          <Card className="flex items-center gap-3 p-4 text-sm" role="alert">
            <ShieldAlert className="h-6 w-6 text-status-warning" />
            Certificado não encontrado. Confira o código digitado.
          </Card>
        )}
        {resultado?.tipo === 'erro' && (
          <Card className="p-4 text-sm text-destructive" role="alert">
            {resultado.mensagem}
          </Card>
        )}
      </div>
    </div>
  );
};

export default ValidarCertificadoPage;
