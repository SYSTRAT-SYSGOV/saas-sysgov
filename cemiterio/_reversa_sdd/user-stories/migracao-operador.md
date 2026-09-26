# User Stories — Operador da Migração

> Gerado pelo Redator em 2026-09-24. Este projeto não tem usuário final de aplicação (é um kit de migração batch) — as "histórias" abaixo descrevem a jornada do único ator humano identificado: o operador/DBA que executa o pipeline.

## US-01 — Extrair dados legados para CSV
**Como** operador,
**Eu quero** extrair todos os `.DBF` dos dois cemitérios para CSV,
**Para que** eu tenha dados intermediários limpos e prontos para importação.

- Critério de aceite: `exported_data/Cemiterio Central/` e `exported_data/Cemiterio Independencia/` contêm um CSV por tabela legível, com contagens batendo com `EXTRACTION_SUMMARY.txt`.
- Unit relacionada: `extracao-dbf`

## US-02 — Aplicar o schema no banco alvo
**Como** operador,
**Eu quero** criar o banco e aplicar o DDL (PostgreSQL ou MySQL),
**Para que** o banco esteja pronto para receber os dados migrados.

- Critério de aceite: as 13 tabelas existem com FKs corretas, sem erro na aplicação do DDL.
- Unit relacionada: `schema-destino`

## US-03 — Importar os CSVs para o banco alvo
**Como** operador,
**Eu quero** rodar a importação completa em uma única transação,
**Para que** eu tenha garantia de que o banco final está íntegro ou que nada foi alterado em caso de erro.

- Critério de aceite: importação completa sem erro resulta em todas as tabelas populadas; qualquer erro no meio reverte tudo (nenhum estado parcial).
- Unit relacionada: `importacao-csv`

## US-04 — Validar a integridade da migração
**Como** operador,
**Eu quero** comparar as contagens pós-importação com os totais originais de cada cemitério,
**Para que** eu tenha confiança de que nenhum dado foi perdido silenciosamente.

- Critério de aceite: contagens de `falecido`, `responsavel`, `lote` por `cemiterio_id` batem com os totais documentados (21.857 falecidos, 15.974 responsáveis, 9.835 lotes, consolidados).
- Units relacionadas: `legado-cemiterio-central`, `legado-cemiterio-independencia`

## US-05 — Migrar usuários com segurança adequada (lacuna a resolver)
**Como** operador/dono do produto,
**Eu quero** que as senhas migradas usem um hash resistente,
**Para que** o sistema novo não herde uma vulnerabilidade de segurança do legado.

- Critério de aceite: nenhuma senha persiste com `SHA256` sem salt no ambiente de produção; ver `seguranca-usuarios-permissoes/tasks.md` T-03.
- Status: 🔴 não implementado hoje — depende de decisão em `seguranca-usuarios-permissoes/questions.md`.
