# Tarefas — Transporte/SETE 3: manutenção e fornecedores

## 0. Antes de começar
- [x] 0.1 Perguntas abertas: abastecimento fica fora (pergunta 1); sem anexo de nota fiscal nesta versão (pergunta 2); o alerta por quilometragem depende do hodômetro atualizado (pergunta 3, avisado na tela)

## 1. Backend
- [x] 1.1 Migrations `transporte_fornecedores`, `transporte_ordens_servico`, `transporte_manutencoes_previstas`; `km_atual` e `km_atualizado_em` em `transporte_veiculos`
- [x] 1.2 `FornecedorService` (Pessoa PJ via `ResolucaoPessoaService`, ramos, inativação)
- [x] 1.3 `OrdemServicoService` (abrir, concluir, cancelar, regras de quilometragem e datas)
- [x] 1.4 `ManutencaoPrevistaService` (criar, cancelar, converter em ordem) e integração com `AlertaService`
- [x] 1.5 Aviso de veículo em manutenção na rota (resposta `avisos` ao salvar a rota); correção de hodômetro com confirmação e auditoria
- [x] 1.6 Relatórios de gasto e histórico; CSV auditado
- [x] 1.7 Permissões `transporte.manutencao.ver` e `transporte.manutencao.gerir`; Policies, Controllers, Resources, rotas

## 2. Backend — testes
- [x] 2.1 Fluxo da ordem (abrir, concluir, cancelar) e atualização do `km_atual`
- [x] 2.2 `km` menor que o atual; conclusão antes da abertura; ordem concluída não editável
- [x] 2.3 Previsão por data e por quilometragem; alertas atenção e crítico; conversão em ordem
- [x] 2.4 Fornecedor com ordem não é excluído; mesma Pessoa em fornecedor e empresa
- [x] 2.5 Isolamento de tenant e permissões; PHPStan nível 6 e `php artisan test --filter=Transporte`

## 3. Frontend
- [x] 3.1 Aba **Manutenção** (ordens, previstas) e **Fornecedores**
- [x] 3.2 Quilometragem dos veículos e marca "em manutenção" (aba Manutenção)
- [ ] 3.2b (adiado) Histórico por veículo na tela: já existe na API (`/veiculos/{id}/manutencao` e filtro `veiculo_id` das ordens), mas a tela ainda não o expõe
- [x] 3.3 Alertas de manutenção (por data e por km) na tabela de alertas do Painel
- [x] 3.4 Relatório de gasto com CSV
- [x] 3.5 Testes vitest; `tsc` limpo

## 4. Fechamento
- [x] 4.1 `docs/modules/transporte.md`; crédito ao SETE (MIT)
- [x] 4.2 Atualizar `openspec/specs/transporte/spec.md` e arquivar
