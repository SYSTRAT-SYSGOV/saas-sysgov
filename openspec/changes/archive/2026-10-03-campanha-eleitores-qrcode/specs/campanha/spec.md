# Spec Delta

## MODIFIED Requirements

### Requirement: Permissões e perfis do módulo Campanha
O módulo SHALL declarar as permissões `campanha.view`, `campanha.gestao.manage` (campanhas, membros, candidato e
configuração), `campanha.municipios.manage` (dados do município na campanha), `campanha.equipes.manage`
(coordenadores, cabos eleitorais, prefeitos e vereadores), `campanha.eleitores.view` (ver os dados pessoais dos
eleitores captados), `campanha.eleitores.manage` (links de captação, exportação e exclusão de eleitores) e
`campanha.demandas.manage` (demandas), e provisionar os perfis **Coordenação Geral de Campanha** (todas, acessa todas
as campanhas do tenant), **Coordenação de Campanha** (`view`, municípios, equipes, eleitores e demandas, só nas
campanhas de que é membro) e **Consulta de Campanha** (`view`, sem dados pessoais de eleitores). Toda autorização
SHALL ser feita no servidor.

#### Scenario: Consulta não altera
- **WHEN** um usuário com o perfil Consulta de Campanha tenta mudar a situação de um município
- **THEN** o sistema responde 403

#### Scenario: Módulo não habilitado
- **WHEN** um usuário de um tenant sem o módulo Campanha habilitado chama qualquer rota do módulo
- **THEN** o sistema responde 403

#### Scenario: Consulta não vê dados pessoais de eleitores
- **WHEN** um usuário com o perfil Consulta de Campanha pede a lista de eleitores
- **THEN** o sistema responde 403, mas o painel mostra a ele os totais de eleitores captados e o mapa de calor

## ADDED Requirements

### Requirement: Links de captação de eleitores
A campanha SHALL gerar links de captação, cada um ligado a um coordenador ou cabo eleitoral da própria campanha, com
um código público imprevisível, um QR Code e um cartão para impressão. O link SHALL poder ser desativado; link
desativado ou de campanha encerrada SHALL recusar novos cadastros. A tela SHALL mostrar quantos eleitores cada link
captou.

#### Scenario: Link desativado
- **WHEN** um eleitor abre o formulário por um link que a coordenação desativou
- **THEN** o formulário informa que o link não está mais ativo e não aceita o cadastro

#### Scenario: Responsável de outra campanha
- **WHEN** a requisição cria um link para um cabo eleitoral de outra campanha
- **THEN** o sistema recusa com erro de validação

### Requirement: Cadastro público de eleitor com consentimento LGPD
O formulário aberto pelo link SHALL funcionar sem login e mostrar o candidato, quem indicou e o termo de privacidade
da campanha (finalidade, base legal, contato do encarregado e direitos do titular). Ele SHALL pedir nome, município
(da UF da campanha) e bairro; zona, seção, WhatsApp, data de nascimento, principal demanda e a localização do
aparelho SHALL ser opcionais. O cadastro SHALL exigir o aceite explícito do termo (caixa não marcada por padrão) e
SHALL guardar a prova do consentimento: versão do termo, data e hora, IP e navegador. Um segundo cadastro com o mesmo
WhatsApp na mesma campanha SHALL atualizar o anterior em vez de duplicar. O formulário SHALL ter limite de envios por
IP e proteção contra robôs. O formulário nunca SHALL devolver dados de outros eleitores.

#### Scenario: Cadastro sem aceite
- **WHEN** o eleitor envia o formulário sem marcar o consentimento
- **THEN** o sistema recusa e nada é gravado

#### Scenario: Cadastro com localização
- **WHEN** o eleitor permite a localização, aceita o termo e envia
- **THEN** o cadastro fica na campanha do link, com o responsável que indicou, a prova do consentimento e o ponto no mapa de calor

#### Scenario: Mesmo WhatsApp
- **WHEN** o mesmo WhatsApp é cadastrado de novo pelo formulário da mesma campanha
- **THEN** o cadastro existente é atualizado e o total de eleitores não aumenta

#### Scenario: Excesso de envios
- **WHEN** o mesmo IP envia mais cadastros do que o limite por minuto
- **THEN** o sistema responde 429

### Requirement: Base de eleitores com acesso restrito
O painel SHALL listar os eleitores captados da campanha de trabalho com filtros por município, bairro, responsável e
período, só para quem tem `campanha.eleitores.view`. A exportação em CSV e a exclusão a pedido do titular SHALL
exigir `campanha.eleitores.manage` e SHALL ser registradas na auditoria. A exclusão a pedido SHALL apagar
definitivamente os dados do eleitor. Os indicadores agregados (total, por município, por responsável) SHALL estar
disponíveis com `campanha.view`.

#### Scenario: Exportação auditada
- **WHEN** a Coordenação Geral exporta os eleitores da campanha
- **THEN** recebe o CSV e a exportação fica registrada na auditoria com o usuário e a quantidade de registros

#### Scenario: Exclusão a pedido do titular
- **WHEN** a coordenação exclui um eleitor a pedido dele
- **THEN** o registro é apagado definitivamente, sai do mapa de calor e a exclusão fica na auditoria sem os dados pessoais

### Requirement: Anonimização dos eleitores após o encerramento da campanha
Ao encerrar a campanha, o sistema SHALL registrar a data de encerramento. Passado o prazo de retenção da campanha
(padrão 90 dias, configurável), uma rotina diária SHALL anonimizar os eleitores dela: nome, WhatsApp, data de
nascimento, demanda escrita, IP e navegador SHALL ser apagados; município, bairro, zona, seção, data do cadastro e o
ponto do mapa de calor (com precisão reduzida) SHALL permanecer para estatística. Reabrir a campanha antes do prazo
SHALL cancelar a anonimização. Excluir a campanha SHALL apagar definitivamente os eleitores dela; eleitores que ainda
estejam guardados de uma campanha excluída SHALL ser anonimizados pela rotina diária.

#### Scenario: Prazo vencido
- **WHEN** a rotina roda 91 dias depois do encerramento de uma campanha com prazo de 90 dias
- **THEN** os eleitores dela ficam sem nome, WhatsApp e nascimento, e o total por município continua o mesmo

#### Scenario: Ainda no prazo
- **WHEN** a rotina roda 30 dias depois do encerramento
- **THEN** nada é anonimizado e a exportação continua disponível

#### Scenario: Campanha excluída
- **WHEN** a Coordenação Geral exclui uma campanha que tem eleitores captados
- **THEN** os eleitores dela são apagados definitivamente e a exclusão fica na auditoria com a quantidade

### Requirement: Camada de mapa de calor
O mapa do painel SHALL oferecer a camada **Mapa de calor (eleitores)**, que mostra a concentração dos eleitores
captados com localização, sobre a malha dos municípios da UF. Os pontos enviados ao navegador SHALL ter as coordenadas
arredondadas e nenhum dado pessoal. Um mapa de ruas SHALL poder ser ligado pelo usuário; sem ele, nenhuma requisição
SHALL ir a servidores de mapa externos.

#### Scenario: Pontos sem dado pessoal
- **WHEN** o painel pede os pontos do mapa de calor
- **THEN** recebe só latitude e longitude arredondadas (e o peso), sem nome, WhatsApp ou identificador do eleitor

### Requirement: Demandas da campanha
A campanha SHALL registrar demandas por município, com solicitante, categoria (saúde, infraestrutura, segurança,
educação, emenda parlamentar, ofício, outra), prioridade (alta, média, baixa), responsável entre os membros da
campanha, prazo, status (`pendente`, `em_andamento`, `concluida`) e descrição/histórico. A demanda escrita por um
eleitor no formulário SHALL poder ser transformada em demanda, ligada a ele. A lista SHALL filtrar por município,
status, prioridade e responsável e destacar as atrasadas.

#### Scenario: Demanda vinda do formulário
- **WHEN** a coordenação transforma em demanda o pedido escrito por um eleitor de Londrina
- **THEN** a demanda nasce pendente em Londrina, com o eleitor como solicitante e o texto do pedido

#### Scenario: Responsável fora da campanha
- **WHEN** a requisição atribui a demanda a um usuário que não é membro da campanha nem da coordenação geral
- **THEN** o sistema recusa com erro de validação
