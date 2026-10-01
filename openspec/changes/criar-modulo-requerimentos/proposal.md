# Proposal

## Why

A comunicação formal entre a Câmara Municipal e a Prefeitura Municipal atualmente ocorre de forma analógica ou por sistemas não integrados, gerando retrabalho, perda de prazos regimentais e ausência de rastreabilidade. Não existe na plataforma SYSGOV um módulo que digitalize e automatize o fluxo de tramitação de proposições legislativas (requerimentos, indicações, projetos de lei, moções, ofícios) entre os Poderes Executivo e Legislativo.

A criação do Módulo de Requerimentos resolve essa lacuna, oferecendo um sistema unificado de tramitação eletrônica que assegura celeridade, transparência e conformidade legal, operando sobre a base de dados única do Cadastro Único Centralizado e integrando-se nativamente com os módulos de Processo Administrativo Digital e Gestão de Fluxos de Trabalho (Workflow).

## What Changes

- **Novo Módulo Laravel `Requerimentos`**: Criação completa do módulo em `apps/api/Modules/Requerimentos`, com suporte a cadastro tipificado de proposições, tramitação entre Poderes, tramitação interna, respostas formais, notificações automáticas e trilha de auditoria.
- **Frontend `web-client`**: Novo conjunto de telas em `apps/web-client/src/modules/requerimentos` para consulta e acompanhamento pelo autor, painel de acompanhamento público e relatórios gerenciais.
- **Integração com Workflow**: Consumo nativo do Módulo de Gestão de Fluxos de Trabalho para automação das etapas de tramitação interna (comissões, pareceres, pauta, votação).
- **Integração com Processo Administrativo Digital**: Vinculação bidirecional entre proposições e processos administrativos relacionados.
- **Integração com Cadastro Único Centralizado**: Consumo da base única de entidades (vereadores, servidores, comissões, secretarias) para autoria e responsáveis.

## Capabilities

### New Capabilities

- `requerimentos/proposicoes`: Cadastro tipificado e parametrizável de proposições legislativas e demandas institucionais, com numeração sequencial por tipo/exercício, campos específicos por tipo de instrumento e vinculação a proposições ou processos anteriores.
- `requerimentos/tramitacao-poderes`: Tramitação eletrônica entre Câmara Municipal e Prefeitura Municipal, com encaminhamento, registro de recebimento, atribuição de responsável, resposta formal e controle de prazos regimentais.
- `requerimentos/tramitacao-interna`: Fluxo de tramitação interna configurável por tipo de proposição (protocolo, distribuição a comissões, pareceres, inclusão em pauta, votação, sanção/veto, publicação), apoiado pelo módulo de Workflow.
- `requerimentos/respostas`: Ambiente de elaboração de resposta ou manifestação formal do Poder destinatário, com editor de texto integrado e anexação de documentos.
- `requerimentos/notificacoes`: Notificações automáticas por e-mail e portal sobre mudanças de status, encaminhamentos, respostas e proximidade de vencimento de prazo.
- `requerimentos/painel-publico`: Painel de consulta pública com informações sobre proposições em tramitação, autor, situação, histórico e textos integrais.
- `requerimentos/acompanhamento-autor`: Ambiente individualizado para o autor acompanhar em tempo real a situação de suas proposições.
- `requerimentos/relatorios`: Relatórios gerenciais e estatísticos com indicadores de quantidade, tempo médio de tramitação e cumprimento de prazos.
- `requerimentos/auditoria`: Trilha de auditoria completa de toda inclusão, tramitação, resposta e alteração de status, com identificação do usuário, Poder, data e hora.

## Impact

- **Backend**: Novo módulo `apps/api/Modules/Requerimentos` com Models, Services, Controllers, Policies, Events, Listeners, Jobs, Migrations e Seeders.
- **Frontend**: Novas telas em `apps/web-client/src/modules/requerimentos` e componentes em `apps/web/src/modules/requerimentos` (painel público).
- **Infraestrutura**: Novas tabelas no banco de dados (MySQL 8.4), sem alterações na infraestrutura existente.
- **Segurança**: Implementação de segregação de acesso por Poder (Câmara vs Prefeitura) e por perfil, criptografia de dados em trânsito e em repouso, conformidade com LGPD.
- **APIs**: Exposição de APIs REST documentadas para integração com Diário Oficial Eletrônico e módulo de Assinatura Digital.