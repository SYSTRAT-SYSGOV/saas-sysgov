# Proposal

## Why

As secretarias lavram atas de reunião em papel ou num sistema PHP isolado (referência: veiga.pro.br/ata), sem integração com o organograma, o Cadastro de Pessoas, o controle de acessos e a auditoria do SYSGOV. Esse sistema também não impede a alteração do texto depois de salvo, e o PDF é gerado só no navegador, sem uma cópia oficial guardada no servidor.

O módulo **Ata** leva esse fluxo para a plataforma: redação (escrita, voz e Assistente IA), assinaturas desenhadas, ata sigilosa, papel timbrado por secretaria, PDF oficial com QR Code de validação e trilha de auditoria. Ele adota o padrão de ata da casa: rascunho trava o texto, quem assinou sai da seleção, preview do PDF, impressão e finalização com PDF salvo.

## What Changes

- **Novo módulo Laravel `Ata`** em `apps/api/Modules/Ata`: tipos de ata, configuração por secretaria (timbrado e sigla sobre `org_units`), atas, participantes/assinaturas, geração de PDF (dompdf), validação pública e Assistente IA (Gemini, chave em `.env`).
- **Frontend** em `apps/web-client/src/modules/ata` com `@sysgov/ui`: lista/painel, nova ata, editor (formatação, digitação por voz, Assistente IA), assinatura desenhada, preview, imprimir e finalizar.
- **Página pública de validação** (`/ata/validar/{codigo}`), sem login.
- **Permissões RBAC** (`ata.view`, `ata.create`, `ata.sign`, `ata.finalize`, `ata.manage`, `ata.audit`) e item de menu.

## Capabilities

### New Capabilities

- `ata/atas`: criação, ciclo de vida (`em_redacao` → `rascunho` → `finalizada`), numeração sequencial por secretaria/ano e travamento do texto.
- `ata/redacao`: editor rico, digitação por voz e Assistente IA, com 5 modos de geração.
- `ata/assinaturas`: participantes vindos do Cadastro de Pessoas ou com nome avulso, assinatura desenhada; quem já assinou sai da seleção.
- `ata/documento`: preview do PDF com marca de rascunho, impressão, finalização com PDF guardado, código e QR de validação, página pública de validação.
- `ata/sigilo-e-acesso`: ata sigilosa e escopo por secretaria.
- `ata/cadastros`: tipos de ata e configuração da secretaria (sigla e papel timbrado).
- `ata/auditoria`: registro de todas as ações no `AuditLog` do núcleo e tela de consulta.

## Impact

- **Backend**: novo módulo com migrations, models, services, policies, controllers, rotas e testes. Ele depende de `OrgChart` (org_units) e de `Pessoas`.
- **Frontend**: novo módulo no web-client, com registro gerado e entrada no menu.
- **Configuração**: `GEMINI_API_KEY`/`ATA_IA_MODELO` no `.env` (opcionais; sem chave, o Assistente IA fica desativado com aviso).
- **Segurança**: nenhum segredo no repositório (repo público). Os áudios não ficam guardados. O PDF finalizado é imutável.
