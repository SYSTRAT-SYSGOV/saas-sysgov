# HistoricoEscolar (i-Educar legado), Questions

> Perguntas abertas acumuladas da unit. Cada pergunta cita evidência e o impacto da resposta no projeto `SYS-Educa` (SYSGOV). Sempre a responder, atualize esta lista.

---

## Bloco A: Migração dos dados (09 itens — dados dos históricos existentes)

1. Nota textual: as notas gravadas como texto livre ("AP", "85,5", "Excepcional") devem ser normalizadas para valor numérico na migração ou mantidas como texto no destino? 🟢 evidência: `nota` varchar(255) em `historico_disciplinas`.
2. Como classificar a origem dos registros se a coluna `origem` gravada é sempre 1 nas duas entradas (vida pregressa e processamento)? Aceitável migrar todos como `manual`? 🔴 evidência: `ProcessamentoApiController.php:620` e `educar_historico_escolar_cad.php:401`.
3. `data_exclusao` estampada em registros ativos (reprocessamento e edição): devemos corrigir o dado (limpar quando `ativo = 1`) ou preservar como histórico? 🟡 evidência: `ProcessamentoApiController.php:581-584`.
4. Disciplinas apagadas fisicamente na exclusão/edição do cabeçalho: a informação perdida nas linhas é irrecuperável — é aceitável que o destino arquive as linhas em vez de excluí-las? 🟡 evidência: `educar_historico_escolar_cad.php:366-380`.
5. A unificação pendente de alunos com históricos duplicados: unificar antes da migração do histórico ou o destino reprocessa duplicidades por (aluno, ano)? 🟢 evidência: `ieducar/lib/App/Unificacao/Aluno.php:24-76`.
6. Faltas globalizadas nulas em regras por componente: manter nulo ou zero no destino? 🟢 evidência: `ProcessamentoApiController.php:538-547`.
7. Percentual de frequência com vírgula decimal: qual esquema de precisão o destino adota (2 casas?) e como converter os textos com vírgula? 🟢 evidência: `ProcessamentoApiController.php:527-536`.
8. Os registros `import` (histórico importado): recebem marcação própria no destino ou se igualam aos demais? 🟡 evidência: coluna `import` na migração.
9. Coluna `historico_escolar_id` (vínculo tardio): migrar com base no vínculo funcional (aluno + sequencial) quando a coluna ainda for nula? 🟢 evidência: migração `2026_03_10_000002_populate_historico_escolar_id.php`.

## Bloco B: Processamento e consolidação (06 itens)

10. O processamento do destino continua "sob demanda, matrícula a matrícula" ou adota o fechamento anual automático do bastão? Requer decisão de produto. 🔴 evidência: sem agendamento no legado.
11. No modo "AP" (nota fixa de aprovado), o destino aceita valores fixos equivalentes por situação ou define a nota do aprovado na regra? 🟢 evidência: `ProcessamentoController.php:165-185`.
12. Média geral: também arredondar pela tabela da regra em vigor no ano do histórico, ou pela vigência atual? 🟢 evidência: `SchoolHistoryService.php:66-88` (usa a regra da matrícula no legado).
13. Média por área: quando ligada, os componentes por área desaparecem do histórico ou ficam duplicados com as linhas de área? 🟡 evidência: opções do processamento.
14. Reprocessamento por lote (turma inteira): aceitável repetir a operação matrícula a matrícula como no legado, ou o destino processa em lote único com relatório de erro? 🟡 evidência: grade do processamento.
15. Escolas com histórico de séries antigas (nomes textuais de série e curso): o destino mapeia por equivalência da estrutura do sistema ou mantém o texto puro? 🟡 evidência: `nm_serie` e `nm_curso` textuais.

## Bloco C: Governança e documentos (05 itens)

16. Restrição de edição: manter o modelo legado (vínculo à escola da última matrícula + níveis) ou o destino adota papéis próprios, mais finos? 🟢 evidência: `educar_historico_escolar_det.php:211-242`.
17. Assentamento notarial (registro, livro, folha): o destino exige validação de alcunha/numeração ou aceita texto livre como no legado? 🟢 evidência: campos textuais.
18. Chancela digital no documento timbrado: qual modalidade (certificação.channels, assinatura do emitente, QR de validação) e com quê o PDF se conecta? 🔴 evidência: bastão, sem código.
19. Posição na matriz impressa (`posicao`): a bandeira institucional de controle de posição permanece por instituição ou vira paramétrico por escola no destino? 🟢 evidência: `ProcessamentoController.php:270-277`.
20. Auditoria: o destino precisa de trilha de alteração de notas do histórico (quem mudou e valor anterior) que o legado não tem? 🟡 evidência: só autor de cadastro/exclusão.

---

## Respostas já resolvidas no legado (não perguntar)

- Códigos de situação e suas abreviações: definidos no enum do sistema. 🟢
- Sequencial por aluno: máximo + 1, sem reordenação. 🟢
- Trigger do histórico de transferência: gravação da solicitação de transferência com a bandeira ligada. 🟢
- Fonte por campo do processamento: opção por formulário, case por caso. 🟢

---

## Registro de perguntas da unit

| Bloco | Itens |
|-------|-------|
| A: Migração | 9 |
| B: Processamento | 6 |
| C: Governança e documentos | 5 |
| **Total da unit** | **20** |

> Acumulado do projeto: **307 perguntas em 16 units** (287 anteriores + 20 desta unit).
