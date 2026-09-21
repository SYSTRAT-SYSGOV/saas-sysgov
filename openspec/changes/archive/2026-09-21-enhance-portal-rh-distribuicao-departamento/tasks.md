# Tasks

## 1. Frontend — Buscar e Estruturar o Organograma Real

- [x] 1.1 Adicionado estado `orgTree`/`orgTreeErro` e chamada a `api.org.getTree()` em
      `carregarDadosRh`, distinguindo 403 (`err.response.status`) de árvore vazia. Verificado com
      `tsc --noEmit`; teste manual dos dois casos de erro fica coberto pela validação da tarefa 6.3.
- [x] 1.2 `extrairSecretariasEDepartamentos()` extrai secretarias de nível 1 e seus departamentos
      diretos. Verificado com `PortalRhView.distribuicao.test.ts` (Vitest): 2 testes passando.

## 2. Frontend — Classificação de Servidores por Unidade

- [x] 2.1 Extraída a lógica de vínculo para `servidorPertenceAoDepartamento()` (usada dentro de
      `dadosDistribuicao`): `org_unit_id` tem prioridade; sem ele, cai no fallback textual já
      existente. Verificado com testes Vitest cobrindo match direto por `org_unit_id` e match por
      fallback textual (nome e sigla).
- [x] 2.2 Bucket "Servidores Não Classificados" adicionado em `dadosDistribuicao` para quem não
      bate em nenhum departamento por nenhum dos dois critérios, com o mesmo layout de card
      (badge âmbar, sem responsável). Verificado com teste Vitest cobrindo um servidor sem
      `org_unit_id` e sem correspondência textual (retorna `false` em todos os departamentos).

## 3. Frontend — Indicadores Agregados e Badges Reais

- [x] 3.1 Os 5 `StatCard` agora vêm de `kpisDistribuicao` (`useMemo` derivado de `secretariasOrg` +
      `servidores` + `dadosDistribuicao`), conforme design.md Decisão 4. Verificado por
      `tsc --noEmit`; a consistência numérica é garantida estruturalmente (mesmos dados-fonte dos
      cards renderizados).
- [x] 3.2 Badges "N Departamento(s)" por secretaria e "Total: N Servidores + N Chefias" (rodapé da
      matriz) agora usam `sec.departamentos.length` e `kpisDistribuicao`, respectivamente.

## 4. Frontend — Estados Vazios e de Erro

- [x] 4.1 Adicionado `EmptyState` distinto para falta de permissão (`orgTreeErro === 'sem_permissao'`,
      detectado via `err.response.status === 403`) e para tenant sem nenhuma secretaria cadastrada
      (`secretariasOrg.length === 0`).

## 5. Limpeza

- [x] 5.1 Removidos `ESTRUTURA_ORGANIZACIONAL_CANONICA`, `EstruturaSecretaria` e
      `EstruturaDepartamento` de `PortalRhView.tsx`. `getSiglaSecretaria`/`getNomeCurtoSecretaria`
      mantidos — ainda usados pela aba "Ranking Desempate Art. 39" (fora do escopo desta mudança).
      Verificado com `tsc --noEmit` e busca textual confirmando ausência de outras referências.

## 6. Verificação Final

- [x] 6.1 `npx vitest run` em `apps/web-client`: **12 arquivos, 77 testes, todos passando**
      (inclui os 5 testes novos de `PortalRhView.distribuicao.test.ts`, tarefas 1.2/2.1/2.2).
- [x] 6.2 `npm run typecheck` na raiz: zero erros em `sysgov-web` e `@sysgov/web-client`.
- [x] 6.3 Validado manualmente com o usuário no ambiente Docker real. Durante a validação, achados
      e correções adicionais (fora do escopo original, mas necessários pra aba funcionar):
      - **Bug pré-existente no SDK**: `OrgModuleClient` (`packages/sdk/src/modules/org/client.ts`)
        chamava `/org/tree`, `/org/units`, etc. — rotas que não existem. A rota real é
        `api/org-units` (`Route::prefix('api/org-units')`). Corrigido em todos os métodos do
        client (`getTree`, `listUnits`, `getUnit`, `createUnit`, `updateUnit`, `deleteUnit`,
        `moveUnit` — também corrigido de PATCH para POST —, `linkUser`, `unlinkUser`, `getScope`,
        `exportData`). `importData` permanece quebrado — não existe rota `api/org-units/import`
        no backend (fora do escopo desta mudança, documentado com comentário no código).
      - **Bug em `extrairSecretariasEDepartamentos`**: só buscava secretarias no nível 1 da árvore;
        árvores reais podem ter secretarias aninhadas sob um nó `raiz`. Corrigido para buscar
        recursivamente em qualquer profundidade. Verificado com novo teste Vitest.
      - Seed de organograma do tenant de teste feito via
        `docker exec saas-sysgov-api-1 php artisan db:seed --class="Modules\OrgChart\Database\Seeders\OrgChartDatabaseSeeder"`.

## 7. Visualização em Tabela (pedido adicional do usuário)

- [x] 7.1 Adicionado alternador "Tabela" / "Cards" na barra de filtros, com "Tabela" como
      visualização padrão ao abrir a aba. A tabela (`DataTable` de `@sysgov/ui`/`@/components/ui`,
      não HTML cru) lista uma linha por servidor (matrícula, nome, cargo, secretaria,
      departamento, situação), respeitando os mesmos filtros de secretaria e busca já existentes.
      Verificado com `tsc --noEmit` e `npx vitest run` (12 arquivos, 81 testes, todos passando).
