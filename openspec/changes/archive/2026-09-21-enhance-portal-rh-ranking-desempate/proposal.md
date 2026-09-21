# Proposal

## Why

A sub-aba "Classificação Oficial & Desempate Art. 39" (`activeTab === 'ranking-desempate'`) do Portal de RH (`PortalRhView.tsx`) é responsável por calcular e exibir a ordem de classificação funcional e progressão dos servidores públicos com base na Nota Final Consolidada (NFC) e nos critérios estritos de desempate da Lei nº 1.704/2006 (Art. 39: 1º Maior NFC, 2º Maior tempo de serviço público e 3º Maior idade civil).

Atualmente, essa aba apresenta limitações importantes de ergonomia e filtragem:
1. **Ausência de Filtros e Busca Rápida**: Não há busca por nome, matrícula ou CPF, nem filtros por Secretaria, Departamento, Cargo, Faixa de Pontuação da NFC (Excelente, Bom, Regular, PMD) ou Status de Elegibilidade à Progressão.
2. **Ausência de Indicadores Executivos (KPIs)**: A aba não exibe métricas no topo sobre a quantidade total de ranqueados, total de elegíveis à progressão, servidores encaminhados para PMD (NFC < 70,00) e média geral de pontuação.
3. **Barra de Rolagem Lateral (Scroll Horizontal)**: A listagem utiliza uma tabela rígida com `fixedLayout`, forçando uma barra de rolagem horizontal desnecessária em resoluções desktop.
4. **Desconexão com o Organograma Real**: A lotação física utiliza strings isoladas em vez do mapeamento institucional unificado (`classificacaoPorServidor`).

## What Changes

- **Painel de Indicadores Executivos (KPIs)** no topo da aba:
  - **Total de Servidores Ranqueados**: Efetivo avaliado classificado no ciclo.
  - **Aptos à Progressão**: Quantitativo e percentual de servidores elegíveis (NFC $\ge 70,00$).
  - **Plano de Melhoria (PMD)**: Servidores que obtiveram NFC $< 70,00$ e demandam acompanhamento de capacitação.
  - **Média Geral do Ciclo**: Média aritmética consolidada das notas com tipografia técnica `font-mono tabular-nums`.
  - **Casos de Desempate Aplicados**: Total de empates de nota solucionados pelos critérios 2 e 3 do Art. 39.
- **Barra de Ferramentas, Busca e Pílulas Rápidas (*Quick Filters*)**:
  - Busca ágil multifacetada por Nome, Matrícula, CPF, Cargo, Secretaria e Departamento.
  - Pílulas rápidas em 1 clique: *"Todos"*, *"Elegíveis ($\ge 70$ pts)"*, *"Empates Art. 39"*, *"Excelente ($\ge 90$ pts)"* e *"Insuficiente (PMD)"*.
  - Contador dinâmico em tempo real: `Exibindo X de Y servidores no ranking`.
- **Painel Colapsável de Filtros Avançados**:
  - Filtros estruturados por Secretaria (organograma real), Departamento contextual, Cargo Efetivo, Faixa de Conceito e Elegibilidade à Progressão.
- **Redesenho do Grid sem Scroll Horizontal**:
  - Tabela fluida ocupando 100% da largura em desktop ($\ge 1024$px), eliminando `fixedLayout` rígido.
  - Colunas otimizadas: Posição oficial (1º, 2º, 3º...), Servidor Público (Matrícula mono + Nome + CPF), Lotação (Secretaria com badge de sigla + Departamento), 1º NFC Trienal, 2º Tempo de Serviço, 3º Idade Civil, Conceito e Status de Elegibilidade.
  - Exportação atômica em CSV, Excel e PDF com metadados estruturados.

## Capabilities

### New Capabilities

(nenhuma — esta mudança estende a capability `capd` existente)

### Modified Capabilities

- `capd`: expande a sub-aba de Classificação Oficial & Desempate Art. 39 do Portal de RH, incorporando filtros avançados multicritério, KPIs executivos, pílulas rápidas e tabela fluida sem rolagem lateral horizontal.

## Impact

- Frontend: `apps/web-client/src/modules/capd/views/PortalRhView.tsx` e utilitários puros de filtragem e cálculo de ranking/KPIs.
- Testes: ampliação dos testes unitários no Vitest para cobrir os cálculos e filtros do ranking de desempate.
- Backend: nenhum impacto em esquemas de banco de dados ou endpoints — reutiliza os dados já carregados no cliente.
