# Design

## Context

A aba "Acompanhamento do Estágio Probatório" (`activeTab === 'estagio'`) em `apps/web-client/src/modules/capd/views/PortalRhView.tsx` lista os servidores públicos cujo atributo `estagio_probatorio` é verdadeiro. Atualmente, a tela exibe uma `DataTable` simples com `columnsServidoresGeral` e `fixedLayout={true}`, sem filtros de fase ou secretaria, sem KPIs panorâmicos e forçando uma barra de rolagem lateral no desktop.

A presente arquitetura reutiliza o modelo de dados já carregado no Portal de RH (`servidores`, `classificacaoPorServidor` e `ultimaAvaliacaoPorServidor`) e os padrões de componentes de `@sysgov/ui`, replicando o sucesso obtido no Quadro Geral de Servidores com especialização para o rito de estágio probatório.

## Goals / Non-Goals

**Goals:**
- Implementar painel de filtros avançados estruturados para o estágio probatório (Fase 1/2/3, Secretaria, Departamento, Status do Estágio, Situação e Avaliação no Ciclo Atual).
- Fornecer pílulas rápidas (*Quick Filters*) para navegação instantânea em 1 clique pelas 3 fases do estágio e pendências de avaliação.
- Redesenhar a tabela com colunas focadas no ciclo probatório (`columnsEstagioProbatorio`), eliminando o scroll horizontal em resoluções desktop ($\ge 1024$px).
- Inserir cabeçalho executivo de KPIs específicos para a cadência do estágio probatório (Total em Estágio, 1ª Fase 12m, 2ª Fase 24m, 3ª Fase 36m e Taxa de Avaliação no Ciclo).
- Exportação atômica em CSV, Excel e PDF com dados de fase, interstício e lotação estruturados via `meta.exportValue`.

**Non-Goals:**
- Não criar novos endpoints de backend (dados já disponíveis no cliente).
- Não alterar regras de homologação ou transição de fases (permanecem gerenciadas pelos serviços de ciclo e cadência trienal do backend).

## Decisions

### 1. Modelo de Dados e Funções Puras em `PortalRhView.quadro.ts`

Definimos a interface `FiltrosEstagioProbatorio` e a função pura `filtrarServidoresEstagio`:

```typescript
export interface FiltrosEstagioProbatorio {
  termoBusca: string;
  secretaria: string;
  departamento: string;
  faseEstagio: 'todas' | '1' | '2' | '3';
  statusEstagio: 'todos' | 'em_andamento' | 'aprovado' | 'reprovado' | 'suspenso';
  situacao: 'todos' | 'ativo' | 'afastado';
  avaliacaoCiclo: 'todos' | 'com_avaliacao' | 'sem_avaliacao';
}
```

E a função pura `calcularKpisEstagioProbatorio`:
```typescript
export interface KpisEstagioProbatorio {
  totalEstagio: number;
  totalFase1: number;
  percentualFase1: number;
  totalFase2: number;
  percentualFase2: number;
  totalFase3: number;
  percentualFase3: number;
  totalComAvaliacao: number;
  percentualComAvaliacao: number;
}
```

### 2. Tabela de Colunas Especializadas (`columnsEstagioProbatorio`)

| Coluna | Conteúdo Visual | Exportação Atômica (`meta.exportValue`) | Largura Otimizada |
| :--- | :--- | :--- | :--- |
| **Servidor Público** | Matrícula em badge mono + Nome completo + CPF | Nome, Matrícula, CPF | ~250px |
| **Cargo & Admissão** | Cargo efetivo + Data de admissão em fonte técnica mono | Cargo Efetivo, Data Admissão | ~180px |
| **Lotação Institucional** | Badge de sigla da Secretaria + Departamento de lotação | Secretaria, Departamento | ~230px |
| **Fase & Interstício** | Badge de Fase (1ª Fase / 12m, 2ª Fase / 24m, 3ª Fase / 36m) + Status + Término | Fase do Estágio, Status Probatório | ~180px |
| **Chefia Imediata** | Nome do superior avaliador imediato | Chefia Imediata | ~150px |
| **Ações** | Botão "Avaliação" (quando houver no ciclo) + Botão "Dossiê" | (omitido) | ~120px |

A largura combinada sem travas rígidas se acomoda naturalmente em 100% da tela a partir de 1024px, dispensando rolagem horizontal.

### 3. Painel de Indicadores Executivos (KPIs)

No topo da aba, 4 cartões de KPI construídos a partir de `kpisEstagio`:
1. **Total em Estágio Probatório**: Efetivo sob acompanhamento da cadência trienal.
2. **1ª Fase (12 meses)**: Servidores no 1º interstício probatório (badge Âmbar).
3. **2ª Fase (24 meses)**: Servidores no 2º interstício probatório (badge Primária).
4. **3ª Fase (36 meses)**: Servidores na fase final conclusiva com estabilidade iminente (badge Esmeralda).

Todos os quantitativos e percentuais seguem a regra obrigatória do Design System SYSGOV: `font-mono tabular-nums`.

## Risks / Trade-offs

- **[Risco] Servidor sem fase preenchida (`estagio_fase_atual` nulo)**:
  - *Mitigação*: Assumir valor padrão `1` (1ª Fase) se `estagio_fase_atual` for nulo ou indefinido, exibindo indicador claro na interface.
- **[Risco] Departamento descontextualizado ao alternar Secretaria**:
  - *Mitigação*: Mesma lógica consolidada no quadro de servidores — ao mudar a secretaria, se o departamento atual não pertencer à nova secretaria, ele é automaticamente redefinido.
