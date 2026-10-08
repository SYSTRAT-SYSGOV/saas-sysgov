# Design

## Context

O Módulo de Vistoria e Inspeção é um módulo novo, sem código pré-existente, destinado a digitalizar a fiscalização de campo da Secretaria de Agricultura. Deve seguir `CODING_STANDARD.md`, `DESIGN_SYSTEM.md` e os manuais `# PADRÃO SYSGOV — ...md` / `# PADRÃO VISUAL SYSGOV — ...md`, usando a stack vigente: Laravel 13 (Backend), React 19 + TypeScript + Tailwind CSS v4 (Frontend), componentes exclusivamente do `@sysgov/ui`.

Duas premissas de contexto foram verificadas diretamente no repositório antes desta proposta (não assumidas):

1. **`Modules/Pessoas` é o Cadastro Único Centralizado** citado na especificação de negócio ("cadastro único de pessoa física por tenant ... base de identidade civil consumida por outros módulos") — o Vistoria consome esse módulo de verdade para proprietários, responsáveis, testemunhas e fiscais.
2. **Os módulos "Gestão Eletrônica de Documentos (GED)" e "Processo Administrativo Digital" citados na especificação de negócio NÃO existem** como módulos Laravel separados em `apps/api/Modules`. O precedente mais próximo (`openspec/changes/criar-modulo-requerimentos`) também citava integração com módulos conceituais que não existiam ("Workflow", "Processo Administrativo Digital") e, na implementação real, essa lógica acabou internalizada no próprio módulo `Requerimentos` (ex.: `Modules/Requerimentos/Models/WorkflowConfig.php`). Este design segue o mesmo caminho de forma deliberada, documentada em vez de assumida.

## Goals / Non-Goals

**Goals:**
- Criar o módulo Laravel `Vistoria` completo (migrations, models, services, controllers, policies, events, listeners, jobs, seeders), dependente apenas de módulos que existem hoje (`Admin`, `Pessoas`, `OrgChart`).
- Implementar cadastro georreferenciado de locais fiscalizáveis vinculado ao Cadastro Único.
- Implementar planejamento/distribuição de ordens de serviço de vistoria.
- Entregar execução de vistoria em campo com capacidade offline real (fila local + sincronização), dentro do `apps/web-client`.
- Implementar formulários/checklist dinâmicos parametrizáveis sem deploy para novos formulários.
- Implementar lavratura eletrônica de auto de infração/notificação/termo com numeração única e PDF.
- Implementar captura de assinatura/rubrica em tela com geolocalização e registro de recusa.
- Implementar evidências fotográficas com marca d'água e anexos documentais.
- Implementar a tramitação do processo sancionatório decorrente (defesa, julgamento, penalidade, recurso) como capacidade interna do módulo.
- Implementar reinspeção automática e histórico de reincidência.
- Implementar painel gerencial com mapa e indicadores.
- Garantir segregação fiscal × chefia e trilha de auditoria completa.
- Garantir conformidade LGPD (inclusive no armazenamento offline do dispositivo) e expor APIs documentadas.

**Non-Goals:**
- Não construir um módulo `GED` ou `ProcessoAdministrativo` de propósito geral e reutilizável por outros módulos — isso é um projeto maior e separado, fora do escopo desta proposta. O armazenamento de documentos/evidências e a tramitação sancionatória aqui descritos são específicos ao domínio de Vistoria.
- Não construir um app nativo (iOS/Android) nem usar Capacitor/React Native — a capacidade de campo é uma PWA web.
- Não alterar `Modules/Pessoas` ou `Modules/OrgChart` além de consumi-los via relação (sem migrations cruzadas).
- Não implementar assinatura digital com certificado ICP-Brasil (fora do escopo; a assinatura aqui é captura manuscrita em tela, com valor probatório documental, não criptográfico).

## Decisions

### 1. Módulo Laravel único via `nwidart/laravel-modules`

**Decisão**: Criar `Modules/Vistoria` via `php artisan make:module Vistoria`, com `requires: ["Admin", "Pessoas", "OrgChart"]` no `module.json`.

**Racional**: Padronização com a arquitetura modular existente (mesmo padrão de `Capd`, `Cemiterios`, `Requerimentos`). `Pessoas` resolve pessoa física/jurídica; `OrgChart` resolve a unidade organizacional (Secretaria de Agricultura) para escopar fiscais e distribuição de demanda.

**Alternativas**: Módulo avulso fora do padrão `nwidart`. Rejeitado por quebrar consistência arquitetural e perder o catálogo/menu dinâmico via `module:register`.

### 2. Documentos/evidências e processo sancionatório como capacidades internas do módulo

**Decisão**: Em vez de depender de um `Modules/GED` ou `Modules/ProcessoAdministrativo` inexistentes, o próprio `Vistoria` implementa: (a) um model `Documento` (tabela `vistoria_documentos`) para versionamento de PDFs gerados e anexos, reutilizando `Storage::disk('public')` (mesmo padrão já usado por `barryvdh/laravel-dompdf` no módulo Capd/Requerimentos); (b) um sub-domínio `ProcessoSancionatorio` com estados (`aberto`, `em_defesa`, `em_julgamento`, `penalidade_aplicada`, `em_recurso`, `concluido`), modelado como máquina de estados simples dentro do próprio módulo.

**Racional**: Entrega valor imediato sem bloquear esta proposta em um projeto de infraestrutura de documentos/workflow genérico que ainda não existe. A interface pública dos services (`DocumentoService`, `ProcessoSancionatorioService`) é desenhada de forma que, se um `Modules/GED` ou `Modules/Workflow` genérico vier a existir no futuro, a migração seja uma troca de implementação por trás da mesma interface, não uma reescrita de domínio.

**Alternativas**: Bloquear esta proposta até que `GED` e `Processo Administrativo Digital` existam como módulos formais. Rejeitado — não há demanda registrada para esses módulos genéricos hoje, e o domínio de Vistoria não depende de nenhuma funcionalidade deles além de "guardar arquivo versionado" e "tramitar estados com prazo", ambos triviais de implementar localmente.

### 3. Capacidade offline como PWA dentro do `apps/web-client` (não um app novo)

**Decisão**: A execução de vistoria em campo é uma seção dedicada dentro de `apps/web-client` (`src/modules/vistoria/campo/`), tornada instalável via Web App Manifest + Service Worker (Workbox), com fila de mutações pendentes em IndexedDB (`idb` ou `dexie`) sincronizada em background (`BackgroundSync`/retry ao reconectar) contra endpoints idempotentes da API (`Idempotency-Key` por registro).

**Racional**: Reaproveita autenticação (Sanctum SPA), RBAC, `@sysgov/ui` e o build Vite existentes — menor custo de infraestrutura que um workspace novo. O fiscal usa o mesmo painel em que já teria credenciais, instalado como atalho no tablet.

**Alternativas**: Novo app `apps/field` isolado — mais separação de bundle (o app de campo não carrega o resto do painel do cliente), porém exige pipeline de build/deploy e autenticação próprios, sem ganho claro de isolamento de segurança (mesmo backend, mesmo tenant). Responsivo sem offline real — rejeitado por violar requisito explícito da especificação de negócio (operação sem conectividade contínua é mandatória, não best-effort).

**Risco assumido**: é a primeira capacidade offline-first do monorepo; não há precedente de service worker/IndexedDB para auditar. Ver seção de riscos.

### 4. Fila de sincronização com `Idempotency-Key` e resolução de conflito "servidor vence, cliente anexa"

**Decisão**: Cada mutação offline (vistoria preenchida, foto capturada, assinatura coletada) recebe um UUID client-side gerado no momento da criação, enviado como `Idempotency-Key` ao sincronizar. Em caso de conflito (ex.: a mesma ordem de serviço já foi concluída por outro fiscal/dispositivo), o servidor preserva o primeiro registro aceito e anexa as evidências do segundo envio como registro suplementar, nunca descartando dados coletados em campo.

**Racional**: Evita duplicação em reenvio por falha de rede e evita perda de evidência coletada em campo (fotos/assinatura têm valor probatório, não podem ser simplesmente sobrescritas).

**Alternativas**: Last-write-wins. Rejeitado — poderia descartar uma autuação legítima coletada em campo por colisão de sincronização.

### 5. Numeração sequencial do auto de infração com trava otimista

**Decisão**: Numeração única por tipo de documento e exercício em `vistoria_contadores`, usando `DB::transaction()` + `lockForUpdate()`, no mesmo padrão já adotado em `Requerimentos`.

**Racional**: Consistência com padrão já validado no repositório; evita duplicidade sob concorrência de múltiplos fiscais sincronizando simultaneamente.

### 6. Marca d'água e assinatura aplicadas no servidor, não confiadas ao dispositivo

**Decisão**: O dispositivo envia a foto original (sem marca d'água) e os metadados (data/hora do dispositivo, coordenadas do GPS); o servidor aplica a marca d'água de forma determinística no momento da sincronização, usando o timestamp do servidor para o campo oficial de auditoria (mantendo o timestamp do dispositivo como metadado complementar). O traçado da assinatura é recebido como vetor (lista de pontos/pressão) e também como PNG rasterizado, e vinculado ao documento gerado por hash (`sha256`).

**Racional**: O relógio/GPS do dispositivo não é fonte confiável para fins de prova documental (pode estar desconfigurado); o servidor é a autoridade de tempo. Guardar o traçado vetorial permite reprocessar a imagem da assinatura se o padrão visual mudar, sem perder o dado original.

**Alternativas**: Confiar apenas no timestamp do dispositivo. Rejeitado por fragilidade probatória em contestação/recurso.

### 7. RBAC fiscal × chefia via Policy + escopo de `OrgChart`

**Decisão**: `OrdemServicoPolicy` restringe o fiscal a `fiscal_id = auth()->id()` nas próprias ordens; `chefia` (role `vistoria.chefia`) tem escopo pela unidade organizacional (`org_unit_id`) da Secretaria de Agricultura e subunidades, via `OrgChart`.

**Racional**: Reaproveita o padrão RBAC + ABAC já descrito em `AGENTS.md`/`CODING_STANDARD.md` (notação `<modulo>.<recurso>.<acao>`), sem inventar mecanismo novo de autorização.

### 8. Criptografia em repouso de dados pessoais sensíveis via cast do Eloquent

**Decisão**: Campos que guardam dado pessoal sensível (ex.: `Documento.dados_autuado`, snapshot do CPF do autuado capturado no momento da emissão) usam o cast `encrypted`/`encrypted:array` do Eloquent, que criptografa/decriptografa de forma transparente usando a `APP_KEY` configurada (via `Illuminate\Contracts\Encryption\Encrypter`, a mesma infraestrutura por trás da facade `Crypt`/`Encryption`). Colunas que viram alvo desse cast migram de `json` nativo pra `text`, já que o valor passa a ser uma string cifrada opaca, não mais um JSON válido (uma coluna `json` do MySQL rejeitaria a gravação).

**Racional**: Mesmo padrão já adotado em `Modules\Pessoas\Models\Pessoa::$cpf` e `Modules\Cemiterios\Models\Falecido::$docs_medicos` — não introduz mecanismo novo de criptografia, reaproveita o que o framework já oferece e o que o resto do monorepo já usa pra CPF/documento. Mantém o dado consultável/decriptável pela aplicação (ao contrário de um hash unidirecional), que é o requisito aqui (precisa reconstituir o CPF pra reimprimir o PDF do auto de infração, por exemplo).

**Alternativas**: Criptografia a nível de banco (MySQL `AES_ENCRYPT`/TDE). Rejeitada — adiciona uma camada de gestão de chave fora do controle da aplicação/Laravel, sem precedente neste repositório, pra um ganho marginal (o cast do Eloquent já protege contra leitura direta do dump/backup do banco, que é a ameaça relevante aqui).

### 9. TLS 1.3 é responsabilidade da infraestrutura de borda, não do código da aplicação

**Decisão**: A sincronização do app de campo (e toda a API do módulo) depende de TLS 1.3 em trânsito, mas essa garantia é de configuração do servidor/load balancer que termina a conexão HTTPS (ex.: diretiva `ssl_protocols TLSv1.3;` num nginx, ou a "Security Policy" do balanceador em um provedor cloud) — não existe nenhum parâmetro de TLS configurável dentro do código Laravel da aplicação (o Artisan serve HTTP puro em desenvolvimento; em produção, a aplicação roda atrás de um proxy reverso que já faz a terminação TLS pra toda a plataforma, não só pra este módulo).

**Racional**: Não há (e não deveria haver) nenhuma dependência ou configuração de TLS no `apps/api` — isso contrariaria a separação de responsabilidades entre aplicação e infraestrutura, e duplicaria uma garantia que já é — ou precisa ser — centralizada pra toda a plataforma (todos os módulos, não só Vistoria, dependem do mesmo HTTPS de borda). Documentar aqui serve pra deixar explícito, pro time de infraestrutura, o requisito mínimo de versão de protocolo esperado (TLS 1.3, não aceitar fallback pra 1.2 ou anterior nas rotas deste módulo), não pra implementá-lo em código.

**Verificação (fora do código)**: inspecionar a configuração do servidor/proxy em produção (`nginx -T | grep ssl_protocols`, ou o console do provedor cloud) e confirmar que `TLSv1.3` está habilitado e que versões anteriores a `TLSv1.2` estão desabilitadas; opcionalmente, validar externamente com `openssl s_client -connect <host>:443 -tls1_3` ou um scanner como o Qualys SSL Labs.

**Alternativas**: Nenhuma — não existe meio de impor versão de TLS a partir do código de uma aplicação Laravel rodando atrás de um proxy reverso; a única alternativa real seria não usar proxy reverso (terminar TLS diretamente no PHP), o que este repositório não faz em nenhum módulo e não seria uma mudança desta proposta.

## Risks / Trade-offs

- **Primeira capacidade offline-first do monorepo**: não há Service Worker/IndexedDB testado em produção aqui. → **Mitigação**: iniciar com fila de sincronização simples (sem Background Sync API, que tem suporte de browser limitado em alguns tablets Android mais antigos) e fallback explícito de "sincronizar manualmente" visível na UI; cobrir com testes de integração que simulam perda de conectividade.
- **Perda de dispositivo com dados offline não sincronizados**: vistorias, fotos e assinaturas ficam temporariamente só no tablet. → **Mitigação**: criptografia do armazenamento local (IndexedDB) com chave derivada da sessão autenticada; política operacional de sincronizar ao final de cada rota, antes de guardar o dispositivo.
- **Conflito de sincronização entre fiscais na mesma ordem de serviço**: tratado pela decisão 4, mas aumenta a complexidade de reconciliação no painel gerencial (pode haver mais de um envio para a mesma OS). → **Mitigação**: painel gerencial exibe explicitamente "envios suplementares" quando ocorrem, sem ocultar a duplicidade do gestor.
- **Dependência funcional de `Pessoas` e `OrgChart` para o módulo funcionar**: se esses módulos não estiverem habilitados no tenant, o Vistoria não tem como resolver proprietário/fiscal. → **Mitigação**: `module:register`/ativação do Vistoria no Admin Suite valida e exige `Pessoas` e `OrgChart` habilitados no tenant antes de permitir habilitar `Vistoria` (mesma mecânica de `requires` do `module.json`).
- **Volume de fotos em alta resolução via rede móvel**: pode degradar a sincronização em áreas rurais com conectividade ruim. → **Mitigação**: compressão client-side antes de enfileirar (ex.: redimensionar para máximo 1920px de lado maior, qualidade JPEG ajustável), mantendo o original apenas se explicitamente necessário para perícia.
