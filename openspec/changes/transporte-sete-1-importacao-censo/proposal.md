# Proposal

## Why

Hoje o Transporte nasce de cadastros digitados ou de CSV próprio. Os municípios já têm o **arquivo do Educacenso** (exportação do Inep, texto separado por `|`) com escolas, turmas, pessoas e matrículas, inclusive a marca de quem usa transporte escolar público. O SETE (UFG/CECATE, licença MIT) lê esse arquivo e é uma boa referência de leitura; o layout que ele usa é o de **2023**.

O leiaute do Inep **muda todo ano** (colunas entram, saem e mudam de posição). Fixar posições no código obrigaria uma alteração de software a cada Censo. Por decisão do usuário, a importação parte do **leiaute de 2023** e o órgão passa a poder **criar e excluir campos** (e ajustar posições) para acompanhar o leiaute do ano corrente, no mesmo espírito da configuração de campos do Licita.

## What Changes

- **Importação do arquivo do Educacenso** (Registros 00 escola, 20 turma, 30 pessoa, 40 gestor e 60 matrícula), com envio, **pré-visualização sem gravar** e confirmação, reaproveitando o fluxo de importação da Fase 5.
- **Leiaute configurável por órgão**: cada leiaute tem a lista de campos por registro (posição da coluna, rótulo, tipo, destino no SysGov). O sistema traz o **Educacenso 2023** como base; o órgão pode **adicionar campo**, **excluir campo**, **mudar a posição**, **restaurar o padrão** e **duplicar** o leiaute para um novo ano.
- **Teste do leiaute**: o usuário envia o arquivo e vê, por registro, uma amostra com a coluna, o valor lido e o campo que o leiaute atribui a ela, para conferir as posições antes de importar.
- **Conciliação com o Escola**: escolas pelo Inep; turmas pelo `inep` da turma; alunos pelo `inep_id`, depois pelo CPF (Pessoas). Só entram os alunos marcados com transporte escolar público. O que não existe é listado e só é criado se o usuário marcar.
- **Campos personalizados** com destino num catálogo fixo de atributos do SysGov, ou o destino "extra" (guarda o valor sem alterar o cadastro, para consulta e exportação futura).
- **Auditoria** de toda importação e de toda alteração de leiaute. O arquivo **não é guardado** no servidor.

## Capabilities

### Modified Capabilities

- `transporte`: acrescenta a importação do arquivo do Educacenso e o leiaute de importação configurável.

## Impact

- **Backend**: `Censo/Importacao/` (leitor em fluxo, `LeiauteImportacao`, `Educacenso2023`, `LeiauteImportacaoService`, `ImportacaoCensoService`, `TesteLeiauteService`); tabelas `transporte_censo_leiautes` e `transporte_censo_extras`; coluna `leiaute_id` em `transporte_importacoes`.
- **Escola**: usa `AlunoService` e `TurmaService`; não muda o esquema do Escola.
- **Permissões novas**: `transporte.censo.importar` e `transporte.censo.leiaute` (coordenação recebe as duas).
- **Dado pessoal de crianças (LGPD)**: leitura em fluxo, nenhum arquivo persistido, máscara nas amostras, relatório sem CPF/nome.
- **Produção** roda `QUEUE_CONNECTION=sync`: arquivos grandes exigem limite de tamanho e processamento em blocos (ver D-I5).
- **Referência externa**: SETE (MIT) — manter o aviso de copyright em `docs/modules/transporte.md` ao reaproveitar as regras de leitura.
