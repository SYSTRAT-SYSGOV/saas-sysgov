# Reports (i-Educar legado), Tasks

> Plano de tarefas derivado de requirements.md e design.md. Cada tarefa cita evidência no legado.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Tarefas

| ID | Tarefa | Entregável | Dependências | Evidência | Confiança |
|----|--------|-----------|--------------|-----------|-----------|
| T-01 | Criar tabela de modelos de documentos (layout de cabeçalho/rodapé em JSON, corpo Blade, papel/orientação, validade, padrão). | Migração + modelo | — | Bastão `:35-75`; sem paridade legada | 🔴 |
| T-02 | Criar tabela de vias emitidas: código de verificação, hash SHA-256, snapshot JSON, caminho do PDF, autor, finalidade, validade, status ACTIVE/EXPIRED/REVOKED e motivo de revogação. | Migração + modelo | T-01 | Bastão `:79-137`; legado não persiste | 🔴 |
| T-03 | Criar tabela de assinaturas eletrônicas/ICP-Brasil (papel, CPF, hash, carimbo de tempo, IP). | Migração + modelo | T-02 | Bastão `:141-168`; sem paridade | 🔴 |
| T-04 | Criar tabela de resultados finais consolidados por turma/aluno (JSON de disciplinas, faltas, participação, situação, trava de homologação). | Migração + modelo | — | Bastão `:172-220`; sem paridade | 🔴 |
| T-05 | Implementar serviço de emissão (template ativo por tenant/escola, compilação do snapshot, código único, hash, QR, validade, render PDF/A, armazenamento S3, persistência da via). | Serviço | T-01, T-02 | Bastão `:240-365` | 🔴 |
| T-06 | Implementar serviço de segurança documental: código `AUTH-AAAA-XXXX-YYYY` único por tenant e QR em Data URI. | Serviço | T-05 | Bastão `:368-415` | 🔴 |
| T-07 | Implementar portal público de validação por código (sem autenticação) com espelho dos dados e contagem de conferências. | API pública | T-02 | Bastão `:429`, `:475-488` | 🔴 |
| T-08 | Implementar revogação de vias com motivo e autor. | API | T-02 | Bastão `:427` | 🔴 |
| T-09 | Implementar consolidação de fechamento da turma para alimentar a Ata (congela dados e trava). | Serviço | T-04 | Bastão `:428`, `:706-709` | 🔴 |
| T-10 | Portar o boletim do aluno como documento modelado com vias autenticadas (dados da matrícula já derivados do legado). | Documento + integração | T-05 | `ReportController.php:68-111` | 🟢 dados / 🔴 vias |
| T-11 | Portar o boletim do professor com modelos por instituição (`modelo_boletim_professor`) e opção de paisagem. | Documento + integração | T-05, `Configuracao` | `ReportController.php:113-153` | 🟢 dados / 🔴 vias |
| T-12 | Portar a Ficha do Aluno (incl. termo de declaração configurável) alinhando com a exportação em lote. | Documento | T-05 | `FileExportService.php:245-279` | 🟢 |
| T-13 | Portar a exportação ZIP de documentos por aluno (pastas por aluno, documentos/laudos/foto, presigned URL, notificação) para o novo registry de vias. | Serviço | T-02, T-12 | `FileExportService.php:96-407` | 🟢 |
| T-14 | Portar o contador de emissões para a nova tabela de vias (mantendo agregados por template para relatórios internos). | Migração | T-02 | `ReportsCount.php` + migração `reports_counts` | 🟡 |
| T-15 | Mapear todos os relatórios do pacote de templates (`.jrxml`/Blade `reports::`) e sua lista de args, por tenant, antes de descartar o Jasper. | Inventário | — | Ausência do pacote no snapshot; `SUBREPORT_DIR` em `ReportController.php`, `FileExportService.php:263` | 🔴 |
| T-16 | Substituir argumentos por nome (args PHP) por templates com placeholder estruturado no novo motor. | Arquitetura | T-05 | `ReportCore.php:56-63` | 🟡 |
| T-17 | Consolidar bandeiras de cabeçalho por tenant: logo, fundos (certificado, carteira de transporte), leis, portaria, modelos de ficha. | Migração | T-01 | `config/legacy.php:152-159` | 🟢 |
| T-18 | Eliminar dependência do Java/JasperPHP e do download de logo por URL sem validação. | Remoção | T-05 | `ReportFactoryPHPJasper.php:55-76`, `:100-151` | 🟢 |
| T-19 | Garantir observabilidade: log de erros com `legacy.report.debug` é insuficiente; adicionar métricas de tempo e falha por template. | Observabilidade | T-05 | `ReportsRenderServerFactory.php:54-63` | 🟡 |

---

## Ordem sugerida

1. **Fundação (T-01 a T-04):** modelos de dados do novo subsistema.
2. **Emissão (T-05, T-06, T-09):** serviço de vias, código/QR, ata.
3. **Documentos principais (T-10 a T-13):** boletins, ficha, exportação em lote.
4. **Porte e encerramento (T-14 a T-18):** contadores, inventário de templates, remoção do Java.
5. **Acompanhamento (T-07, T-08, T-19):** portal público e revogação, observabilidade.

---

## Panorama de riscos de execução

- T-15 é bloqueador: sem inventário dos templates por tenant, a migração perde documentos que o cliente usa. 🔴
- T-05..T-09 dependem de infraestrutura nova (PDF/A, S3, QR, carimbo de tempo) — Iniciar com prova de conceito antes do backlog. 🔴
- T-09 inicia o acerto com o fechamento do ano (units `Calendario` e `Avaliacao`) — vale revisão cruzada. 🟡
- T-14 manter os agregados do legado permite comparação de volume de emissões após a migração. 🟡
