# Proposal

## Why

A aba "Quadro Geral de Servidores" do Portal de RH (`PortalRhView.tsx`, `activeTab === 'servidores'`)
já é sólida em vários aspectos (tabela real, busca, paginação, exportação), mas tem duas lacunas:

1. A coluna "Secretaria (Órgão)" usa `getSiglaSecretaria()` — uma heurística de texto fixa
   (`"administra" → SMAD`, `"finan" → SMF`, `"educa" → SMED`, `"saúde" → SMS`, `"obras" → SMOSP`,
   senão as 5 primeiras letras em maiúsculo) que não reflete a estrutura real de nenhum tenant.
   Essa é a mesma classe de problema já corrigida na aba "Distribuição por Pasta & Departamento"
   (mudança `enhance-portal-rh-distribuicao-departamento`), que passou a usar o organograma real
   do OrgChart — mas essa correção não foi propagada para esta tabela.
2. Não há como ver o perfil completo de um servidor a partir desta lista — o único atalho é "Ver
   Avaliação" quando existe uma avaliação no ciclo atual. Histórico de avaliações de outros
   ciclos, quinquênios e afastamentos não são visíveis sem sair da tela.

## What Changes

- Substituir `getSiglaSecretaria()`/coluna "Secretaria (Órgão)" pela classificação real do
  organograma: mesma lógica de `servidorPertenceAoDepartamento()`/`dadosDistribuicao` já usada na
  aba de Distribuição, exibindo a secretaria e o departamento reais (ou "Não Classificado" quando
  o servidor não corresponde a nenhuma unidade).
- Adicionar `onRowClick` na `DataTable` do Quadro de Servidores, abrindo um painel de detalhe
  (`Modal` do `@sysgov/ui`) com: dados cadastrais básicos, histórico de avaliações em todos os
  ciclos (não só o ciclo ativo), quinquênios registrados e afastamentos.

## Capabilities

### New Capabilities

(nenhuma — esta mudança estende a capability `capd` já existente)

### Modified Capabilities

- `capd`: adiciona classificação organizacional real e visualização de detalhe do servidor na
  aba "Quadro Geral de Servidores" do Portal de RH.

## Impact

- Frontend: `apps/web-client/src/modules/capd/views/PortalRhView.tsx` — reescreve a coluna
  "Secretaria (Órgão)"/"Departamento (Lotação)" de `columnsServidoresGeral`, adiciona estado de
  servidor selecionado e o painel de detalhe.
- Backend: nenhuma mudança — todos os dados do painel de detalhe já são servidos por endpoints
  existentes (`api.capd.listAvaliacoes({ servidor_id })`, `api.capd.listarQuinquenios(id)`,
  `ApiServidor.afastamentos`).
- Sem impacto em outras abas, exceto reaproveitar (não duplicar) a lógica de classificação já
  existente em `dadosDistribuicao`.
