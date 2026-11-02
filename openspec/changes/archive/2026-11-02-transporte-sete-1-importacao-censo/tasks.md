# Tarefas — Transporte/SETE 1: importação do Censo com leiaute configurável

## 0. Antes de começar
- [x] 0.1 (dispensado) O órgão **não tem arquivo real**; segue-se com o leiaute 2023 do SETE e arquivo sintético. O Teste do leiaute cobre a conferência futura
- [x] 0.2 Decidido pelo usuário: escola e aluno precisam estar cadastrados; a importação não cria cadastro
- [ ] 0.3 (pendente) Decidir o worker de fila (pergunta aberta 3): hoje a confirmação roda na requisição

## 1. Backend — leiaute
- [x] 1.1 Migrations `transporte_censo_leiautes`, `transporte_censo_extras` e `leiaute_id` em `transporte_importacoes`; models com `TenantAware`
- [x] 1.2 `CampoImportacao`, `Educacenso2023` (fábrica, em dados) e catálogo de destinos (`Destinos`)
- [x] 1.3 `LeiauteImportacaoService`: lista mesclada, salvar, desativar/restaurar nativo, criar/remover personalizado, duplicar para novo ano, definir padrão; validação (posição única por registro, campo travado, chave, registro e tipo do personalizado) e auditoria
- [x] 1.4 Permissões `transporte.censo.importar` e `transporte.censo.leiaute` no `TransporteRbacSeeder` e nos papéis

## 2. Backend — importação
- [x] 2.1 `LeitorEducacenso`: leitura em fluxo com decodificação e limites (linhas, bytes, colunas, campo)
- [x] 2.2 Teste do leiaute (`ImportacaoCensoService::testar`) com máscara de campos sensíveis (`ConversorCampo`)
- [x] 2.3 `ImportacaoCensoService`: duas passadas, conciliação sem criar cadastro (D-I6), pré-visualização em transação desfeita, confirmação com `casar_por_nome`, relatório sem dado pessoal
- [x] 2.4 Campos `extra` gravados em `transporte_censo_extras`; sensíveis fora de listagem e auditoria
- [x] 2.5 Controllers, Policy e rotas (`censo/importacao/leiautes`, `censo/importacao/testar`, `censo/importacao/previa`; confirmar, consultar e cancelar pelas rotas `importacoes/{id}`)
- [x] 2.6 Auditoria de importação e de alteração de leiaute

## 3. Backend — testes
- [x] 3.1 Arquivo sintético no leiaute 2023 (dados fictícios): escola, turma, pessoas, matrículas com e sem transporte
- [x] 3.2 Leiaute: nativo desativado, posição trocada, personalizado criado/removido, campo travado, posição duplicada, tipo incompatível, duplicar leiaute
- [x] 3.3 Conciliação: por Inep, por CPF, por nome e nascimento, ambíguo, não cadastrado, escola não cadastrada, divergências, nada é criado
- [x] 3.4 Isolamento de tenant, permissões, arquivo hostil (binário, sem registro conhecido, colunas demais, campo e linha gigantes, UTF-8 inválido)
- [x] 3.5 LGPD: relatório e auditoria sem CPF, nome ou filiação; observação de necessidade especial nunca lida
- [x] 3.6 PHPStan nível 6 e `php artisan test --filter=Transporte`

## 4. Frontend (`apps/web-client/src/modules/transporte`)
- [x] 4.1 Aba **Censo** → sub-aba **Importar**: envio, escolha do leiaute, pré-visualização (reconhecidos, pendências, divergências) e confirmação
- [x] 4.2 Tela **Leiaute de importação**: campos por registro, posição editável, ativar/desativar, adicionar campo, restaurar padrão, duplicar para o ano
- [x] 4.3 **Testar leiaute** com a amostra por registro e os alertas
- [x] 4.4 Testes vitest; `tsc` limpo

## 5. Fechamento
- [x] 5.1 `docs/modules/transporte.md`: fluxo, edição do leiaute e crédito ao SETE (MIT)
- [x] 5.2 Atualizar `openspec/specs/transporte/spec.md` e arquivar
