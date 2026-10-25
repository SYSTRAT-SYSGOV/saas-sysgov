# Reports (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o subsistema de relatórios e documentos oficiais faz: motor de renderização plugável (Jasper/Java ou serviços remoto/HTML), emissão em streaming do boletim do aluno e do boletim do professor, ficha do aluno em lote por exportação de documentos, contador de emissões e o quadro de bandeiras de layout.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O legado separa **integrador** (dado do aluno/turma/matrícula viram argumento de relatório) e **renderizador** (fábrica que produz o PDF). A biblioteca base (`Portabilis_Report_ReportCore` + `Portabilis_Controller_ReportCoreController`) aceita fábricas trocáveis por configuração: `ReportFactoryPHPJasper` (Java local com JasperPHP) ou `ReportsRenderServerFactory` (render server remoto por HTTP/token, que também suporta fontes JSON e HTML/Blade). O PDF sai em streaming direto para o navegador, sem persistência de vias. 🟢 `ieducar/lib/Portabilis/Report/ReportCore.php:101-138`, `ReportFactoryPHPJasper.php:80-162`, `ReportsRenderServerFactory.php:94-224` contra `_reversa_sdd/Reports/legacy-mapping.md:12-16`

A emissão mais usada no código é a API AJAX: boletim do aluno por matrícula (`getBoletim`) e boletim do professor por turma/componente (`getBoletimProfessor`), ambos devolvendo PDF em base64. 🟢 `ieducar/modules/Api/Views/ReportController.php:68-153`

Já existe um pipeline novo dentro do Laravel: **Exportações de documentos** (`FileExportController`, processo 1026) que empacota por aluno a Ficha do Aluno em PDF, documentos, laudos e foto num ZIP assíncrono. 🟢 `app/Http/Controllers/FileExportController.php:14-105`, `app/Services/FileExportService.php:19-407`

> ⚠️ Snapshot: o pacote de relatórios concretos (`ieducar/modules/Reports` com `.jrxml`/`.jasper` de `ReportSources` e `ReportLogos` — o default de `REPORTS_SOURCE_PATH`) e as views Blade `reports::` **não estão neste repositório**. As classes concretas de relatório (ex.: `BoletimReport`) vêm de um driver deployment-only. 🔴 impacto: os templates são ativos de instalação, não do projeto.

---

## Responsabilidades

- Rodar o ciclo de relatório: formulário de filtro → validação de argumentos obrigatórios → emissão → PDF inline. 🟢 `Portabilis_Controller_ReportCoreController.php:66-89`, `:129-163`
- Escolher fábrica por configuração (`legacy.report.default_factory`) e injetar logo (local, URL ou nome remoto). 🟢 `ReportCore.php:122-138`, `ReportFactoryPHPJasper.php:55-76`, `ReportsRenderServerFactory.php:94-105`
- Compilar `.jrxml` em `.jasper` por falta do precompilado e executar via JasperPHP (Java) com driver `postgres` ou `json`, em foreground que devolve erro. 🟢 `ReportFactoryPHPJasper.php:88-161`
- Delegar ao render server remoto (`REPORTS_URL` + `REPORTS_TOKEN`): jasper/database, jasper/json e rotas HTML/Blade via `ReportRenderContract`, com eventos de interceptação do conteúdo (`ReportIssued`). 🟢 `ReportsRenderServerFactory.php:107-224`
- Emitir boletim do aluno (por matrícula) e boletim do professor (por turma/componente, com modelo da configuração geral). 🟢 `ReportController.php:68-153`
- Alterar dados do JSON com modificadores (`BaseModifier`/`modify()`), para campos derivados no corpo do relatório. 🟢 `src/Reports/BaseModifier.php`, `ReportCore.php:215-227`
- Marcar autenticação de relatório pelo trait `Authenticate` (`args['autenticar']`). 🟢 `src/Reports/Authenticate.php`
- Contar emissões: todo PDF emitido dispara `ReportIssued` que registra `reports_counts` (render, template, sucesso, data, autenticado), sem autor e sem vínculo por aluno. 🟢 `app/Events/ReportIssued.php`, `app/Listeners/ReportIssuedListener.php`, migração `table/2023_04_17_161801_create_report_counts_table.php`
- Exportar documentos por lote: ZIP com pasta por aluno (Ficha do Aluno + documentos + laudos + foto), assíncrono, com status e presigned URL. 🟢 `FileExportController.php:32-56`, `FileExportService.php:96-407`
- Testar o render do boletim do professor na tela de configurações gerais (lista de modelos). 🟢 `ieducar/intranet/educar_configuracoes_gerais.php:173-179` (unit `Configuracao`)

---

## Regras de Negócio

### Ciclo do relatório base

- Processo padrão 624; autenticação obrigatória; formulário só com POST ou `print_report_with_get`; erros de validação viram alertas de JavaScript. 🟢 `ReportCoreController.php:21-38`, `:66-89`, `:253-265`
- Argumentos fixos injetados sempre: `database` (nomes de base), `SUBREPORT_DIR` (caminho dos templates) e `data_emissao` (bandeira de cabeçalho). 🟢 `:76-79`
- Erros de render com tracking opcional por configuração (`legacy.modules.error.track`); detalhes completos só para nível 1 ou `show_error_details`. 🟢 `:145-162`

### Fontes de dados

- **Jasper/database:** a query vive dentro do `.jrxml` executado contra o banco PostgreSQL informado (usuário/senha do próprio config). 🟢 `ReportFactoryPHPJasper.php:136-151`
- **Jasper/JSON:** subclasses usam `JsonDataSource` com `getSqlMainReport()` e `getSqlHeaderReport()` (dados principal e do cabeçalho), gravados em arquivo temporário no `source_path`. 🟢 `src/Reports/JsonDataSource.php`, `ReportFactoryPHPJasper.php:112-134`
- **HTML/Blade:** com o trait `Html`, o payload usa `getHtmlData()` (HTML/view/parameters/orientation/driver) e o render server devolve a vias em base64. 🟢 `ReportsRenderServerFactory.php:118-155`

### Boletim do professor e modelo

- A API injeta `modelo` da configuração geral `modelo_boletim_professor` e `orientacao = 2` (paisagem). 🟢 `ReportController.php:130-135`
- A tela de configurações gerais lista os modelos do contrato `TeacherReportCard` (`getOptions()`). 🟢 `educar_configuracoes_gerais.php:173-179`

### Contadores e auditoria

- `reports_counts` perde a identidade: só render/template/sucesso/data/autenticado e somatório de `count` (ganchado em `saving`). 🟢 migração + `ReportsCount.php`
- O interceptor de conteúdo (`ReportIssuedListener`) permite trocar a vias antes de devolver, para extensões do distrito. 🟢 `ReportsRenderServerFactory.php:139-155`, `:197-223`

### Exportações de documentos (novo pipeline)

- Obrigatório vínculo de processo `DOCUMENT_EXPORT` (1026); a listagem é por usuário criador. 🟢 `routes/web.php` (can:view/can:modify), `FileExportController.php:16-30`
- O job `FileExporterJob` cria o ZIP em disco temporário, copia para o disco final (`filesystems.default`) e notifica por mensagem com link presignado. 🟢 `FileExportService.php:96-103`, `:313-362`, `:369-391`
- Um aluno sem arquivos não empacota Ficha se o contrato não estiver bound; a Ficha sempre grava (mesmo que o render falhe silenciosamente com `@`). 🟡 `FileExportService.php:245-279`
- Cursos/ficha: a Ficha a rego todo o ano acadêmico por matrícula com situação "todas". 🟢 `FileExportService.php:245-265`

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RC-01 | O sistema deve emitir o boletim do aluno por matrícula com escola/curso/série/turma e etapa opcionais. | Must | Dado matrícula ativa, então o PDF sai com notas por etapa. 🟢 |
| RC-02 | O sistema deve emitir o boletim do professor por turma/componente com modelo de layout da configuração. | Must | Dado duas escolas com modelos diferentes, então o layout muda. 🟢 |
| RC-03 | O sistema deve trocar a fábrica de renderização por configuração (Jasper local, render server, HTML/Blade). | Must | Dado env `REPORTS_FACTORY`, então a rota de render muda sem código novo. 🟢 |
| RC-04 | O sistema deve imprimir em streaming inline com cabeçalho/título, sem persistir vias. | Should | 🟢 Paridade do legado (o alvo muda isso — ver RC-07). |
| RC-05 | O sistema deve contar as emissões por render/template/sucesso/dia/autenticado. | Must | 🟢 `reports_counts` com `count` agregado. |
| RC-06 | O sistema deve exportar documentos em lote por aluno em ZIP assíncrono com Ficha, documentos, laudos e foto. | Must | Dado 3 alunos com foto, então o ZIP tem pastas com Ficha e arquivos. 🟢 |
| RC-07 | O sistema deve registrar cada via emitida com código de verificação, hash SHA-256, snapshot, PDF/A e QR público. | Must | 🔴 Novo (bastão `:19-30`); sem paridade legada. |
| RC-08 | O sistema deve permitir revogação de vias com motivo formal e portal público de validação. | Must | 🔴 Novo (bastão `:22-25`). |
| RC-09 | O sistema deve ter portal de validação pública do tenant por código de autenticação. | Should | 🔴 Novo (`:429`). |
| RC-10 | O sistema deve congelar notas finais por turma para a Ata de Resultados Finais (tabela dedicada). | Must | 🔴 Novo (bastão `:29-30`, `:172-220`). |
| RC-11 | O sistema deve sustentar assinatura eletrônica/ICP-Brasil pelo carimbo de autor e tempo. | Should | 🔴 Novo (`:26-27`). |
| RC-12 | O sistema deve suportar templates por modelo (Brasão, fundo de certificado, carteira de transporte, portaria). | Should | 🟢 Bandeiras existentes: `caminho_fundo_certificado`, `caminho_fundo_carteira_transporte`, `lei_estudante`, `portaria_aprovacao_pontos`. |
| RC-13 | O sistema deve emitir relatórios com modificadores de dados e contexto (`BaseModifier`). | Should | 🟢 `ReportCore.php:215-227`. |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| Dependência | Motor primário depende de Java (JasperPHP); os templates estão fora deste snapshot (deployment-only). | `ReportFactoryPHPJasper.php:100-151`, ausência de `ieducar/modules/Reports` | 🔴 |
| Segurança | `logoPath()` baixa logotipo da URL configurada para tmp com hash do texto da URL (sem validação de mídia). | `ReportFactoryPHPJasper.php:55-76` | 🟡 |
| Segurança | Configuração de render server com token em texto no env; sem rotação ou expiração. | `config/legacy.php:158-170` | 🟡 |
| Rastreabilidade | Contadores sem autor/aluno; vias não persistidas; formato base64 em API sem armazenamento. | `ReportsCount.php`, `ReportController.php:75-80` | 🟡 |
| Resiliência | Erros silenciosos com `@` na Ficha (vantagem do legado na exportação); job marca erro normalmente. | `FileExportService.php:267-274` | 🟡 |
| Conformidade | PDF/A arquivístico e assinatura eletrônica (novo no alvo), atender à Lei 14.063/2020 e de normativos digitais. | bastão `:706-709` | 🔴 |

---

## Critérios de Aceitação

```gherkin
Dado matrícula ativa em turma com notas
Quando getBoletim é chamado
Então PDF em base64 com argumentos fixos e SUBREPORT_DIR 🟢

Dado escola com modelo A e outra com modelo B no boletim do professor
Quando getBoletimProfessor é chamado
Então cada escola usa o modelo da configuração geral 🟢

Dado fábrica Jasper sem .jasper compilado
Quando dumps é chamado
Então o .jrxml é compilado na hora e o render volta erro sem background 🟢

Dado comando de emissão autenticada
Quando a vias é emitida
Então reports_counts incrementa com authenticated = true 🟢

Dado exportação de documentos de 5 alunos
Quando o job termina
Então o ZIP tem 5 pastas com Ficha e arquivo disponível via URL presignada 🟢

Dada via emitida no alvo
Quando escaneado o QR
Então validação pública é aberta e status ACTIVE/EXPIRED/REVOKED é exibido 🔴
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Boletim do aluno e do professor | Must | Uso principais 🟢 |
| Fábrica trocável de renderização | Must | Flexibilidade do legado 🟢 |
| Contagem de emissões | Must | Instrumentação mínima 🟢 |
| Exportação de documentos em lote (ZIP) | Must | Pipeline novo mantém o legado vivo 🟢 |
| Bandeiras de cabecalho (logo, fundo, portaria) | Should | Customização por tenant 🟢 |
| Vias autenticadas com QR/hash/revogação | Must | Objetivo do bastão; perde no legado 🔴 |
| Portal público de validação | Should | Confiança externa 🔴 |
| Ata congelada por turma | Must | Passa ao movimento de fechamento 🔴 |
| Assinatura eletrônica + ICP-Brasil | Should | Compliance 🔴 |

---

## Rastreabilidade de Código

| Arquivo | Papel | Cobertura |
|---------|-------|-----------|
| `ieducar/lib/Portabilis/Report/ReportCore.php` | Ciclo de relatório (args, fábrica, JSON/HTML/autenticação) | 🟢 |
| `ieducar/lib/Portabilis/Controller/ReportCoreController.php` | Formulário, validação, streaming inline, erro | 🟢 |
| `ieducar/lib/Portabilis/Report/ReportFactory.php` | Base das fábricas | 🟢 |
| `ieducar/lib/Portabilis/Report/ReportFactoryPHPJasper.php` | Render com Java/JasperPHP (local) | 🟢 |
| `ieducar/lib/Portabilis/Report/ReportsRenderServerFactory.php` | Render server remoto (HTTP/token + HTML) | 🟢 |
| `ieducar/modules/Api/Views/ReportController.php` | Endpoints boletim e boletim-professor | 🟢 |
| `src/Reports/*` | Contratos, modificadores, JSON/HTML/Autenticar | 🟢 |
| `app/Events/ReportIssued.php`, `app/Listeners/ReportIssuedListener.php` | Evento e contador | 🟢 |
| `app/Models/ReportsCount.php` + migração `table/2023_04_17_161801_create_report_counts_table.php` | Tabela `reports_counts` | 🟢 |
| `app/Http/Controllers/FileExportController.php`, `app/Jobs/FileExporterJob.php`, `app/Services/FileExportService.php` | Exportação de documentos em lote | 🟢 |
| `app/Models/FileExport.php` + migração `table/2024_01_05_110000_create_file_export_table.php` | Metadados e status da exportação | 🟢 |
| `config/legacy.php:152-176` | Bandeiras do relatório (logo, fundo, portaria, remote_factory) | 🟢 |
| `ieducar/modules/Reports/ReportSources` + `resources/views/reports` | Templates (.jrxml/Blade) | 🔴 ausentes no snapshot |
| `ieducar/intranet/educar_configuracoes_gerais.php:173-179` | Lista de modelos do boletim do professor | 🟢 (unit `Configuracao`) |
