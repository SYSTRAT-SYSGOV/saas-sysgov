import React, { useMemo, useState } from 'react';
import { Cross, FileSignature, HardHat, LayoutGrid, Map, Receipt, Camera, ClipboardList } from 'lucide-react';
import { PageHeader, Tabs } from '@/components/ui';
import { useCan } from '@/core/rbac/useCan';
import { InventarioView } from './views/InventarioView';
import { MapaView } from './views/MapaView';
import { OperacoesView } from './views/OperacoesView';
import { ConcessoesView } from './views/ConcessoesView';
import { FinanceiroView } from './views/FinanceiroView';
import { EmpreiteirosView } from './views/EmpreiteirosView';
import { VistoriaView } from './views/VistoriaView';

/** Espelha `module.json#menu.children` (mesma ordem e permissões). */
const ABAS = [
  { key: 'inventario', label: 'Inventário', icon: LayoutGrid, permissao: 'cemiterios.view', Componente: InventarioView },
  { key: 'mapa', label: 'Mapa', icon: Map, permissao: 'cemiterios.view', Componente: MapaView },
  { key: 'operacoes', label: 'Operações', icon: ClipboardList, permissao: 'cemiterios.view', Componente: OperacoesView },
  { key: 'concessoes', label: 'Concessões', icon: FileSignature, permissao: 'cemiterios.concessoes.manage', Componente: ConcessoesView },
  { key: 'financeiro', label: 'Financeiro', icon: Receipt, permissao: 'cemiterios.financeiro.manage', Componente: FinanceiroView },
  { key: 'empreiteiros', label: 'Empreiteiros', icon: HardHat, permissao: 'cemiterios.empreiteiros.manage', Componente: EmpreiteirosView },
  { key: 'vistorias', label: 'Vistoria e Abandono', icon: Camera, permissao: 'cemiterios.vistoria.create', Componente: VistoriaView },
] as const;

/** Shell do módulo de Gestão de Cemitérios (SIGCM): abas internas por permissão (mesmo padrão do CapdModule). */
export const CemiteriosModule: React.FC = () => {
  const { can } = useCan();
  const abasVisiveis = useMemo(() => ABAS.filter((a) => can(a.permissao)), [can]);
  const [aba, setAba] = useState<string>(abasVisiveis[0]?.key ?? 'inventario');
  const atual = abasVisiveis.find((a) => a.key === aba) ?? abasVisiveis[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Gestão de Cemitérios" subtitle="Inventário, GIS, operações, concessões, financeiro, empreiteiros e vistoria/abandono." icon={<Cross className="h-6 w-6" />} />
      <Tabs items={abasVisiveis.map((a) => ({ key: a.key, label: a.label }))} value={atual?.key ?? ''} onChange={setAba} />
      {atual ? <atual.Componente /> : <p className="text-sm text-muted-foreground">Sem permissão para nenhuma área deste módulo.</p>}
    </div>
  );
};

export default CemiteriosModule;
