# Tasks

## 1. Infraestrutura do Módulo

- [x] 1.1 Executar `php artisan make:module Vistoria` para gerar o scaffold base tenant-aware (com teste de isolamento) e verificar que a estrutura de diretórios foi criada corretamente.
- [x] 1.2 Configurar `module.json` com `requires: ["Admin", "Pessoas", "OrgChart"]`, metadados de menu (grupo "GESTÃO & FISCALIZAÇÃO") e permissões base (`vistoria.view`, `vistoria.ordens.manage`, `vistoria.locais.manage`, `vistoria.formularios.manage`, `vistoria.chefia`) e verificar o registro via `php artisan module:register Vistoria`.
- [x] 1.3 Criar migrations das tabelas core: `vistoria_locais`, `vistoria_ordens_servico`, `vistoria_contadores` e verificar a criação no banco com índices compostos iniciando por `tenant_id`.
- [x] 1.4 Criar models Eloquent `LocalFiscalizavel` e `OrdemServico` com trait `TenantAware` e `$casts` tipados e verificar que o escopo `tenant_id` é aplicado automaticamente em consultas e criação.
- [x] 1.5 Configurar `VistoriaServiceProvider` e `RouteServiceProvider` (rotas em `Routes/api.php`, nunca em `web.php` global) e verificar o registro correto dos providers. **Achado durante a implementação (fora do que a tarefa descrevia)**: os providers de módulo neste repositório não são descobertos automaticamente a partir do `module.json` — cada módulo precisa ser registrado manualmente em `apps/api/bootstrap/app.php` (`->withProviders([...])`). Sem esse passo, migrations/rotas/policies do módulo nunca carregam, apesar de `module:register` e `make:module` rodarem sem erro. Adicionado `VistoriaServiceProvider::class` à lista, na mesma posição alfabética dos demais módulos.

## 2. Cadastro de Locais Fiscalizáveis

- [x] 2.1 Implementar `LocalFiscalizavelService::criarLocal()` resolvendo `proprietario_pessoa_id` contra `Modules\Pessoas\Models\Pessoa` e lançando `DomainException` quando não encontrado, e verificar via teste unitário os dois caminhos.
- [x] 2.2 Implementar endpoint `POST /api/vistoria/locais` com `FormRequest` validando georreferenciamento (`latitude`, `longitude`) e `LocalFiscalizavelPolicy::create()`, e verificar respostas HTTP 201/422/403. **Achados durante a implementação**: (1) o gate `module-access:{alias}` (`AuthServiceProvider::Gate::define('module', ...)`) exige a permissão `{alias}.view` do usuário além de qualquer permissão específica de ação — sem ela, toda rota do módulo responde 403 independentemente da Policy; (2) a Policy gerada pelo scaffold `make:module` chama um método `User::belongsToTenant()` que não existe no model real — corrigido para `$user->currentTenantId() === $model->tenant_id`, mesmo padrão usado por `Modules\Requerimentos\Policies\ProposicaoPolicy`. Ambos os achados valem para qualquer módulo futuro criado via `make:module`, não só este.
- [x] 2.3 Implementar `LocalFiscalizavelService::obterHistorico()` com as vistorias anteriores ordenadas por data decrescente e verificar o retorno via teste de feature. Adicionada coluna `resultado` (nullable) em `vistoria_ordens_servico` — necessária para o cenário da spec "incluindo resultado (regular/irregular) de cada uma"; populá-la é responsabilidade das seções 4/5/9 (execução/checklist/processo sancionatório), ainda não implementadas.

## 3. Planejamento e Agendamento de Vistorias

- [x] 3.1 Implementar `OrdemServicoService::criarOrdemServico()` com tipo de ação, data prevista, roteiro de deslocamento e criticidade, escopado por unidade organizacional via `Modules\OrgChart`, e verificar a persistência e notificação ao fiscal designado. "Notificação" implementada como evento de domínio (`OrdemServicoAtribuida`, dispatch), não como e-mail/push — não existe infraestrutura de notificação real em nenhum módulo deste repositório (busca confirmou zero usos de `Notification`/`->notify(`); mesmo padrão de `ProposicaoCriada` em Requerimentos.
- [x] 3.2 Implementar `OrdemServicoService::distribuirAutomaticamente()` com seleção do fiscal de menor carga pendente na unidade organizacional e verificar a atribuição via teste de feature com múltiplos fiscais. "Fiscais disponíveis na unidade" = usuários vinculados ao `org_unit` via `Modules\OrgChart\Models\OrgUnitUser` (ainda não existe role `vistoria.fiscal` — isso é construído na tarefa 12.1).
- [x] 3.3 Implementar ordenação por criticidade na listagem da agenda do fiscal (`GET /api/vistoria/ordens-servico/minha-agenda`) e verificar a ordem de retorno.
- [x] 3.4 Implementar `OrdemServicoPolicy` (fiscal restrito às próprias ordens; chefia escopada por unidade organizacional) e verificar cada regra via teste unitário. Escopo por unidade organizacional ainda é simplificado (chefia com `vistoria.ordens.manage` vê todo o tenant) — o refinamento por unidade específica é a tarefa 12.2.

## 4. App de Campo com Suporte Offline (PWA no `web-client`)

- [x] 4.1 Configurar Web App Manifest e Service Worker (Workbox) em `apps/web-client` para a seção `src/modules/vistoria/campo/`, tornando-a instalável, e verificar a instalação em um tablet/emulador Chrome. Via `vite-plugin-pwa` (`generateSW`), manifest confirmado em `/manifest.webmanifest` e `dev-dist/sw.js` servidos pelo dev server — instalação real em tablet físico ainda não testada (só via DevTools/manifest).
- [x] 4.2 Implementar fila local de mutações pendentes em IndexedDB (`dexie` ou `idb`) com `client_uuid` gerado por registro e verificar a persistência local sem conectividade (DevTools offline mode). `campo/db.ts` (Dexie) + `campo/syncEngine.ts`, cobertos por `campo/__tests__/syncEngine.test.ts` com `fake-indexeddb`.
- [x] 4.3 Implementar download do "pacote do dia" (ordens de serviço do fiscal + histórico dos locais envolvidos) ao abrir o app com conectividade, e verificar o acesso ao histórico offline em seguida. `GET /api/vistoria/pacote-do-dia` + `campo/pacoteDoDia.ts` (grava criptografado no Dexie, leitura 100% offline via `obterPacoteLocal`).
- [x] 4.4 Implementar sincronização automática ao reconectar, enviando cada item da fila com `Idempotency-Key = client_uuid`, e verificar via teste de integração que reenvio do mesmo `client_uuid` não duplica registro no servidor. `campo/useOnlineStatus.ts` dispara `processarFila()` no evento `online`; idempotência coberta em `ExecucaoVistoriaControllerTest::test_reenvio_com_mesmo_client_uuid_retorna_200_sem_duplicar`.
- [x] 4.5 Implementar endpoints idempotentes no backend (`POST /api/vistoria/execucoes/sincronizar`) que verificam `Idempotency-Key` já processado antes de criar novo registro, e verificar o comportamento com requisições repetidas. `ExecucaoVistoriaService::sincronizar()` — dedupe por `client_uuid` (unique constraint + checagem na service) e conflito "servidor vence, cliente anexa" (status `suplementar`).
- [x] 4.6 Implementar indicador visual de "pendente de sincronização" / "sincronizado" na UI e botão de sincronização manual, e verificar a transição de estado na interface. `CampoHomeView.tsx` (badge de pendentes + botão "Sincronizar agora").
- [x] 4.7 Implementar criptografia do armazenamento local (IndexedDB) com chave derivada da sessão autenticada e verificar que os dados não ficam legíveis em texto claro no storage do navegador. `campo/crypto.ts` (PBKDF2 a partir do token de sessão + AES-GCM), coberto por `campo/__tests__/crypto.test.ts`.
- [x] 4.8 Implementar compressão client-side de fotos antes de enfileirar (máx. 1920px, qualidade ajustável) e verificar o tamanho do payload antes/depois. `campo/imageCompression.ts`, coberto por `campo/__tests__/imageCompression.test.ts`.

**Escopo explícito desta seção** (ver `design.md`): infraestrutura genérica de offline/sync. O
conteúdo detalhado do checklist (seção 5), assinatura (seção 7) e evidências com marca d'água (seção 8)
ainda não existe — o registro `ExecucaoVistoria.dados` guarda por ora um payload JSON genérico, e a tela
`CampoExecucaoPage.tsx` é um formulário mínimo (observação + 1 foto) só para validar a fila ponta a
ponta; a UI completa de checklist dinâmico é responsabilidade da seção 5.

## 5. Formulários Dinâmicos e Checklist

- [ ] 5.1 Criar migrations `vistoria_modelos_formulario` e `vistoria_perguntas` com suporte a tipos (`multipla_escolha`, `texto_livre`, `foto`) e flag `obrigatoria`, e verificar a criação das tabelas.
- [ ] 5.2 Implementar `FormularioService::criarModeloFormulario()` com validação de tipo de fiscalização e verificar a disponibilização imediata do modelo sem deploy.
- [ ] 5.3 Implementar persistência de `vistoria_respostas_checklist` com captura automática de `latitude`/`longitude` no momento do registro e verificar via teste de feature.
- [ ] 5.4 Implementar bloqueio de conclusão de vistoria com pergunta obrigatória pendente e verificar o comportamento na UI e na API.
- [ ] 5.5 Desenvolver a tela de execução de checklist em `apps/web-client/src/modules/vistoria/campo` com componentes exclusivamente do `@sysgov/ui` e verificar a renderização de cada tipo de pergunta.

## 6. Lavratura de Auto de Infração e Documentos

- [ ] 6.1 Criar migrations `vistoria_documentos` e reutilizar `vistoria_contadores` para numeração sequencial por tipo/exercício com `DB::transaction()` + `lockForUpdate()`, e verificar a atomicidade sob concorrência via teste.
- [ ] 6.2 Implementar `DocumentoService::emitirDocumento()` para os tipos `auto_infracao`, `notificacao`, `termo_embargo`, `termo_apreensao`, preenchendo dados do autuado a partir do Cadastro Único, e verificar a numeração única gerada.
- [ ] 6.3 Implementar geração de PDF via `barryvdh/laravel-dompdf` (já usado no módulo Capd) para cada tipo de documento e verificar a renderização do PDF final com todos os dados.
- [ ] 6.4 Implementar vinculação automática do prazo de regularização ao agendamento de reinspeção (ver seção 8) e verificar a criação da ordem de reinspeção futura.

## 7. Assinatura e Rubrica em Tela

- [ ] 7.1 Criar migration `vistoria_assinaturas` com armazenamento do traçado vetorial (JSON de pontos) e da imagem rasterizada (PNG), vinculada ao documento por hash `sha256`, e verificar a persistência de ambos os formatos.
- [ ] 7.2 Implementar componente de captura de assinatura touch em `apps/web-client` (canvas) reutilizável entre autuado/responsável/testemunha e verificar a captura em dispositivo touch e com mouse.
- [ ] 7.3 Implementar `AssinaturaService::registrarRecusa()` com motivo e vinculação de testemunha (resolvida via Cadastro Único) e verificar a persistência e a descrição no PDF final.
- [ ] 7.4 Implementar uso do timestamp do servidor (não do dispositivo) como data/hora oficial da assinatura no momento da sincronização, mantendo o timestamp do dispositivo como metadado complementar, e verificar via teste simulando relógio de dispositivo divergente.

## 8. Evidências Fotográficas e Anexos

- [ ] 8.1 Criar migration `vistoria_evidencias` (fotos e documentos complementares) e verificar a criação da tabela com índices por `tenant_id` e `vistoria_id`.
- [ ] 8.2 Implementar aplicação de marca d'água (data/hora do servidor + coordenadas) no momento da sincronização, preservando a foto original sem marca d'água no storage, e verificar a imagem final gerada.
- [ ] 8.3 Implementar `EvidenciaService::anexarDocumentoComplementar()` para notas fiscais/licenças/laudos apresentados pelo fiscalizado e verificar o armazenamento e a vinculação à vistoria.

## 9. Processo Administrativo Sancionatório (Interno ao Módulo)

- [ ] 9.1 Criar migration `vistoria_processos_sancionatorios` modelando a máquina de estados (`aberto`, `em_defesa`, `em_julgamento`, `penalidade_aplicada`, `arquivado`, `em_recurso`, `concluido`) e verificar as transições permitidas via teste unitário.
- [ ] 9.2 Implementar abertura automática do processo ao confirmar a sincronização de um auto de infração, com cálculo do prazo de defesa, e verificar a criação e notificação ao autuado.
- [ ] 9.3 Implementar `ProcessoSancionatorioService::apresentarDefesa()`, `julgar()` (com `Penalidade` em `Money`/centavos) e fluxo de recurso, e verificar cada transição via teste de feature.
- [ ] 9.4 Implementar `VerificarPrazosProcessoJob` (scheduler diário) para avançar processos com prazo de defesa vencido sem manifestação (revelia) e verificar a transição automática e o registro de auditoria.

## 10. Reinspeção e Reincidência

- [ ] 10.1 Criar migration `vistoria_reinspecoes` vinculando à ordem de serviço original e ao auto de infração, e verificar a criação da tabela.
- [ ] 10.2 Implementar job agendado que cria automaticamente uma ordem de serviço do tipo `reinspecao` ao término do prazo de regularização e verificar a criação via teste com prazo simulado.
- [ ] 10.3 Implementar cálculo de reincidência (quantidade de autuações do local/responsável nos últimos 12 meses) exibido na tela de execução da vistoria e verificar o destaque visual de "local reincidente".
- [ ] 10.4 Implementar `ReinspecaoService::constatarRegularizacao()` encerrando o acompanhamento de prazo do processo sancionatório vinculado e verificar a atualização de status.

## 11. Painel Gerencial e Mapa

- [ ] 11.1 Implementar endpoint `GET /api/vistoria/painel/mapa` com vistorias pendentes/realizadas georreferenciadas no período filtrado e verificar o retorno correto dos dados.
- [ ] 11.2 Implementar endpoint `GET /api/vistoria/painel/produtividade` com contagem de vistorias concluídas por fiscal no período e verificar a acurácia dos números.
- [ ] 11.3 Implementar endpoint `GET /api/vistoria/painel/indicadores` com autuações por tipo/período, taxa de regularização e tempo médio entre vistoria e conclusão do processo sancionatório, com cache Redis (TTL 1h), e verificar os valores calculados.
- [ ] 11.4 Desenvolver a interface do painel gerencial em `apps/web-client/src/modules/vistoria/painel` com mapa, KPIs e gráficos, usando componentes exclusivamente do `@sysgov/ui`, e verificar a renderização.

## 12. Segregação de Acesso e Políticas

- [ ] 12.1 Implementar `LocalFiscalizavelPolicy` e `OrdemServicoPolicy` com métodos `viewAny`, `view`, `create`, `update`, `reatribuir` considerando role (`vistoria.fiscal` / `vistoria.chefia`) e unidade organizacional, e verificar cada regra via teste unitário.
- [ ] 12.2 Implementar middleware/escopo de consulta que injeta automaticamente o filtro `fiscal_id = auth()->id()` para role `vistoria.fiscal` nas listagens de ordens de serviço, e verificar que a chefia não sofre essa restrição.
- [ ] 12.3 Implementar reatribuição de ordem de serviço entre fiscais pela chefia com notificação a ambos e registro em auditoria, e verificar o fluxo completo via teste de feature.

## 13. Trilha de Auditoria

- [ ] 13.1 Implementar `AuditLogger` em todos os Services de mutação (`LocalFiscalizavelService`, `OrdemServicoService`, `DocumentoService`, `AssinaturaService`, `ProcessoSancionatorioService`) e verificar a persistência em `audit_logs` com coordenadas geográficas quando aplicável.
- [ ] 13.2 Implementar endpoint `GET /api/vistoria/vistorias/{id}/auditoria` para consulta da trilha completa (vistoria, documentos, assinatura, processo) e verificar o acesso restrito a auditores/chefia/administradores.

## 14. Conformidade LGPD, Criptografia e APIs de Integração

- [ ] 14.1 Implementar criptografia em repouso dos dados pessoais sensíveis (CPF, documentos) via `Encryption` facade do Laravel e verificar o armazenamento criptografado no MySQL.
- [ ] 14.2 Garantir TLS 1.3 em toda a comunicação de sincronização e documentar a configuração no `design.md`/infra, e verificar via inspeção da configuração do servidor.
- [ ] 14.3 Implementar autenticação M2M (token de API dedicado) para os endpoints públicos de integração (`GET /api/vistoria/autuacoes`) e verificar a resposta HTTP 401 para requisições sem credencial válida.
- [ ] 14.4 Documentar as APIs do módulo no formato OpenAPI/Swagger e verificar a disponibilidade da documentação no endpoint `/api/docs`.

## 15. Testes e Qualidade

- [ ] 15.1 Garantir teste de isolamento multi-tenant (Tenant A × Tenant B) para `LocalFiscalizavel`, `OrdemServico`, `AutoInfracao` e `ProcessoSancionatorio`, e verificar que nenhum dado cruza entre tenants.
- [ ] 15.2 Garantir cobertura de testes unitários ≥ 80% para todos os Services do módulo e verificar via `composer test -- --coverage`.
- [ ] 15.3 Garantir cobertura de testes de feature para todos os endpoints da API (sucesso e erro) e para o fluxo de sincronização offline (incluindo reenvio duplicado), e verificar os cenários.
- [ ] 15.4 Executar `composer static` (PHPStan/Larastan nível 6) e `npm run typecheck` e verificar zero erros.
- [ ] 15.5 Executar `composer test` e `npm test` na raiz do monorepo e verificar que todos os testes existentes (de outros módulos) continuam passando.
