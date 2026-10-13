# Proposal

## Why

O CRM eleitoral da SYSTRAT roda hoje como um sistema PHP separado (`/politica`, publicado em
`veiga.pro.br/politica`), com usuários próprios, uma única campanha e um único candidato por instalação, e com os
dados dos municípios digitados ou importados à mão. Trazê-lo para o SYSGOV como o módulo **Campanha Política**
coloca o CRM no mesmo login, RBAC, isolamento por tenant, auditoria e design system dos demais módulos, permite
atender **vários candidatos** no mesmo cliente e já parte de dados públicos oficiais (IBGE e TSE) em vez de
cadastro manual.

Esta é a **Fase 1** (fundação): o essencial para a operação de campo — campanhas, candidatos, municípios, o painel
com o **mapa interativo** e as equipes. A Fase 2 (fora desta change) traz eleitores por QR Code com LGPD e mapa de
calor, materiais e logística, financeiro, eventos/visitas/reuniões, pesquisas, demandas e documentos.

## What Changes

- **Novo módulo `Campanha`** no backend (`apps/api/Modules/Campanha`) e no painel do cliente
  (`apps/web-client/src/modules/campanha`), com permissões, perfis e item de menu próprios.
- **Campanhas por candidato:** o tenant (partido, consultoria, mandato) cadastra N campanhas (eleição, cargo, UF de
  atuação, meta global de votos). Cada campanha tem **um candidato**, ligado ao **Cadastro de Pessoas** pelo CPF.
  O usuário trabalha numa **campanha de cada vez** (seletor, como a escola de trabalho dos módulos de educação) e só
  acessa as campanhas de que é **membro**; a coordenação geral acessa todas.
- **Base territorial pública por UF** (compartilhada entre tenants, só leitura para eles): municípios com código
  IBGE, mesorregião/região intermediária e população estimada (IBGE), eleitorado, zonas e seções (TSE),
  prefeito e vice eleitos (TSE) e a malha geográfica dos municípios (IBGE). Carga e atualização por comando de
  importação a partir das fontes abertas; Paraná carregado agora, outros estados com o mesmo comando.
- **Município na campanha:** situação política (sem atuação, em andamento, consolidado, prioritário, risco),
  meta de votos, votos na eleição anterior, coordenador responsável, potencial e observações — por campanha.
- **Painel com o mapa interativo** da UF da campanha, com as camadas **Situação Política**, **Apoio de
  Prefeito** e **Meta de Votos** (faixas e cores configuráveis), legenda, dica ao passar o mouse e **clique que
  abre a ficha do município**; indicadores (municípios, coordenadores, cabos, prefeitos e vereadores aliados) e
  gráficos de situação e meta por região.
- **Ficha do município:** dados públicos (IBGE/TSE), dados da campanha (editáveis), prefeito e relação com a
  campanha, vereadores, cabos eleitorais e coordenador.
- **Equipes e relacionamento:** cadastros de coordenadores (estadual, regional, municipal), cabos eleitorais,
  prefeitos (apoio à campanha e influência) e vereadores (aliado, votos estimados, apoios declarados).
- **Configuração da campanha:** cores das situações, faixas de meta de votos e dados do candidato.
- Auditoria de todas as alterações e eventos de domínio (Outbox), como nos demais módulos.

## Capabilities

### New Capabilities
- `campanha`: CRM de campanha política — campanhas por candidato com acesso por membro, base territorial pública
  (IBGE/TSE) por UF, municípios na campanha, painel com mapa interativo e ficha do município, coordenadores, cabos
  eleitorais, prefeitos e vereadores.

### Modified Capabilities
<!-- Nenhuma: o Cadastro de Pessoas é usado como está (resolução por CPF), sem mudar seus requisitos. -->

## Impact

- **Backend:** novo módulo `Modules/Campanha` (migrations, models com isolamento por tenant e por campanha,
  policies, serviços, rotas `api/campanha`, middleware de campanha de trabalho, seeder de perfis, comando de
  importação dos dados públicos e testes de isolamento). Usa `Pessoas` (resolução por CPF) e `Admin`
  (usuários, perfis, habilitação do módulo).
- **Frontend:** novo módulo `modules/campanha` no `web-client` (`@sysgov/ui`, `react-leaflet` já instalado para o
  mapa, `recharts` para os gráficos) e regeneração do registry de módulos.
- **Dados externos:** IBGE (`servicodados.ibge.gov.br` localidades e malhas; `apisidra.ibge.gov.br` população) e TSE
  (`cdn.tse.jus.br` dados abertos: eleitorado, candidatos/eleitos). Só o comando de importação acessa essas fontes
  (nunca um controller), seguindo o padrão de chamadas externas assíncronas.
- **Sistema PHP de referência:** apenas consultado; nada é alterado nele nem em seu banco. Não há migração dos
  dados dele nesta fase.
- **Documentação:** `docs/modules/campanha.md`.
