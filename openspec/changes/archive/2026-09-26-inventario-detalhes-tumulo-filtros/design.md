# Design Técnico: Modernização dos Detalhes da Sepultura, Ficha Cadastral e Filtros Avançados

## Contexto

A experiência do usuário no inventário de necrópoles do SYSGOV (`apps/web-client/src/modules/cemiterios/views/InventarioView.tsx`) utilizava uma gaveta lateral (`Drawer sm:max-w-lg`) para exibir detalhes de túmulos. Esse formato lateral impunha rolagem vertical exaustiva e impedia a consolidação de informações essenciais, omitindo a dimensão de arrecadação financeira municipal (taxas anuais, concessões, inumações e DAMs). Além disso, a ficha cadastral oficial municipal sofria com constrangimento de largura (`max-w-3xl`), e a listagem de inventário dispunha apenas de filtros básicos unidimensionais.

Para detalhes sobre a motivação e requisitos funcionais, consulte `proposal.md` e `specs/cemiterio/inventario/spec.md`.

---

## Metas e Não-Metas (Goals / Non-Goals)

**Metas:**
- Substituir o `Drawer` lateral por um modal ergonômico e amplo (`ModalDetalheJazigo`, `max-w-5xl`), preservando retrocompatibilidade com chamadas existentes (`DetalheJazigo` exportado).
- Organizar as informações da sepultura em 5 sub-abas temáticas: Físico, Concessão, Sepultados, Financeiro e Vistorias/Obras.
- Integrar a dimensão financeira à sepultura, consumindo o histórico de guias DAM via endpoint `/api/cemiterios/guias?plot_id={id}` e exibindo métricas de adimplência formatadas em `JetBrains Mono`.
- Ampliar a visualização da Ficha Cadastral (`ModalFichaCadastral`) para `max-w-5xl`/`max-w-6xl` com grid multi-colunas inteligente, eliminando barras de rolagem desnecessárias no desktop sem quebrar o layout oficial de impressão A4.
- Implementar painel expansível de Filtros Avançados (situação jurídica da concessão, regularidade financeira/inadimplência, ocupação e georreferenciamento) tanto no frontend quanto no backend Eloquent.

**Não-Metas:**
- Não reimplementar primitivos de interface fora do design system `@sysgov/ui`.
- Não alterar regras de negócio do cálculo de juros ou multas fiscais já regidas pelo `GuiaService`.
- Não alterar a estrutura transacional das tabelas de banco de dados (os relacionamentos existentes já suportam as queries necessárias via índices compostos).

---

## Decisões de Arquitetura e Design

### Decisão 1: Modal em Abas vs. Drawer Expansível
- **Escolha**: Implementar `ModalDetalheJazigo` com largura `max-w-5xl` centralizado, utilizando abas de navegação internas (`activeTab: 'geral' | 'concessao' | 'ocupantes' | 'financeiro' | 'vistorias'`).
- **Justificativa**: A quantidade de informações de uma sepultura municipal (dados cartográficos, titularidade jurídica, ocupantes sepultados com dados de cartório de óbito, extrato fiscal e laudos de vistorias) é multidimensional. Tentar exibir tudo linearmente em uma cortina lateral força centenas de pixels de rolagem. Um modal centralizado com abas categorizadas reduz a carga cognitiva e oferece visão completa a um clique.
- **Alternativa Descartada**: Aumentar a largura do `Drawer` para `w-full` ou `max-w-3xl`. Continuaria a ser uma barra lateral com rolagem pesada e sem a hierarquia clara que as abas proporcionam.

### Decisão 2: Reestruturação do Grid da Ficha Cadastral (`ModalFichaCadastral`)
- **Escolha**: Elevar a largura do container modal para `max-w-5xl`/`max-w-6xl` e reestruturar a folha de dados em grid de 2 a 3 colunas balanceadas para visualização em tela, mantendo regras estritas `@media print` para saída em folha A4 contínua.
- **Justificativa**: Em resoluções de desktop (1920x1080, 1707x932, 1366x768), o grid horizontal aproveita o espaço em tela e permite que fiscal, administrador ou atendente visualizem cabeçalho, localização, titular, inumados e autenticidade com QR Code simultaneamente sem precisar rolar a página para conferir dados.
- **Alternativa Descartada**: Manter largura `max-w-3xl` e apenas reduzir o tamanho da fonte. Isso prejudicaria a legibilidade e a acessibilidade da informação.

### Decisão 3: Integração Financeira do Jazigo via Query Eloquent
- **Escolha**: Habilitar no endpoint `FinanceiroController@guias` o parâmetro `plot_id`, que busca todas as guias onde `origem_type = 'concessao'` e `origem_id` pertença às concessões do jazigo, além de `origem_type = 'jazigo'`. Ajustar a autorização para permitir leitura para usuários com perfil de consulta (`cemiterios.view`).
- **Justificativa**: O modelo de dados conecta cobranças (`cemetery_charges`) ao titular (`holder_id`) e à concessão (`origem_id` / `origem_type = 'concessao'`), que por sua vez se conecta ao túmulo (`plot_id`). Essa abordagem reaproveita a infraestrutura existente de guias sem duplicar modelos nem criar tabelas de junção redundantes.
- **Alternativa Descartada**: Criar um novo controller específico apenas para o extrato financeiro do jazigo. Desnecessário, pois o `FinanceiroController` já dispõe de toda a lógica de paginação, serialização de guias e ações de PDF/2ª via.

### Decisão 4: Filtragem Avançada no Banco de Dados com Índices Compostos
- **Escolha**: Processar os novos filtros (`concessao_status`, `financeiro_status`, `faixa_ocupacao`, `georreferenciado`) diretamente nas queries do `JazigoController::index` utilizando `whereHas`, `whereDoesntHave`, `whereNull`/`whereNotNull` e comparações de colunas indexadas (`park_id`, `sector_id`, `estado`).
- **Justificativa**: Filtrar no frontend exigiria transferir todos os 20k+ jazigos para a memória do navegador, reintroduzindo a lentidão previamente resolvida. Filtrar no backend garante paginação ágil de 50 itens por página com resposta em sub-300ms.

---

## Riscos e Mitigações

| Risco Identificado | Mitigação Arquitetural |
| :--- | :--- |
| **Quebra de compatibilidade em `MapaView`**: O componente `MapaView.tsx` consome `DetalheJazigo` importado de `InventarioView.tsx`. | Manter o export `DetalheJazigo` em `InventarioView.tsx` apontando diretamente para `ModalDetalheJazigo`, garantindo que tanto o mapa quanto a tabela abram o modal enriquecido sem divergências. |
| **Sobrecarga de chamadas de API ao abrir o modal**: Carregar vistorias, histórico, concessões, inumações e guias financeiras simultaneamente pode causar lentidão se executado desordenadamente. | Executar as consultas em paralelo via `Promise.all` ou lazy loading por aba ativa (a aba Financeiro só busca guias quando selecionada ou em pré-carregamento assíncrono não-bloqueante). |
| **Impressão da Ficha Cadastral deformada**: Alterações no layout em tela podem afetar a quebra de página física. | Separar rigorosamente as classes de exibição em tela (`screen:grid...`) das regras de impressão (`print:block print:w-[210mm] print:p-0`), testando a saída de impressão em A4. |

---

## Plano de Migração e Rollback

1. **Deploy Backend**: Adicionar os filtros no `JazigoController` e `FinanceiroController`. Não há alteração de esquema DDL (sem novas migrations), portanto é 100% retrocompatível.
2. **Deploy Frontend**: Inserir os componentes `ModalDetalheJazigo`, `ModalFichaCadastral` atualizado e os seletores avançados no `InventarioView`.
3. **Estratégia de Rollback**: Caso ocorra alguma incompatibilidade de visualização, a reversão de commits no frontend restaura imediatamente a gaveta lateral e a ficha cadastral anterior sem impacto no banco de dados.
