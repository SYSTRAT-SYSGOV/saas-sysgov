# Tasks

## 1. Pessoa jurídica no MDM para os consumidores

- [x] 1.1 `ResolucaoPessoaService::resolverPorCnpj` e `tentarPorCnpj` (cria ou localiza a jurídica; inválido devolve `null`). Verificar: `ConciliacaoPessoasJuridicasTest`.
- [x] 1.2 `RegistroConciliacao::$dadosJuridica` e criação da jurídica na conciliação; CNPJ inválido vira `documento_invalido`. Verificar: mesmo teste.

## 2. Vínculo nos módulos

- [x] 2.1 Migrations `pessoa_id` em `inservivel_entidades`, `licitacao_participantes`, `cursos_empresas` e `passeio_veiculos` (FK, nullable até a conciliação) e models atualizados.
- [x] 2.2 Gravação liga a pessoa jurídica: cadastro de entidade (Inservível), credenciamento de fornecedor (Procurement) e empresa de Cursos. Verificar: `test_empresa_de_cursos_nova_liga_a_pessoa_juridica_no_cadastro` e suítes dos módulos.
- [x] 2.3 Adaptadores `inservivel-entidades`, `procurement-participantes`, `cursos-empresas` e `passeio-veiculos` no `ConciliacaoRegistry`. Verificar: `test_os_modulos_das_fases_registram_a_conciliacao`.
- [x] 2.4 Licitação homologada preservada: a conciliação só acrescenta `pessoa_id`. Verificar: comparação da tabela antes e depois no teste.

## 3. Validação

- [x] 3.1 Suítes de Pessoas, Procurement, Inservível, Passeio e Cursos (707 testes) e PHPStan do projeto todo verdes.
- [x] 3.2 Dry-run em produção de cada alias depois do deploy; revisar `documento_invalido` e os motoristas repetidos. **Feito em 21/10/2026:** `pessoas:conciliar <alias> --dry-run` rodou em produção para os 13 aliases e, em seguida, a conciliação real; resultado final no relatório de adoção da Fase 5 (517 de 517 vinculados, 0 divergências). Inservível, Passeio e Procurement têm 0 registros em produção.
