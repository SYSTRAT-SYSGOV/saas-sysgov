# Design

## Por que a Fase 5 não é só "apagar colunas"
As Fases 1 a 4 mantiveram as colunas civis como **cópia de exibição** (nome, nascimento, filiação, CPF, razão
social...), atualizada pela pessoa. Muito código ainda lê essa cópia: busca e ordenação por nome (Escola, Capd),
boletins, atas e espelhos de avaliação, certificados, `where('email', ...)` no login do servidor. Remover a coluna
sem antes trocar essas leituras por `join`/relação com `pessoas` quebra telas e relatórios. Cada onda tem, então,
duas partes: **trocar as leituras** (reversível, vai para produção primeiro) e **remover a coluna** (destrutiva).

## Porta de entrada: a trava
Nenhuma migration destrutiva roda sem `TravaRemocaoColunasService::exigir(<modulo>)` (todos os tenants: nenhum
registro sem pessoa, nenhuma divergência aberta). A trava precisa do alias registrado, então cada onda usa os
aliases das Fases 1 a 4. Ela só passa depois de **deploy + `pessoas:conciliar <alias>` real em produção + revisão
das divergências e dos `sem_responsavel` / `documento_invalido` / `pessoa_juridica_inexistente`**.

## Ondas (cada uma independente, com backup e janela próprios)
1. **Cursos (participantes e empresas)** e **Procurement**: menos leituras da cópia; empresa já tem CNPJ na pessoa.
2. **Inservível, Passeio**.
3. **Cemitérios** e **Campanha (coordenadores e cabos)**: regras de óbito e sucessão leem a pessoa.
4. **Capd**: depende de trocar a busca/ordenação por nome e o login por e-mail; e-mail e telefone precisam antes de
   propagação a partir dos contatos da pessoa.
5. **Escola**: maior volume e mais leituras da cópia (boletins, atas, listas); por último.

Prefeitos e vereadores da Campanha e Multiprofissional só entram depois das decisões pendentes (ver Fase 3).

## Em cada onda
1. Trocar as leituras da cópia por relação com a pessoa; testes de tela/relatório cobrindo a troca.
2. Deploy; validar em produção por um ciclo de uso.
3. Backup verificado; migration do módulo chamando a trava; `pessoa_id` passa a `NOT NULL`.
4. Remover fallbacks de código e `Support/Documento` restantes; atualizar o relatório de adoção.

## Rollback
Antes da migration destrutiva: voltar o código (a cópia ainda existe). Depois: só restaurando o backup. Por isso a
migration não tem `down()` útil e declara isso.

## Riscos
- Integrações externas lendo as colunas pela API ou direto do banco: inventariar antes de cada onda.
- Dado só existente na cópia (nunca conciliado): a trava barra; o backup cobre o resto.
