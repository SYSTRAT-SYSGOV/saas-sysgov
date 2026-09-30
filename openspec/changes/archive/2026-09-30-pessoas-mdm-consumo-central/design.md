# Design

## Context

O backend do módulo Pessoas (`apps/api/Modules/Pessoas`) está consolidado como repositório canônico de identidade civil do SYSGOV, operando sob isolamento multi-tenant estrito (`tenant_id`, `cpf_hash`), proteção de dados da LGPD (criptografia em repouso e serialização exclusiva de `cpf_mascarado`), Form Requests validados, API Resources e `PessoaPolicy`. 

Contudo, módulos satélites como Cemitérios (em `OperadoresView` e `EmpreiteirosView`), RH e outros ainda mantêm fluxos paralelos que duplicam atributos civis (nome, CPF, contatos). Para transformar o módulo Pessoas em um Master Data Management (MDM) plenamente reutilizável, este design define a arquitetura dos componentes no `@sysgov/ui`, a camada de contratos no `@sysgov/sdk`, os hooks compartilhados no `apps/web-client` e o padrão de integração piloto no módulo Cemitérios.

## Goals / Non-Goals

**Goals:**
- Criar componentes de interface de domínio neutros, acessíveis e reutilizáveis em `@sysgov/ui`: `PessoaPicker`, `PessoaSearchInput`, `PessoaCard` / `PessoaSummary`, `PessoaFormModal` e `PessoaVinculosBadge`.
- Disponibilizar métodos de busca rápida e projeção enxuta (`lookup`) no `@sysgov/sdk` e na API, sem expor CPF literal ou hashes internos.
- Estabelecer os hooks `usePessoas` e `usePessoaPicker` no `apps/web-client` com debounce, cache leve e controle de modal.
- Substituir o cadastro manual paralelo de coveiros, pedreiros e empreiteiros em `apps/web-client/src/modules/cemiterios` pelo seletor `PessoaPicker`, associando a chave estrangeira `pessoa_id`.
- Apresentar no módulo de usuários (`apps/web-client/src/modules/users`) a indicação visual e o link para a pessoa física vinculada, sem consolidar os formulários.
- Preservar a compatibilidade com registros legados pré-existentes.

**Non-Goals:**
- Não realizar migração ou backfill de dados históricos de operadores legados nesta versão (novos cadastros passam a usar `pessoa_id`, registros antigos permanecem intactos).
- Não fundir os modelos nem os formulários de Pessoa e Usuário em uma tela única.
- Não implementar deduplicação probabilística ou assistida por IA.
- Não alterar as regras de negócio centrais já implementadas no backend de Pessoas.

## Decisions

### D1: Componentes de Domínio Centralizados em `@sysgov/ui`
- **Decisão**: Implementar `PessoaPicker`, `PessoaSearchInput`, `PessoaCard`, `PessoaFormModal` e `PessoaVinculosBadge` no pacote compartilhado `@sysgov/ui`, exportando-os em `packages/ui/src/index.ts`.
- **Justificativa**: Evita reimplementações locais nos módulos (`cemiterios`, `rh`, `finance`, etc.), assegura uniformidade visual aderente ao `DESIGN_SYSTEM.md` (paleta GOV.BR e tipografia técnica em JetBrains Mono) e garante o mascaramento obrigatório de dados sensíveis em conformidade com a LGPD em um único ponto auditável.
- **Alternativas consideradas**: Criar componentes dentro de `apps/web-client/src/modules/pessoas/components` e exportá-los entre módulos. Descartada pois violaria a regra de `@sysgov/ui` ser a fonte obrigatória de componentes reutilizáveis entre módulos e aplicações.

### D2: Busca Remota com Debounce no `PessoaPicker`
- **Decisão**: O `PessoaPicker` operará com combobox assíncrono disparando requisições com debounce de 300ms a partir do segundo caractere digitado (ou 11 dígitos para CPF), consumindo `/api/pessoas?q=...&compact=true`.
- **Justificativa**: Em órgãos municipais com milhares de munícipes e servidores cadastrados, o carregamento prévio da lista completa no frontend causaria degradação severa de memória e lentidão.
- **Alternativas consideradas**: Carregar a lista inicial completa em memória. Descartada por problemas de escalabilidade e performance.

### D3: Cadastro Rápido Inline (`PessoaFormModal`)
- **Decisão**: Disponibilizar um modal compacto (`size="xl"` ou `size="2xl"`) acessível diretamente pelo `PessoaPicker` caso a pessoa desejada ainda não conste na base, exigindo apenas os atributos essenciais: Nome completo, CPF, Nome Social (opcional), Data de Nascimento e Contato principal (E-mail ou Celular).
- **Justificativa**: Evita a quebra de fluxo do usuário que está cadastrando um operador ou empreiteiro e descobre que a pessoa ainda não foi registrada no cadastro geral.
- **Alternativas consideradas**: Forçar o usuário a sair da tela, abrir o módulo de pessoas, cadastrar e retornar. Descartada por prejudicar a experiência do usuário (UX).

### D4: Chave Estrangeira `pessoa_id` Nulável e Composta com `tenant_id`
- **Decisão**: A adição de `pessoa_id` nas tabelas consumidoras (`cemetery_operators`, `cemetery_contractors`) será `nullable`, com índice composto `[tenant_id, pessoa_id]`.
- **Justificativa**: Garante que o isolamento multi-tenant seja mantido, impede vazamento de integridade entre prefeituras e não quebra os registros históricos legados existentes que não possuem `pessoa_id`.
- **Alternativas consideradas**: Tornar `pessoa_id` obrigatório (`not null`). Descartada pois exigiria migração imediata de todos os operadores existentes no banco.

### D5: Exibição Desacoplada no Módulo Users
- **Decisão**: No módulo `users`, a visualização do usuário exibirá o componente `PessoaCard` indicando a pessoa vinculada, com um botão de ação "Ver Cadastro Civil" que redireciona para `/cadastros/pessoas?id=...`.
- **Justificativa**: Mantém o isolamento de domínios (identidade civil vs. credencial de acesso) e preserva a regra de negócio que exige ação explícita e permissão `cadastros.pessoas.promote` para gerenciar a conta de acesso.
- **Alternativas consideradas**: Incorporar os campos de edição civil dentro do formulário de usuário. Descartada por violar a separação arquitetural e de auditoria.

## Risks / Trade-offs

- **[Risco] Tentativa de cadastro rápido sem permissão RBAC**  
  *Mitigação*: O `PessoaPicker` verifica se o usuário autenticado possui a permissão `cadastros.pessoas.create`. Caso não possua, o botão de novo cadastro rápido é ocultado na interface e, caso haja chamada direta à API, o backend rejeita com HTTP 403 via `PessoaPolicy`.

- **[Risco] Renderização de operadores antigos sem `pessoa_id` no módulo Cemitérios**  
  *Mitigação*: Os componentes de listagem e detalhe de operadores verificam a presença de `pessoa_id`. Se preenchido, priorizam a renderização via `PessoaCard`/dados mestres; se ausente, realizam o fallback gracioso para os campos legados (`nome`, `documento_mascarado`) persistidos na tabela local.

- **[Risco] Exposição acidental de dados pessoais em endpoints de combobox**  
  *Mitigação*: O parâmetro `compact=true` na listagem de pessoas projeta estritamente `id`, `nome`, `nome_social` e `cpf_mascarado`, processados via `PessoaResource`, mantendo `cpf` literal e `cpf_hash` completamente inacessíveis.

## Migration Plan

1. Executar a migration `add_pessoa_id_to_cemetery_contractors` no módulo Cemitérios (`apps/api`).
2. Implementar e testar os componentes no `@sysgov/ui` (`packages/ui`).
3. Atualizar o SDK com os tipos e métodos de busca compacta (`packages/sdk`).
4. Atualizar `apps/web-client` implementando os hooks, integrando o `PessoaPicker` em `OperadoresView` e `EmpreiteirosView`, e o resumo no módulo `users`.
5. Executar `scripts/generate-module-registry.js` e validar a integridade com `tsc --noEmit`.

## Open Questions

- *Estratégia de Backfill*: A conversão em massa dos operadores e empreiteiros legados para vínculos de `pessoa_id` será tratada em change futura por meio de uma rotina guiada de correspondência por CPF no painel administrativo.
