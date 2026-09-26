# Tasks: Navegação Cruzada com o Mapa GIS

## 1. Contexto de Navegação do Módulo

- [x] 1.1 Criar `src/modules/cemiterios/CemiteriosContext.tsx` com o provedor `CemiteriosNavigationProvider` e o hook `useCemiteriosNavigation()`.
- [x] 1.2 Integrar o provedor no shell `CemiteriosModule.tsx` para gerenciar a aba ativa e o foco cartográfico compartilhado.

## 2. Componente de Georreferenciamento no Drawer

- [x] 2.1 Criar `src/modules/cemiterios/views/LocalizacaoGeorreferenciada.tsx` exibindo status cartográfico (Georreferenciado vs Pendente), coordenadas decimais em JetBrains Mono (`font-mono tabular-nums`) e botões de atalho.
- [x] 2.2 Integrar `LocalizacaoGeorreferenciada` no Drawer de detalhes `DetalheJazigo`.

## 3. Ação "Ver no Mapa" e Foco no Mapa GIS

- [x] 3.1 Adicionar botão com ícone `MapPin` e ação "Ver no Mapa" na coluna de ações da tabela em `InventarioView.tsx`.
- [x] 3.2 Atualizar `MapaView.tsx` para receber `focoMapa`, calcular envelope e voar (`flyToBounds`) até o jazigo selecionado.

## 4. Testes Automatizados e Validação

- [x] 4.1 Desenvolver testes unitários para `LocalizacaoGeorreferenciada.tsx` e para o contexto de navegação.
- [x] 4.2 Executar a suíte completa de testes (`npm test --workspace apps/web-client`) e verificar 100% de testes verdes.

