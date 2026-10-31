# Tarefas — Transporte/SETE 1: importação do Censo com leiaute configurável

## 0. Antes de começar
- [ ] 0.1 Conseguir **um arquivo real (ou anonimizado) do Educacenso** e conferir as posições do D-I9 com o Teste do leiaute; ajustar o leiaute base
- [ ] 0.2 Confirmar com o órgão: criar escolas/turmas/alunos ausentes? (pergunta aberta 4) e limite de tamanho do arquivo
- [ ] 0.3 Decidir o worker de fila (pergunta aberta 3)

## 1. Backend — leiaute
- [ ] 1.1 Migrations `transporte_censo_leiautes`, `transporte_censo_extras` e `leiaute_id` em `transporte_importacoes`; models com `TenantAware`
- [ ] 1.2 `LeiauteImportacao` (interface), `Educacenso2023` (fábrica, em dados) e catálogo de destinos
- [ ] 1.3 `LeiauteImportacaoService`: lista mesclada, salvar, desativar/restaurar nativo, criar/remover personalizado, duplicar para novo ano, definir padrão; validação (posição única por registro, campo travado, tipo × destino) e auditoria
- [ ] 1.4 Permissões `transporte.censo.importar` e `transporte.censo.leiaute` no `TransporteRbacSeeder` e nos papéis

## 2. Backend — importação
- [ ] 2.1 Leitor em fluxo com decodificação, limites e contagem de registros ignorados
- [ ] 2.2 `TesteLeiauteService` com máscara de campos sensíveis
- [ ] 2.3 `ImportacaoCensoService`: primeira passada, conciliação (D-I6), pré-visualização em transação desfeita, confirmação, relatório sem dado pessoal
- [ ] 2.4 Campos `extra` gravados em `transporte_censo_extras`; sensíveis fora de listagem e auditoria
- [ ] 2.5 Controllers, Policies, Resources e rotas (`leiautes`, `leiautes/{id}/campos`, `censo/importacoes/testar`, `previsualizar`, `confirmar`)
- [ ] 2.6 Auditoria de importação e de alteração de leiaute

## 3. Backend — testes
- [ ] 3.1 Arquivo sintético no leiaute 2023 (dados fictícios): escola, turma, pessoas, matrículas com e sem transporte
- [ ] 3.2 Leiaute: nativo desativado, posição trocada, personalizado criado/removido, campo travado, posição duplicada, tipo incompatível, duplicar leiaute
- [ ] 3.3 Conciliação: por Inep, por CPF, aluno novo, divergência, não sobrescreve com vazio
- [ ] 3.4 Isolamento de tenant, permissões, arquivo hostil (colunas demais, campo gigante, codificação inválida)
- [ ] 3.5 LGPD: relatório e auditoria sem CPF, nome ou filiação; observação de necessidade especial nunca lida
- [ ] 3.6 PHPStan nível 6 e `php artisan test --filter=Transporte`

## 4. Frontend (`apps/web-client/src/modules/transporte`)
- [ ] 4.1 Aba **Censo** → sub-aba **Importar**: envio, escolha do leiaute, pré-visualização (novos, divergências, ignorados) e confirmação
- [ ] 4.2 Tela **Leiaute de importação**: campos por registro, posição editável, ativar/desativar, adicionar campo, restaurar padrão, duplicar para o ano
- [ ] 4.3 **Testar leiaute** com a amostra por registro e os alertas
- [ ] 4.4 Testes vitest; `tsc` limpo

## 5. Fechamento
- [ ] 5.1 `docs/modules/transporte.md`: fluxo, edição do leiaute e crédito ao SETE (MIT)
- [ ] 5.2 Atualizar `openspec/specs/transporte/spec.md` e arquivar
