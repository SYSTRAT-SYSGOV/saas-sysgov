# Tasks: Galeria de Vistorias e Laudos Fotográficos no Drawer do Jazigo

## 1. Componentes de Visualização de Vistorias e Galeria de Fotos

- [x] 1.1 Criar o componente `SecaoVistoriasJazigo.tsx` exibindo lista de vistorias com datas em JetBrains Mono (`font-mono tabular-nums`), classificação de estado de conservação, risco estrutural e galeria de miniaturas de fotos.
- [x] 1.2 Criar o componente `ModalFotoVistoria.tsx` (lightbox/zoom) para ampliação em alta resolução da fotografia de vistoria com carimbo de data e hora.

## 2. Componente de Registro Ágil de Nova Vistoria

- [x] 2.1 Criar o componente `ModalNovaVistoriaJazigo.tsx` com formulário técnico completo (data, estado de conservação, risco, observações e anexação de arquivos de imagem).
- [x] 2.2 Integrar a submissão via `cemiteriosApi.registrarVistoria` e garantir recarga reativa do histórico e da lista de vistorias após a gravação.

## 3. Integração no Drawer e Testes Automatizados

- [x] 3.1 Integrar `SecaoVistoriasJazigo` e o acionador de `ModalNovaVistoriaJazigo` no Drawer `DetalheJazigo` em `InventarioView.tsx`.
- [x] 3.2 Desenvolver suíte de testes unitários com Vitest para os novos componentes (`SecaoVistoriasJazigo.test.tsx` e `ModalNovaVistoriaJazigo.test.tsx`).
- [x] 3.3 Executar `npm test --workspace apps/web-client` e verificar 100% de testes verdes.

