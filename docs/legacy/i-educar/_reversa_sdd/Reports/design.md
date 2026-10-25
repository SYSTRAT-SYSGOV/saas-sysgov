# Reports (i-Educar legado), Design

> Como o subsistema de relatórios está estruturado no código legado, com fluxos, dependências, decisões e riscos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades e componentes legados

| Componente | Papel | Fonte |
|----------|-------|-------|
| `Portabilis_Report_ReportCore` | Classe abstrata: args, fábrica, JSON/HTML, modificadores e autenticação | 🟢 `ieducar/lib/Portabilis/Report/ReportCore.php:5-228` |
| `Portabilis_Controller_ReportCoreController` | Tela de filtro + emissão inline (processo 624, only-read) | 🟢 `ReportCoreController.php:6-330` |
| `ReportFactoryPHPJasper` | Fábrica com Java local (JasperPHP), compilacão e drivers | 🟢 `ReportFactoryPHPJasper.php:5-176` |
| `ReportsRenderServerFactory` | Fábrica remota: HTTP + token, jasper/json/html | 🟢 `ReportsRenderServerFactory.php:9-225` |
| `ReportController` (API) | `getBoletim` e `getBoletimProfessor` em base64 | 🟢 `modules/Api/Views/ReportController.php:68-153` |
| `iEducar\Reports\{JsonDataSource,Html,Authenticate,BaseModifier}` | Traços/contratos das fontes | 🟢 `src/Reports/*` |
| `iEducar\Reports\Contracts\{TeacherReportCard,StudentRecordReport,ReportRenderContract}` | Contratos de binding | 🟢 `src/Reports/Contracts/*` |
| `ReportIssued` + `ReportIssuedListener` + `ReportsCount` | Evento e contador `reports_counts` | 🟢 `app/Events/*`, `app/Listeners/*` |
| `FileExportController` / `FileExporterJob` / `FileExportService` | Exportação de documentos por aluno (ZIP) | 🟢 `app/Http/*`, `app/Jobs/*`, `app/Services/*` |

### Domínio

O domínio é a **emissão documental**: relatório pedido com filtros, fonte de dados (SQL direto, JSON com queries próprias ou HTML/Blade com parameterização), renderização por fábrica, e exposição inline. O legado não persiste vias nem relaciona a emissão ao usuário/aluno — só em contadores agregados. 🟢 `reports_counts` e `ReportController.php:75-80`

### Endpoints legados

| Rota/op | Papel | Fonte |
|---------|-------|-------|
| `module/Api/Report?operation=boletim&matricula_id=` | PDF em base64 por matrícula | 🟢 `ReportController.php:157-160` |
| `module/Api/Report?operation=boletim-professor&...` | PDF em base64 por turma/componente | 🟢 `:159-160` |
| Telas filhas do `ReportCoreController` | Formulário + PDF inline (nova aba) | 🟢 `ReportCoreController.php:66-89` |
| `/arquivo/exportacoes(/novo)` | Uploads de ZIP por aluno (processo 1026) | 🟢 `routes/web.php` |

### Funções e classes no nível de aplicação

| Método | Papel | Fonte |
|--------|-------|-------|
| `ReportCore::dumps()` | Valida args obrigatórios e delega à fábrica | 🟢 `:101-113` |
| `ReportCore::modify()` | Aplica modificadores aos dados JSON | 🟢 `:215-227` |
| `ReportCoreController::renderReport()` | Header inline, `echo` + `exit`, erro com tracker/nível | 🟢 `ReportCoreController.php:129-163` |
| `ReportFactoryPHPJasper::dumps()` | Compila `.jrxml`, escol JSON/postgres executa JasperPHP, lê PDF, apaga | 🟢 `:80-161` |
| `ReportsRenderServerFactory::dumps()` | Monta payload HTTP, escolhe entre html/json/jasper, dispara evento | 🟢 `ReportsRenderServerFactory.php:94-224` |
| `ReportController::getBoletim/getBoletimProfessor` | Carrega dados da matrícula, injeta args, devolve base64 | 🟢 `ReportController.php:68-153` |
| `FileExportService::execute()` | Zip por aluno, cópia final, status, notificação presignada | 🟢 `FileExportService.php:96-103` |

---

## Fluxo Principal

**Boletim do aluno via API (casa mais usada).**

1. Frontend pede `operation=boletim` com `matricula_id`; validações de escola e matrícula. 🟢 `ReportController.php:9-14`
2. O carregador busca a matrícula ativa mais recente (aluno, ano, escola, curso, série, turma). 🟢 `:28-65`
3. `new BoletimReport` com args completos (inclusive `situacao_matricula = 10` fixo na API e `SUBREPORT_DIR`). 🟢 `:85-106`
4. Fábrica configurada valida presença, determina driver (JSON: `getJsonData()` gravados em temporário; ou database: conexao postgres) e executa. 🟢 `ReportCore.php:108-112`, `ReportFactoryPHPJasper.php:88-151`
5. PDF devolvido em base64 na resposta; nada é persistido. 🟢 `ReportController.php:107-111`

**Emissão por tela (Jasper local).**

1. Formulário de filtro; POST abre nova aba. 🟢 `ReportCoreController.php:66-71`, `:314-325`
2. Report concreto injeta args próprios, valida, emite; erro registrado e alertado. 🟢 `:72-88`, `:145-162`

---

## Fluxos Alternativos

- **Render server remoto:** configuração `remote_factory` (URL + token); o fator HTML/Blade usa `ReportRenderContract` local; interceptação/pós-processamento por `ReportIssued`. 🟢 `ReportsRenderServerFactory.php:107-224`
- **Ficha no lote:** `FileExportService` cria pasta por aluno, Ficha via binding `StudentRecordReport` (args fixos e situação todas), adiciona documentos/laudos/foto, comprime, copia ao disco final, atualiza status e notifica via presigned URL; falha geral marca `FileExportStatus::ERROR`. 🟢 `FileExportService.php:96-407`
- **Modelo do boletim do professor:** escolha na tela de configurações gerais (options do contrato). 🟢 `educar_configuracoes_gerais.php:173-179`
- **Sem fábrica configurada:** `${env REPORTS_FACTORY}` default `Portabilis_Report_ReportFactoryPHPJasper`; source path default pode falhar se o pacote não estiver presente. 🟡 `config/legacy.php:158-159`

---

## Dependências

| Dependência | Uso | Direção | Fonte |
|-------------|-----|---------|-------|
| `Avaliacao` / `DiarioClasse` | Fonte de dados das notas/faltas/financeiro (queries internas aos templates) | Entrada indireta | 🟡 queries vivem nos `.jrxml`/subclasses ausentes |
| `School` / `People` / `Enrollments` | Dados da matrícula e escola no `getBoletim` | Entrada | 🟢 `ReportController.php:28-65` |
| `Configuracao` | `modelo_boletim_professor` (config geral), bandeiras `legacy.report.*` | Entrada | 🟢 `ReportController.php:130-134`, `config/legacy.php:152-176` |
| `ErrorTracking` | `TrackerFactory` para falhas de render | Saída | 🟢 `ReportCoreController.php:146-151` |
| `Notifications` | Notificação de exportação pronta | Saída | 🟢 `FileExportService.php:378-391` |
| `Usuario` | Autor da execução (só para `file_export`), permissões por `Process` | Entrada | 🟢 `FileExportController.php:18`, `routes/web.php` |
| Pacote de templates (deployment) | `.jrxml`/`.jasper` + logos + views `reports::` | Runtime externo | 🔴 ausente no snapshot |
| Java (JasperPHP) | Runtime de renderização local | Runtime | 🟢 presente em pacote vendor (composer) |

---

## Decisões de Design Identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Emissão sem persistência de vias; contagem agregada por template. | `ReportController.php:75-80`, `reports_counts` | 🟢 |
| Fábrica escolhida por env, com fallback Java. | `config/legacy.php:158` | 🟢 |
| Fontes de dados em 3 modelos (database/JSON/HTML) com a máquina do report decidendo. | `ReportCore.php:160-173`, `JsonDataSource`, `Html` | 🟢 |
| Interceptação do conteúdo por evento (`ReportIssued`) para extensões externas. | `ReportsRenderServerFactory.php:139-155` | 🟢 |
| Erro do render: silencioso por `@` na Ficha do lote, registrado nas telas. | `FileExportService.php:267-274` | 🟡 |
| PDF exposto em streaming direto ao navegador (header inline + `exit`). | `ReportCoreController.php:97-144` | 🟢 |
| Temas de cabeçalho por configuração da instituição (logo, fundos, portaria). | `config/legacy.php`, `ReportFactoryPHPJasper.php:55-76` | 🟢 |

---

## Estado Interno

- `file_export`: hash md5(time) + filename + status (WAITING/SUCCESS/ERROR) + tamanho; url presignada do objeto. 🟢 `FileExport.php:21-53`
- `reports_counts`: contador incrementado no `saving`, indexado por render/template/success/date/authenticated. 🟢 migração
- Templates vivem fora do repo (deployment); a base `.jrxml` compila `.jasper` na falta. 🟡 `ReportFactoryPHPJasper.php:100-106`

---

## Observabilidade

- Log de erro do render server só com `legacy.report.debug`; resposta completa logada. 🟢 `ReportsRenderServerFactory.php:54-63`, `:193-211`
- Falha de emissor trackedo (ErrorTracking) nas telas do core. 🟢 `ReportCoreController.php:145-162`
- Nenhuma métrica de tempo de execução de um relatório. 🔴

---

## Riscos e Lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Sem autenticidade de documento | Nenhuma via com código/hash/QR; auditoria com contadores sem vínculo por aluno. | bastão `:15-16`, `reports_counts` | 🔴 |
| Vias não persistidas | Conteúdo não auditado; re-emissão atualiza o que veio antes sem trilha. | `ReportController`/Core | 🟡 |
| Templates fora do repositório | Migração perde modelos se o pacote de instalação não for capturado por tenant. | ausência de `ieducar/modules/Reports`, `resources/views/reports` | 🔴 |
| Java obrigatório local | Gargalo e instabilidade referido pelo bastão; o remote_factory alivia mas exige serviço externo. | `ReportFactoryPHPJasper.php:100-151`, `config/legacy.php:161-170` | 🔴 |
| Ficha no lote com `@` | Falha silenciosa que produz PDF vazio no ZIP. | `FileExportService.php:267-274` | 🟡 |
| API com base64 inline | Payloads grandes em resposta JSON; sem armazenamento de vias. | `ReportController.php:75-80` | 🟡 |
