import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileSignature, History, Landmark, Tags } from 'lucide-react';
import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from '@sysgov/ui';
import { Avisos, useAvisos } from '../escola/components/Avisos';
import { EstadoCarga } from '../escola/components/AdminModal';
import { useCarga } from '../escola/useCarga';
import { ataApi } from './api';
import { PainelAtas } from './components/PainelAtas';
import { EditorAta } from './components/EditorAta';
import { TiposAta } from './components/TiposAta';
import { SecretariasAta } from './components/SecretariasAta';
import { AuditoriaAta } from './components/AuditoriaAta';

type Aba = 'atas' | 'tipos' | 'secretarias' | 'auditoria';

/** Módulo Ata: painel e lista de atas, editor (?ata=id), cadastros e auditoria. As permissões vêm de /ata/opcoes. */
export const AtaModule: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { avisos, avisar } = useAvisos();
  const opcoes = useCarga(() => ataApi.opcoes(), []);
  const ataAberta = Number(params.get('ata')) || null;

  const abrirAta = (id: number | null) => {
    const novo = new URLSearchParams(params);
    if (id) novo.set('ata', String(id));
    else novo.delete('ata');
    setParams(novo);
  };

  if (!opcoes.dados) {
    return <div className="p-4"><EstadoCarga carregando={opcoes.carregando} erro={opcoes.erro} onTentar={() => void opcoes.recarregar()} /></div>;
  }
  const o = opcoes.dados;

  if (ataAberta) {
    return (
      <div className="space-y-4 p-4">
        <EditorAta id={ataAberta} opcoes={o} avisar={avisar} aoVoltar={() => abrirAta(null)} />
        <Avisos avisos={avisos} />
      </div>
    );
  }

  const abas: { id: Aba; rotulo: string; icone: React.ElementType; visivel: boolean }[] = [
    { id: 'atas', rotulo: 'Atas', icone: FileSignature, visivel: true },
    { id: 'tipos', rotulo: 'Tipos de ata', icone: Tags, visivel: o.permissoes.gerenciar },
    { id: 'secretarias', rotulo: 'Secretarias e timbrado', icone: Landmark, visivel: o.permissoes.gerenciar },
    { id: 'auditoria', rotulo: 'Auditoria', icone: History, visivel: o.permissoes.auditar },
  ];
  const visiveis = abas.filter((a) => a.visivel);
  const pedida = params.get('aba');
  const aba = (visiveis.some((a) => a.id === pedida) ? pedida : 'atas') as Aba;

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardContent className="p-4">
          <h1 className="text-xl font-bold text-gov-text-primary">Atas</h1>
          <p className="text-sm text-muted-foreground">Atas de reunião das secretarias: redação, assinaturas, PDF oficial e validação.</p>
        </CardContent>
      </Card>
      <Tabs value={aba} onValueChange={(v) => setParams({ aba: v })}>
        {visiveis.length > 1 && (
          <TabsList>
            {visiveis.map((a) => (
              <TabsTrigger key={a.id} value={a.id}><a.icone className="mr-1.5 h-4 w-4" />{a.rotulo}</TabsTrigger>
            ))}
          </TabsList>
        )}
        <TabsContent value="atas"><PainelAtas opcoes={o} avisar={avisar} abrir={abrirAta} /></TabsContent>
        {o.permissoes.gerenciar && <TabsContent value="tipos"><TiposAta avisar={avisar} aoMudar={() => void opcoes.recarregar()} /></TabsContent>}
        {o.permissoes.gerenciar && <TabsContent value="secretarias"><SecretariasAta avisar={avisar} /></TabsContent>}
        {o.permissoes.auditar && <TabsContent value="auditoria"><AuditoriaAta /></TabsContent>}
      </Tabs>
      <Avisos avisos={avisos} />
    </div>
  );
};

export default AtaModule;
