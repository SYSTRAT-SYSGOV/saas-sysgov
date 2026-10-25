# Reports (i-Educar legado), Contracts

> Contratos de dados, serviços e interfaces do subsistema de relatórios. Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contratos de dados existentes

### 1.1 `reports_counts`

| Coluna | Tipo | Semântica | Confiança |
|---|---|---|---|
| `render` | varchar(20) | Motor usado (jasper/json/html) | 🟢 |
| `template` | varchar(150) | Nome do relatório | 🟢 |
| `success` | boolean | Sucesso/falha do render | 🟢 |
| `date` | date | Dia da emissão | 🟢 |
| `count` | integer | Contador agregado (incremento no `saving`) | 🟢 |
| `authenticated` | boolean | Vias com autenticação (trait `Authenticate`) | 🟢 |

Sem vínculo de usuário, aluno, escola ou matrícula. Fonte: `table/2023_04_17_161801_create_report_counts_table.php`, `app/Models/ReportsCount.php` contra `_reversa_sdd/Reports/legacy-mapping.md:14-16`.

### 1.2 `file_export`

| Coluna | Semântica | Alvo sugerido | Confiança |
|---|---|---|---|
| `user_id` | Dono da exportação | issued_by_user_id | 🟢 |
| `url` | URL final do ZIP | pdf_storage_path | 🟢 |
| `hash` | md5(time) como nome de pasta | id/UUID | 🟡 |
| `filename` | Nome de exibição | verification_code equivalente semântico | 🟢 |
| `status_id` | WAITING/SUCCESS/ERROR (`FileExportStatus`) | status ACTIVE/EXPIRED/REVOKED (semântica diferente) | 🟢 |
| `size` | Tamanho do objeto | file_size_bytes | 🟢 |

Fonte: `app/Models/FileExport.php`, `table/2024_01_05_110000_create_file_export_table.php`.

### 1.3 Templates e vias (novo no alvo)

Contratos esperados pelo bastão (sem paridade legada): `educa_document_templates` (layout JSON + Blade, tipo, papel, validade, padrão) e `educa_issued_documents` (via com código/hash/snapshot/PDF/status/revogação/QR). 🔴 `_reversa_sdd/Reports/legacy-mapping.md:33-221`

---

## 2. Contratos de serviço

### 2.1 Ciclo do relatório (ReportCore)

```php
// Interface observada (classe abstrata)
templateName(): string          // nome do .jrxml/Blade 'reports::'
requiredArgs(): void            // declaração de args obrigatórios
addArg($name, $value)           // argumento para a fábrica
dumps($options = []): mixed     // render pela fábrica configurada
useJson()/useHtml()/authenticate()/getJsonQuery()/getJsonData(): nos traits
modify($data): array            // modificadores BaseModifier
```

Fonte: `ReportCore.php:56-227` contra `_reversa_sdd/Reports/legacy-mapping.md:229-236`.

### 2.2 Fábricas

| Fábrica | Driver | Entrada mínima | Saída | Confiança |
|---|---|---|---|---|
| `ReportFactoryPHPJasper` | JasperPHP (Java local) | template, args, conexão postgres ou JSON temporário | PDF binário em memória | 🟢 |
| `ReportsRenderServerFactory` | HTTP remoto (URL + token) | payload com `report`/`url`/`data`/`params` | PDF base64 via evento | 🟢 |
| (HTML/Blade do mesmo fator) | `ReportRenderContract` | view `reports::`, parameters, orientation | PDF via render | 🟢 |

### 2.3 Emissões API

| Operação | Argumentos | Retorno | Confiança |
|----------|-----------|---------|-----------|
| `getBoletim(matricula_id, etapa?)` | matrícula + fixos (instituicao/escola/curso/serie/turma/ano, situacao_matricula=10) | PDF base64 | 🟢 `ReportController.php:68-111` |
| `getBoletimProfessor(ano, instituicao_id, escola_id, curso_id, serie_id, turma_id, professor, componente_curricular_id, situacao?, situacao_matricula?)` | + `modelo` da configuração geral | PDF base64 | 🟢 `:113-153` |

### 2.4 Exportações de documentos

| Op | Papel | Confiança |
|----|-------|-----------|
| `GET /arquivo/exportacoes` | Listagem com URL presignada | 🟢 `routes/web.php`, `FileExport-model` |
| `GET /arquivo/exportacoes/novo` | Formulário (ano/escola/curso/série/turma/matricula) | 🟢 |
| `POST /arquivo/exportacoes/novo` | Cria registro e despacha `FileExporterJob` | 🟢 `FileExportController.php:32-56` |
| job `FileExporterJob` | Zip por aluno + Ficha via `StudentRecordReport` | 🟢 `FileExportService.php:96-407` |

### 2.5 Vias no novo alvo (API proposta pelo bastão)

`POST reports/issue`, `GET reports/issued-documents`, `download`, `revoke`, `POST final-grades/consolidate`, `GET public/documents/verify/{codigo}`. 🔴 `_reversa_sdd/Reports/legacy-mapping.md:422-429`

---

## 3. Contratos cruzados com outras units

| Unit | Contrato | Direção | Confiança |
|------|----------|---------|-----------|
| `Configuracao` | `modelo_boletim_professor` (config geral), bandeiras `legacy.report.*` (logo, fundos, portaria, modelos, remote_factory) | Entrada | 🟢 |
| `Avaliacao`/`DiarioClasse` | Dados de notas/faltas/Ficha Financeira dentro das queries dos templates | Entrada indireta | 🟡 |
| `People`/`Enrollments`/`School`/`SchoolClass` | Dados da matrícula para o boletim | Entrada | 🟢 |
| `People` (documentos/laudos/fotos) | Fonte do ZIP de exportação | Entrada | 🟢 |
| `ErrorTracking` | Notificação de falha de render | Saída | 🟢 |
| `Notifications` | Aviso de exportação pronta | Saída | 🟢 |
| `Usuario` | Autor da exportação e permissões de processo | Entrada | 🟢 |
| `HistoricoEscolar` | Alvo da vias de documento timbrado (RC do histórico) | Consumidor | 🟡 |

---

## 4. Papéis de configuração (legado)

| Config (`legacy.report.*`) | Papel | Confiança |
|---|---|---|
| `default_factory` (env `REPORTS_FACTORY`) | Fábrica de renderização | 🟢 |
| `source_path` (env `REPORTS_SOURCE_PATH`) | Caminho dos templates e dos JSON temporários | 🟢 |
| `remote_factory.url/token` | Render server remoto | 🟢 |
| `logo_file_name` (env `REPORTS_LOGO`) | Logo dos relatórios (nome ou URL) | 🟢 |
| `show_error_details` / `debug` | Verbosidade de erros | 🟢 |
| `caminho_fundo_certificado`, `caminho_fundo_carteira_transporte` | Fundos de documentos | 🟢 |
| `lei_estudante`, `lei_conclusao_ensino_medio`, `portaria_aprovacao_pontos` | Textos legais do cabeçalho | 🟢 |
| `modelo_ficha_individual` ('todos'), `mostrar_relatorios` | Alcance da Ficha/visibilidade | 🟢 |
| `diario_classe.dias_temporarios` | Compartilhado com `DiarioClasse` | 🟢 |

---

## 5. Lacunas de contrato

- Templates `.jrxml`/Blade e logos fora do repositório (deployment-only): inventário obrigatório por tenant antes da migração. 🔴
- Nenhuma persistência de vias no legado; qualquer amostra do PDF produzido no cliente não é auditável. 🟡
- O argumento `situacao_matricula = 10` fixo na API não é configurável. 🟢 `ReportController.php:98`
- O hash de file_export é `md5(time())` — colisão teórica por segundo; melhor UUID no alvo. 🟡
