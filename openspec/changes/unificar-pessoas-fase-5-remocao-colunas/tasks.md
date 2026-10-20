# Tasks

Pré-requisito comum a todas as ondas: Fases 0 a 4 publicadas em produção, `pessoas:conciliar <alias>` executado
(dry-run, depois real) e o relatório de adoção sem pendências para o módulo.

## 0. Preparação

- [ ] 0.1 Publicar as Fases 2 a 4 (hoje sem push) e fazer o deploy em produção. Verificar: migrations aplicadas e `pessoas:conciliar <alias> --dry-run` rodando para todos os aliases.
- [ ] 0.2 Executar a conciliação real por alias e fechar as divergências, `sem_responsavel`, `documento_invalido` e `pessoa_juridica_inexistente`. Verificar: `GET /api/pessoas/adocao` com `sem_vinculo = 0` e `divergencias_abertas = 0` por módulo.
- [ ] 0.3 Inventariar integrações externas que leem as colunas a remover (API, exportações, relatórios, banco direto).

## 1. Onda 1 — Cursos e Procurement
- [ ] 1.1 Trocar leituras de nome/e-mail/CNPJ por relação com a pessoa (participantes, empresas, fornecedores). Verificar: testes de certificado, lista de inscritos e licitação.
- [ ] 1.2 Migration destrutiva por módulo com `exigir()` e `pessoa_id NOT NULL`; remover fallbacks. Verificar: migrate em MySQL com dados e trava recusando quando há pendência.

## 2. Onda 2 — Inservível e Passeio
- [ ] 2.1 Idem 1.1 e 1.2 para entidades e veículos/motoristas.

## 3. Onda 3 — Cemitérios e Campanha (coordenadores e cabos)
- [ ] 3.1 Idem, conferindo `marcarFalecimento` e a cadeia sucessória.

## 4. Onda 4 — Capd
- [ ] 4.1 Propagar e-mail/telefone dos contatos da pessoa ao servidor e trocar o login por e-mail. Verificar: `ServidorMeusSubordinadosTest`.
- [ ] 4.2 Trocar busca/ordenação por nome e CPF por join com `pessoas`. Verificar: listagem com paginação e filtro.
- [ ] 4.3 Migration destrutiva de `capd_servidores`. Verificar: espelhos de avaliação já selados inalterados.

## 5. Onda 5 — Escola
- [ ] 5.1 Trocar nome/nascimento/filiação/CPF/contatos de `escola_alunos` e `escola_aluno_contatos` por relação com a pessoa em listas, boletins, atas e importação. Verificar: suítes de Escola, Pedagógico, Formatura, Passeio e Portfolio.
- [ ] 5.2 Migration destrutiva e remoção do código de cópia (`AlunoPessoaService::copiarDadosCivis`).

## 6. Encerramento
- [ ] 6.1 Remover o que restar de `Support/Documento` e fallbacks; publicar o relatório final de adoção (100% vinculado).
- [ ] 6.2 Arquivar as changes da série (`/opsx:archive`), corrigindo antes a spec principal malformada de `procurement`.
