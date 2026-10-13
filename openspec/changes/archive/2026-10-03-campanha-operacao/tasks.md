# Tasks

> Convenções: cada tarefa cita a spec (`spec: campanha › <requisito>`) e a decisão do design (`D<n>`). Backend testado
> no container (phpunit com o ambiente de teste), frontend com typecheck e vitest, conferência no navegador. Commit por
> grupo. Dinheiro sempre em centavos inteiros.

## 1. Permissões, perfil Financeiro e anexos

- [x] 1.1 Permissões `campanha.materiais.manage`, `campanha.financeiro.view`, `campanha.financeiro.manage`,
      `campanha.agenda.manage` e `campanha.pesquisas.manage` no `module.json` e no seeder; perfil-modelo
      `campanha_financeiro` (Financeiro de Campanha) e Coordenação sem o financeiro (spec: campanha › Permissões e
      perfis; D1); verificar com testes de Coordenação recebendo 403 no livro-caixa, Financeiro lançando e recebendo
      403 em municípios/equipes, e perfis já clonados recebendo as novas
- [x] 1.2 `Support/Documento` (CPF pelo Pessoas, CNPJ próprio, só dígitos) e serviço de anexos no disco privado
      (`pdf,jpg,jpeg,png,webp`, 10 MB, caminho por tenant/campanha/recurso, troca apaga o anterior, download pela API)
      (spec: campanha › Comprovantes anexados; D5); verificar com testes de CPF/CNPJ válidos e inválidos, arquivo
      recusado e arquivo fora de endereço público

## 2. Materiais e logística

- [x] 2.1 Migrations e models `campanha_materiais` e `campanha_remessas`; estoque calculado; CRUD de materiais com
      imagem; despesa automática exigindo o financeiro (spec: campanha › Materiais de campanha e estoque; D2, D3);
      verificar com testes de estoque após remessas, despesa automática (valor e vínculo), recusa sem permissão do
      financeiro (nada gravado) e quantidade produzida abaixo do enviado (422)
- [x] 2.2 Remessas: registrar com trava e recusa acima do estoque, município da UF e responsável da campanha,
      confirmar entrega com foto, excluir devolvendo ao estoque (spec: campanha › Logística de distribuição; D2);
      verificar com testes de remessa acima do estoque, entrega com foto protegida, exclusão e isolamento entre
      campanhas

## 3. Financeiro

- [x] 3.1 Migration e model `campanha_lancamentos` (documento criptografado, categorias e origens como constantes);
      CRUD com validação por tipo (recibo nas receitas, documento fiscal nas despesas), centro de custo da UF e
      comprovante (spec: campanha › Livro-caixa com os campos da prestação de contas; D4, D5); verificar com testes de
      CPF inválido, centavos, comprovante protegido (403 sem `financeiro.view`) e campanha encerrada só consulta
- [x] 3.2 `GET /financeiro/resumo` (receitas, despesas, saldo, por categoria, origem e município, com filtros) e
      `GET /financeiro/exportar` (CSV com os campos do TSE, auditado) (spec: campanha › Livro-caixa…; D4); verificar
      com testes do saldo em centavos, filtros, conteúdo do CSV e auditoria

## 4. Agenda e pesquisas

- [x] 4.1 Migrations, models e CRUD de eventos, reuniões e visitas (município da UF, responsável que acessa a
      campanha, pendências vencidas); `GET /agenda` normalizado com filtros e próximos compromissos;
      `POST /visitas/{id}/demanda` reaproveitando o `DemandaService` (spec: campanha › Agenda de eventos, reuniões e
      visitas; D6); verificar com testes de visita virando demanda (sem duplicar), próximos compromissos em ordem,
      pendência vencida e responsável fora da campanha (422)
- [x] 4.2 Migrations, models e CRUD de pesquisas com resultados (décimos, soma ≤ 100%, um só da campanha,
      abrangência estadual ou município) e `GET /pesquisas/evolucao` (spec: campanha › Pesquisas eleitorais; D7);
      verificar com testes de soma acima de 100, dois candidatos da campanha (422) e evolução em ordem de data
- [x] 4.3 `docs/modules/campanha.md`, suíte do módulo e PHPStan sem erros; commit do backend

## 5. Telas

- [x] 5.1 Aba Materiais (estoque com barra, cadastro com imagem e despesa automática só para quem tem o financeiro,
      remessas, confirmar entrega com foto) (spec: campanha › Materiais…, Logística…; D8); verificar com vitest
      (opção de despesa oculta sem o financeiro) e no navegador
- [x] 5.2 Aba Financeiro (só com `financeiro.view`: indicadores, gráficos, extrato com filtros, lançamento com
      comprovante, exportar) e saldo no painel só com a permissão (spec: campanha › Livro-caixa…, Comprovantes…; D8);
      verificar com vitest (aba ausente para a Coordenação) e no navegador com um comprovante PDF
- [x] 5.3 Aba Agenda (lista por período com os três tipos, fichas, "transformar em demanda") e próximos compromissos
      no painel (spec: campanha › Agenda…; D6, D8); verificar no navegador
- [x] 5.4 Aba Pesquisas (lista, ficha com resultados editáveis, gráfico de evolução) (spec: campanha › Pesquisas
      eleitorais; D7, D8); verificar com vitest (soma acima de 100 avisada antes de enviar) e no navegador
- [x] 5.5 Typecheck, `npm test`, `grep` sem `alert(`/`confirm(`; commit do frontend
