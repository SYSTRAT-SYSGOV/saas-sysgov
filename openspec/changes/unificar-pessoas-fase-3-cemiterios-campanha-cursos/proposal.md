# Proposal

## Why

Fase 3 da unificação do cadastro de pessoas (guarda-chuva: `unificar-cadastro-pessoas`). Estes módulos já
têm `pessoa_id` em parte das tabelas, mas mantêm cópia civil ao lado dele: Cemitérios (`cemetery_operators`,
`concession_holders`, `cemetery_succession_heirs`), Campanha (candidatos, coordenadores, cabos, prefeitos,
vereadores), Cursos (`cursos_participantes`) e Multiprofissional (`multi_profissionais`). É a fase de menor
risco técnico, porque a ligação já existe; falta tornar a referência obrigatória, conciliar e parar de copiar.

## What Changes

- **Cemitérios**: operadores, concessionários, herdeiros e falecidos passam a ter `pessoa_id` obrigatório e
  a ler documento, contatos e endereço da pessoa. Herdeiros (hoje sem FK) são vinculados. Conclui o que o
  piloto `consumo-cadastro-pessoas-cemiterios` deixou sem backfill.
- **Campanha**: candidatos, coordenadores e cabos eleitorais passam a ler contatos da pessoa;
  prefeitos e vereadores (hoje sem FK) são vinculados.
- **Campanha — eleitores ficam fora**: a base de eleitores tem consentimento LGPD específico e anonimização
  após a campanha, o que conflita com um cadastro civil permanente. Eleitores não entram no MDM nesta fase;
  a decisão é registrada no `design.md` da fase.
- **Cursos**: participantes passam a ler nome e contatos da pessoa. As empresas (pessoa jurídica) ficam na Fase 4.
- **Multiprofissional**: profissionais passam a ler telefone e dados civis da pessoa. A spec do módulo ainda
  está na change `criar-modulo-multiprofissional`, então esta fase só altera o módulo depois que ela for arquivada.
- Conciliação por módulo com `pessoas:conciliar <modulo>`, `--dry-run` e revisão das divergências.
- Colunas civis duplicadas ficam como fallback somente leitura até a Fase 5.

## Capabilities

### New Capabilities
<!-- Nenhuma. -->

### Modified Capabilities
- `cemiterio/cadastro-operadores`: operadores, concessionários e herdeiros referenciam obrigatoriamente a pessoa do cadastro central.
- `campanha`: equipe da campanha (candidatos, coordenadores, cabos, prefeitos, vereadores) referencia a pessoa do cadastro central; eleitores permanecem fora.
- `cursos`: participantes referenciam a pessoa do cadastro central e leem os dados civis dela.

## Impact

- **Backend**: `Modules/Cemiterios`, `Modules/Campanha`, `Modules/Cursos`, `Modules/Multiprofissional`
  (serviços de cadastro, resources, migrations de backfill, comandos de conciliação).
- **Frontend**: formulários de cadastro de cada módulo passam a usar `PessoaPicker`/`PessoaFormModal`.
- **Dependências**: exige a Fase 0. Multiprofissional depende do arquivamento de `criar-modulo-multiprofissional`.
- **Risco**: Cemitérios tem regras de óbito e sucessão ligadas à pessoa (`marcarFalecimento`); a conciliação
  não pode alterar a situação vital já registrada.
