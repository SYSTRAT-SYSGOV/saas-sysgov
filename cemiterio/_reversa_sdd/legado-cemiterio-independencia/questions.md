# Legado — Cemitério Independência, Perguntas Pendentes

> Lacunas 🔴 que requerem validação humana.

## Q1 — Por que `OBA.DBF`/`TTT.DBF` existem só em Independência?
Nenhum artefato disponível indica se o Central já teve essas tabelas e as perdeu ao longo do tempo, ou se são específicas de um fluxo de trabalho/processo administrativo que só existiu nesta unidade.

**Por que importa:** se for um fluxo de negócio real e específico desta unidade (ex.: um processo de renegociação de concessão só formalizado aqui), o sistema novo talvez precise oferecer esse fluxo de forma opcional/configurável por cemitério, não como algo fixo de uma unidade só.

**Quem pode responder:** administração/operador de ambos os cemitérios, que conhece o histórico operacional de cada unidade.

## Q2 — Os responsáveis/usuários mapeados em `OBA.DBF` têm equivalente direto em `lote`?
`OBA.DBF` mapeia uma numeração alternativa de quadra/lote — não está confirmado com que frequência (ou se sempre) essa numeração alternativa resolve para um `lote_id` existente no cadastro atual.

**Por que importa:** afeta a taxa de sucesso do `lote_oba.lote_id` no schema alvo — se muitos registros de OBA não resolverem, isso é um sinal de dado órfão ou de uma numeração de um sistema anterior ainda mais antigo.

**Quem pode responder:** confirmação técnica pode vir de uma consulta de reconciliação nos dados já extraídos (não requer necessariamente um humano, mas o resultado deve ser validado com o operador).
