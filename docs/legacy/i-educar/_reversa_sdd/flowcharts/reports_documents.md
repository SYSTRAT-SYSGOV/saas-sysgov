# Fluxo de Emissão e Validação de Documentos e Relatórios Oficiais (Reports & Official Documents)

Este diagrama modela o ciclo de vida da geração de documentos escolares oficiais (Atestados, Boletins, Fichas Individuais, Atas de Resultados Finais), o processo de assinatura digital, a fixação de autenticidade documental pública via QR Code / Hash SHA-256 e a consulta pública por terceiros no submódulo `SYS-Educa` do **SYSGOV**.

```mermaid
flowchart TD
    subgraph SOLICITACAO["1. Solicitação e Parametrização"]
        A[Secretaria / Gestor Escolar] -->|Seleciona Tipo de Documento| B{Tipo de Documento?}
        B -->|Atestado de Matrícula/Frequência| C1[Parâmetros: Aluno, Matrícula, Ano Letivo, Finalidade]
        B -->|Boletim Escolar| C2[Parâmetros: Turma ou Aluno, Etapa/Bimestre, Tipo de Média]
        B -->|Ficha Individual do Aluno| C3[Parâmetros: Aluno, Matrícula, Histórico de Frequência e Notas]
        B -->|Ata Final de Resultados| C4[Parâmetros: Escola, Curso, Série, Turma, Ano Letivo]
    end

    subgraph MOTOR_DADOS["2. Compilação e Snapshot de Dados"]
        C1 & C2 & C3 & C4 --> D[DocumentDataCompilerService]
        D --> E1[(Dados Cadastrais: educa_students & educa_enrollments)]
        D --> E2[(Regras de Avaliação & Notas: educa_report_card_evaluations)]
        D --> E3[(Frequência & Faltas: educa_stage_absence_summaries)]
        D --> E4[(Parâmetros do Tenant & Escola: educa_schools & educa_document_templates)]
        E1 & E2 & E3 & E4 --> F[Compilação do Payload JSON Estruturado]
    end

    subgraph SEGURANCA_AUTENTICIDADE["3. Registro de Autenticidade & Hash"]
        F --> G[DocumentSecurityEngine]
        G --> H[Geração de Código Verificador Único\nex: AUTH-2026-XXXX-YYYY]
        G --> I[Cálculo de Hash SHA-256 dos Dados + Metadados]
        G --> J[Geração de URL e QR Code de Validação Pública\nex: https://tenant.sysgov.br/valida-documento?codigo=...]
        H & I & J --> K[(Persistência em educa_issued_documents\nStatus: ACTIVE)]
    end

    subgraph RENDERIZACAO["4. Renderização do Documento"]
        K --> L[Motor de Renderização Blade / Headless Chromium]
        L --> M[Injeção de Template Oficial: Cabeçalho, Brasão, Corpo, QR Code, Rodapé]
        M --> N{Saída Solicitada?}
        N -->|PDF Arquivístico PDF/A| O1[Compilação PDF/A com Metadados XMP]
        N -->|Impressão Direta / Web| O2[HTML Responsivo com CSS Paged Media @page]
        O1 --> P[Armazenamento em Object Storage S3/MinIO criptografado]
    end

    subgraph ASSINATURA["5. Assinatura Eletrônica / Digital"]
        P --> Q{Requer Assinatura Digital?}
        Q -->|Sim| R[Assinatura Eletrônica Avançada / ICP-Brasil]
        R --> S[(Registro em educa_document_signatures)]
        S --> T[Documento Disponibilizado para Download / Impressão]
        Q -->|Não| T
    end

    subgraph VALIDACAO_PUBLICA["6. Validação Externa de Autenticidade"]
        U[Empresa / Órgão Público / Cidadão] -->|Escaneia QR Code ou Digita Código| V[Portal Público de Autenticidade /valida-documento]
        V --> W[DocumentPublicVerificationController]
        W --> X[(Consulta educa_issued_documents)]
        X --> Y{Documento Válido & Ativo?}
        Y -->|Sim| Z1[Exibe Dados Oficiais Resumidos + Status VÁLIDO + Botão de Download da Via Original]
        Y -->|Revogado / Anulado| Z2[Exibe Alerta Vermelho: DOCUMENTO REVOGADO com Motivo e Data]
        Y -->|Não Encontrado| Z3[Exibe Alerta Vermelho: CÓDIGO INVÁLIDO OU INEXISTENTE]
    end
```

## Destaques da Arquitetura SYSGOV vs Legado

1. **Eliminação do Servidor Java JasperReports**:
   - O legado dependia de arquivos `.jrxml` e chamadas HTTP síncronas a um daemon Java instável (`ReportFactoryPHPJasper` ou serviço remoto).
   - O **SYSGOV** utiliza templates Blade modernos com CSS Paged Media (`@page`) e renderização determinística via Chromium Headless (Gotenberg / Browsershot), permitindo tanto geração de PDF/A de altíssima fidelidade quanto impressão instantânea via navegador.
2. **Rastreabilidade e Autenticidade Pública (Inovação)**:
   - No legado, a impressão de documentos gerava PDFs voláteis sem persistência de via ou verificação pública.
   - O **SYSGOV** grava cada emissão na tabela `educa_issued_documents` com hash SHA-256 e código alfanumérico único. Um QR Code impresso no documento permite que qualquer terceiro (cartórios, consulados, empresas, outras secretarias) confirme a validade do documento em tempo real sem intermediários.
3. **Assinatura Eletrônica Integrada**:
   - Suporte nativo a assinaturas eletrônicas (`educa_document_signatures`) por diretores e secretários escolares, atendendo aos requisitos da Lei Federal nº 14.063/2020 e carimbo de tempo.
