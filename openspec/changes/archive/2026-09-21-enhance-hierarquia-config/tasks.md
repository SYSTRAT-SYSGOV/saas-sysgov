# Tasks: Modernização da Aba de Configuração de Hierarquia

## 1. Funções Puras e Testes Unitários do Simulador e Integridade

- [x] 1.1 Criar o módulo utilitário `apps/web-client/src/modules/capd/HierarquiaConfigPanel.simulador.ts` contendo as interfaces `KpisHierarquia`, `IntegridadeHierarquia`, `PassoCadeiaSimulada` e `CenarioSimulacao`.
- [x] 1.2 Implementar a função pura `calcularKpisHierarquia` para consolidar total de níveis, regra predominante e identificação do nível topo.
- [x] 1.3 Implementar a função pura `validarIntegridadeHierarquia` para diagnosticar ausência de topo, múltiplos topos ou lacunas na sequência numérica de níveis.
- [x] 1.4 Implementar a função pura `simularCadeiaAvaliacao` projetando o fluxo de ascendência e a resolução em cenários de chefia ativa vs chefia afastada.
- [x] 1.5 Criar a suíte de testes unitários `apps/web-client/src/modules/capd/__tests__/HierarquiaConfigPanel.simulador.test.ts` e validar execução com `npx vitest run apps/web-client/src/modules/capd/__tests__/HierarquiaConfigPanel.simulador.test.ts`.

## 2. Refatoração da Gestão de Níveis com DataTable e Diálogo Seguro

- [x] 2.1 Refatorar a listagem de níveis em `HierarquiaConfigPanel.tsx` adotando o componente `DataTable` com busca rápida e ordenação natural por nível ascendente.
- [x] 2.2 Substituir a chamada insegura nativa a `window.confirm()` pelo componente oficial `ConfirmDialog` de `@/components/ui/ConfirmDialog`.
- [x] 2.3 Aplicar tipografia técnica JetBrains Mono (`font-mono tabular-nums`) na exibição de níveis e identificadores.
- [x] 2.4 Implementar o seletor de visualização (Segmented Control: "Tabela de Níveis", "Pirâmide Institucional" e "Simulador de Avaliação").

## 3. Painel de KPIs e Pirâmide Institucional (Visualização em Árvore)

- [x] 3.1 Construir a barra executiva de 4 StatCards no topo do painel (`StatCard` com `caption` e `accentClassName`).
- [x] 3.2 Construir o componente visual da Pirâmide Institucional, conectando graficamente os níveis hierárquicos cadastrados da base ao ápice.
- [x] 3.3 Adicionar badge de status de integridade (Cadeia Homologada vs Alerta de Inconsistência) no topo da visualização em árvore.

## 4. Simulador Interativo e Validação Final

- [x] 4.1 Implementar a interface do Simulador Interativo ("Quem avalia quem?"), permitindo selecionar o escalão base e acionar a chave de afastamento/licença da chefia imediata.
- [x] 4.2 Renderizar a linha do tempo explicativa demonstrando a aplicação regimental da substituição ("Superior Hierárquico" subindo o nível vs "Substituto Legal").
- [x] 4.3 Executar a verificação de tipagem TypeScript com `npm run typecheck --workspace=@sysgov/web-client` garantindo zero erros de compilação.
- [x] 4.4 Executar a suíte de testes unitários completa do workspace com `npm test --workspace=@sysgov/web-client` e verificar 100% de testes verdes.
