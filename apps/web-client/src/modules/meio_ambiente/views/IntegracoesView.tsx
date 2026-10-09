import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Input, Modal, Select } from '@sysgov/ui';
import { KeyRound, PlugZap } from 'lucide-react';
import { ScreenState } from '@/components/ui/ScreenState';
import { EmptyState } from '@/components/ui/EmptyState';
import { meioAmbienteApi, erroApi, type IntegracaoOrgaoControle, type OrgaoControle } from '../api';

const ORGAOS: { value: OrgaoControle; label: string }[] = [
  { value: 'ibama', label: 'IBAMA' },
  { value: 'inea', label: 'INEA' },
  { value: 'cetesb', label: 'CETESB' },
  { value: 'outro', label: 'Outro órgão' },
];

const ROTULO_ORGAO: Record<OrgaoControle, string> = { ibama: 'IBAMA', inea: 'INEA', cetesb: 'CETESB', outro: 'Outro' };

/**
 * Credenciais de integração com órgãos de controle ambiental. A chave de API só é
 * exibida uma vez, logo após a criação (o backend guarda apenas o hash). O envio
 * ativo é opcional: só para órgãos que exigem receber os autos de infração.
 */
export const IntegracoesView: React.FC = () => {
  const [integracoes, setIntegracoes] = useState<IntegracaoOrgaoControle[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [orgao, setOrgao] = useState<OrgaoControle>('ibama');
  const [envioUrl, setEnvioUrl] = useState('');
  const [envioToken, setEnvioToken] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [chaveCriada, setChaveCriada] = useState<string | null>(null);
  const [aRevogar, setARevogar] = useState<IntegracaoOrgaoControle | null>(null);
  const [revogando, setRevogando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setIntegracoes(await meioAmbienteApi.listarIntegracoes());
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const criar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const criada = await meioAmbienteApi.criarIntegracao({
        nome,
        orgao,
        ...(envioUrl ? { envio_url: envioUrl, envio_token: envioToken } : {}),
      });
      setChaveCriada(criada.api_key);
      setNome('');
      setEnvioUrl('');
      setEnvioToken('');
      await carregar();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const revogar = async () => {
    if (!aRevogar) return;
    setRevogando(true);
    setErro(null);
    try {
      await meioAmbienteApi.revogarIntegracao(aRevogar.id);
      setARevogar(null);
      await carregar();
    } catch (e) {
      setErro(erroApi(e).mensagem);
    } finally {
      setRevogando(false);
    }
  };

  if (carregando) {
    return <ScreenState type="loading" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><PlugZap className="h-4 w-4" /> Nova Credencial de Integração</h3>

        {erro && <div className="mb-4 rounded-md bg-rose-950/60 p-3 text-sm text-rose-400">{erro}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: IBAMA — consulta de licenças" />
          <Select label="Órgão" value={orgao} onChange={(v) => setOrgao(v as OrgaoControle)} options={ORGAOS} />
          <Input label="URL de envio ativo (opcional)" value={envioUrl} onChange={(e) => setEnvioUrl(e.target.value)} placeholder="https://..." />
          <Input label="Token do órgão para o envio" type="password" value={envioToken} onChange={(e) => setEnvioToken(e.target.value)} disabled={envioUrl === ''} />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Com URL de envio ativo, cada auto de infração ambiental emitido é enviado automaticamente ao órgão, com novas
          tentativas em caso de indisponibilidade. Sem ela, o órgão apenas consulta os dados pela API (documentação em{' '}
          <a className="underline" href="/api/meio_ambiente/docs" target="_blank" rel="noreferrer">/api/meio_ambiente/docs</a>).
        </p>

        <Button className="mt-4" onClick={criar} disabled={salvando || nome.trim() === '' || (envioUrl !== '' && envioToken === '')}>
          {salvando ? 'Criando...' : 'Criar Credencial'}
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold">Credenciais</h3>

        {integracoes.length === 0 ? (
          <EmptyState icon={<KeyRound className="h-8 w-8" />} title="Nenhuma credencial de integração cadastrada" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Nome</th>
                <th>Órgão</th>
                <th>Chave</th>
                <th>Envio ativo</th>
                <th>Último uso</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {integracoes.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="py-2">{i.nome}</td>
                  <td>{ROTULO_ORGAO[i.orgao]}</td>
                  <td className="font-mono tabular-nums">{i.api_key_prefixo}…</td>
                  <td>{i.envio_ativo ? 'Sim' : 'Não'}</td>
                  <td className="font-mono tabular-nums">{i.ultimo_uso_em ? new Date(i.ultimo_uso_em).toLocaleString('pt-BR') : '—'}</td>
                  <td>{i.is_active ? <Badge variant="success">Ativa</Badge> : <Badge variant="neutral">Revogada</Badge>}</td>
                  <td className="text-right">
                    {i.is_active && (
                      <Button size="sm" variant="outline" onClick={() => setARevogar(i)}>Revogar</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        open={chaveCriada !== null}
        onClose={() => setChaveCriada(null)}
        title="Credencial criada"
        description="Copie a chave agora e entregue ao órgão por um canal seguro. Ela não será exibida novamente."
        footer={<Button onClick={() => setChaveCriada(null)}>Já copiei a chave</Button>}
      >
        <code className="block break-all rounded-md bg-muted p-3 font-mono text-sm">{chaveCriada}</code>
      </Modal>

      <Modal
        open={aRevogar !== null}
        onClose={() => setARevogar(null)}
        title="Revogar credencial"
        footer={
          <>
            <Button variant="outline" onClick={() => setARevogar(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={revogar} disabled={revogando}>{revogando ? 'Revogando...' : 'Revogar'}</Button>
          </>
        }
      >
        <p className="text-sm">
          <strong>{aRevogar?.nome}</strong> deixará de consultar os dados e de receber envios. Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
};

export default IntegracoesView;
