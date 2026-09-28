-- =====================================================================
-- SCRIPT DE CRIAÇÃO DE TABELAS E IMPORTAÇÃO - POSTGRESQL
-- Sistema de Gestão de Cemitérios - Dados migrados de Clipper/DBF
-- =====================================================================

-- 1. CRIAR BANCO E EXTENSÕES
-- =====================================================================
-- CREATE DATABASE cemiterios_migracao ENCODING 'UTF8' LC_COLLATE 'pt_BR.UTF-8' LC_CTYPE 'pt_BR.UTF-8';
-- \c cemiterios_migracao;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELAS DE REFERÊNCIA (DIMENSÕES)
-- =====================================================================

-- Cemitérios
CREATE TABLE cemiterio (
    id SMALLINT PRIMARY KEY,
    codigo_legado CHAR(2) NOT NULL UNIQUE,  -- '01', '02'
    nome VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE
);

INSERT INTO cemiterio (id, codigo_legado, nome) VALUES
(1, '01', 'Cemitério Central'),
(2, '02', 'Cemitério Independência / Boqueirão');

-- Quadras
CREATE TABLE quadra (
    id SERIAL PRIMARY KEY,
    cemiterio_id SMALLINT NOT NULL REFERENCES cemiterio(id),
    codigo VARCHAR(6) NOT NULL,  -- '0001', '0071', '000C'
    descricao VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cemiterio_id, codigo)
);

-- Tipos de Lote (domínio)
CREATE TABLE tipo_lote (
    codigo CHAR(1) PRIMARY KEY,
    descricao VARCHAR(50) NOT NULL,
    perpetuo BOOLEAN DEFAULT FALSE
);

INSERT INTO tipo_lote (codigo, descricao, perpetuo) VALUES
('1', 'Comum (terra) - Concessão Temporária', FALSE),
('3', 'Gaveta/Perpétuo (concreto) - Perpetuidade', TRUE);

-- 3. TABELA PRINCIPAL: LOTES
-- =====================================================================
CREATE TABLE lote (
    id BIGSERIAL PRIMARY KEY,
    quadra_id INT NOT NULL REFERENCES quadra(id),
    codigo VARCHAR(6) NOT NULL,           -- '0042', '0030', '001A', '001B'
    tipo_codigo CHAR(1) NOT NULL REFERENCES tipo_lote(codigo),
    gavetas SMALLINT DEFAULT 1,           -- nº de gavetas (corpos empilhados)
    processo VARCHAR(30),                 -- nº processo administrativo
    validade DATE,                        -- NULL = perpétuo
    legado_cemiterio CHAR(2),             -- para rastreabilidade
    legado_quadra VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (quadra_id, codigo)
);

CREATE INDEX idx_lote_quadra ON lote(quadra_id);
CREATE INDEX idx_lote_validade ON lote(validade) WHERE validade IS NOT NULL;
CREATE INDEX idx_lote_tipo ON lote(tipo_codigo);

-- 4. FUNCIONÁRIOS (COVEIROS)
-- =====================================================================
CREATE TABLE funcionario (
    id SMALLINT PRIMARY KEY,              -- legado CODIGO
    nome VARCHAR(150) NOT NULL,
    rg VARCHAR(30),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. PEDREIROS
-- =====================================================================
CREATE TABLE pedreiro (
    id SMALLINT PRIMARY KEY,              -- legado CODIGO
    nome VARCHAR(150) NOT NULL,
    rg VARCHAR(30),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. FALECIDOS / SEPULTAMENTOS
-- =====================================================================
CREATE TABLE falecido (
    id BIGSERIAL PRIMARY KEY,
    lote_id BIGINT NOT NULL REFERENCES lote(id),
    item_ordem SMALLINT NOT NULL,         -- 1, 2, 3... (sequencial no lote)
    nome VARCHAR(200) NOT NULL,
    dt_nascimento DATE,
    dt_falecimento DATE NOT NULL,
    certidao_numero VARCHAR(30),
    dt_emissao_certidao DATE,
    cartorio VARCHAR(200),
    medico VARCHAR(200),
    causa_mortis VARCHAR(500),
    coveiro_id SMALLINT REFERENCES funcionario(id),
    pedreiro_id SMALLINT REFERENCES pedreiro(id),
    excluido BOOLEAN DEFAULT FALSE,
    legado_cemiterio CHAR(2),
    legado_quadra VARCHAR(6),
    legado_lote VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lote_id, item_ordem)
);

CREATE INDEX idx_falecido_lote ON falecido(lote_id);
CREATE INDEX idx_falecido_nome ON falecido(nome);
CREATE INDEX idx_falecido_dt_falecimento ON falecido(dt_falecimento);
CREATE INDEX idx_falecido_certidao ON falecido(certidao_numero);

-- 7. RESPONSÁVEIS / CONCESSIONÁRIOS
-- =====================================================================
CREATE TABLE responsavel (
    id BIGSERIAL PRIMARY KEY,
    lote_id BIGINT NOT NULL REFERENCES lote(id),
    item_ordem SMALLINT NOT NULL,         -- sequencial no lote
    nome VARCHAR(200) NOT NULL,
    rg VARCHAR(30),
    cpf_cnpj VARCHAR(18),                 -- apenas dígitos ou formatado
    endereco VARCHAR(200),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    cep VARCHAR(10),
    cidade VARCHAR(100),
    uf CHAR(2),
    telefone VARCHAR(20),
    celular VARCHAR(20),
    email VARCHAR(150),
    falecido_flag BOOLEAN DEFAULT FALSE,  -- '[FALECIDO]' no nome original
    excluido BOOLEAN DEFAULT FALSE,
    legado_cemiterio CHAR(2),
    legado_quadra VARCHAR(6),
    legado_lote VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_responsavel_lote ON responsavel(lote_id);
CREATE INDEX idx_responsavel_nome ON responsavel(nome);
CREATE INDEX idx_responsavel_cpf ON responsavel(cpf_cnpj);

-- 8. SEGURANÇA: USUÁRIOS E PERMISSÕES
-- =====================================================================
CREATE TABLE usuario_grupo (
    codigo CHAR(4) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE usuario (
    grupo_codigo CHAR(4) NOT NULL REFERENCES usuario_grupo(codigo),
    codigo CHAR(4) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    nivel CHAR(1),                        -- '1'=admin, '2'=operador, etc.
    observacao VARCHAR(200),
    senha_hash VARCHAR(255) NOT NULL,     -- NÃO armazenar senha em texto puro
    email VARCHAR(150),
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissao (
    grupo_codigo CHAR(4) NOT NULL REFERENCES usuario_grupo(codigo),
    tabela VARCHAR(100) NOT NULL,
    pode_incluir BOOLEAN DEFAULT FALSE,
    pode_alterar BOOLEAN DEFAULT FALSE,
    pode_excluir BOOLEAN DEFAULT FALSE,
    pode_consultar BOOLEAN DEFAULT FALSE,
    pode_relatorio BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (grupo_codigo, tabela)
);

-- 9. LOG DE ERROS (AUDITORIA)
-- =====================================================================
CREATE TABLE log_erro (
    id BIGSERIAL PRIMARY KEY,
    codigo_erro VARCHAR(20),
    tipo_mensagem CHAR(1),                -- 'E'rro, 'A'viso, 'I'nfo
    mensagem TEXT NOT NULL,
    ocorrido_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_codigo CHAR(4),
    modulo VARCHAR(100)
);

CREATE INDEX idx_log_erro_data ON log_erro(ocorrido_em);

-- 10. TABELAS ESPECÍFICAS INDEPENDÊNCIA
-- =====================================================================

-- OBA - Mapeamento alternativo de lotes
CREATE TABLE lote_oba (
    id BIGSERIAL PRIMARY KEY,
    cemiterio_legado VARCHAR(10),
    quadra_legado VARCHAR(10),
    lote_legado VARCHAR(6),
    lote_id BIGINT REFERENCES lote(id),   -- link para tabela principal
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_oba_legado ON lote_oba(cemiterio_legado, quadra_legado, lote_legado);

-- TTT - Histórico de validades
CREATE TABLE lote_historico_validade (
    id BIGSERIAL PRIMARY KEY,
    cemiterio_legado VARCHAR(10),
    quadra_legado VARCHAR(10),
    lote_legado VARCHAR(6),
    tipo VARCHAR(10),
    gavetas SMALLINT,
    processo VARCHAR(30),
    validade DATE,
    lote_id BIGINT REFERENCES lote(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- COMANDOS DE IMPORTAÇÃO (COPY FROM CSV)
-- =====================================================================
-- Execute estes comandos APÓS popular as tabelas de referência (cemiterio, quadra, tipo_lote, funcionario, pedreiro)

-- Ajuste o caminho dos arquivos conforme sua instalação:
-- \set base_path 'D:/SYSTRAT/Novos Projetos/Gestão Cemitérios/cemiterio/exported_data'

-- IMPORTAÇÃO CEMITÉRIO CENTRAL (cemiterio_id = 1)
-- =====================================================================

-- Quadras do Central (extrair distinct de LOTES.csv)
-- INSERT INTO quadra (cemiterio_id, codigo)
-- SELECT DISTINCT 1, QUADRAIOQ FROM temp_lotes_central;

-- Lotes Central
-- \copy lote (quadra_id, codigo, tipo_codigo, gavetas, processo, validade, legado_cemiterio, legado_quadra)
-- FROM PROGRAM 'awk -F"," "NR>1 {print $2\",\"$3\",\"$4\",\"$5\",\"$6\",\"$7\",\"$1\",\"$2}" D:/SYSTRAT/Novos Projetos/Gestão Cemitérios/cemiterio/exported_data/Cemiterio\ Central/LOTES.csv'
-- WITH (FORMAT csv, HEADER false);

-- Falecidos Central
-- \copy falecido (lote_id, item_ordem, nome, dt_nascimento, dt_falecimento, certidao_numero, dt_emissao_certidao, cartorio, medico, causa_mortis, coveiro_id, pedreiro_id, excluido, legado_cemiterio, legado_quadra, legado_lote)
-- FROM PROGRAM '...'
-- WITH (FORMAT csv, HEADER false);

-- Responsáveis Central
-- \copy responsavel (lote_id, item_ordem, nome, rg, cpf_cnpj, endereco, numero, cep, cidade, telefone, celular, falecido_flag, excluido, legado_cemiterio, legado_quadra, legado_lote)
-- FROM PROGRAM '...'
-- WITH (FORMAT csv, HEADER false);

-- IMPORTAÇÃO CEMITÉRIO INDEPENDÊNCIA (cemiterio_id = 2)
-- =====================================================================

-- Similar ao acima, alterando cemiterio_id para 2 e caminhos dos arquivos

-- =====================================================================
-- SCRIPTS DE CARGA AUTOMATIZADA (Python recomendado)
-- =====================================================================
-- Para carga robusta, use o script Python separado: import_csv_to_postgres.py
-- Ele faz: lookup de quadra_id, lote_id, trata NULLs, valida FKs, batch insert