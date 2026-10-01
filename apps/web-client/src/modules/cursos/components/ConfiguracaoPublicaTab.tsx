import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { Button, Card, RichTextEditor, Switch } from '@sysgov/ui';
import { ScreenState } from '@/components/ui';
import { sysgovApi, type ConfiguracaoPublica } from '@sysgov/sdk';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { ErroFormulario } from './ErroFormulario';

const vazio: ConfiguracaoPublica = { publico_habilitado: false, boas_vindas: null, termo: { texto: null, versao: 0 }, documento_obrigatorio: false };

/** Aba "Página pública" da GestaoCursosPage (tarefa 6.6, design D11): habilita o catálogo/cadastro público do órgão e o termo de uso exibido no cadastro externo. */
export const ConfiguracaoPublicaTab: React.FC = () => {
  const [config, setConfig] = useState<ConfiguracaoPublica | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const carregar = useCallback(async () => {
    setErroCarga(null);
    try {
      setConfig(await sysgovApi.cursos.getConfiguracaoPublica());
    } catch (e) {
      setErroCarga(getApiErrorMessage(e, 'Não foi possível carregar a configuração da página pública.'));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const salvar = async () => {
    if (!config) return;
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    try {
      setConfig(
        await sysgovApi.cursos.atualizarConfiguracaoPublica({
          publico_habilitado: config.publico_habilitado,
          boas_vindas: config.boas_vindas,
          documento_obrigatorio: config.documento_obrigatorio,
          termo: { texto: config.termo.texto },
        }),
      );
      setSalvo(true);
    } catch (e) {
      setErro(getApiErrorMessage(e, 'Não foi possível salvar a configuração.'));
    } finally {
      setSalvando(false);
    }
  };

  if (erroCarga) return <ScreenState type="error" title="Erro ao carregar" description={erroCarga} actionLabel="Tentar novamente" onAction={carregar} />;
  if (!config) return <ScreenState type="loading" title="Carregando configuração..." />;

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Página pública</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Habilita o catálogo de cursos e o cadastro de participantes externos, fora da autenticação do sistema.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="publico-habilitado"
            checked={config.publico_habilitado}
            onCheckedChange={(v) => setConfig((c) => (c ? { ...c, publico_habilitado: v } : c))}
            label="Habilitar página pública"
          />
          <label htmlFor="publico-habilitado" className="text-sm text-foreground">
            Habilitar o catálogo e o cadastro público deste órgão
          </label>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Texto de boas-vindas</p>
          <RichTextEditor
            value={config.boas_vindas ?? ''}
            onChange={(v) => setConfig((c) => (c ? { ...c, boas_vindas: v } : c))}
            minHeight={140}
          />
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Termo de uso do cadastro</h2>
            <p className="mt-1 text-xs text-muted-foreground">Exibido no cadastro externo; alterar o texto incrementa a versão aceita pelos novos cadastros.</p>
          </div>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">Versão {config.termo.versao}</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="documento-obrigatorio"
            checked={config.documento_obrigatorio}
            onCheckedChange={(v) => setConfig((c) => (c ? { ...c, documento_obrigatorio: v } : c))}
            label="Exigir CPF no cadastro externo"
          />
          <label htmlFor="documento-obrigatorio" className="text-sm text-foreground">
            Exigir CPF no cadastro externo
          </label>
        </div>
        <RichTextEditor
          value={config.termo.texto ?? ''}
          onChange={(v) => setConfig((c) => (c ? { ...c, termo: { ...c.termo, texto: v } } : c))}
          minHeight={200}
        />
      </Card>

      <ErroFormulario mensagem={erro} />
      {salvo && (
        <div className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> Configuração salva com sucesso.
        </div>
      )}
      <div className="flex justify-end">
        <Button isLoading={salvando} onClick={() => void salvar()}>
          <Save className="h-4 w-4" /> Salvar
        </Button>
      </div>
    </div>
  );
};

export default ConfiguracaoPublicaTab;
