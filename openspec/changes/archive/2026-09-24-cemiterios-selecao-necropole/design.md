# Design Técnico: Seleção de Necrópole e Painel de Administração Geral

## Contexto

Consulte o documento `proposal.md` para a motivação do negócio e `specs/cemiterio/selecao-necropole/spec.md` para os requisitos funcionais.

O módulo de cemitérios em `apps/web-client/src/modules/cemiterios` possui hoje uma estrutura com abas locais em `CemiteriosModule.tsx`. Os dados de parques são obtidos via `cemiteriosApi.parques()`. Contudo, o módulo não possuía um gerenciador de contexto que avaliasse a quantidade de cemitérios autorizados ao usuário nem uma visão executiva consolidada em nível municipal.

Este design detalha a arquitetura frontend para viabilizar:
1. Controle de fluxo e gatekeeper inicial de acesso.
2. Tela de seleção de necrópole com grid de cards informativos.
3. Tela executiva de Administração Geral Municipal com dashboards consolidados, financeiro macro e manutenções.
4. Cabeçalho contextual com seletor rápido de necrópole (switcher).

---

## Objetivos / Não-Objetivos

**Objetivos:**
- Prover uma experiência fluida onde operadores de um único cemitério vão direto à sua rotina sem fricção.
- Fornecer aos gestores municipais e operadores multiparque um ponto de entrada claro para escolher a necrópole desejada.
- Criar a visão de "Administração Geral Municipal" com dados agregados de todo o município (dashboards, financeiro, manutenções).
- Permitir alternar de cemitério a qualquer momento através do cabeçalho da necrópole sem perder a sessão.
- Respeitar rigorosamente o Design System (`@sysgov/ui`) e `JetBrains Mono` para todos os indicadores numéricos, percentuais e monetários.

**Não-Objetivos:**
- Não inclui alteração no modelo de dados transacional de sepultamentos e concessões (que continuam isolados por necrópole e tenant).
- Não inclui criação de novos endpoints backend complexos além do consumo das APIs existentes de parques e relatórios consolidados.

---

## Decisões Técnicas de Arquitetura

### D1: Centralização de Estado no `CemiteriosContext`
O contexto atual em `src/modules/cemiterios/context/CemiteriosContext.tsx` será estendido para ser a fonte única de verdade do estado de necrópole ativa e do modo de visualização.

**Estrutura do Contexto:**
```typescript
export type ModoVisaoCemiterios = 'selecao' | 'administracao_geral' | 'gestao_necropole';

export interface CemiteriosContextData {
  cemiteriosDisponiveis: ParqueCemiterio[];
  cemiterioAtivoId: string | null;
  cemiterioAtivo: ParqueCemiterio | null;
  isCarregandoCemiterios: boolean;
  modoVisao: ModoVisaoCemiterios;
  isGestorMunicipal: boolean;
  temMultiplosCemiterios: boolean;
  selecionarCemiterio: (id: string) => void;
  abrirAdministracaoGeral: () => void;
  voltarParaSelecao: () => void;
}
```

*Justificativa*: Evita prop-drilling entre o cabeçalho, a barra de abas e as views filhas (inventário, financeiro, etc.), garantindo que qualquer subcomponente saiba em qual necrópole está operando.

---

### D2: Triagem e Gatekeeper no Ciclo de Vida Inicial
Ao inicializar o `CemiteriosContext`:
1. Executa requisição para `cemiteriosApi.parques()`.
2. Verifica permissão via `useCan('cemiterios.admin')` ou atribuição de roles para determinar `isGestorMunicipal`.
3. Aplica a regra de negócio:
   - Se `parques.length === 1`: define automaticamente `cemiterioAtivoId = parques[0].id` e `modoVisao = 'gestao_necropole'`.
   - Se `parques.length > 1`:
     - Mantém `cemiterioAtivoId = null` e define `modoVisao = 'selecao'`.
     - Caso haja preferência salva em `localStorage` da última necrópole selecionada na sessão recente, o usuário pode ser pré-alocado opcionalmente ou convidado a continuar.
   - Se `parques.length === 0`: renderiza Empty State explicativo no Design System.

---

### D3: Visualização `SelecaoNecropoleView`
Componente dedicado renderizado quando `modoVisao === 'selecao'`:
- **Barra de Ações e Filtro**: Busca textual rápida (filtra cemitérios por nome, código, bairro/distrito).
- **Banner de Administração Geral**: Se `isGestorMunicipal === true`, exibe banner com badge "Gestão Municipal Unificada" e botão para acessar a "Administração Geral".
- **Grid de Cards de Cemitérios**:
  - Cada card utiliza `<Card>` do `@sysgov/ui`.
  - Exibe nome do cemitério, badge de status (Ativo, Em Manutenção, Saturado), endereço/bairro.
  - Indicador numérico de capacidade: Total de Jazigos, Jazigos Ocupados e Disponíveis, com barra de progresso e percentual formatados em `JetBrains Mono` (`font-mono tabular-nums`).
  - Botão de ação "Acessar Gestão da Necrópole" (`variant="primary"`).

---

### D4: Painel de `AdministracaoGeralView`
Componente executivo renderizado quando `modoVisao === 'administracao_geral'`:
- **Grid de KPIs Municipais (Topo)**:
  - Total de Necrópoles Ativas.
  - Capacidade Municipal (Jazigos Totais e Disponíveis).
  - Taxa Média de Ocupação do Município (com badge de alerta se > 85%).
  - Sepultamentos no Mês (agregado de todos os cemitérios).
  - Exumações e Traslados Programados.
- **Abas Internas da Administração Geral**:
  1. **Comparativo de Necrópoles**: Lista/tabela completa de cemitérios com capacidade, ocupação, equipe alocada e botão de atalho direto para alternar para a necrópole.
  2. **Financeiro Consolidado**: Resumo de arrecadação de taxas de concessão, renovações e manutenção anual, com valores em R$ (`font-mono tabular-nums`).
  3. **Manutenções e Ocorrências**: Painel integrado de manutenções preventivas, capina, podas, reformas de muros e conservação predial pendentes em cada cemitério.

---

### D5: Barra Superior Contextual (`NecropoleHeaderBar`)
Exibida quando `modoVisao === 'gestao_necropole'`:
- Identificação clara do cemitério ativo no topo: ícone institucional, nome da necrópole, badge de status e capacidade resumida.
- Se o usuário tiver acesso a múltiplos cemitérios ou for gestor municipal:
  - Botão dropdown "Trocar Cemitério" que lista os outros cemitérios cadastrados para troca instantânea.
  - Botão de atalho "Administração Geral" para gestores municipais.
- Se o usuário tiver acesso a necrópole única:
  - A barra exibe o nome e status da necrópole de forma estática, sem opção de troca.

---

### D6: Composição de Abas Locais da Necrópole
Quando em `modoVisao === 'gestao_necropole'`, o `CemiteriosModule.tsx` renderiza a barra de navegação local com as 8 abas funcionais:
- `visao_geral`: Dashboard da necrópole selecionada.
- `inventario`: Gestão de setores, quadras e jazigos do cemitério ativo.
- `concessoes`: Contratos e títulos de perpetuidade da necrópole.
- `operacoes`: Sepultamentos, exumações e agendamentos.
- `vistorias`: Vistorias técnicas locais.
- `mapa`: Mapa interativo georreferenciado dos jazigos do cemitério ativo.
- `financeiro`: Arrecadação de taxas da necrópole.
- `empreiteiros`: Empresas autorizadas para obras tumulares.

---

## Riscos / Trade-offs

| Risco | Mitigação |
|---|---|
| Latência ao buscar múltiplos parques ou estatísticas agregadas | Utilizar dados já cacheados na resposta de `parques()` e exibir skeleton loading com feedback visual claro. |
| Perda de contexto de trabalho ao alternar de cemitério | O switcher no cabeçalho limpa os estados locais específicos (ex: formulário de jazigo aberto) e reseta a visualização para a aba correspondente na nova necrópole. |
| Inconsistência de permissão entre cemitérios | As permissões são validadas pelo backend na resolução do `parqueId`. Se o usuário tentar acessar ID não autorizado, a aplicação bloqueia e retorna para a tela de seleção. |
| Usuário de cemitério único tentar forçar tela de seleção | O guard detecta `temMultiplosCemiterios === false` e redireciona imediatamente para o cemitério atribuído. |
