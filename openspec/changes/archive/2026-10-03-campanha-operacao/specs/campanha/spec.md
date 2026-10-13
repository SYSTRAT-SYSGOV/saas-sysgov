# Spec Delta

## MODIFIED Requirements

### Requirement: Permissões e perfis do módulo Campanha
O módulo SHALL declarar as permissões `campanha.view`, `campanha.gestao.manage` (campanhas, membros, candidato e
configuração), `campanha.municipios.manage` (dados do município na campanha), `campanha.equipes.manage`
(coordenadores, cabos eleitorais, prefeitos e vereadores), `campanha.eleitores.view` (ver os dados pessoais dos
eleitores captados), `campanha.eleitores.manage` (links de captação, exportação e exclusão de eleitores),
`campanha.demandas.manage` (demandas), `campanha.materiais.manage` (materiais e remessas), `campanha.financeiro.view`
(ver o livro-caixa e os comprovantes), `campanha.financeiro.manage` (lançar, alterar e excluir no livro-caixa),
`campanha.agenda.manage` (eventos, reuniões e visitas) e `campanha.pesquisas.manage` (pesquisas eleitorais), e
provisionar os perfis **Coordenação Geral de Campanha** (todas, acessa todas as campanhas do tenant),
**Coordenação de Campanha** (`view`, municípios, equipes, eleitores, demandas, materiais, agenda e pesquisas, sem o
financeiro, só nas campanhas de que é membro), **Financeiro de Campanha** (`view` e o financeiro, só nas campanhas
de que é membro) e **Consulta de Campanha** (`view`, sem dados pessoais de eleitores e sem o financeiro). Toda
autorização SHALL ser feita no servidor.

#### Scenario: Consulta não altera
- **WHEN** um usuário com o perfil Consulta de Campanha tenta mudar a situação de um município
- **THEN** o sistema responde 403

#### Scenario: Módulo não habilitado
- **WHEN** um usuário de um tenant sem o módulo Campanha habilitado chama qualquer rota do módulo
- **THEN** o sistema responde 403

#### Scenario: Consulta não vê dados pessoais de eleitores
- **WHEN** um usuário com o perfil Consulta de Campanha pede a lista de eleitores
- **THEN** o sistema responde 403, mas o painel mostra a ele os totais de eleitores captados e o mapa de calor

#### Scenario: Coordenação não vê o financeiro
- **WHEN** um usuário com o perfil Coordenação de Campanha pede o livro-caixa ou um comprovante financeiro
- **THEN** o sistema responde 403

#### Scenario: Perfil Financeiro lança
- **WHEN** um usuário com o perfil Financeiro de Campanha, membro da campanha, registra uma despesa
- **THEN** o lançamento é gravado, mas ele recebe 403 ao tentar alterar um município ou uma equipe

## ADDED Requirements

### Requirement: Materiais de campanha e estoque
A campanha SHALL cadastrar materiais com tipo (santinho, folder, adesivo, bandeira, praguinha, cartaz, banner, faixa,
cavalete, perfurado, jornal, revista, envelope, camiseta, boné, caneta, brinde, outro), nome, fornecedor/gráfica,
unidade de medida, quantidade produzida, valor total do lote em centavos (o valor unitário é calculado), peso e
volume unitários, observações e imagem.
O estoque SHALL ser a quantidade produzida menos as remessas registradas. Ao cadastrar o material, a coordenação SHALL
poder pedir o lançamento automático da despesa (valor total do lote) no livro-caixa, o que exige também a
permissão do financeiro.

#### Scenario: Estoque após remessas
- **WHEN** um material com 10.000 unidades produzidas recebe remessas de 3.000 e 2.500
- **THEN** o estoque mostrado é 4.500

#### Scenario: Despesa automática
- **WHEN** a Coordenação Geral cadastra 5.000 adesivos por R$ 1.500,00 pedindo o lançamento no financeiro
- **THEN** o livro-caixa ganha uma despesa de R$ 1.500,00 na categoria Publicidade e gráfica, ligada ao material

#### Scenario: Despesa automática sem permissão do financeiro
- **WHEN** um usuário da Coordenação de Campanha cadastra um material pedindo o lançamento no financeiro
- **THEN** o sistema recusa com erro de validação e nada é gravado

### Requirement: Logística de distribuição
A campanha SHALL registrar remessas de material para um município da UF, com coordenador ou cabo eleitoral da
campanha (opcionais), quantidade, data de envio, transportadora, motorista, veículo e placa, previsão de entrega e
observações. A remessa SHALL ser recusada se a quantidade passar do estoque. A entrega SHALL poder ser confirmada com
quem recebeu, a data e uma foto. Excluir uma remessa SHALL devolver a quantidade ao estoque.

#### Scenario: Remessa acima do estoque
- **WHEN** a requisição envia 6.000 unidades de um material com estoque de 4.500
- **THEN** o sistema recusa com erro de validação e o estoque não muda

#### Scenario: Entrega confirmada
- **WHEN** a coordenação confirma a entrega de uma remessa em Londrina informando quem recebeu e a foto
- **THEN** a remessa aparece como entregue, com a foto disponível para quem tem a permissão de materiais

### Requirement: Livro-caixa com os campos da prestação de contas
A campanha SHALL registrar lançamentos de **receita** e **despesa** com categoria, valor em centavos, data, forma de
pagamento (PIX, transferência, dinheiro, cartão, cheque, estimável), centro de custo (um município da UF ou a
campanha geral), nome e CPF/CNPJ do doador ou fornecedor (validado), origem do recurso (recursos próprios, pessoa
física, partido político, FEFC, Fundo Partidário, financiamento coletivo, outros), número do recibo eleitoral (nas
receitas), tipo e número do documento fiscal (nas despesas) e observações. O painel do financeiro SHALL mostrar
receitas, despesas e saldo, com totais por categoria, origem do recurso e município, e filtros por período, tipo,
categoria, origem e município. A exportação em planilha (CSV) SHALL trazer os campos da prestação de contas e SHALL
ficar registrada na auditoria. O sistema não gera o arquivo do SPCE.

#### Scenario: Saldo
- **WHEN** a campanha tem R$ 50.000,00 em receitas e R$ 32.450,75 em despesas
- **THEN** o painel do financeiro mostra saldo de R$ 17.549,25, calculado em centavos

#### Scenario: CPF/CNPJ inválido
- **WHEN** a requisição registra uma doação de pessoa física com CPF inválido
- **THEN** o sistema recusa com erro de validação

#### Scenario: Exportação para a prestação de contas
- **WHEN** o Financeiro de Campanha exporta os lançamentos de setembro
- **THEN** recebe o CSV com data, tipo, categoria, origem do recurso, nome e CPF/CNPJ, recibo ou documento fiscal,
  forma de pagamento e valor, e a exportação fica na auditoria

### Requirement: Comprovantes anexados
Lançamentos financeiros, materiais (imagem) e entregas de remessa (foto) SHALL aceitar um arquivo PDF ou imagem de
até 10 MB, guardado em armazenamento privado. O arquivo SHALL ser baixado só por quem tem a permissão do recurso
(financeiro para comprovantes; materiais para imagens e fotos), pela própria API; nunca por um endereço público.

#### Scenario: Comprovante protegido
- **WHEN** um usuário sem `campanha.financeiro.view` pede o comprovante de uma despesa
- **THEN** o sistema responde 403

#### Scenario: Tipo de arquivo recusado
- **WHEN** a requisição anexa um arquivo executável a uma despesa
- **THEN** o sistema recusa com erro de validação

### Requirement: Agenda de eventos, reuniões e visitas
A campanha SHALL registrar **eventos** (nome, município, local, data e hora, responsável entre os membros, público
estimado e presente, observações), **reuniões** (título, município, local, data e hora, participantes, ata,
pendências, responsável e prazo das pendências) e **visitas de campo** (liderança visitada, município, bairro, data,
assunto, resultado e encaminhamento). A agenda SHALL filtrar por período, município e tipo e destacar as reuniões com
pendências vencidas. O painel SHALL mostrar os próximos compromissos. O encaminhamento de uma visita SHALL poder virar
uma demanda pendente no município da visita, com a liderança como solicitante.

#### Scenario: Visita vira demanda
- **WHEN** a coordenação transforma em demanda o encaminhamento de uma visita à associação de moradores de Maringá
- **THEN** a demanda nasce pendente em Maringá, com a associação como solicitante e o texto do encaminhamento

#### Scenario: Próximos compromissos
- **WHEN** a campanha tem um evento amanhã e uma reunião daqui a três dias
- **THEN** o painel lista os dois em ordem de data

### Requirement: Pesquisas eleitorais
A campanha SHALL registrar pesquisas **internas** e **externas** com instituto, data de divulgação, abrangência
(estadual ou um município da UF), margem de erro, tamanho da amostra, número de registro no TSE (opcional) e
**resultados estruturados** (nome, partido e percentual de cada candidato, marcando o candidato da campanha). Os
percentuais SHALL estar entre 0 e 100 e a soma não SHALL passar de 100. A tela SHALL mostrar o gráfico da evolução do
candidato da campanha ao longo das pesquisas, por abrangência.

#### Scenario: Soma acima de 100
- **WHEN** a requisição registra uma pesquisa cujos percentuais somam 104%
- **THEN** o sistema recusa com erro de validação

#### Scenario: Evolução do candidato
- **WHEN** há três pesquisas estaduais com o candidato da campanha em 8%, 11% e 14%
- **THEN** o gráfico mostra a evolução na ordem das datas
