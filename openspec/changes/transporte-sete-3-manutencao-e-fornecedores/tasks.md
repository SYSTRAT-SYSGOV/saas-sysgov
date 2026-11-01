# Tarefas — Transporte/SETE 3: manutenção e fornecedores

## 0. Antes de começar
- [ ] 0.1 Responder as perguntas abertas 1 a 3 com o órgão

## 1. Backend
- [ ] 1.1 Migrations `transporte_fornecedores`, `transporte_ordens_servico`, `transporte_manutencoes_previstas`; `km_atual` e `km_atualizado_em` em `transporte_veiculos`
- [ ] 1.2 `FornecedorService` (Pessoa PJ via `ResolucaoPessoaService`, ramos, inativação)
- [ ] 1.3 `OrdemServicoService` (abrir, concluir, cancelar, regras de quilometragem e datas)
- [ ] 1.4 `ManutencaoPrevistaService` (criar, cancelar, converter em ordem) e integração com `AlertaService`
- [ ] 1.5 Aviso de veículo em manutenção na rota; correção de hodômetro com confirmação e auditoria
- [ ] 1.6 Relatórios de gasto e histórico; CSV auditado
- [ ] 1.7 Permissões `transporte.manutencao.ver` e `transporte.manutencao.gerir`; Policies, Controllers, Resources, rotas

## 2. Backend — testes
- [ ] 2.1 Fluxo da ordem (abrir, concluir, cancelar) e atualização do `km_atual`
- [ ] 2.2 `km` menor que o atual; conclusão antes da abertura; ordem concluída não editável
- [ ] 2.3 Previsão por data e por quilometragem; alertas atenção e crítico; conversão em ordem
- [ ] 2.4 Fornecedor com ordem não é excluído; mesma Pessoa em fornecedor e empresa
- [ ] 2.5 Isolamento de tenant e permissões; PHPStan nível 6 e `php artisan test --filter=Transporte`

## 3. Frontend
- [ ] 3.1 Aba **Manutenção** (ordens, previstas) e **Fornecedores**
- [ ] 3.2 Histórico no detalhe do veículo e quilometragem
- [ ] 3.3 Alertas de manutenção nos cartões do painel
- [ ] 3.4 Relatório de gasto com CSV
- [ ] 3.5 Testes vitest; `tsc` limpo

## 4. Fechamento
- [ ] 4.1 `docs/modules/transporte.md`; crédito ao SETE (MIT)
- [ ] 4.2 Atualizar `openspec/specs/transporte/spec.md` e arquivar
