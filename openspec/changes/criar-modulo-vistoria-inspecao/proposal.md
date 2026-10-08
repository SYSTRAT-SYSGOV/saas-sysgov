# Proposal

## Why

A fiscalização de campo conduzida pela Secretaria de Agricultura — vistorias em propriedades rurais, estabelecimentos comerciais, feiras, eventos e demais locais sujeitos à fiscalização sanitária, agropecuária e ambiental municipal — ainda ocorre hoje de forma analógica: ordens de serviço em papel ou planilha, autos de infração preenchidos à mão no local e posteriormente digitados, assinatura do autuado em papel, fotografias sem vínculo formal ao processo e nenhuma trilha de auditoria unificada. Isso gera retrabalho, risco de extravio de documentos, dificuldade de comprovar a regularidade do ato fiscalizatório em eventual contestação ou recurso, e ausência de indicadores gerenciais sobre produtividade dos fiscais e efetividade das autuações.

A criação do Módulo de Vistoria e Inspeção resolve essa lacuna, digitalizando o ciclo completo — planejamento da vistoria, execução em campo (inclusive sem conectividade, com sincronização posterior), lavratura eletrônica do auto de infração com coleta de assinatura/rubrica em tela, e tramitação do processo administrativo sancionatório decorrente — operando sobre a base de dados única mantida pelo Módulo de Cadastro Único Centralizado (`Modules/Pessoas`) e sobre a hierarquia organizacional do `Modules/OrgChart` para vincular fiscais à Secretaria de Agricultura.

## What Changes

- **Novo Módulo Laravel `Vistoria`**: criação completa do módulo em `apps/api/Modules/Vistoria`, com cadastro de locais fiscalizáveis georreferenciados, planejamento e distribuição de ordens de serviço, formulários dinâmicos/checklist parametrizáveis, lavratura de auto de infração e documentos equivalentes em PDF, captura de assinatura/rubrica em tela, anexação de evidências fotográficas com marca d'água, tramitação do processo administrativo sancionatório decorrente (defesa, julgamento, penalidade, recurso), controle de reinspeção/reincidência, painel gerencial com mapa e trilha de auditoria.
- **Capacidade offline-first no `apps/web-client`**: nova seção de "App de Campo" dentro do `apps/web-client` (PWA instalável, service worker + fila de sincronização local via IndexedDB), permitindo que o fiscal execute vistorias, preencha checklist, fotografe e colete assinatura sem conectividade contínua, com sincronização automática ao reconectar. É a primeira capacidade offline-first do monorepo — não existe hoje nenhuma infraestrutura de PWA/service worker nas aplicações React.
- **Documentos e evidências internos ao módulo**: como os módulos conceituais "Gestão Eletrônica de Documentos (GED)" e "Processo Administrativo Digital" citados na especificação de negócio não existem como módulos Laravel separados no repositório (`apps/api/Modules` hoje contém apenas Admin, Capd, Cemiterios, Client, Contracts, Cursos, Finance, Licita, OrgChart, Pessoas, Procurement, Requerimentos), o armazenamento versionado de documentos/evidências e a tramitação sancionatória (prazo de defesa, julgamento, penalidade, recurso) são implementados como capacidades internas do próprio módulo `Vistoria`, seguindo o mesmo precedente adotado pelo módulo `Requerimentos` (ver `design.md` para detalhes e trade-offs).
- **Integração com `Modules/Pessoas`**: todo proprietário/responsável autuado, testemunha e fiscal são resolvidos a partir do Cadastro Único Centralizado, sem duplicação de cadastro de pessoa física/jurídica.
- **Integração com `Modules/OrgChart`**: ordens de serviço e distribuição de demanda são escopadas pela unidade organizacional (Secretaria de Agricultura e suas subunidades/equipes).

## Capabilities

### New Capabilities

- `vistoria/locais-fiscalizaveis`: cadastro georreferenciado de propriedades rurais, estabelecimentos, feiras, eventos e demais locais fiscalizáveis, vinculados ao proprietário/responsável no Cadastro Único, com histórico de vistorias anteriores e classificação por tipo de atividade.
- `vistoria/planejamento-agendamento`: ordens de serviço de vistoria vinculadas a fiscal/equipe, tipo de ação, data prevista, roteiro e priorização por criticidade, com distribuição automática entre fiscais disponíveis.
- `vistoria/app-campo-offline`: execução da vistoria em tablet/smartphone com funcionamento offline, fila local de sincronização e acesso ao histórico do local já baixado no dispositivo.
- `vistoria/formularios-dinamicos`: formulários/checklist de vistoria parametrizáveis por tipo de fiscalização (múltipla escolha, texto livre, foto, geolocalização automática), sem necessidade de nova implantação para novos formulários.
- `vistoria/autuacao`: lavratura de auto de infração, notificação, termo de embargo/interdição ou apreensão em campo, com numeração única, enquadramento legal, prazo de defesa/regularização e geração de PDF.
- `vistoria/assinatura-em-tela`: captura de assinatura/rubrica manuscrita em tela (autuado, responsável ou testemunha), com data/hora/geolocalização, e registro formal de recusa de assinatura.
- `vistoria/evidencias`: captura e anexação de fotografias com marca d'água (data/hora/coordenadas) e upload de documentos complementares apresentados pelo fiscalizado.
- `vistoria/processo-sancionatorio`: abertura e tramitação do processo administrativo decorrente da autuação (prazo de defesa, julgamento, penalidade, recurso), internamente ao módulo.
- `vistoria/reinspecao-reincidencia`: controle de prazo de regularização, agendamento automático de reinspeção e histórico de reincidência por local/responsável.
- `vistoria/painel-gerencial-mapa`: painel com mapa de vistorias realizadas/pendentes, produtividade por fiscal, autuações por tipo/período, taxa de regularização e tempo médio de conclusão.
- `vistoria/rbac-fiscal-chefia`: segregação de acesso entre fiscal de campo (restrito às próprias ordens de serviço) e chefia da Secretaria (acesso administrativo integral).
- `vistoria/auditoria`: trilha de auditoria de toda vistoria, documento emitido, assinatura coletada e alteração de status, com identificação de fiscal, data/hora e coordenadas.
- `vistoria/lgpd-apis`: conformidade LGPD (criptografia em trânsito/repouso, inclusive offline) e APIs REST documentadas para integração com sistemas estaduais/federais de vigilância sanitária/agropecuária.

## Impact

- **Backend**: novo módulo `apps/api/Modules/Vistoria` com Models, Services, Controllers, Policies, Events, Listeners, Jobs, Migrations e Seeders, dependente de `Admin`, `Pessoas` e `OrgChart`.
- **Frontend**: novas telas de gestão/planejamento/painel gerencial em `apps/web-client/src/modules/vistoria`, e nova seção de app de campo offline (PWA) no mesmo app.
- **Infraestrutura**: novas tabelas MySQL (`vistoria_*`); nenhuma mudança na infraestrutura de containers Docker existente; primeira introdução de service worker/IndexedDB no monorepo (apenas no front, sem novo serviço de backend).
- **Segurança**: criptografia de dados pessoais do autuado/testemunha em trânsito e repouso (inclusive na fila offline do dispositivo), segregação fiscal × chefia, trilha de auditoria completa.
- **APIs**: endpoints REST documentados (OpenAPI) para consumo por sistemas de vigilância sanitária/agropecuária estadual ou federal.
