# Reports (i-Educar legado), Questions

> Perguntas abertas acumuladas da unit. Cada pergunta cita evidência e impacta o projeto `SYS-Educa` (SYSGOV). Ao responder, atualize esta lista.

---

## Bloco A: Migração dos dados (08 itens — contadores, exportações e templates)

1. Templates `.jrxml`/Blade vivem fora do repositório (deployment-only): como garantir o inventário por tenant antes da migração (backup de `ieducar/modules/Reports`, lista de templates usados em `reports_counts`)? 🔴 evidência: ausência do pacote + `SUBREPORT_DIR`.
2. A tabela `reports_counts` (agregados por render/template/success/date/authenticated) deve ser migrada como histórico ou descartada em favor de `educa_issued_documents`? 🟢 evidência: `table/2023_04_17_161801_create_report_counts_table.php`.
3. Exportações existentes (ZIP por aluno, status e URL presignada): migrar registros e arquivos do storage, ou iniciá-la em branco no alvo? 🟢 evidência: `file_export`.
4. Fichas no ZIP geradas com erros silenciosos (`@`): auditar o histórico do cliente para detectar vias corruptas geradas na migração? 🟡 evidência: `FileExportService.php:267-274`.
5. Bandeiras de cabeçalho (`logo_file_name`, fundos, leis, portaria, `modelo_boletim_professor`) por instituição explicitamente portadas no novo template engine? 🟢 evidência: `config/legacy.php:152-159`.
6. Logo por URL sem validação: migrar como arquivo no storage do tenant (com extensão/media type validados)? 🟡 evidência: `ReportFactoryPHPJasper.php:55-76`.
7. `situacao_matricula = 10` fixo na API do boletim: virar parâmetro no alvo ou manter conteúdo? 🟢 evidência: `ReportController.php:98`.
8. Modelos de ficha (`modelo_ficha_individual = 'todos'`) e `mostrar_relatorios`: precificação por tipo de documento no alvo. 🟡 evidência: `config/legacy.php`.

## Bloco B: Motor de renderização e vias (06 itens)

9. Motor de render: Blade + Chromium (Browsershot/Gotenberg) como o bastão propõe, ou manter render server por contrato? 🔴 evidência: bastão `:19-21`.
10. PDF/A-1b/2b com metadados XMP: exigir assinatura como PDF/A ou manter simples? 🔴 bastão `:21`.
11. Código de verificação: formato `AUTH-AAAA-XXXX-YYYY` o suficiente ou hash publicado? 🔴 bastão `:385-399`.
12. Snapshot JSON congelado por via: tamanho de payload de queries de boletim/ficha (pode ser grande); storage no banco JSON (InnoDB) ou objeto referenciado? 🔴 bastão `:101`.
13. Marcação de vias EXPIRED: job diário ou cálculo na leitura? 🟡 bastão `:107`.
14. Modificadores (`BaseModifier`) do legado: reinterpretar como mappers de dados no alvo, ou embutir no snapshot? 🟢 evidência: `src/Reports/BaseModifier.php`.

## Bloco C: Vias consolidadas e porte de documentos (06 itens)

15. Porta do boletim do professor com modelos da configuração general: migração de modelos equivalentes no alvo com mapeamento por tenant. 🟡 evidência: `ReportController.php:130-134`.
16. Contagem de conferências públicas (`verification_views_count`): manter? 🟡 bastão `:112`.
17. Ata final: data de congelamento por turma é o mesmo fechamento do ano (units `Calendario`/`Avaliacao`)? 🔴 bastão `:29-30`.
18. Revogação de vias: que papéis podem revogar (direção? secretaria?) e mensagem para quem já imprimiu? 🔴 bastão `:427`.
19. Assinatura: eletrônica simples do emissor já no MVP, ICP-Brasil previsto mas fase 2? 🔴 bastão `:26-27`.
20. O alvo deve cobrir a carteira de transporte (fundos config) como documentos tipados ou manter como relatórios livres? 🟢 evidência: `caminho_fundo_carteira_transporte`.

---

## Respostas já resolvidas no legado (não perguntar)

- Canal de emissão dos boletins: API AJAX em base64 + telas inline. 🟢
- Fontes de dados: database (jasper), JSON com queries próprias, HTML/Blade. 🟢
- Exportação de documentos por aluno: ZIP assíncrono com pastas por aluno, Ficha + arquivos + notificação presignada. 🟢
- Contagem de emissões: agregada por render/template/sucesso/dia/autenticado. 🟢

---

## Registro de perguntas da unit

| Bloco | Itens |
|-------|-------|
| A: Migração | 8 |
| B: Motor e vias | 6 |
| C: Porte de documentos | 6 |
| **Total da unit** | **20** |

> Acumulado do projeto: **347 perguntas em 18 units** (327 anteriores + 20 desta unit).
