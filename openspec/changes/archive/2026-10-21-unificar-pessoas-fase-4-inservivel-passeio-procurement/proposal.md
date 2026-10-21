# Proposal

## Why

Fase 4 da unificação do cadastro de pessoas (guarda-chuva: `unificar-cadastro-pessoas`). Estes módulos não
têm referência alguma ao cadastro central: Inservível guarda entidades com CNPJ, contatos e endereço
próprios (`inservivel_entidades`), Passeio guarda contatos de veículos e responsáveis, e Procurement guarda
o CNPJ dos participantes de licitação. Boa parte são pessoas jurídicas, que o MDM já suporta desde a change
`evoluir-pessoas-pessoa-juridica`.

## What Changes

- **Inservível**: entidades (donatárias e interessadas) passam a referenciar uma pessoa jurídica (ou física)
  do cadastro central; CNPJ, contatos e endereço são lidos dela.
- **Procurement**: participantes de licitação passam a referenciar a pessoa jurídica pelo CNPJ.
- **Passeio**: responsáveis e contatos de veículos e motoristas passam a referenciar a pessoa do cadastro central.
- **Cursos — empresas**: `cursos_empresas` (CNPJ, e-mail, telefone, responsável), deixada pela Fase 3,
  é vinculada à pessoa jurídica.
- Conciliação por módulo com `pessoas:conciliar <modulo>`, `--dry-run` e revisão das divergências.
- Documento de pessoa jurídica inválido ou ausente vai para divergência, não para criação automática.
- Colunas duplicadas ficam como fallback somente leitura até a Fase 5.

## Capabilities

### New Capabilities
<!-- Nenhuma. -->

### Modified Capabilities
- `inservivel`: entidades referenciam a pessoa do cadastro central.
- `passeio`: responsáveis e contatos de veículos referenciam a pessoa do cadastro central.
- `procurement`: participantes de licitação referenciam a pessoa jurídica do cadastro central.

## Impact

- **Backend**: `Modules/Inservivel`, `Modules/Passeio`, `Modules/Procurement`, `Modules/Cursos` (empresas).
- **Frontend**: formulários de cadastro passam a usar `PessoaPicker` com busca por CNPJ.
- **Dependências**: exige a Fase 0 e o suporte a pessoa jurídica já entregue.
- **Risco**: dados de licitação são juridicamente sensíveis; a conciliação não pode alterar participantes
  de licitações já homologadas.
