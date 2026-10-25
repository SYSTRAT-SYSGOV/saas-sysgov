# Reports (i-Educar legado), Flows

> Fluxos observados no código legado. Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## F-01: Boletim do aluno via API

**Consumidor:** frontend do diário/aluno (script no pacote deployment, não no snapshot). 🔴 consumo / 🟢 backend

1. Requisição `GET api/Report?operation=boletim&matricula_id=X` (etapa opcional). 🟢 `ieducar/modules/Api/Views/ReportController.php:67-81`
2. Validações de escola e matrícula; carrega aluno/ano/escola/curso/série/turma da matrícula ativa mais recente (aceitando matrículas transferidas). 🟢 `:28-65`
3. Instancia `BoletimReport` com args completos e `SUBREPORT_DIR`; `dumps()` valida obligatorios e delega à fábrica configurada. 🟢 `:83-111`, `ReportCore.php:101-113`
4. Fábrica Jasper: compila `templateName()` se `.jasper` ausente; driver database (conexão postgres da config) ou JSON (temporário com `getJsonData()` + modificadores). 🟢 `ReportFactoryPHPJasper.php:100-161`, `src/Reports/JsonDataSource.php`
5. Executor JasperPHP roda em foreground (erro volta ao PHP) e o PDF é lido e descartado do disco temporário. 🟢 `:131-161`
6. API devolve base64; nada é persistido; `reports_counts` só registrado na rota de render server/core (não na cadeia Java local). 🟡

## F-02: Boletim do professor via API

1. Requisição `operation=boletim-professor` com ano/instituição/escola/curso/série/turma/professor/componente. 🟢 `ReportController.php:16-25`
2. `app(TeacherReportCard::class)` injeta args e o `modelo` da configuração geral (`modelo_boletim_professor`, unit `Configuracao`). 🟢 `:113-136`
3. Render pela mesma fábrica; PDF base64 devolvido. 🟢 `:138-152`

## F-03: Emissão por tela (ReportCoreController)

**Ator:** secretaria/professor (processo 624). 🟢 `ReportCoreController.php:21-38`

1. Formulário de filtro renderiza; POST envia a nova aba. 🟢 `:66-71`, `:314-325`
2. Report concreto injeta args; validação de presença e `afterValidation` de subclasses; erros viram alerta. 🟢 `:72-89`, `:239-265`
3. `dumps()` da fábrica; headers `application/pdf` inline; `echo` + `exit` (streaming). 🟢 `:97-144`
4. Falha registrada no ErrorTracking com detalhe só para nível 1 ou quando `show_error_details` está ativo. 🟢 `:145-162`

## F-04: Render server remoto

1. Fábrica `ReportsRenderServerFactory` (configurada por `REPORTS_FACTORY`) monta payload `report`/`url`/`data`/`params` + `Authorization: Token`. 🟢 `ReportsRenderServerFactory.php:94-187`
2. Fonte: HTML/Blade (via `ReportRenderContract` local, `reports::` view), JSON (`getJsonData` + modificadores) ou jasper/database (conexao postgres no payload). 🟢 `:118-168`
3. Resposta 200 com base64; evento `ReportIssued` permite interceptar a via; `reports_counts` registrado pelo listener. 🟢 `:187-223`, `app/Listeners/ReportIssuedListener.php:10-19`

## F-05: Exportação de documentos por aluno (ZIP)

**Ator:** secretaria com processo `DOCUMENT_EXPORT` (1026). 🟢 `routes/web.php`

1. Formulário define ano/escola/curso/série/turma/matricula opcional; registro `file_export` criado com status WAITING. 🟢 `FileExportController.php:32-56`, `FileExport.php:27-36`
2. Job assíncrono: consulta alunos ativos com matrícula filtrada; pasta por aluno com nome normalizado. 🟢 `FileExportService.php:141-243`
3. Ficha do Aluno via binding `StudentRecordReport` com args do ano/instituição/escola/curso/série/turma/matricula e termo de declaração; erros silenciados com `@`. 🟢 `:245-279`
4. Documentos, laudos e foto do aluno copiados ao blob temporário; ZIP criado; cópia para o disco final; status SUCCESS e tamanho. 🟢 `:282-375`
5. Notificação ao usuário com URL presignada do ZIP. 🟢 `:378-391`

## F-06: Contagem de emissões

1. Toda vias do core/remote factory dispara `ReportIssued(render, template, success, authenticated)`. 🟢 `ReportsRenderServerFactory.php:139-155`, `:201-217`
2. Listener registra/agrega em `reports_counts` com `count++`. 🟢 `app/Listeners/ReportIssuedListener.php`

## F-07: Vias autenticadas com QR/hash/revogação e Ata congelada (novo no alvo)

1. O bastão pede registro de vias com código/hashes/QR/status e revogação; e ata consolidada por turma com trava. Sem paridade no legado. 🔴 `_reversa_sdd/Reports/legacy-mapping.md:19-30`
