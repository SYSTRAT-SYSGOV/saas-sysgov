# ADR 002: Cálculo Dinâmico de Status em Tempo de Execução (Derived Statuses)

- **Status**: Aceito 🟢
- **Data**: 2026-10-24
- **Decisores**: Arquitetura Hi.Events

## Contexto
Tentar persistir estados transitórios de alta concorrência em tabelas (como se uma ocorrência está `SOLD_OUT`, se uma faixa de preço está trancada `markLockedTiers`, ou se um assento está `HELD`/`SOLD`/`BLOCKED`) leva frequentemente a condições de corrida, dessincronização de inventário e necessidade de tarefas de reconciliação em background (sweepers).

## Decisão
1. Não persistir os status calculados `SOLD_OUT`, travas de faixa de preço e reivindicações transitórias de assentos no banco de dados.
2. Os únicos status persistidos para ocorrências são `ACTIVE` e `CANCELLED`.
3. Todo status operacional derivado é computado dinamicamente no momento da leitura, cruzando capacidades, ordens ativas e limites de vendas.
4. É proibida a criação de jobs ou rotinas assíncronas que escrevam esses estados derivados no banco.

## Alternativas Consideradas
- **Flags booleanas em colunas (`is_sold_out`)**: Facilita consultas simples, mas causa deadlocks e divergência quando reservas expiram ou são canceladas.

## Consequências
- **Positivas**: Elimina bugs de inventário fantasma e a complexidade de rotinas de varredura (sweepers).
- **Negativas**: Requer otimização rigorosa das queries de agregação de capacidade nos repositórios.
