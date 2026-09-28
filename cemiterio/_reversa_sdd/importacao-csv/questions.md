# Importação CSV, Perguntas Pendentes

> Lacunas 🔴 que requerem validação humana antes de considerar esta unit totalmente especificada.

## Q1 — Mapeamento exato de `PW_PERMIS` está correto?
A decodificação atual assume 5 blocos de 4 caracteres (Incluir/Alterar/Excluir/Consultar/Relatório), mas o próprio comentário no código-fonte original tem um ponto de interrogação, indicando que o autor não tinha certeza do mapeamento exato de posições.

**Por que importa:** se o mapeamento estiver errado, usuários podem receber permissões diferentes das que tinham no legado — risco de segurança (excesso de permissão) ou de operação (falta de permissão).

**Quem pode responder:** um operador que conheça o comportamento real do PWTABELA no sistema Clipper original, ou testes empíricos comparando com o comportamento observado na aplicação legada.

## Q2 — Qual a política de migração de senha?
Hoje a senha de 6 caracteres em texto puro é convertida para `SHA256` sem salt (ver ADR 0002). Isso não é adequado para produção.

**Opções a decidir:**
- (a) Forçar reset de senha de todos os usuários no primeiro login do sistema novo (mais seguro, mas exige fluxo de reset)
- (b) Migrar com hash adequado (bcrypt/argon2) mantendo a senha atual (usuário não percebe a troca, mas a senha original de 6 caracteres continua fraca por natureza)
- (c) Combinação: hash adequado + forçar troca em prazo definido

**Quem pode responder:** dono do produto, junto com quem vai operar o sistema novo (poucos usuários — 2 por cemitério — então o custo operacional de forçar reset é baixo).

## Q3 — Identidade de coveiros/pedreiros/usuários entre cemitérios
Ver a mesma pergunta em `seguranca-usuarios-permissoes/questions.md` (Q-identidade) — a resposta lá determina o desenho de T-08/T-09 nesta unit. Não duplicando aqui para evitar respostas divergentes.
