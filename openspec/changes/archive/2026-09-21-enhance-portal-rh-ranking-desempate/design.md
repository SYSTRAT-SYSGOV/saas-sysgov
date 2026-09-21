# Design: Modernização da Aba Classificação Oficial & Desempate Art. 39

## Context

A sub-aba "Classificação Oficial & Desempate Art. 39" (`activeTab === 'ranking-desempate'`) do Portal de RH e Secretaria Municipal de Gestão de Pessoas (`PortalRhView.tsx`) é responsável por apresentar a lista ordenada final de servidores avaliados, aplicando a ordem legal de desempate preconizada pelo Art. 39 da Lei Municipal nº 1.704/2006:
1. Maior Nota Final Consolidada (NFC);
2. Maior tempo de serviço público efetivo no município (em dias);
3. Maior idade civil (em anos).

Conforme detalhado no `proposal.md`, a interface atual apresentava limitações:
- Utilização de `DataTable` com largura fixa (`fixedLayout={true}`) que provocava barra de rolagem horizontal desnecessária em resoluções desktop padrão (1366px e 1920px);
- Falta de filtros estruturados por Secretaria, Departamento, Cargo, Faixa de Conceito e Elegibilidade;
- Falta de destaque visual transparente para os servidores que empataram em pontuação e foram desempatados pelos critérios da lei;
- Atribuição de lotações estáticas ("Secretaria de Saúde") ao invés de utilizar a árvore hierárquica real de `classificacaoPorServidor` e `orgTree`.

## Goals / Non-Goals

**Goals:**
- **Módulo Utilitário Puro (`PortalRhView.desempate.ts`)**: Estruturar tipos, regras de detecção de empates, filtros multi-critério e cálculo de métricas executivas de forma pura e desacoplada, 100% coberta por testes no Vitest.
- **Lotação Institucional Dinâmica**: Integrar cada servidor ranqueado aos dados reais de Secretaria e Departamento obtidos de `classificacaoPorServidor` e `extrairSecretariasEDepartamentos(orgTree)`.
- **Painel de Filtros Avançados & Quick Filters**: Barra de busca rápida por texto (nome/matrícula/cargo), painel colapsável com seletores dinâmicos e pílulas de acesso rápido em 1 clique ("Todos", "Elegíveis (≥70)", "Empates Art. 39", "Excelente (≥90)", "Em PMD (<70)").
- **Painel Executivo de KPIs**: Barra superior com 4 cartões de indicadores analíticos com tipografia técnica JetBrains Mono (`font-mono tabular-nums`).
- **Grid Fluido & Transparência do Desempate**: Grid responsivo sem scroll lateral em desktop, destacando visualmente os casos de empate com badges semânticos e identificação clara do critério de desempate aplicado.
- **Exportação CSV Rica**: Colunas dedicadas com atributos atômicos para auditoria e prestação de contas.

**Non-Goals:**
- Alterar as regras legislativas ou a fórmula de desempate do Art. 39 no backend.
- Alterar outras abas do `PortalRhView` (as abas "Quadro de Servidores" e "Estágio Probatório" já possuem suas respectivas especificações e padronizações).
- Adicionar chamadas assíncronas ou endpoints adicionais além dos já fornecidos pelo contexto do módulo CAPD.

## Decisions

### Decisão 1: Separação de Funções Puras em `PortalRhView.desempate.ts`
- **Decisão**: Isolar a lógica de ordenação, enriquecimento, identificação de empates, filtragem e cálculo de KPIs em um arquivo dedicado `PortalRhView.desempate.ts`, mantendo `PortalRhView.tsx` focado apenas na orquestração de estado e renderização dos componentes do `@sysgov/ui`.
- **Alternativas consideradas**:
  - *Manter inline em `PortalRhView.tsx`*: Rejeitado para evitar sobrecarregar o componente (que já possui mais de 2.000 linhas) e para permitir testes unitários isolados de alta velocidade no Vitest.

### Decisão 2: Algoritmo de Identificação de Empates e Critério Aplicado
- **Decisão**: Durante a ordenação e enriquecimento do ranking, verificar se existem dois ou mais servidores com a mesma pontuação NFC. Caso haja empate na pontuação:
  1. O servidor é marcado com a flag `possuiEmpatePontuacao: true`;
  2. Identifica-se o critério que determinou a posição relativa (`'dias_servico'` se os dias forem diferentes, `'idade'` se os dias forem iguais mas as idades diferentes, ou `'total'` se ambos empatarem em todos os critérios).
- **Alternativas consideradas**:
  - *Apenas ordenar sem marcar flags*: Rejeitado porque a equipe de RH precisa de visibilidade instantânea sobre quais colocações foram decididas por desempate legal, facilitando respostas a eventuais recursos administrativos.

### Decisão 3: Grid Fluido sem Barra de Rolagem Lateral no Desktop
- **Decisão**: Configurar o `DataTable` com dimensionamento fluído (`fixedLayout={false}` ou colunas com larguras percentuais e quebras controladas), combinando dados afins quando necessário (ex.: Nome com Matrícula logo abaixo em texto secundário) e removendo larguras em pixels excessivas.
- **Alternativas consideradas**:
  - *Manter largura fixa com overflow horizontal*: Rejeitado porque quebra a harmonia visual da aplicação e exige que o usuário use scroll lateral mesmo em monitores de alta resolução.

### Decisão 4: Mapeamento de Lotação com Fallback Seguro
- **Decisão**: Obter secretaria e departamento via `classificacaoPorServidor.get(s.id)`. Caso o servidor não possua lotação atribuída na árvore organizacional, utilizar fallbacks amigáveis (`"Não vinculada"`, `"Geral"`), evitando strings hard-coded incorretas.
- **Alternativas consideradas**:
  - *Ignorar a lotação na tabela de classificação*: Rejeitado porque a lotação é indispensável para filtros setoriais pela Secretaria Municipal de Gestão de Pessoas.

## Risks / Trade-offs

- **[Risco] Inconsistência de formato nas datas de nascimento ou admissão para o cálculo de dias e idade.**
  - *Mitigação*: Implementar parser resiliente em `PortalRhView.desempate.ts` com validação de formato e fallback numérico (zero dias ou idade padrão), garantindo que dados incompletos não gerem `NaN` nem quebrem a ordenação.

- **[Risco] Sobrecarga de re-renderizações ao alternar filtros.**
  - *Mitigação*: Utilizar `useMemo` para a lista enriquecida, para o resultado filtrado e para os KPIs, garantindo que operações pesadas só executem quando os dados brutos ou filtros ativos sofrerem alteração.
