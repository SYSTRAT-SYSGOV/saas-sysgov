# Proposal

## Why

A Fase 1 do módulo Campanha (change `campanha-politica-fundacao`) trouxe campanhas, municípios, mapa e equipes, mas
não a **captação de eleitores em campo**, que a versão no ar do CRM PHP já faz: o cabo eleitoral ou o coordenador
mostra um QR Code, o eleitor preenche um formulário público no próprio celular (com GPS e aceite da LGPD) e o cadastro
alimenta o **mapa de calor** da campanha. Junto vêm as **demandas** dos municípios — os pedidos que chegam por esse
formulário e pelas lideranças.

Opinião política é **dado pessoal sensível** (LGPD, art. 11): a captação precisa de consentimento específico e
destacado, registro da prova do consentimento, acesso restrito e um fim de vida para os dados quando a campanha acaba
(decisão do usuário: anonimizar depois de um prazo).

Esta é a **Fase 2A**. A Fase 2B (change futura) traz materiais e logística, financeiro (livro-caixa com os campos da
prestação de contas do TSE), agenda (eventos, reuniões, visitas) e pesquisas.

## What Changes

- **Links de captação:** a campanha gera links (e QR Codes) por coordenador ou cabo eleitoral; cada link identifica
  quem indicou, pode ser desativado e conta os cadastros que trouxe. Cartão para imprimir com o QR.
- **Formulário público** (sem login, aberto pelo QR): nome, cidade, bairro, zona e seção (opcionais), WhatsApp e
  nascimento (opcionais), principal demanda (opcional), localização do aparelho (opcional, com permissão do
  navegador) e **consentimento LGPD** específico, não pré-marcado, com o termo da campanha. Protegido contra abuso
  (limite por IP, campo-armadilha, cadastro repetido pelo mesmo WhatsApp não duplica).
- **Base de eleitores** no painel: lista com filtros (município, bairro, responsável, período), ficha, exportação
  CSV auditada e exclusão a pedido do titular. Acesso aos dados pessoais só com permissão própria
  (`campanha.eleitores.view`/`manage`); quem só tem `campanha.view` vê os números agregados.
- **Prova do consentimento:** versão do termo, data/hora, IP e navegador de cada aceite; termo e encarregado
  (contato para o titular) configuráveis por campanha.
- **Fim de vida (LGPD):** ao encerrar a campanha começa um prazo (padrão 90 dias) para exportar; depois, os dados
  pessoais dos eleitores são **anonimizados** automaticamente (fica só o agregado: município, bairro, zona e o ponto do
  mapa de calor com precisão reduzida).
- **Mapa de calor:** nova camada "Mapa de calor (eleitores)" no painel, sobre a malha do IBGE, com os pontos dos
  eleitores captados (coordenadas arredondadas, sem dado pessoal); mapa de ruas (OpenStreetMap) opcional.
- **Demandas:** cadastro de demandas por município (solicitante, categoria, prioridade, responsável entre os membros,
  prazo, status pendente → em andamento → concluída, histórico); a demanda escrita no formulário público pode virar
  uma demanda com um clique.

## Capabilities

### New Capabilities
<!-- Nenhuma: tudo pertence à capacidade `campanha`, criada na Fase 1. -->

### Modified Capabilities
- `campanha`: acrescenta links de captação e formulário público de eleitores com LGPD, base de eleitores com
  acesso restrito e anonimização após o encerramento, camada de mapa de calor e demandas; amplia as permissões e
  perfis do módulo.

## Impact

- **Backend (`Modules/Campanha`):** tabelas de links de captação, eleitores (com prova de consentimento) e demandas;
  colunas de termo LGPD, encarregado, prazo de retenção e `encerrada_em` na campanha; rotas públicas
  `api/public/campanha` (sem login, com limite por IP) isoladas como as do Cursos; comando agendado de anonimização;
  novas permissões no seeder de perfis; testes.
- **Frontend:** página pública do formulário (fora do AppShell, como a validação de certificados), abas Eleitores,
  Captação e Demandas, camada de mapa de calor (`leaflet.heat`, nova dependência) e configuração LGPD na aba Campanha.
- **Privacidade:** dado sensível com consentimento específico, acesso por permissão, exportação auditada,
  exclusão a pedido e anonimização por prazo. Nenhum dado pessoal vai para o mapa de calor nem para servidores
  externos; os únicos pedidos externos são as imagens do mapa de ruas, quando ligado.
- **Documentação:** `docs/modules/campanha.md`.
