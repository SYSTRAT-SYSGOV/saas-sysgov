import { describe, it, expect } from 'vitest';
import type { ApiServidor, OrgUnitTreeNode } from '@sysgov/sdk';
import {
  extrairSecretariasEDepartamentos,
  servidorPertenceAoDepartamento,
  construirClassificacaoPorServidor,
  type DepartamentoOrg,
} from './PortalRhView';

function servidor(partial: Partial<ApiServidor> & Pick<ApiServidor, 'id'>): ApiServidor {
  return {
    tenant_id: 1,
    matricula: `MAT-${partial.id}`,
    cpf: '000.000.000-00',
    nome_completo: `Servidor ${partial.id}`,
    regime_juridico: 'estatutario',
    regime_previdenciario: 'rpps',
    carga_horaria_semanal: 40,
    cargo_efetivo: 'Analista',
    orgao_lotacao: 'Não informado',
    situacao_funcional: 'ativo',
    estagio_probatorio: false,
    ...partial,
  };
}

const DEPARTAMENTO_DRH: DepartamentoOrg = {
  id: 3,
  nome: 'Departamento de Recursos Humanos',
  codigo: 'SMAD-DRH',
  responsavel: null,
};

function no(partial: Partial<OrgUnitTreeNode> & Pick<OrgUnitTreeNode, 'id' | 'type' | 'name' | 'code'>): OrgUnitTreeNode {
  return {
    tenant_id: 1,
    parent_id: null,
    acronym: null,
    level: 1,
    path: String(partial.id),
    order: 0,
    is_active: true,
    children: [],
    ...partial,
  };
}

describe('extrairSecretariasEDepartamentos', () => {
  it('extrai secretarias de nível 1 e seus departamentos diretos, com responsáveis', () => {
    const tree: OrgUnitTreeNode[] = [
      no({ id: 1, type: 'gabinete', name: 'Gabinete do Prefeito', code: 'GAB' }),
      no({
        id: 2,
        type: 'secretaria',
        name: 'Secretaria Municipal de Administração',
        code: 'SMAD',
        acronym: 'SMAD',
        responsibles: [{ id: 10, name: 'Fulana Secretária', email: 'fulana@x.gov.br', role: 'responsavel' }],
        children: [
          no({
            id: 3,
            type: 'departamento',
            name: 'Departamento de RH',
            code: 'SMAD-DRH',
            responsibles: [{ id: 11, name: 'Ciclano Diretor', email: 'ciclano@x.gov.br', role: 'responsavel' }],
          }),
          no({
            id: 4,
            type: 'divisao',
            name: 'Divisão de Folha',
            code: 'SMAD-DRH-DIV1',
          }),
        ],
      }),
      no({
        id: 5,
        type: 'secretaria',
        name: 'Secretaria Municipal de Saúde',
        code: 'SMS',
        acronym: 'SMS',
        children: [
          no({ id: 6, type: 'departamento', name: 'Departamento de Atenção Básica', code: 'SMS-DAB' }),
        ],
      }),
    ];

    const resultado = extrairSecretariasEDepartamentos(tree);

    expect(resultado).toHaveLength(2);

    const [smad, sms] = resultado;
    expect(smad.nome).toBe('Secretaria Municipal de Administração');
    expect(smad.responsavel?.name).toBe('Fulana Secretária');
    expect(smad.departamentos).toHaveLength(1);
    expect(smad.departamentos[0].nome).toBe('Departamento de RH');
    expect(smad.departamentos[0].responsavel?.name).toBe('Ciclano Diretor');

    expect(sms.nome).toBe('Secretaria Municipal de Saúde');
    expect(sms.responsavel).toBeNull();
    expect(sms.departamentos).toHaveLength(1);
    expect(sms.departamentos[0].responsavel).toBeNull();
  });

  it('encontra secretarias aninhadas sob um nó raiz, além das soltas no topo', () => {
    const tree: OrgUnitTreeNode[] = [
      no({
        id: 1,
        type: 'raiz',
        name: 'Gabinete do Prefeito',
        code: 'GAB',
        children: [
          no({
            id: 2,
            type: 'secretaria',
            name: 'Secretaria Municipal de Finanças',
            code: 'SMF',
            children: [no({ id: 3, type: 'departamento', name: 'Departamento de Contabilidade', code: 'SMF-CONT' })],
          }),
        ],
      }),
      no({ id: 4, type: 'secretaria', name: 'Secretaria Municipal de Administração', code: 'SMAD' }),
    ];

    const resultado = extrairSecretariasEDepartamentos(tree);

    expect(resultado.map((s) => s.nome).sort()).toEqual([
      'Secretaria Municipal de Administração',
      'Secretaria Municipal de Finanças',
    ]);
    const smf = resultado.find((s) => s.codigo === 'SMF');
    expect(smf?.departamentos).toHaveLength(1);
  });

  it('retorna lista vazia quando a árvore não tem nenhuma secretaria', () => {
    const tree: OrgUnitTreeNode[] = [no({ id: 1, type: 'gabinete', name: 'Gabinete', code: 'GAB' })];

    expect(extrairSecretariasEDepartamentos(tree)).toEqual([]);
  });
});

describe('servidorPertenceAoDepartamento', () => {
  it('usa org_unit_id diretamente quando presente, ignorando texto', () => {
    const s = servidor({ id: 1, org_unit_id: 3, lotacao_fisica: 'Qualquer coisa sem relação' });
    expect(servidorPertenceAoDepartamento(s, DEPARTAMENTO_DRH)).toBe(true);

    const outro = servidor({ id: 2, org_unit_id: 999, lotacao_fisica: 'Departamento de Recursos Humanos' });
    expect(servidorPertenceAoDepartamento(outro, DEPARTAMENTO_DRH)).toBe(false);
  });

  it('cai para correspondência textual quando org_unit_id está ausente', () => {
    const porNome = servidor({ id: 3, lotacao_fisica: 'Departamento de Recursos Humanos' });
    expect(servidorPertenceAoDepartamento(porNome, DEPARTAMENTO_DRH)).toBe(true);

    const porSigla = servidor({ id: 4, lotacao_fisica: 'DRH - Sede', cargo_efetivo: 'Analista' });
    expect(servidorPertenceAoDepartamento(porSigla, DEPARTAMENTO_DRH)).toBe(true);
  });

  it('retorna false (candidato a "Não Classificados") sem org_unit_id e sem correspondência textual', () => {
    const semRelacao = servidor({ id: 5, lotacao_fisica: 'Secretaria de Obras', cargo_efetivo: 'Engenheiro' });
    expect(servidorPertenceAoDepartamento(semRelacao, DEPARTAMENTO_DRH)).toBe(false);
  });
});

describe('construirClassificacaoPorServidor', () => {
  it('mapeia cada servidor à secretaria/departamento em que foi classificado', () => {
    const distribuicao = [
      {
        nome: 'Secretaria Municipal de Administração',
        departamentos: [
          { nome: 'Departamento de Recursos Humanos', servidores: [{ id: 10 }, { id: 11 }] },
        ],
      },
      {
        nome: 'Servidores Não Classificados',
        departamentos: [
          { nome: 'Sem unidade organizacional identificada', servidores: [{ id: 99 }] },
        ],
      },
    ];

    const mapa = construirClassificacaoPorServidor(distribuicao);

    expect(mapa.get(10)).toEqual({ secretaria: 'Secretaria Municipal de Administração', departamento: 'Departamento de Recursos Humanos' });
    expect(mapa.get(11)?.secretaria).toBe('Secretaria Municipal de Administração');
    expect(mapa.get(99)?.secretaria).toBe('Servidores Não Classificados');
  });

  it('não contém entrada para um servidor ausente da distribuição', () => {
    const distribuicao = [
      { nome: 'Secretaria Municipal de Saúde', departamentos: [{ nome: 'Departamento X', servidores: [{ id: 1 }] }] },
    ];

    const mapa = construirClassificacaoPorServidor(distribuicao);

    expect(mapa.get(1)).toBeDefined();
    expect(mapa.get(404)).toBeUndefined();
  });
});
