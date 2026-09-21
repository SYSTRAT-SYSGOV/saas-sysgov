# Proposta: Modernização e Expansão da Aba de Pendências de Hierarquia (DRH)

## Motivação (Why)

No módulo CAPD do SYSGOV, a resolução automatizada de avaliadores depende da integridade da árvore organizacional, dos vínculos funcionais e do status de afastamento dos chefes imediatos. Quando ocorrem casos excepcionais — tais como servidores sem superior cadastrado no organograma, chefias imediatas afastadas sem substituto legal designado ou unidades de topo sem configuração formal — o motor de hierarquia gera registros de exceção na tabela `capd_pendencias_hierarquia`.

Atualmente, o painel de resolução dessas pendências no Portal do RH (`PendenciasHierarquiaPanel.tsx`) apresenta severas limitações operacionais:
1. **Interface Rudimentar e Incompleta**: Utiliza uma tabela estática básica sem paginação, sem ordenação, sem busca e sem filtros por tipo de inconsistência ou ciclo avaliativo.
2. **Ausência de Indicadores de Gestão (KPIs)**: O gestor do DRH não possui visibilidade consolidada do volume total de pendências abertas, resolvidas, taxa de resolução ou impacto em avaliações represadas.
3. **Resolução Manual Frágil e Insegura**: O modal de resolução atual exige que o operador digite manualmente o número inteiro do ID do avaliador (`<Input type="number" placeholder="Ex.: 42" />`), sem qualquer busca de servidores, validação de impedimento/parentesco ou exibição de contexto do servidor avaliado.
4. **Falta de Recursos para Auditoria e Exportação**: Não há ferramentas para exportação de relatórios de inconsistências para o DRH auditar e sanear cadastros no sistema de pessoal/ERP.
5. **Adesão ao Design System**: A tabela atual não utiliza o componente canônico `DataTable` de `@sysgov/ui`, não possui tipografia técnica padronizada em `JetBrains Mono` e não oferece experiência ergonômica de trabalho.

A modernização desta aba é vital para permitir que o DRH saneie com agilidade os bloqueios da avaliação de desempenho, garantindo transparência, governança e conformidade legal.

---

## O que Mudará (What Changes)

- **Painel Executivo de KPIs Analíticos**:
  - 4 cartões de indicadores no topo com visualização em destaque: Total de Pendências Abertas (com alerta visual em âmbar), Total Resolvidas, Taxa de Saneamento (%) e Distribuição por Tipo de Pendência.
- **Filtros Avançados e Busca Multifacetada**:
  - Busca textual rápida por Nome do Servidor, Matrícula e Diagnóstico/Motivo;
  - Filtro por Status (Aberta, Resolvida, Todas);
  - Filtro por Tipo de Inconsistência (Sem superior resolvido, Afastamento sem substituto, Topo da hierarquia sem configuração);
  - Filtro por Ciclo Avaliativo.
- **Tabela Moderna com `DataTable` (`@sysgov/ui`)**:
  - Paginação completa com seletor de quantidade por página (`pageSizeSelector`);
  - Ordenação por data de criação, servidor, tipo e status;
  - Badges semânticos com ícones para cada categoria de pendência;
  - Dados técnicos (matrículas, códigos, datas e horários) rigorosamente em `JetBrains Mono` (`font-mono tabular-nums`);
  - Layout fluido sem barras de rolagem horizontal desnecessárias.
- **Modal de Resolução Guiado e Seguro**:
  - Exibição de cabeçalho com ficha resumida do servidor afetado (Nome, Matrícula, Lotação e Diagnóstico do Algoritmo de Hierarquia);
  - Seletor de avaliador com busca preditiva por nome/matrícula ou seleção a partir da lista de gestores/avaliadores elegíveis da unidade;
  - Verificação visual de impacto (informa que as avaliações abertas não-homologadas serão redirecionadas para o novo avaliador);
  - Histórico de resolução com registro de quem resolveu e data/hora.
- **Exportação de Relatório de Inconsistências**:
  - Exportação de dados tabulares para CSV formatado com cabeçalhos padronizados e codificação UTF-8 BOM para fácil abertura no Microsoft Excel / Calc pelo setor de Recursos Humanos.
- **Módulo de Suporte Puro e Testes Automatizados**:
  - Criação de `PendenciasHierarquiaPanel.utils.ts` contendo funções puras de filtragem, agregação de KPIs e formatação de exportação, com 100% de cobertura de testes unitários no Vitest.

---

## Capacidades (Capabilities)

### Modified Capabilities

- `capd`: Expansão das regras de governança e interface do painel de pendências de hierarquia avaliativa no Portal de Recursos Humanos (DRH).

---

## Impacto

- **Frontend**:
  - Refatoração de `apps/web-client/src/modules/capd/PendenciasHierarquiaPanel.tsx`.
  - Criação de utilitários isolados em `apps/web-client/src/modules/capd/PendenciasHierarquiaPanel.utils.ts`.
  - Criação de suíte de testes unitários em `apps/web-client/src/modules/capd/__tests__/PendenciasHierarquiaPanel.test.ts`.
- **Design System & Componentes**:
  - Utilização estrita de componentes de `@sysgov/ui` (`Card`, `Button`, `Badge`, `DataTable`, `Modal`, `Select`, `Input`, `KpiCard`).
  - Tipografia técnica estritamente em `JetBrains Mono` (`font-mono tabular-nums`).
- **Backend**:
  - Totalmente compatível com as rotas e regras já existentes em `PendenciaHierarquiaController` (`GET /api/capd/pendencias-hierarquia` e `POST /api/capd/pendencias-hierarquia/{id}/resolver`).
