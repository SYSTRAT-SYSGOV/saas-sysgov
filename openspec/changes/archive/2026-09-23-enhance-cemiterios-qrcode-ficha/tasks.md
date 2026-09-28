# Tasks: Identificação Física com QR Code e Ficha Cadastral de Unidades de Sepultamento

## 1. Dependências e Utilitário de Geração de QR Code

- [x] 1.1 Instalar dependências `qrcode` e `@types/qrcode` em `apps/web-client` e verificar que a resolução de módulos TypeScript compila sem erros.
- [x] 1.2 Criar o utilitário `qrcode.ts` com funções puras para geração de SVG/DataURL e composição de URL canônica de consulta da unidade, verificando via teste unitário que os links e matrizes são gerados com sucesso.

## 2. Componente de Plaqueta de Identificação com QR Code

- [x] 2.1 Criar o componente `ModalQrCodeJazigo.tsx` utilizando componentes `@sysgov/ui`, exibindo moldura técnica de plaqueta patrimonial, código em JetBrains Mono (`tabular-nums font-mono`), nome da necrópole, setor, tipo de unidade, QR Code nítido e botão de impressão rápida.
- [x] 2.2 Implementar folha de estilo de impressão `@media print` específica para a plaqueta (dimensões calibradas para etiqueta/plaqueta sem cabeçalhos indesejados da página) e validar a visualização.

## 3. Emissão da Ficha Cadastral Oficial da Unidade de Sepultamento (A4)

- [x] 3.1 Criar o componente `ModalFichaCadastral.tsx` com estrutura de documento oficial A4 para fé pública, contendo cabeçalho municipal, dados físicos e georreferenciamento, seção de concessão ativa com vigência, tabela de ocupantes inumados e selo de autenticidade documental com QR Code.
- [x] 3.2 Ajustar regras de estilo `@media print` para garantir ajuste perfeito em folha A4 e ausência de elementos da interface do sistema durante a impressão.

## 4. Integração na DataTable e no Drawer de Detalhes

- [x] 4.1 Adicionar os botões de ação "Plaqueta QR Code" e "Ficha Cadastral" no cabeçalho/ações do Drawer `DetalheJazigo` e atalho de emissão rápida na `DataTable` de `InventarioView.tsx`.
- [x] 4.2 Testar a navegação e abertura dos modais a partir do clique nas linhas da tabela e nos botões do Drawer.

## 5. Verificação, Testes Automatizados e Conformidade

- [x] 5.1 Criar suíte de testes unitários com Vitest para os novos componentes (`ModalQrCodeJazigo.test.tsx` e `ModalFichaCadastral.test.tsx`).
- [x] 5.2 Executar `npm test --workspace apps/web-client` e validar que 100% dos testes passam sem regressões.
