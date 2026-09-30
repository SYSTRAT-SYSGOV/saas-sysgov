# Design

## Context

O componente `PessoasModule.tsx` hoje tem um único `FormModal` genérico (`views/comum.tsx`) reaproveitado para todos os formulários do módulo (pessoa, vínculo, documento, endereço, contato, promoção, importação). `FormModal` renderiza uma lista plana de `campos` em um grid de 2 colunas e chama `onEnviar` uma única vez ao submeter. O modal de detalhe (`DetalhePessoaModal`) já compõe múltiplos `FormModal` para as ações de adicionar vínculo/documento/endereço/contato/promover, todos disparados a partir de botões dentro de um único `Modal` com rolagem. Não existe nenhum componente de "wizard"/passos no design system (`@sysgov/ui`) nem em nenhum outro módulo do SYSGOV (ver proposal.md - Why).

## Goals / Non-Goals

**Goals:**
- Permitir montar o perfil completo de uma pessoa nova (dados civis + opcionalmente vínculo/documento/endereço-contato) em uma sequência guiada, sem inventar endpoints novos.
- Tornar a promoção a usuário alcançável em no máximo um clique a partir da listagem, e visível sem rolagem a partir do detalhe.
- Corrigir a listagem para trazer os vínculos de cada pessoa.

**Non-Goals:**
- Criar um componente de wizard genérico e reutilizável em `@sysgov/ui` — este é o único fluxo em passos do SYSGOV até agora; generalizar sem um segundo caso de uso concreto seria abstração prematura.
- Mudar o formulário de edição para um wizard — ele mantém o formato de formulário único, só reorganizado (ver proposal.md - What Changes).
- Qualquer endpoint novo de "criação composta" no backend (ex.: `POST /pessoas/completo` criando pessoa+vínculo+documento numa chamada só). O wizard orquestra as chamadas já existentes sequencialmente no frontend.

## Decisions

**O wizard é um componente local e específico (`NovaPessoaWizard`), não um primitivo genérico.**
Segue a mesma regra já aplicada ao restante do módulo (`FormModal`, `IntegracoesPanel`): componentes locais quando o caso de uso é único, primitivos em `@sysgov/ui` só quando há reuso real. Internamente, o wizard mantém um estado `{ passo: number; pessoaId: number | null; dados: {...} }` e reaproveita os mesmos `campos`/validação por passo que hoje já existem espalhados em `FormModal`s separados — só muda a orquestração (uma sequência com "Avançar/Pular/Voltar" em vez de modais independentes).

**Cada passo além do 1º chama o endpoint correspondente imediatamente ao avançar (não acumula tudo para enviar no fim).**
Alternativa considerada: acumular todos os dados dos 4 passos e enviar tudo de uma vez ao concluir o wizard. Rejeitada — os endpoints de vínculo/documento/endereço/contato exigem um `pessoa_id` que só existe depois que o passo 1 (criação da pessoa) é confirmado no backend; enviar tudo no fim exigiria o mesmo número de chamadas sequenciais mesmo assim, só adiando o feedback de erro por passo para o fim do fluxo, o que é pior para o usuário (ele preenche 4 passos para só então descobrir que o passo 2 falhou).

**Passo pulado não dispara nenhuma chamada; "Concluir" a qualquer momento após o passo 1 fecha o wizard com a pessoa já criada.**
Mantém o comportamento non-goal declarado (nenhum vínculo/documento é obrigatório). O botão muda de "Avançar" para "Concluir" a partir do passo em que o usuário decide parar.

**Extrai um componente `PromoverPessoaModal` compartilhado entre `DetalhePessoaModal` e a nova ação rápida da tabela.**
Hoje a lógica de promoção (buscar `accessApi.tenantRoles()`, montar o `FormModal` de email+papel, chamar `pessoasApi.promover`) vive só dentro de `DetalhePessoaModal`. Duplicá-la para a ação de linha da tabela criaria dois pontos de manutenção para a mesma regra de negócio; extrair para um componente que recebe `pessoa` + `onPromovido` e é montado em ambos os lugares evita a duplicação.

**O ícone de promover na linha da tabela verifica `!pessoa.usuario && podePromover` usando o dado já presente no item da listagem — nenhuma requisição extra por linha.**
Depende diretamente da correção do eager-load em `PessoaService::listar()` (ver Decisions abaixo); sem isso, `pessoa.usuario` viria sempre `undefined` e o ícone apareceria para todo mundo, inclusive quem já tem usuário.

**`PessoaService::listar()` ganha `->with(['vinculos', 'usuario'])`.**
Consulta adicional de baixo custo (poucos vínculos/no máximo um usuário por pessoa, já indexados por `pessoa_id`); resolve simultaneamente a coluna "Vínculos" quebrada e a necessidade do novo ícone. Endereços/documentos/contatos não entram no eager-load porque nada na listagem ou na nova ação de linha precisa deles.

## Risks / Trade-offs

- [Risco] Um usuário fecha o wizard no meio do passo 2/3/4 (ex.: clica fora do modal) depois que o passo 1 já criou a pessoa no backend — a pessoa fica criada mesmo que o usuário "desista" do wizard. → Mitigação: esse já é o comportamento atual do fluxo existente (criar pessoa é sempre uma ação imediata e irreversível pela UI, sem rascunho local); o wizard não piora nem resolve isso, só reduz o número de cliques necessários para quem completa o fluxo. Sair do wizard após o passo 1 deixa a pessoa já criada e listada normalmente — o usuário pode completar o restante depois pelo "Gerenciar", exatamente como hoje.
- [Trade-off] Extrair `PromoverPessoaModal` é um refactor do código existente em `DetalhePessoaModal`, não só uma adição — precisa preservar exatamente o comportamento atual (mensagens de erro, seleção de papel) para não regressão nos testes/fluxos já validados.
