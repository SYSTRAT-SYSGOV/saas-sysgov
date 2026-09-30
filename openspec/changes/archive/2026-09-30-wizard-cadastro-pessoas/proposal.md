# Proposal

## Why

O fluxo de cadastro completo de uma pessoa hoje exige criar a pessoa em um formulário plano de 10 campos sem agrupamento visual, fechar o modal, reabrir em "Gerenciar" e adicionar cada vínculo/documento/endereço/contato em popups separados, um de cada vez. A ação de promover uma pessoa a usuário do SYSGOV fica na última seção de um modal de detalhe longo, exigindo rolar até o fim para encontrá-la. Além disso, `PessoaService::listar()` nunca faz eager-load de `vinculos`/`usuario`, então a coluna "Vínculos" da listagem está sempre vazia e não há como saber, na própria linha da tabela, se uma pessoa já foi promovida.

## What Changes

- O formulário "Nova pessoa" vira um wizard de 4 passos (Identificação civil, Vínculo, Documento, Endereço/Contato), orquestrando sequencialmente os endpoints já existentes (`POST /pessoas`, depois `POST /pessoas/{id}/vinculos|documentos|enderecos|contatos`) — nenhuma rota nova. Apenas o passo 1 é obrigatório; os demais são puláveis, mantendo o comportamento atual de que uma pessoa pode existir sem vínculo, documento, endereço ou contato.
- O formulário "Editar pessoa" continua sendo um único formulário (não vira wizard), mas reorganizado em seções visuais em vez do grid plano atual.
- O botão "Promover a usuário" passa a aparecer também no topo do modal de detalhe (junto ao nome/CPF da pessoa), além de continuar disponível na seção "Conta de acesso".
- Novo ícone de ação rápida "Promover" na linha da tabela de listagem, visível apenas quando a pessoa ainda não tem usuário vinculado e o usuário logado tem a permissão `cadastros.pessoas.promote`.
- `PessoaService::listar()` passa a fazer eager-load de `vinculos` e `usuario`, corrigindo a coluna "Vínculos" da listagem (hoje sempre vazia) e alimentando a condição de exibição do novo ícone de promover.

## Capabilities

### New Capabilities
(nenhuma — evolui a capability `pessoas` já existente)

### Modified Capabilities
- `pessoas`: os requisitos "Busca e listagem de pessoas" e "Promoção a usuário por ação explícita e auditada" ganham cenários novos cobrindo, respectivamente, a listagem retornar os vínculos de cada pessoa e a ação de promover estar acessível diretamente pela listagem.

## Impact

- **Backend** (`apps/api/Modules/Pessoas`): `PessoaService::listar()` ganha `->with(['vinculos', 'usuario'])`; nenhuma rota nova, nenhuma migration.
- **Frontend** (`apps/web-client/src/modules/pessoas`): `PessoasModule.tsx` reestruturado — novo componente de wizard para criação, formulário de edição reorganizado em seções, botão de promover no cabeçalho do modal de detalhe, nova coluna/ação de promover rápida na tabela.
- **Pré-requisito de sequenciamento** (decisão do usuário): esta mudança pressupõe que `pessoas-soft-delete-e-campos` já foi aplicada antes da implementação, para que os passos 2 e 3 do wizard já nasçam com os campos `matricula`, `uf_emissao`, `data_emissao` e `autoriza_notificacoes`.
- Nenhum impacto em outros módulos.
