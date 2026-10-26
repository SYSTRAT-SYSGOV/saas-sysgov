import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Layers } from 'lucide-react';
import { getIcon, ICON_MAP } from './iconMap';
import { iconeDoItem } from './menuIcon';
import { MODULE_REGISTRY } from './moduleRegistry';

/** Guarda do padrão de ícones: menu, cards e registro saem do mesmo module.json e não se repetem. */
const MODULOS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../api/Modules');

interface Entrada { modulo: string; onde: 'menu' | 'filho'; rotulo: string; icone: string }

function lerManifestos(): Entrada[] {
  const entradas: Entrada[] = [];
  for (const pasta of fs.readdirSync(MODULOS)) {
    const arquivo = path.join(MODULOS, pasta, 'module.json');
    if (!fs.existsSync(arquivo)) continue;
    const manifesto = JSON.parse(fs.readFileSync(arquivo, 'utf-8')) as { alias?: string; menu?: { label?: string; icon?: string; children?: { label: string; icon: string }[] } };
    const modulo = manifesto.alias ?? pasta.toLowerCase();
    if (manifesto.menu?.icon) entradas.push({ modulo, onde: 'menu', rotulo: manifesto.menu.label ?? modulo, icone: manifesto.menu.icon });
    for (const filho of manifesto.menu?.children ?? []) entradas.push({ modulo, onde: 'filho', rotulo: filho.label, icone: filho.icon });
  }
  return entradas;
}

describe('Ícones de módulos e menus', () => {
  const manifestos = lerManifestos();

  it('lê os manifestos dos módulos', () => {
    expect(manifestos.length).toBeGreaterThan(20);
  });

  it('todo ícone dos manifestos tem componente no iconMap (nada cai no ícone padrão)', () => {
    const sem = manifestos.filter((e) => !(e.icone in ICON_MAP));
    expect(sem.map((e) => `${e.modulo}/${e.rotulo}: ${e.icone}`)).toEqual([]);
  });

  it('todo ícone do registro de módulos resolve', () => {
    const sem = Object.values(MODULE_REGISTRY).filter((d) => d.icon && !(d.icon in ICON_MAP));
    expect(sem.map((d) => `${d.id}: ${d.icon}`)).toEqual([]);
  });

  it('nenhum ícone se repete entre os itens dos manifestos (módulos e subitens)', () => {
    const porIcone = new Map<string, string[]>();
    for (const e of manifestos) porIcone.set(e.icone, [...(porIcone.get(e.icone) ?? []), `${e.modulo}/${e.rotulo}`]);
    const repetidos = [...porIcone.entries()].filter(([, usos]) => usos.length > 1);
    expect(repetidos).toEqual([]);
  });

  it('nenhum módulo do registro divide o ícone com outro', () => {
    const porIcone = new Map<string, string[]>();
    for (const d of Object.values(MODULE_REGISTRY)) porIcone.set(d.icon ?? '', [...(porIcone.get(d.icon ?? '') ?? []), d.id]);
    const repetidos = [...porIcone.entries()].filter(([icone, ids]) => icone && ids.length > 1);
    expect(repetidos).toEqual([]);
  });

  it('o ícone do módulo no registro (cards) é o mesmo do menu no manifesto', () => {
    const divergentes = manifestos
      .filter((e) => e.onde === 'menu' && MODULE_REGISTRY[e.modulo]?.icon !== undefined)
      .filter((e) => MODULE_REGISTRY[e.modulo].icon !== e.icone)
      .map((e) => `${e.modulo}: manifesto ${e.icone} × registro ${MODULE_REGISTRY[e.modulo].icon}`);
    expect(divergentes).toEqual([]);
  });

  it('o ícone padrão (Layers) só aparece para o módulo de placeholder', () => {
    const comLayers = Object.values(MODULE_REGISTRY).filter((d) => d.icon === 'Layers').map((d) => d.id);
    expect(comLayers).toEqual(['client']);
    expect(getIcon('Layers')).toBe(Layers);
  });
});

describe('iconeDoItem (menu lateral)', () => {
  it('o item principal do módulo usa o ícone do registro, mesmo com o banco desatualizado', () => {
    expect(iconeDoItem({ module: 'passeio', route: '/passeio', icon: 'Layers' })).toBe(MODULE_REGISTRY.passeio.icon);
    expect(iconeDoItem({ module: 'dashboard', route: '/', icon: 'Layers' })).toBe(MODULE_REGISTRY.dashboard.icon);
  });

  it('subitens e atalhos do mesmo módulo mantêm o ícone que veio da API', () => {
    expect(iconeDoItem({ module: 'users', route: '/reset-senha', icon: 'Key' })).toBe('Key');
    expect(iconeDoItem({ module: 'org', route: '/hierarquias', icon: 'GitBranch' })).toBe('GitBranch');
  });

  it('item sem módulo ou com módulo desconhecido mantém o ícone da API', () => {
    expect(iconeDoItem({ module: null, route: '/gerenciar-menus', icon: 'Menu' })).toBe('Menu');
    expect(iconeDoItem({ module: 'nao_existe', route: '/x', icon: 'Bell' })).toBe('Bell');
  });
});
