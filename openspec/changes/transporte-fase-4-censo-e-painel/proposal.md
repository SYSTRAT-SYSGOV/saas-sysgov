# Proposal

## Why

O Censo Escolar (Registro 60) exige, por aluno, a declaração de uso de transporte público, o poder público responsável e a tipologia do veículo. Erros aqui afetam o repasse do PNATE. Além disso, o gestor precisa ver, num só lugar, quais rotas estão lotadas e quais documentos estão vencendo.

## What Changes

- **Pré-validação do Registro 60** por ano letivo, com quatro tipos de pendência: aluno do ano sem alocação ativa, alocação em rota sem veículo, aluno rural sem declaração de uso, e aluno com necessidade especial em veículo não acessível. Mais o aviso `turno_divergente` da Fase 3.
- **Exportação CSV** do Registro 60 com uma linha por aluno alocado, incluindo as flags de tipologia modal (1 a 11, com o ferroviário) e a **anulação** da declaração de transporte público quando não há atendimento curricular, a mediação não é presencial nem semipresencial, ou o país de residência não é Brasil.
- **Painel** do módulo: indicadores (rotas ativas, veículos ativos, alunos transportados, ocupação média, rotas em superlotação), painel de lotação por rota com faixa e os cartões de alerta da Fase 1 integrados.
- **Auditoria** do módulo (tela e filtro), com a exportação do Censo também auditada.

## Capabilities

### Modified Capabilities

- `transporte`: acrescenta Registro 60 (pré-validação e CSV), painel de lotação e consulta de auditoria.

## Impact

- **Backend**: `CensoService` e `PainelService`; leitura de `escola_escolas.inep`; sem tabelas novas.
- **Depende das Fases 1 a 3** mescladas.
- **Dado pessoal**: o CSV leva dados de crianças. Há minimização e proteção contra injeção de fórmula em planilha (ver `design.md`).
- **Lacuna conhecida**: o cadastro escolar não tem o código Inep do **aluno**; o CSV usa o identificador interno e a escola pelo Inep. O arquivo no layout oficial do Educacenso fica fora desta change.
