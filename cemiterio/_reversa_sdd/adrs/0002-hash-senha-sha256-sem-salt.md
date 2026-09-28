# ADR 0002 — Hash de senha SHA256 sem salt como ponte de migração

**Status:** Aceito, porém sinalizado como inadequado para produção pelo próprio autor 🔴
**Contexto:** Retroativo — reconstruído a partir de código, sem histórico Git disponível.

## Decisão
A migração converte a senha em texto puro do legado (`PWUSUA.PW_PASS`, `CHAR(6)`) para `SHA256(senha)` sem salt, gravado em `usuario.senha_hash`.

## Evidência
Comentário explícito no próprio código-fonte do importador: *"Hash simples para migração (substituir por bcrypt/argon2 na aplicação real)"*. O autor original já documentou esta decisão como temporária.

## Motivação inferida
🟡 Provável racional: evitar migrar senha em texto puro sem introduzir a complexidade de um algoritmo de hash de senha adequado (com custo computacional configurável) nesta fase de migração de dados, deixando a troca para uma etapa posterior de "aplicação real".

## Consequência observada
Não há evidência, nos artefatos analisados, de que a etapa posterior (troca para bcrypt/argon2) tenha sido implementada. Ver `permissions.md` (SEC-001, SEC-002) para o risco de segurança decorrente caso este estado "temporário" siga para produção sem correção.
