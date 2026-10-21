# Design

## Decisões

### D1. Pessoa jurídica é criada pelo consumidor quando o módulo tem razão social e CNPJ válido
Diferente da Fase 0 (que recusava), aqui o módulo guarda razão social e CNPJ. `ResolucaoPessoaService::resolverPorCnpj`
devolve a jurídica existente (só completa o vazio) ou a cria. `RegistroConciliacao::$dadosJuridica` habilita isso na
conciliação; sem ele continua `pessoa_juridica_inexistente`.

### D2. CNPJ inválido ou ausente nunca cria pessoa
Na gravação do módulo, `tentarPorCnpj` devolve `null` e o registro é gravado sem pessoa. Na conciliação, vira
`documento_invalido` no relatório. Em ambos os casos o dado fica para revisão humana.

### D3. Licitação homologada só ganha o vínculo
A conciliação grava apenas `pessoa_id`; razão social, CNPJ e status do participante não mudam
(`ConciliacaoPessoasJuridicasTest` compara a tabela antes e depois).

### D4. Passeio: só o motorista do veículo
`passeio_veiculos.motorista` é nome livre de adulto: o adaptador cria pessoa pendente sem nascimento. Não há
semelhança possível sem nascimento, então o mesmo motorista em vários veículos gera pessoas repetidas; a fila de
duplicidades e a mesclagem da Fase 0 tratam isso. O `responsavel` do passeio é texto livre e não é conciliado.

## Fora desta fase
- Entidades físicas no Inservível (o spec admite pessoa física): hoje a entidade é sempre de CNPJ.
- Formulários do web-client com `PessoaPicker` por CNPJ: a API mantém o contrato e as telas não mudaram.
- Gravação de motorista de Passeio na criação do veículo: só a conciliação o liga por enquanto.
