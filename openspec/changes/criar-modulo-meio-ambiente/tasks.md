# Tasks

## 1. Scaffold do módulo e fundação multi-tenant

- [x] 1.1 Criar o módulo via `php artisan make:module MeioAmbiente` e verificar que a estrutura padrão (Config, Database, Http, Models, Policies, Providers, Routes, Services, Tests, `module.json`) e o teste de isolamento multi-tenant scaffoldado existem e passam. **Nota de implementação**: o scaffold gera o alias em `Str::lower(Str::studly(...))`, que para "MeioAmbiente" produz `meioambiente` sem separador — corrigido manualmente para `meio_ambiente` em todos os arquivos gerados antes de seguir. O placeholder genérico (`MeioAmbienteItem`/Controller/Policy/migration/teste) foi removido após a verificação, por não corresponder a nenhuma capability do spec; as entidades reais chegam a partir da Fase 2.
- [x] 1.2 Editar `module.json`: `name=MeioAmbiente`, `alias=meio_ambiente`, `priority=55`, `requires=["Admin","Pessoas","OrgChart","Vistoria"]`, `menu` (grupo "GESTÃO & FISCALIZAÇÃO", label "Meio Ambiente") e a lista completa de permissões `meio_ambiente.*` definida em `design.md` (D9); verificado via `php artisan module:register MeioAmbiente` (catálogo de plataforma, 16 permissões e menu criados). **Nota**: `php artisan bootstrap/app.php` deste monorepo registra o provider de cada módulo manualmente em `withProviders([...])` (não há auto-discovery do nwidart) — `MeioAmbienteServiceProvider::class` foi adicionado lá, sem o que a migration do módulo nunca seria carregada.
- [x] 1.3 Criar `MeioAmbienteRbacSeeder` registrando as permissões de `module.json` em 4 papéis-template (Administrador, Analista de Licenciamento Ambiental, Fiscal Ambiental, Gestor de Recursos Naturais); verificado rodando o seeder (16 permissões + 4 roles persistidos no tenant interno `systrat`).
- [x] 1.4 Criar o skeleton do frontend `apps/web-client/src/modules/meio_ambiente` (`MeioAmbienteModule.tsx` + `index.ts`) e regenerar `moduleRegistry.generated.ts` (`npm run generate:registry`); verificado que a entrada `meio_ambiente` aponta para o componente real (não para o `ModulePlaceholder` de fallback) e que `npm run typecheck` passa.

## 2. Empreendimentos (cadastro mestre)

- [x] 2.1 Migration + model `Empreendimento` (`TenantAware`, titular via `titular_pessoa_id` nullable FK `Modules\Pessoas\Models\Pessoa` OU `cnpj`/`razao_social` próprios, atividade, porte, latitude/longitude) com validação de "titular PF ou CNPJ obrigatório" no Service; testes unitários cobrindo cadastro PF, cadastro PJ e rejeição sem titular (`EmpreendimentoServiceTest`).
- [x] 2.2 Migration + model `ResponsavelTecnico` (vínculo a `Empreendimento`, `pessoa_id` nullable FK Pessoas, `nome`/`registro_profissional`/`tipo_registro` sempre preenchidos) + `EmpreendimentoService::garantirResponsavelTecnico()` (guard a ser chamado pelo `ProcessoLicenciamentoService` na Fase 3); testes cobrindo vínculo e o bloqueio sem responsável.
- [x] 2.3 `EmpreendimentoService` (`criarEmpreendimento()`, `vincularResponsavelTecnico()`) + `EmpreendimentoPolicy` + permissão `meio_ambiente.empreendimentos.manage`; testes de feature dos cenários do spec `empreendimentos` via `EmpreendimentoControllerTest` (cadastro PJ, rejeição 422 sem titular, 403 sem permissão).
- [x] 2.4 Endpoint `GET /empreendimentos/mapa` (GeoJSON) com filtro por atividade/porte; teste de feature do cenário "consulta em mapa filtrando por atividade".
- [x] 2.5 Tela de cadastro/listagem de empreendimentos no `web-client` (`EmpreendimentosView.tsx`, abas Lista/Mapa) com mapa (`react-leaflet` + `CircleMarker`, sem `Marker` padrão para evitar o bug conhecido de ícone do Leaflet em bundlers), reaproveitando `PessoaPicker`/`usePessoaPicker` do módulo Pessoas para o titular pessoa física; `npm run typecheck` e `npm test` (web-client completo, 497 testes) passam sem regressão.

**Nota de implementação**: `garantirResponsavelTecnico()` já existe e tem teste unitário próprio nesta fase, mas só será *chamado* de verdade pelo fluxo de abertura de processo na Fase 3 (não existe `ProcessoLicenciamento` ainda) — ver spec `meio-ambiente/empreendimentos`, cenário "Empreendimento sem responsável técnico não pode iniciar licenciamento".

## 3. Licenciamento ambiental

- [x] 3.1 Migration + model `ProcessoLicenciamento` (fase `LP|LI|LO|renovacao|correcao`, numeração sequencial por exercício via `Contador::proximoValor()` com `lockForUpdate()` — `Contador` próprio do módulo, já que `Vistoria` não está presente nesta branch ainda, ver nota de sequenciamento no memory do projeto —, status) + `ProcessoLicenciamentoPolicy`/permissão `meio_ambiente.licenciamento.manage`; teste de abertura de processo e numeração sequencial.
- [x] 3.2 Regra de renovação (bloqueio após 120 dias de vencimento da LO anterior) no Service; teste do cenário "prazo de renovação expirado" + guarda extra para renovação sem LO alguma.
- [x] 3.3 Migration + model `DocumentoLicenciamento` (documentos exigidos por fase/porte, incluindo EIA/RIMA — regra em constante no Service, não em tabela própria) + bloqueio de `deferir()` enquanto houver documento obrigatório pendente; testes dos cenários de deferimento bloqueado e liberado após anexação.
- [x] 3.4 Migration + model `Condicionante` (descrição, prazo, situação `pendente|cumprida` + `estaVencida()` computado) + bloqueio de avanço de fase (LI→LO) com condicionante vencida da fase anterior; teste do cenário correspondente.
- [x] 3.5 Migration + model `VistoriaTecnicaLicenciamento` (parecer favorável/desfavorável) + bloqueio de deferimento automático em parecer desfavorável, com `deferir()` aceitando justificativa para superar o bloqueio; testes dos dois cenários.
- [x] 3.6 Cálculo de validade da licença emitida (`VALIDADE_DIAS_POR_FASE`) + `VerificarPrazosLicenciamentoCommand` (Artisan Command agendado via `Schedule::command()->dailyAt()` em `routes/console.php` — mesmo padrão de `ExpireAccess`/`NotifyExpiringAccess`, não um Job de fila) gerando `AlertaLicenciamento` aos 90/30/7 dias (idempotente por `unique(tenant_id, processo, dias)`) + `ProcessoLicenciamentoService::empreendimentoEstaIrregular()` computado on-demand (sem coluna persistida) quando a última LO está vencida sem renovação; testes cobrindo alerta e irregularidade.
- [x] 3.7 Endpoints de processo/condicionante/documento/vistoria/deferimento + telas no `web-client` (`LicenciamentoView.tsx`: lista por empreendimento, abertura de processo, modal de detalhe com condicionantes/documentos/vistoria/deferimento); testes de feature dos endpoints (`ProcessoLicenciamentoControllerTest`) e `npm run typecheck`/`npm test` (web-client completo, 497 testes) sem regressão.

**Nota de implementação**: `Vistoria` ainda não existe nesta branch (cortada de `origin/main`, onde o PR #48 do Vistoria não está mergeado — ver memory `project-sysgov-meio-ambiente`), então `Contador` e o job de prazos foram implementados como classes próprias do módulo MeioAmbiente em vez de reaproveitar as equivalentes do Vistoria citadas no design original. Quando o Vistoria for mergeado/disponível nesta branch, avaliar se vale a pena consolidar `Contador` num utilitário compartilhado — não é bloqueante, o contrato observável (numeração sequencial sem colisão) é o mesmo.

## 4. Fiscalização ambiental (integração com Vistoria)

- [x] 4.1 Migration + model `AutoInfracaoAmbiental` (`documento_id` FK 1:1 `Modules\Vistoria\Models\Documento` em `vistoria_documentos`, `empreendimento_id` FK, `tipo_infracao`, `area_afetada_ha`, `reincidente`, `valor_multa_sugerido_centavos`); teste unitário cobrindo a emissão e a relação com `Documento`.
- [x] 4.2 Migration + model `TabelaMultaAmbiental` + `TabelaMultaAmbientalSeeder` com valores iniciais inspirados no Decreto Federal 6.514/2008 (ilustrativos — cabe à Secretaria revisar antes de produção, ver Open Questions do design.md), editável por `meio_ambiente.chefia`; teste cobrindo o cálculo a partir da tabela semeada.
- [x] 4.3 `FiscalizacaoAmbientalService::emitirAutoInfracaoAmbiental(ExecucaoVistoria, Empreendimento, array)` chamando `Modules\Vistoria\Services\DocumentoService::emitirDocumento()` e anexando os dados ambientais ao documento emitido; teste do cenário "emissão de auto de infração por desmatamento".
- [x] 4.4 `calcularMultaSugerida()` (proporcional ao enquadramento da `TabelaMultaAmbiental` + agravante de reincidência em 24 meses, por mesmo titular PF/CNPJ) + edição do valor pelo julgador via `Vistoria\ProcessoSancionatorioService::julgar()` direto (sem wrapper); testes dos 3 cenários.
- [x] 4.5 `ParcelamentoMulta`/`ParcelaMulta` (migrations/models + `FiscalizacaoAmbientalService::parcelar()`) com limite de 12 parcelas (`ParcelamentoMulta::LIMITE_PARCELAS`) e distribuição exata do total em centavos (sem resto perdido/sobrando); testes dos cenários de parcelamento em 6x e rejeição acima do limite.
- [x] 4.6 Endpoints de emissão/consulta sob permissão `meio_ambiente.fiscalizacao.autuar` (já existente desde a Fase 1) + teste de feature (`FiscalizacaoAmbientalControllerTest`) + teste de integração cross-module (`test_defesa_e_recurso_seguem_a_mesma_maquina_de_estados_do_vistoria`) chamando `Vistoria\ProcessoSancionatorioService::apresentarRecurso()`/`julgarRecurso()` direto sobre o processo aberto automaticamente pela nossa emissão — confirma que não há duplicação da máquina de estados.
- [x] 4.7 Tela no `web-client` (`FiscalizacaoAmbientalView.tsx`): emissão de auto de infração ambiental e parcelamento da multa; `npm run typecheck` e `npm test` (532 testes) sem regressão.

**Nota de implementação**: o Vistoria exige uma `ExecucaoVistoria` (execução de campo já concluída, com `OrdemServico`→`LocalFiscalizavel`) para emitir qualquer documento — não existe hoje nenhuma tela/endpoint no Vistoria para *listar* execuções concluídas (só emissão por ID, `POST /vistoria/execucoes/{id}/documentos`). A tela da Fase 4.7 por isso pede o ID da execução diretamente (com texto explicativo), em vez de uma lista navegável — e não há reaproveitamento de componente de assinatura em tela, já que a assinatura acontece no fluxo de campo do próprio Vistoria (`SignaturePad.tsx`/`DocumentoAssinaturaPage.tsx`), não nesta tela de desk/gabinete. `Empreendimento` e `LocalFiscalizavel` (Vistoria) permanecem sem vínculo persistido no banco — o Service recebe os dois independentemente (ver design.md D2/D3); cabe ao fiscal saber qual empreendimento corresponde à execução que está lançando.

## 5. Compensação ambiental

- [x] 5.1 Migration + model `CompensacaoAmbiental` (vínculo a `Empreendimento`/`ProcessoLicenciamento`, percentual configurável `PERCENTUAL_PADRAO=0.5`, cálculo sobre `valor_empreendimento_centavos` — coluna nova em `meio_ambiente_empreendimentos`, junto de `impacto_significativo`, ambas em migration de `ALTER TABLE` separada); `CompensacaoAmbientalService::criarSeNecessario()` chamado por `ProcessoLicenciamentoService::deferir()` (idempotente por `processo_licenciamento_id`); testes dos cenários de cálculo para impacto significativo e de ausência de compensação sem impacto significativo.
- [x] 5.2 Migration + model `PagamentoCompensacao` + `saldoDevedorCentavos()` computado (sem coluna persistida, soma `pagamentos()`) + bloqueio de `deferir()` da fase LO quando há compensação do empreendimento com saldo pendente; testes dos cenários de pagamento parcial e de bloqueio (e de liberação após pagamento integral).
- [x] 5.3 Migration + model `DestinacaoCompensacao` + validação "destinação não pode exceder valor pago" (`valorPagoCentavos() - valorDestinadoCentavos()`); testes dos cenários de destinação integral e de rejeição por excesso.
- [x] 5.4 Endpoints sob permissão `meio_ambiente.compensacao.manage` (já existente desde a Fase 1) + `CompensacaoAmbientalControllerTest`; tela `CompensacaoAmbientalView.tsx` no `web-client` (saldo, pagamentos, destinação) + campos de `impacto_significativo`/`valor_empreendimento_centavos` adicionados ao formulário de cadastro de empreendimento (`EmpreendimentosView.tsx`, Fase 2); `npm run typecheck` e `npm test` (532 testes) sem regressão.

**Escopo cortado explicitamente**: a ressalva do requisito ("salvo quando a Secretaria autorizar parcelamento") não foi implementada — não existe `ParcelamentoCompensacao` nesta fase, só o bloqueio direto por saldo pendente. Se necessário no futuro, seguiria o mesmo padrão de `ParcelamentoMulta` da Fase 4.

## 6. Gestão de resíduos sólidos

- [x] 6.1 Migration + model `GeradorResiduo` (`domiciliar|comercial|industrial`, vínculo opcional a `Pessoa`/`Empreendimento`, `nome` opcional para identificação/exibição); teste do cenário "cadastro de gerador industrial vinculado a empreendimento".
- [x] 6.2 Migration + model `ColetaResiduo` (`regular|seletiva`, rota como campo texto livre — ver `design.md` Risks sobre integração futura com Gestão de Frota —, volume, destinação) + validação de volume positivo (`RegraNegocioException`); testes dos cenários de coleta seletiva e de rejeição de volume negativo.
- [x] 6.3 Migration + models `PontoLogisticaReversa` (com lat/long opcionais, mesmo padrão das demais entidades "local" do módulo) e `EntregaLogisticaReversa` + `totalAcumuladoKg()` computado; teste do cenário "registro de entrega de pilhas em ponto de coleta" e de soma de múltiplas entregas.
- [x] 6.4 Endpoints sob permissão `meio_ambiente.residuos.manage` (já existente desde a Fase 1) + `ResiduosSolidosControllerTest`; tela `ResiduosSolidosView.tsx` no `web-client` (abas Geradores/Logística Reversa, cadastro e registro de coleta/entrega); `npm run typecheck` e `npm test` (532 testes) sem regressão.

## 7. Áreas protegidas

- [ ] 7.1 Migration + model `AreaProtegida` (`tipo` `app|reserva_legal|unidade_conservacao`, `subtipo`, `geometria` GeoJSON `Polygon`/`MultiPolygon` em coluna `JSON`, `ato_legal`) + validação de geometria; verificar testes dos cenários de cadastro e de geometria inválida.
- [ ] 7.2 `AreasProtegidasService::verificarSobreposicao()` (interseção geométrica em PHP, sem dependência de extensão nativa) aplicado a `Empreendimento`; verificar teste do cenário "empreendimento com sobreposição a APP é sinalizado".
- [ ] 7.3 Endpoint de listagem para mapa (GeoJSON) com filtro por tipo; verificar teste do cenário "consulta filtrando apenas reservas legais".
- [ ] 7.4 Permissão `meio_ambiente.areas_protegidas.manage`; tela de mapa interativo no `web-client` (`react-leaflet`) com camada de empreendimentos sobreposta; verificar `npm run typecheck` e teste de componente.

## 8. Controle de queimadas

- [ ] 8.1 Migration + model `OcorrenciaQueimada` (data, latitude/longitude, `area_queimada_ha`, `responsavel_pessoa_id` opcional, referência de imagem de satélite opcional); verificar testes dos cenários com e sem responsável identificado.
- [ ] 8.2 Listener/Service que, ao vincular um responsável a uma ocorrência, abre automaticamente um `AutoInfracaoAmbiental` com `tipo_infracao='queimada'` via `FiscalizacaoAmbientalService` (seção 4); verificar teste do cenário "auto de infração aberto automaticamente ao identificar responsável".
- [ ] 8.3 Permissão `meio_ambiente.queimadas.registrar` + endpoints; tela de registro de ocorrência e mapa de focos no `web-client`; verificar teste de feature e `npm run typecheck`.

## 9. Recursos hídricos

- [ ] 9.1 Migration + model `OutorgaAgua` (`tipo_captacao` `poco|captacao_superficial`, vazão, finalidade, validade calculada); verificar teste do cenário "cadastro de outorga de poço para uso industrial".
- [ ] 9.2 Migration + models `LicencaLancamentoEfluente` e `ParametroQualidadeEfluente` (limites regulatórios) + registro de medição com sinalização de não conformidade; verificar testes dos cenários de cadastro de licença e de medição fora do limite.
- [ ] 9.3 Job diário de verificação de prazos (90/30/7 dias) para outorgas e licenças de lançamento de efluentes, mesmo padrão do job da seção 3.6; verificar teste do cenário "alerta gerado 90 dias antes do vencimento da outorga".
- [ ] 9.4 Permissão `meio_ambiente.recursos_hidricos.manage` + endpoints; tela de outorgas/licenças/medições no `web-client`; verificar teste de feature e `npm run typecheck`.

## 10. Relatórios e indicadores ambientais

- [ ] 10.1 `RelatorioAmbientalService::gerarRelatorio()` para RARS e inventário de emissões de GEE, consolidando dados das seções 6 (resíduos) e demais módulos por exercício; verificar teste do cenário "geração do Relatório Anual de Resíduos Sólidos".
- [ ] 10.2 `exportarRelatorio()` no formato exigido pelo órgão destinatário; verificar teste do cenário de exportação do inventário de GEE.
- [ ] 10.3 `PainelIndicadoresAmbientaisService` (licenças emitidas, multas aplicadas x arrecadadas, área queimada, cobertura de coleta seletiva) com `Cache::remember`, mesma abordagem de `Vistoria\Services\PainelGerencialService`; verificar testes dos cenários de indicador de multas e de coleta seletiva.
- [ ] 10.4 Permissão `meio_ambiente.chefia` restringindo painel e relatórios (HTTP 403 sem permissão); verificar teste do cenário "usuário sem permissão de chefia não acessa o painel".
- [ ] 10.5 Aba de painel (mapas + gráficos via `react-leaflet`/`recharts`, componente `StatCard` de `@sysgov/ui`) e tela de relatórios no `web-client`; verificar `npm run typecheck` e teste de componente.

## 11. Integrações e API

- [ ] 11.1 `openapi.yaml` do módulo + rota pública de documentação (Swagger UI via CDN em `GET /api/meio-ambiente/docs`), mesmo padrão de `/api/docs` do Vistoria; verificar teste de feature confirmando resposta 200.
- [ ] 11.2 Migration + model `MeioAmbienteIntegracao` (credencial M2M por tenant, mesmo padrão de `Vistoria\Models\VistoriaIntegracao`) + endpoints públicos de licenças emitidas, autos de infração ambiental e relatórios de resíduos; verificar testes dos cenários de credencial válida e de credencial ausente/inválida (HTTP 401).
- [ ] 11.3 Integração com `App\Support\OutboxPublisher` para envio ativo (push) a órgãos que exigirem, com reagendamento em caso de falha; verificar teste do cenário "falha de envio é registrada para reprocessamento".
- [ ] 11.4 Permissão `meio_ambiente.integracoes.manage` + tela de gestão de credenciais de integração no `web-client`; verificar teste de feature e `npm run typecheck`.

## 12. Trilha de auditoria consolidada

- [ ] 12.1 Confirmar que todo Service criado nas seções 2 a 11 chama `AuditLogger::record()` em cada mutação, escrevendo um `AuditLoggerCoberturaTest` análogo ao do módulo Vistoria; verificar que o teste passa cobrindo todos os Services do módulo.
- [ ] 12.2 Endpoint `GET` consolidando a auditoria de um processo de licenciamento ou auto de infração ambiental (casando `resource` por prefixo no `AuditLog`, mesmo padrão não polimórfico do restante do monorepo) + permissão `meio_ambiente.auditoria.view`; verificar testes dos cenários de consulta consolidada e de acesso restrito (HTTP 403).
- [ ] 12.3 Tela de trilha de auditoria no `web-client`; verificar `npm run typecheck`.

## 13. Testes e Qualidade (fechamento do módulo)

- [ ] 13.1 Teste de isolamento multi-tenant (Tenant A x Tenant B) para `Empreendimento`, `ProcessoLicenciamento`, `AutoInfracaoAmbiental`, `CompensacaoAmbiental`, `AreaProtegida` e `OutorgaAgua`; verificar que nenhum dado cruza entre tenants.
- [ ] 13.2 Cobertura de testes unitários ≥ 80% para todos os Services do módulo; verificar via `composer test -- --coverage`.
- [ ] 13.3 Cobertura de testes de feature para todos os endpoints da API do módulo (sucesso e erro); verificar os cenários.
- [ ] 13.4 Executar `composer static` (PHPStan/Larastan nível 6) e `npm run typecheck`; verificar zero erros.
- [ ] 13.5 Executar `composer test` e `npm test` na raiz do monorepo; verificar que todos os testes existentes de outros módulos (incluindo Vistoria) continuam passando.
