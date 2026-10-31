# Proposal

## Why

O Censo Escolar (Educacenso) exige, por aluno matriculado, a declaração de uso de transporte escolar público, o poder público responsável e a tipologia do veículo. Erros aqui afetam o repasse do PNATE. Por decisão do usuário, a exportação **segue o leiaute oficial do Educacenso**, e não um CSV próprio. Além disso, o gestor precisa ver, num só lugar, quais rotas estão lotadas e quais documentos estão vencendo.

## What Changes

- **Arquivo do Educacenso para o Registro 60**, gerado conforme o **leiaute oficial vigente do Inep para o ano do Censo**, versionado por ano, com as variáveis de transporte escolar (transporte público, poder público responsável e as onze tipologias, incluindo o ferroviário) e a **anulação** da declaração quando não há atendimento curricular, a mediação não é presencial nem semipresencial, ou o país de residência não é Brasil.
- **Pré-validação** por ano letivo, com quatro tipos de pendência (aluno que teve alocação e não tem ativa, rota sem veículo, aluno rural sem declaração, aluno com necessidade especial em veículo não acessível), o aviso `turno_divergente` da Fase 3 e a nova pendência `sem_codigo_inep` quando falta um código que o leiaute exige.
- **CSV de conferência** (leitura humana, antes de enviar o arquivo oficial), sem dado pessoal além do necessário.
- **Painel** do módulo: indicadores (rotas ativas, veículos ativos, alunos transportados, ocupação média, rotas em superlotação), lotação por rota com faixa e os cartões de alerta da Fase 1.
- **Auditoria** do módulo (tela e filtro); toda geração de arquivo é auditada.

## Capabilities

### Modified Capabilities

- `transporte`: acrescenta o arquivo do Educacenso (Registro 60), a pré-validação, o CSV de conferência, o painel de lotação e a consulta de auditoria.

## Impact

- **Backend**: `CensoService`, `LeiauteRegistro60` por ano, `PainelService`. Lê `escola_escolas.inep`.
- **Depende das Fases 1 a 3** mescladas e de **duas entradas externas**: o documento do leiaute oficial do ano e a decisão sobre os códigos Inep do aluno e da turma (ver `design.md`, D35 e D36).
- **Possível alteração pequena no módulo Escola** (campos opcionais de código Inep do aluno e da turma), sujeita a aprovação.
- **Dado pessoal de crianças**: minimização, proteção contra injeção de fórmula no CSV e auditoria de cada geração.
