# Tasks

Cada item L passa por (A) trocar a leitura e (B) remover, com um ciclo de uso em produção entre as duas.
Nada da etapa B roda sem trava liberada, backup verificado e confirmação.

## 0. Pré-requisitos
- [x] 0.1 Fases 0 a 4 em produção; conciliação real de Escola e Cemitérios executada em 20/10 (Escola 390/400, falecidos 46/50, operadores 8/8, concessionários 30/49).
- [ ] 0.2 Resolver os 10 alunos sem vínculo (mesmo nome e nascimento de outro aluno): mesclar ou confirmar como pessoas distintas. Verificar: relatório de adoção do Escola com `sem_vinculo = 0`.
- [ ] 0.3 Resolver os 4 falecidos sem vínculo (3 menores sem responsável e 1 duplicidade).
- [ ] 0.4 Inventariar integrações externas que leiam as colunas L (API, exportações, relatórios, banco).

## 1. Escola
- [ ] 1.1 (A) Leituras de `nascimento`, `mae`, `pai` e CPF do aluno via `pessoa` em `AlunoResource`, boletins, atas, listas e importação. Verificar: suítes de Escola, Pedagógico, Formatura, Passeio e Portfolio, e conferência visual das fichas.
- [ ] 1.2 (A) Busca por CPF e unicidade por escola passam para `pessoa_id`. Verificar: testes de cadastro com CPF repetido na mesma escola e em escolas diferentes.
- [ ] 1.3 (B) Migration que remove `cpf`, `cpf_hash`, `nascimento`, `mae`, `pai`, torna `pessoa_id` NOT NULL e chama a trava. Sem `down()` útil, declarado.
- [ ] 1.4 Remover `AlunoPessoaService::copiarDadosCivis` do que não for `nome`.

## 2. Capd
- [ ] 2.1 (A) Leituras de `cpf`, `nome_social`, `data_nascimento` via pessoa (listagem, espelho de avaliação, exportações). Verificar: avaliações seladas inalteradas.
- [ ] 2.2 (B) Migration de remoção dessas três colunas e `pessoa_id` NOT NULL, com a trava.
- [ ] 2.3 (A, depois de 2.2) Propagar `email` e `telefone` dos contatos da pessoa ao servidor e trocar o login por vínculo `user_id`/`pessoa_id`; só então avaliar a remoção.

## 3. Cemitérios
- [ ] 3.1 (A) Operadores e herdeiros: documento lido da pessoa. Verificar: `OperadoresTest` e sucessão.
- [ ] 3.2 (B) Migration de remoção de `cpf_cnpj`, `documento_hash` (operadores) e `documento` (herdeiros), com a trava. Os 29 documentos inválidos (19 concessionários e 10 herdeiros) precisam de decisão antes.
- [ ] 3.3 Concessionários: definir a nova chave do portal (Gov.br) antes de mexer em `documento`.

## 4. Encerramento
- [ ] 4.1 Remover `Support/Documento` e fallbacks que sobrarem; atualizar o relatório de adoção com o que foi mantido de propósito.
- [ ] 4.2 Corrigir a spec principal de `procurement` e arquivar as changes da série (`/opsx:archive`).

## Mantido de propósito (não entra na Fase 5)
Colunas **M** da tabela do `design.md`: certificados e participantes de Cursos, licitações, óbitos, cadastro submetido do Inservível, contatos do responsável no Escola, contatos operacionais da Campanha, motorista do Passeio e PIS/PASEP.
