# Proposal

## Why

Fase 2 da unificação do cadastro de pessoas (guarda-chuva: `unificar-cadastro-pessoas`). O CAPD guarda o
servidor como cópia completa: `capd_servidores` tem CPF, nome completo, nome social, data de nascimento,
e-mail e telefone, alimentados por integração de RH (`capd_rh_integracoes`, `capd_rh_sync_logs`), e não tem
`pessoa_id`. O mesmo servidor existe no MDM de pessoas com vínculo funcional, e os dois divergem sem
nenhum mecanismo de conciliação.

## What Changes

- `capd_servidores` passa a ter `pessoa_id` obrigatório; a sincronização de RH resolve a pessoa pelo CPF
  no MDM (cria se não existir) em vez de gravar dado civil no CAPD.
- Servidor sem CPF válido vindo do RH é registrado como pessoa com documento pendente, sem descartar o registro.
- Nome, nome social, nascimento, e-mail e telefone do servidor são lidos da pessoa; o CAPD guarda apenas o
  que é do domínio da avaliação (matrícula, cargo, grupo funcional, hierarquia, afastamentos).
- A matrícula e o cargo permanecem como vínculo funcional da pessoa (`PessoaVinculo`), sem duplicar.
- Conciliação dos servidores existentes com `pessoas:conciliar capd`, com `--dry-run` e revisão de divergências.
- Colunas civis de `capd_servidores` ficam como fallback somente leitura até a Fase 5.

## Capabilities

### New Capabilities
<!-- Nenhuma. -->

### Modified Capabilities
- `capd`: servidor avaliado passa a ser vinculado a uma pessoa do cadastro central, e a integração de RH
  grava dados civis no cadastro central.

## Impact

- **Backend**: `Modules/Capd` (servidor, serviço de sincronização de RH, resources), migration de backfill
  e comando de conciliação.
- **Integração**: a sincronização de RH passa a depender do MDM; falhas de resolução não podem interromper o lote.
- **Dependências**: exige a Fase 0; independe da Fase 1.
- **Risco**: avaliações seladas (NFD, ciclos homologados) não podem mudar com a troca da fonte dos dados civis.
