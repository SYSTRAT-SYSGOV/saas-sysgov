# Proposal

## Why

O módulo controla a **regularidade** do veículo (vistoria, licença, documentos do motorista), mas não a **manutenção**: não há registro do que foi consertado, por quem, quanto custou e o que está previsto. O SETE (UFG/CECATE, MIT) tem fornecedores por ramo (mecânica, combustível, seguro), ordens de serviço por veículo e previsão de manutenção, além da quilometragem. Isso fecha o ciclo de gestão da frota e alimenta o custo real da rota.

## What Changes

- **Fornecedores** de manutenção, combustível e seguro, cadastrados sobre o cadastro único de **Pessoas** (pessoa jurídica), com ramo(s), contato e situação.
- **Ordens de serviço** por veículo: fornecedor, tipo de serviço, abertura, conclusão, quilometragem, valor e descrição; situação aberta, concluída ou cancelada.
- **Manutenção prevista** por veículo (por data e/ou quilometragem), que vira **alerta** no painel quando se aproxima ou vence, e pode ser **convertida em ordem de serviço**.
- **Quilometragem do veículo** (atual e histórico pelas ordens de serviço).
- **Histórico de manutenção** do veículo e **gasto por veículo/fornecedor** em relatório.
- **Veículo em manutenção**: a ordem aberta marca o veículo como indisponível para novas rotas (aviso, não bloqueio das rotas já gravadas, como nas fases anteriores).
- **Auditoria** de ordens e previsões.

## Capabilities

### Modified Capabilities

- `transporte`: acrescenta fornecedores, ordens de serviço, manutenção prevista e quilometragem.

## Impact

- **Backend**: `FornecedorService`, `OrdemServicoService`, `ManutencaoPrevistaService`; integra com `AlertaService` e `VeiculoService`; tabelas `transporte_fornecedores`, `transporte_ordens_servico`, `transporte_manutencoes_previstas`; colunas `km_atual` e `km_atualizado_em` em `transporte_veiculos`.
- **Pessoas**: reaproveita `ResolucaoPessoaService` para o CNPJ; não duplica cadastro.
- **Permissões**: `transporte.manutencao.ver` e `transporte.manutencao.gerir`.
- **Sem dado pessoal de aluno** nesta mudança.
