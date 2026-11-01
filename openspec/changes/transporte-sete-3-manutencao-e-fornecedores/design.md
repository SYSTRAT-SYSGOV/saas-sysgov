# Design — Transporte/SETE 3: manutenção e fornecedores

## Decisões

### D-M1. Fornecedor não é empresa de transporte
`transporte_empresas` representa quem presta o **transporte** (contrato, vigência). O fornecedor presta **serviço à frota**. Tabelas separadas, ambas apontando para `pessoas` (PJ). Uma mesma pessoa pode ser os dois; o vínculo é pela Pessoa, sem acoplamento entre as tabelas.

### D-M2. Fornecedor
`transporte_fornecedores`: `tenant_id`, `pessoa_id` (restrictOnDelete), `ramos` (JSON: `mecanica`, `combustivel`, `seguro`, `pecas`, `outros`), `contato`, `ativo`, `observacoes`; único por `tenant_id` + `pessoa_id`; soft delete. Fornecedor com ordem de serviço **não é excluído**, só inativado.

### D-M3. Ordem de serviço
`transporte_ordens_servico`: `tenant_id`, `veiculo_id`, `fornecedor_id` (nulo para serviço interno), `tipo` (`preventiva|corretiva|revisao|pneus|combustivel|seguro|outro`), `descricao`, `aberta_em`, `concluida_em`, `km`, `valor`, `status` (`aberta|concluida|cancelada`), `criada_por`.
- Concluir exige `concluida_em` ≥ `aberta_em` e `km` ≥ quilometragem anterior do veículo (senão 422 com o valor atual).
- Ao concluir com `km` maior, o `km_atual` do veículo é atualizado.
- Ordem **aberta** deixa o veículo "em manutenção": novas rotas com ele recebem aviso; rotas já gravadas não mudam (mesmo critério da regularidade).
- Concluída ou cancelada não é editada, só corrigida por nova ordem (a auditoria guarda o histórico).

### D-M4. Manutenção prevista
`transporte_manutencoes_previstas`: `tenant_id`, `veiculo_id`, `descricao`, `data_prevista` (nula), `km_previsto` (nulo), `status` (`pendente|convertida|cancelada`), `ordem_servico_id` (nulo). Exige data **ou** quilometragem. Gera alerta de **atenção** a 30 dias (ou a 500 km) do limite e **crítico** vencido, na mesma `AlertaService` das vistorias. Converter cria a ordem com os dados da previsão.

### D-M5. Quilometragem
`km_atual` e `km_atualizado_em` no veículo. Editável manualmente (com auditoria) e atualizada pelas ordens. Nunca diminui sem confirmação explícita ("correção de hodômetro"), registrada na auditoria.

### D-M6. Relatórios
Gasto por veículo, fornecedor e tipo, no ano; histórico por veículo. Exportação CSV com neutralização de fórmula e auditada. O gasto real alimenta, **opcionalmente**, o comparativo da mudança de custos (SETE 2), sem depender dela.

### D-M7. Fora de escopo
Garagem georreferenciada, abastecimento por bomba e integração com sistema de frota de terceiros.

## Riscos e perguntas abertas

1. O órgão controla **abastecimento** à parte? (afeta o rendimento km/l do custo)
2. Ordem de serviço precisa de **anexo** (nota fiscal)? Se sim, usar o armazenamento já existente e tratar tamanho/tipo.
3. A previsão por quilometragem depende de o hodômetro ser atualizado; sem rotina de atualização, só a previsão por data funciona bem.
