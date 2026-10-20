# Proposal

## Why

Fase 5 (final) da unificação do cadastro de pessoas (guarda-chuva: `unificar-cadastro-pessoas`). Depois das
Fases 1 a 4, cada módulo lê e grava dados civis no cadastro central, mas as colunas antigas continuam nas
tabelas como fallback. Enquanto elas existirem, a duplicação pode voltar por qualquer escrita direta, e os
dados antigos ficam como uma segunda fonte que diverge com o tempo.

## What Changes

- Remove, módulo a módulo, as colunas civis duplicadas (CPF/CNPJ, nome, nascimento, filiação, e-mail,
  telefone, endereço) de: `escola_alunos`, `escola_aluno_contatos`, `capd_servidores`, `cemetery_operators`,
  `concession_holders`, `cemetery_succession_heirs`, tabelas de equipe da Campanha, `cursos_participantes`,
  `cursos_empresas`, `multi_profissionais`, `inservivel_entidades`, tabelas do Passeio e `licitacao_participantes`.
- Cada remoção só é liberada pela trava da Fase 0: todos os registros do módulo com `pessoa_id`, nenhuma
  divergência aberta e leitura já feita pelo cadastro central.
- Torna `pessoa_id` `NOT NULL` nas tabelas em que ele ainda é opcional.
- Remove o código de fallback que lia as colunas legadas e as cópias de `Support/Documento` que restarem.
- Publica o relatório final de adoção, mostrando 100% dos registros vinculados.
- **BREAKING**: integrações externas que liam as colunas removidas diretamente do banco ou da API
  precisam migrar para os dados da pessoa. Uma migration por módulo, com backup antes da execução.

## Capabilities

### New Capabilities
<!-- Nenhuma. -->

### Modified Capabilities
<!-- Nenhuma: o comportamento já foi especificado nas Fases 0 a 4; esta fase só remove o legado. -->

## Impact

- **Banco**: migrations destrutivas por módulo (irreversíveis sem backup). Cada módulo é executado em janela
  própria, com backup verificado e rollback por restauração.
- **Backend e frontend**: remoção de fallbacks de leitura, ajuste de resources, exportações e relatórios.
- **Dependências**: exige as Fases 1 a 4 concluídas e o relatório de adoção sem pendências para cada módulo
  incluído. Módulos podem ser removidos em ondas, sem esperar os demais.
- **Risco**: perder o único registro de um dado que nunca foi conciliado. Mitigação: a trava da Fase 0 e o
  backup obrigatório antes de cada migration.
