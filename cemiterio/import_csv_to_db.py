#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de importação CSV -> PostgreSQL/MySQL
Sistema de Gestão de Cemitérios - Migração Clipper/DBF

Uso:
    python import_csv_to_db.py --db postgresql --host localhost --database cemiterios_migracao --user postgres --password senha
    python import_csv_to_db.py --db mysql --host localhost --database cemiterios_migracao --user root --password senha
"""

import os
import sys
import csv
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from contextlib import contextmanager

# Detectar driver disponível
try:
    import psycopg2
    from psycopg2.extras import execute_batch
    PG_AVAILABLE = True
except ImportError:
    PG_AVAILABLE = False

try:
    import pymysql
    MY_AVAILABLE = True
except ImportError:
    MY_AVAILABLE = False

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =====================================================================
# CONFIGURAÇÃO DOS ARQUIVOS E MAPEAMENTOS
# =====================================================================

BASE_PATH = r"D:\SYSTRAT\Novos Projetos\Gestão Cemitérios\cemiterio\exported_data"

CEMETERIOS = {
    1: {
        'nome': 'Cemitério Central',
        'codigo_legado': '01',
        'path': os.path.join(BASE_PATH, 'Cemiterio Central'),
        'files': {
            'lotes': 'LOTES.csv',
            'falecidos': 'DADOS.csv',
            'responsaveis': 'RESPONSA.csv',
            'erros': 'ERROS.csv',
            'usuarios': 'PWUSUA.csv',
            'permissoes': 'PWTABELA.csv',
            'grupos': 'PWGRUPOS.csv',
        }
    },
    2: {
        'nome': 'Cemitério Independência',
        'codigo_legado': '02',
        'path': os.path.join(BASE_PATH, 'Cemiterio Independencia'),
        'files': {
            'lotes': 'LOTES.csv',
            'falecidos': 'DADOS.csv',
            'responsaveis': 'RESPONSA.csv',
            'erros': 'ERROS.csv',
            'oba': 'OBA.csv',
            'historico': 'TTT.csv',
            'usuarios': 'PWUSUA.csv',
            'permissoes': 'PWTABELA.csv',
            'grupos': 'PWGRUPOS.csv',
            'fun_seq': 'FUN_SEQ.csv',
            'ped_seq': 'PED_SEQ.csv',
        }
    }
}

TIPO_LOTE_MAP = {
    '1': ('Comum (terra) - Concessão Temporária', False),
    '3': ('Gaveta/Perpétuo (concreto) - Perpetuidade', True),
}

BATCH_SIZE = 1000

# =====================================================================
# CLASSES DE CONEXÃO
# =====================================================================

class DatabaseConnection:
    def __init__(self, db_type: str, **kwargs):
        self.db_type = db_type.lower()
        self.conn = None
        self.kwargs = kwargs
    
    def connect(self):
        if self.db_type == 'postgresql':
            if not PG_AVAILABLE:
                raise RuntimeError("psycopg2 não instalado. pip install psycopg2-binary")
            self.conn = psycopg2.connect(**self.kwargs)
            self.conn.autocommit = False
        elif self.db_type == 'mysql':
            if not MY_AVAILABLE:
                raise RuntimeError("pymysql não instalado. pip install pymysql")
            self.conn = pymysql.connect(**self.kwargs, charset='utf8mb4', autocommit=False)
        else:
            raise ValueError(f"Banco não suportado: {self.db_type}")
        logger.info(f"Conectado ao {self.db_type.upper()}")
    
    def close(self):
        if self.conn:
            self.conn.close()
    
    def commit(self):
        self.conn.commit()
    
    def rollback(self):
        self.conn.rollback()
    
    @contextmanager
    def cursor(self):
        cur = self.conn.cursor()
        try:
            yield cur
        finally:
            cur.close()
    
    def execute(self, sql: str, params: tuple = None):
        with self.cursor() as cur:
            cur.execute(sql, params)
            return cur
    
    def executemany(self, sql: str, params_list: list):
        with self.cursor() as cur:
            if self.db_type == 'postgresql':
                execute_batch(cur, sql, params_list, page_size=BATCH_SIZE)
            else:
                cur.executemany(sql, params_list)
            return cur
    
    def fetchone(self, sql: str, params: tuple = None):
        with self.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()
    
    def fetchall(self, sql: str, params: tuple = None):
        with self.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()

# =====================================================================
# FUNÇÕES UTILITÁRIAS
# =====================================================================

def parse_date(date_str: str) -> Optional[datetime.date]:
    """Converte string de data para date object"""
    if not date_str or date_str.strip() in ('', 'NULL', 'None', '1111-11-11', '0000-00-00'):
        return None
    try:
        return datetime.strptime(date_str.strip(), '%Y-%m-%d').date()
    except ValueError:
        return None

def parse_int(val: str) -> Optional[int]:
    if not val or val.strip() in ('', 'NULL', 'None'):
        return None
    try:
        return int(val.strip())
    except ValueError:
        return None

def parse_float(val: str) -> Optional[float]:
    if not val or val.strip() in ('', 'NULL', 'None'):
        return None
    try:
        return float(val.strip())
    except ValueError:
        return None

def clean_str(val: str) -> Optional[str]:
    if not val or val.strip() in ('', 'NULL', 'None'):
        return None
    return val.strip()

def is_falecido_flag(nome: str) -> bool:
    return nome and '[FALECIDO]' in nome.upper()

def clean_falecido_nome(nome: str) -> str:
    if not nome:
        return nome
    return nome.replace('[FALECIDO]', '').strip()

def clean_header(header: str) -> str:
        """Remove null bytes and normalize header"""
        return header.replace('\x00', '').strip()

def get_csv_field(row: dict, *possible_keys: str) -> str:
        """Try multiple possible keys (with/without null bytes)"""
        for key in possible_keys:
            if key in row:
                return row[key]
            # Try with null bytes
            null_key = key.replace('', '\x00').replace('IO', 'IO\x00').replace('AIO', 'AIO\x00').replace('OQ', 'OQ\x00').replace('EA', 'EA\x00')
            if null_key in row:
                return row[null_key]
        return ''

# =====================================================================
# IMPORTADOR PRINCIPAL
# =====================================================================

class CemiterioImporter:
    def __init__(self, db: DatabaseConnection):
        self.db = db
        self.stats = {
            'cemiterios': 0, 'quadras': 0, 'lotes': 0,
            'falecidos': 0, 'responsaveis': 0,
            'funcionarios': 0, 'pedreiros': 0,
            'erros': 0, 'usuarios': 0, 'grupos': 0, 'permissoes': 0
        }
        # Caches para evitar queries repetidas
        self.quadra_cache: Dict[tuple, int] = {}  # (cemiterio_id, codigo) -> quadra_id
        self.lote_cache: Dict[tuple, int] = {}    # (quadra_id, codigo) -> lote_id
        self.funcionario_cache: Dict[int, int] = {}  # legado_id -> id
        self.pedreiro_cache: Dict[int, int] = {}
    
    def run_full_import(self):
        """Executa importação completa na ordem correta"""
        logger.info("=" * 60)
        logger.info("INICIANDO IMPORTAÇÃO COMPLETA")
        logger.info("=" * 60)
        
        try:
            # 1. Tabelas de referência
            self.import_cemiterios()
            self.import_tipos_lote()
            self.import_funcionarios()
            self.import_pedreiros()
            self.import_grupos_usuarios()
            self.import_usuarios()
            self.import_permissoes()
            
            # 2. Por cemitério: quadras -> lotes -> falecidos -> responsaveis
            for cem_id, cem_info in CEMETERIOS.items():
                logger.info(f"\n--- Processando: {cem_info['nome']} (ID: {cem_id}) ---")
                self.import_quadras(cem_id, cem_info)
                self.import_lotes(cem_id, cem_info)
                self.import_falecidos(cem_id, cem_info)
                self.import_responsaveis(cem_id, cem_info)
                self.import_erros(cem_id, cem_info)
                
                # Tabelas específicas Independência
                if cem_id == 2:
                    self.import_oba(cem_info)
                    self.import_historico(cem_info)
            
            self.db.commit()
            self.print_stats()
            logger.info("IMPORTAÇÃO CONCLUÍDA COM SUCESSO!")
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"ERRO NA IMPORTAÇÃO: {e}")
            raise
    
    def import_cemiterios(self):
        logger.info("Importando cemitérios...")
        for cem_id, info in CEMETERIOS.items():
            sql = """
                INSERT INTO cemiterio (id, codigo_legado, nome)
                VALUES (%s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome
            """ if self.db.db_type == 'postgresql' else """
                INSERT INTO `cemiterio` (`id`, `codigo_legado`, `nome`)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE `nome`=VALUES(`nome`)
            """
            self.db.execute(sql, (cem_id, info['codigo_legado'], info['nome']))
            self.stats['cemiterios'] += 1
    
    def import_tipos_lote(self):
        logger.info("Importando tipos de lote...")
        for codigo, (desc, perpetuo) in TIPO_LOTE_MAP.items():
            sql = """
                INSERT INTO tipo_lote (codigo, descricao, perpetuo)
                VALUES (%s, %s, %s)
                ON CONFLICT (codigo) DO UPDATE SET descricao=EXCLUDED.descricao
            """ if self.db.db_type == 'postgresql' else """
                INSERT INTO `tipo_lote` (`codigo`, `descricao`, `perpetuo`)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE `descricao`=VALUES(`descricao`)
            """
            self.db.execute(sql, (codigo, desc, perpetuo))
    
    def import_funcionarios(self):
        logger.info("Importando funcionários (coveiros)...")
        # Dados conhecidos dos DBFs
        funcionarios = [
            (1, 'IGNORADO', '.'),
            (2, 'RAFAEL STARON', '78082798'),
            (3, 'AUGUSTO BOJAN', '44766337'),
            (4, 'FUNCIONARIO 4', ''),
            (5, 'FUNCIONARIO 5', ''),
            (6, 'FUNCIONARIO 6', ''),
            (7, 'FUNCIONARIO 7', ''),
            (8, 'FUNCIONARIO 8', ''),
            (9, 'FUNCIONARIO 9', ''),
            (10, 'FUNCIONARIO 10', ''),
            (11, 'FUNCIONARIO 11', ''),
            (12, 'FUNCIONARIO 12', ''),
        ]
        for cod, nome, rg in funcionarios:
            sql = """
                INSERT INTO funcionario (id, nome, rg)
                VALUES (%s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome
            """ if self.db.db_type == 'postgresql' else """
                INSERT INTO `funcionario` (`id`, `nome`, `rg`)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE `nome`=VALUES(`nome`)
            """
            self.db.execute(sql, (cod, nome, rg))
            self.funcionario_cache[cod] = cod
            self.stats['funcionarios'] += 1
    
    def import_pedreiros(self):
        logger.info("Importando pedreiros...")
        pedreiros = [
            (1, 'IGNORADO', '.'),
            (2, 'PEDREIRO 2', ''),
            (3, 'PEDREIRO 3', ''),
            (4, 'PEDREIRO 4', ''),
        ]
        for cod, nome, rg in pedreiros:
            sql = """
                INSERT INTO pedreiro (id, nome, rg)
                VALUES (%s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome
            """ if self.db.db_type == 'postgresql' else """
                INSERT INTO `pedreiro` (`id`, `nome`, `rg`)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE `nome`=VALUES(`nome`)
            """
            self.db.execute(sql, (cod, nome, rg))
            self.pedreiro_cache[cod] = cod
            self.stats['pedreiros'] += 1
    
    def import_grupos_usuarios(self):
        logger.info("Importando grupos de usuários...")
        # Ler do CSV (mesmo para ambos cemitérios)
        for cem_id in [1, 2]:
            path = os.path.join(CEMETERIOS[cem_id]['path'], CEMETERIOS[cem_id]['files']['grupos'])
            if not os.path.exists(path):
                continue
            with open(path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                if reader.fieldnames:
                    reader.fieldnames = [clean_header(h) for h in reader.fieldnames]
                for row in reader:
                    codigo = clean_str(get_csv_field(row, 'PW_GRUPO', 'PW_GRUPOhQ', 'PW_GRUPOfQ'))
                    nome = clean_str(get_csv_field(row, 'PW_NOGRUPO'))
                    if codigo:
                        sql = """
                            INSERT INTO usuario_grupo (codigo, nome)
                            VALUES (%s, %s)
                            ON CONFLICT (codigo) DO UPDATE SET nome=EXCLUDED.nome
                        """ if self.db.db_type == 'postgresql' else """
                            INSERT INTO `usuario_grupo` (`codigo`, `nome`)
                            VALUES (%s, %s)
                            ON DUPLICATE KEY UPDATE `nome`=VALUES(`nome`)
                        """
                        self.db.execute(sql, (codigo, nome))
                        self.stats['grupos'] += 1
    
    def import_usuarios(self):
        logger.info("Importando usuários...")
        for cem_id in [1, 2]:
            path = os.path.join(CEMETERIOS[cem_id]['path'], CEMETERIOS[cem_id]['files']['usuarios'])
            if not os.path.exists(path):
                continue
            with open(path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                if reader.fieldnames:
                    reader.fieldnames = [clean_header(h) for h in reader.fieldnames]
                for row in reader:
                    grupo = clean_str(get_csv_field(row, 'PW_GRUPO', 'PW_GRUPOhQ', 'PW_GRUPOfQ'))
                    codigo = clean_str(get_csv_field(row, 'PW_CODIGO', 'PW_CODIGOQ'))
                    nome = clean_str(get_csv_field(row, 'PW_NOME', 'PW_NOMEOQ'))
                    nivel = clean_str(get_csv_field(row, 'PW_NIVEL', 'PW_NIVELQ'))
                    obs = clean_str(get_csv_field(row, 'PW_OBSL', 'PW_OBSLQ'))
                    senha = clean_str(get_csv_field(row, 'PW_PASS', 'PW_PASSQ'))
                    # Hash simples para migração (substituir por bcrypt na aplicação real)
                    import hashlib
                    senha_hash = hashlib.sha256((senha or '').encode()).hexdigest()
                    
                    if codigo:
                        sql = """
                            INSERT INTO usuario (grupo_codigo, codigo, nome, nivel, observacao, senha_hash)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            ON CONFLICT (codigo) DO UPDATE SET nome=EXCLUDED.nome
                        """ if self.db.db_type == 'postgresql' else """
                            INSERT INTO `usuario` (`grupo_codigo`, `codigo`, `nome`, `nivel`, `observacao`, `senha_hash`)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            ON DUPLICATE KEY UPDATE `nome`=VALUES(`nome`)
                        """
                        self.db.execute(sql, (grupo, codigo, nome, nivel, obs, senha_hash))
                        self.stats['usuarios'] += 1
    
    def import_permissoes(self):
        logger.info("Importando permissões...")
        for cem_id in [1, 2]:
            path = os.path.join(CEMETERIOS[cem_id]['path'], CEMETERIOS[cem_id]['files']['permissoes'])
            if not os.path.exists(path):
                continue
            with open(path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                if reader.fieldnames:
                    reader.fieldnames = [clean_header(h) for h in reader.fieldnames]
                for row in reader:
                    grupo = clean_str(get_csv_field(row, 'PW_GRUPO', 'PW_GRUPOhQ', 'PW_GRUPOfQ'))
                    dbf = clean_str(get_csv_field(row, 'PW_DBF', 'PW_DBFOhQ', 'PW_DBFOfQ'))
                    permis = clean_str(get_csv_field(row, 'PW_PERMIS', 'PW_PERMISQ'))
                    if grupo and dbf and permis:
                        # PW_PERMIS: string de 20 chars = 5 ações x 4 tabelas? 
                        # Interpretar: posições 0-3=Incluir, 4-7=Alterar, 8-11=Excluir, 12-15=Consultar, 16-19=Relatório
                        pode_i = 'S' in permis[0:4] if len(permis) >= 4 else False
                        pode_a = 'S' in permis[4:8] if len(permis) >= 8 else False
                        pode_e = 'S' in permis[8:12] if len(permis) >= 12 else False
                        pode_c = 'S' in permis[12:16] if len(permis) >= 16 else False
                        pode_r = 'S' in permis[16:20] if len(permis) >= 20 else False
                        
                        sql = """
                            INSERT INTO permissao (grupo_codigo, tabela, pode_incluir, pode_alterar, pode_excluir, pode_consultar, pode_relatorio)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (grupo_codigo, tabela) DO UPDATE SET
                                pode_incluir=EXCLUDED.pode_incluir, pode_alterar=EXCLUDED.pode_alterar,
                                pode_excluir=EXCLUDED.pode_excluir, pode_consultar=EXCLUDED.pode_consultar,
                                pode_relatorio=EXCLUDED.pode_relatorio
                        """ if self.db.db_type == 'postgresql' else """
                            INSERT INTO `permissao` (`grupo_codigo`, `tabela`, `pode_incluir`, `pode_alterar`, `pode_excluir`, `pode_consultar`, `pode_relatorio`)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            ON DUPLICATE KEY UPDATE
                                `pode_incluir`=VALUES(`pode_incluir`), `pode_alterar`=VALUES(`pode_alterar`),
                                `pode_excluir`=VALUES(`pode_excluir`), `pode_consultar`=VALUES(`pode_consultar`),
                                `pode_relatorio`=VALUES(`pode_relatorio`)
                        """
                        self.db.execute(sql, (grupo, dbf, pode_i, pode_a, pode_e, pode_c, pode_r))
                        self.stats['permissoes'] += 1
    
    def import_quadras(self, cem_id: int, cem_info: dict):
        logger.info(f"  Importando quadras do {cem_info['nome']}...")
        path = os.path.join(cem_info['path'], cem_info['files']['lotes'])
        if not os.path.exists(path):
            return
        
        quadras_set = set()
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            if reader.fieldnames:
                reader.fieldnames = [clean_header(h) for h in reader.fieldnames]
            for row in reader:
                quadra_cod = clean_str(get_csv_field(row, 'QUADRAIOQ'))
                if quadra_cod:
                    quadras_set.add(quadra_cod)
        
        for quadra_cod in sorted(quadras_set):
            # Use INSERT ... ON DUPLICATE KEY UPDATE to ensure we get the ID
            sql = """
                INSERT INTO `quadra` (`cemiterio_id`, `codigo`)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE `id`=LAST_INSERT_ID(`id`)
            """
            self.db.execute(sql, (cem_id, quadra_cod))
            q = self.db.fetchone("SELECT `id` FROM `quadra` WHERE `cemiterio_id`=%s AND `codigo`=%s", (cem_id, quadra_cod))
            if q:
                self.quadra_cache[(cem_id, quadra_cod)] = q[0]
                self.stats['quadras'] += 1
            else:
                logger.warning(f"    Falha ao inserir/buscar quadra: {quadra_cod}")
        
        logger.info(f"    {len(self.quadra_cache)} quadras no cache")
    
    def import_lotes(self, cem_id: int, cem_info: dict):
        logger.info(f"  Importando lotes do {cem_info['nome']}...")
        path = os.path.join(cem_info['path'], cem_info['files']['lotes'])
        if not os.path.exists(path):
            return
        
        batch = []
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            # Normalize fieldnames
            if reader.fieldnames:
                reader.fieldnames = [clean_header(h) for h in reader.fieldnames]
            for row in reader:
                quadra_cod = clean_str(get_csv_field(row, 'QUADRAIOQ'))
                lote_cod = clean_str(get_csv_field(row, 'LOTEAIOQ'))
                tipo = clean_str(get_csv_field(row, 'TIPOAIOQ'))
                gavetas = parse_int(get_csv_field(row, 'GAVETAIOQ'))
                processo = clean_str(get_csv_field(row, 'PROCESSOQ'))
                validade = parse_date(get_csv_field(row, 'VALIDADEQ'))
                
                if not quadra_cod or not lote_cod:
                    continue
                
                quadra_id = self.quadra_cache.get((cem_id, quadra_cod))
                if not quadra_id:
                    logger.warning(f"    Quadra não encontrada: {quadra_cod}")
                    continue
                
                batch.append((
                    quadra_id, lote_cod, tipo or '1',
                    gavetas or 1, processo, validade,
                    cem_info['codigo_legado'], quadra_cod
                ))
                
                if len(batch) >= BATCH_SIZE:
                    self._insert_lote_batch(batch)
                    batch = []
        
        if batch:
            self._insert_lote_batch(batch)
        
        logger.info(f"    {self.stats['lotes']} lotes importados")
    
    def _insert_lote_batch(self, batch: list):
        sql = """
            INSERT INTO lote (quadra_id, codigo, tipo_codigo, gavetas, processo, validade, legado_cemiterio, legado_quadra)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (quadra_id, codigo) DO UPDATE SET
                tipo_codigo=EXCLUDED.tipo_codigo, gavetas=EXCLUDED.gavetas,
                processo=EXCLUDED.processo, validade=EXCLUDED.validade
            RETURNING id
        """ if self.db.db_type == 'postgresql' else """
            INSERT INTO `lote` (`quadra_id`, `codigo`, `tipo_codigo`, `gavetas`, `processo`, `validade`, `legado_cemiterio`, `legado_quadra`)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                `tipo_codigo`=VALUES(`tipo_codigo`), `gavetas`=VALUES(`gavetas`),
                `processo`=VALUES(`processo`), `validade`=VALUES(`validade`)
        """
        
        if self.db.db_type == 'postgresql':
            with self.db.cursor() as cur:
                for params in batch:
                    cur.execute(sql, params)
                    result = cur.fetchone()
                    if result:
                        lote_id = result[0]
                        # Precisamos mapear quadra_id+codigo -> lote_id
                        # Como não temos o quadra_id no batch facilmente, faremos lookup depois
                        pass
        else:
            self.db.executemany(sql, batch)
        
        self.stats['lotes'] += len(batch)
        # Atualizar cache de lotes (fazer SELECT depois do batch)
        self._refresh_lote_cache()
    
    def _refresh_lote_cache(self):
        """Atualiza cache lote_id após inserts"""
        if self.db.db_type == 'postgresql':
            rows = self.db.fetchall("""
                SELECT id, quadra_id, codigo FROM lote
                WHERE (quadra_id, codigo) NOT IN %s
            """, (tuple(self.lote_cache.keys()) if self.lote_cache else ((0, ''),)))
        else:
            # MySQL não suporta tuplas em NOT IN, usar abordagem diferente
            if self.lote_cache:
                placeholders = ', '.join(['(%s, %s)'] * len(self.lote_cache))
                params = []
                for k in self.lote_cache.keys():
                    params.extend(k)
                rows = self.db.fetchall(f"""
                    SELECT id, quadra_id, codigo FROM lote
                    WHERE (quadra_id, codigo) NOT IN ({placeholders})
                """, tuple(params))
            else:
                rows = self.db.fetchall("SELECT id, quadra_id, codigo FROM lote")
        
        for lote_id, quadra_id, codigo in rows:
            self.lote_cache[(quadra_id, codigo)] = lote_id
    
    def import_falecidos(self, cem_id: int, cem_info: dict):
        logger.info(f"  Importando falecidos do {cem_info['nome']}...")
        path = os.path.join(cem_info['path'], cem_info['files']['falecidos'])
        if not os.path.exists(path):
            return
        
        self._refresh_lote_cache()
        
        batch = []
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            if reader.fieldnames:
                reader.fieldnames = [clean_header(h) for h in reader.fieldnames]
            for row in reader:
                quadra_cod = clean_str(get_csv_field(row, 'QUADRAIOQ'))
                lote_cod = clean_str(get_csv_field(row, 'LOTEAIOQ'))
                item = parse_int(get_csv_field(row, 'ITEMAIOQ'))
                nome = clean_str(get_csv_field(row, 'NOMEAIOQ'))
                dt_nasc = parse_date(get_csv_field(row, 'DT_NASCOQ'))
                dt_fal = parse_date(get_csv_field(row, 'DT_FALOQ'))
                certidao = parse_int(get_csv_field(row, 'CERTIDAOQ'))
                dt_emi = parse_date(get_csv_field(row, 'DT_EMIOQ'))
                cartorio = clean_str(get_csv_field(row, 'CARTORIOQ'))
                medico = clean_str(get_csv_field(row, 'MEDICOOQ'))
                causa = clean_str(get_csv_field(row, 'CAUSAOQ'))
                cod_func = parse_int(get_csv_field(row, 'COD_FUNCQ'))
                cod_ped = parse_int(get_csv_field(row, 'COD_PEDQ'))
                flag_excl = clean_str(get_csv_field(row, 'FLAG_EXCLQ'))
                
                if not nome or not dt_fal or not quadra_cod or not lote_cod or item is None:
                    continue
                
                if flag_excl == '*':
                    continue  # Pular excluídos
                
                quadra_id = self.quadra_cache.get((cem_id, quadra_cod))
                lote_id = self.lote_cache.get((quadra_id, lote_cod)) if quadra_id else None
                
                if not lote_id:
                    continue
                
                batch.append((
                    lote_id, item, nome,
                    dt_nasc, dt_fal, certidao, dt_emi,
                    cartorio, medico, causa,
                    cod_func, cod_ped, False,
                    cem_info['codigo_legado'], quadra_cod, lote_cod
                ))
                
                if len(batch) >= BATCH_SIZE:
                    self._insert_falecido_batch(batch)
                    batch = []
        
        if batch:
            self._insert_falecido_batch(batch)
        
        logger.info(f"    {self.stats['falecidos']} falecidos importados")
    
    def _insert_falecido_batch(self, batch: list):
        sql = """
            INSERT INTO falecido (lote_id, item_ordem, nome, dt_nascimento, dt_falecimento,
                certidao_numero, dt_emissao_certidao, cartorio, medico, causa_mortis,
                coveiro_id, pedreiro_id, excluido, legado_cemiterio, legado_quadra, legado_lote)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (lote_id, item_ordem) DO UPDATE SET
                nome=EXCLUDED.nome, dt_nascimento=EXCLUDED.dt_nascimento,
                dt_falecimento=EXCLUDED.dt_falecimento, certidao_numero=EXCLUDED.certidao_numero,
                dt_emissao_certidao=EXCLUDED.dt_emissao_certidao, cartorio=EXCLUDED.cartorio,
                medico=EXCLUDED.medico, causa_mortis=EXCLUDED.causa_mortis,
                coveiro_id=EXCLUDED.coveiro_id, pedreiro_id=EXCLUDED.pedreiro_id
        """ if self.db.db_type == 'postgresql' else """
            INSERT INTO `falecido` (`lote_id`, `item_ordem`, `nome`, `dt_nascimento`, `dt_falecimento`,
                `certidao_numero`, `dt_emissao_certidao`, `cartorio`, `medico`, `causa_mortis`,
                `coveiro_id`, `pedreiro_id`, `excluido`, `legado_cemiterio`, `legado_quadra`, `legado_lote`)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                `nome`=VALUES(`nome`), `dt_nascimento`=VALUES(`dt_nascimento`),
                `dt_falecimento`=VALUES(`dt_falecimento`), `certidao_numero`=VALUES(`certidao_numero`),
                `dt_emissao_certidao`=VALUES(`dt_emissao_certidao`), `cartorio`=VALUES(`cartorio`),
                `medico`=VALUES(`medico`), `causa_mortis`=VALUES(`causa_mortis`),
                `coveiro_id`=VALUES(`coveiro_id`), `pedreiro_id`=VALUES(`pedreiro_id`)
        """
        
        if self.db.db_type == 'postgresql':
            with self.db.cursor() as cur:
                execute_batch(cur, sql, batch, page_size=BATCH_SIZE)
        else:
            self.db.executemany(sql, batch)
        
        self.stats['falecidos'] += len(batch)
    
    def import_responsaveis(self, cem_id: int, cem_info: dict):
        logger.info(f"  Importando responsáveis do {cem_info['nome']}...")
        path = os.path.join(cem_info['path'], cem_info['files']['responsaveis'])
        if not os.path.exists(path):
            return
        
        self._refresh_lote_cache()
        
        batch = []
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            if reader.fieldnames:
                reader.fieldnames = [clean_header(h) for h in reader.fieldnames]
            for row in reader:
                quadra_cod = clean_str(get_csv_field(row, 'QUADRAIOQ'))
                lote_cod = clean_str(get_csv_field(row, 'LOTEAIOQ'))
                item = parse_int(get_csv_field(row, 'ITEMAIOQ'))
                nome = clean_str(get_csv_field(row, 'NOMEAIOQ'))
                rg = clean_str(get_csv_field(row, 'RGEAIOQ'))
                cpf = clean_str(get_csv_field(row, 'CPFAIOQ'))
                endereco = clean_str(get_csv_field(row, 'ENDERECOQ'))
                numero = parse_int(get_csv_field(row, 'NUMEROOQ'))
                cep = clean_str(get_csv_field(row, 'CEPROOQ'))
                cidade = clean_str(get_csv_field(row, 'CIDADEOQ'))
                fone = clean_str(get_csv_field(row, 'FONEEOQ'))
                celular = clean_str(get_csv_field(row, 'CELULARQ'))
                flag_excl = clean_str(get_csv_field(row, 'FLAG_EXCLQ'))
                
                if not nome or not quadra_cod or not lote_cod or item is None:
                    continue
                
                if flag_excl == '*':
                    continue
                
                quadra_id = self.quadra_cache.get((cem_id, quadra_cod))
                lote_id = self.lote_cache.get((quadra_id, lote_cod)) if quadra_id else None
                
                if not lote_id:
                    continue
                
                falecido_flag = is_falecido_flag(nome)
                nome_limpo = clean_falecido_nome(nome)
                
                batch.append((
                    lote_id, item, nome_limpo, rg, cpf,
                    endereco, str(numero) if numero else None, None, cep, cidade,
                    None, fone, celular, None,
                    falecido_flag, False,
                    cem_info['codigo_legado'], quadra_cod, lote_cod
                ))
                
                if len(batch) >= BATCH_SIZE:
                    self._insert_responsavel_batch(batch)
                    batch = []
        
        if batch:
            self._insert_responsavel_batch(batch)
        
        logger.info(f"    {self.stats['responsaveis']} responsáveis importados")
    
    def _insert_responsavel_batch(self, batch: list):
        sql = """
            INSERT INTO responsavel (lote_id, item_ordem, nome, rg, cpf_cnpj,
                endereco, numero, complemento, cep, cidade, uf,
                telefone, celular, email, falecido_flag, excluido,
                legado_cemiterio, legado_quadra, legado_lote)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """ if self.db.db_type == 'postgresql' else """
            INSERT INTO `responsavel` (`lote_id`, `item_ordem`, `nome`, `rg`, `cpf_cnpj`,
                `endereco`, `numero`, `complemento`, `cep`, `cidade`, `uf`,
                `telefone`, `celular`, `email`, `falecido_flag`, `excluido`,
                `legado_cemiterio`, `legado_quadra`, `legado_lote`)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        if self.db.db_type == 'postgresql':
            with self.db.cursor() as cur:
                execute_batch(cur, sql, batch, page_size=BATCH_SIZE)
        else:
            self.db.executemany(sql, batch)
        
        self.stats['responsaveis'] += len(batch)
    
    def import_erros(self, cem_id: int, cem_info: dict):
        logger.info(f"  Importando log de erros do {cem_info['nome']}...")
        path = os.path.join(cem_info['path'], cem_info['files']['erros'])
        if not os.path.exists(path):
            return
        
        batch = []
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            if reader.fieldnames:
                reader.fieldnames = [clean_header(h) for h in reader.fieldnames]
            for row in reader:
                codigo = clean_str(get_csv_field(row, 'CODI_ERROQ'))
                tipo = clean_str(get_csv_field(row, 'TPMSG_ERRO'))
                msg = clean_str(get_csv_field(row, 'MSG_ERROO'))
                
                if msg:
                    batch.append((codigo, tipo, msg, cem_info['codigo_legado']))
                
                if len(batch) >= BATCH_SIZE:
                    self._insert_erro_batch(batch)
                    batch = []
        
        if batch:
            self._insert_erro_batch(batch)
        
        logger.info(f"    {self.stats['erros']} erros importados")
    
    def _insert_erro_batch(self, batch: list):
        sql = """
            INSERT INTO log_erro (codigo_erro, tipo_mensagem, mensagem, modulo)
            VALUES (%s, %s, %s, %s)
        """ if self.db.db_type == 'postgresql' else """
            INSERT INTO `log_erro` (`codigo_erro`, `tipo_mensagem`, `mensagem`, `modulo`)
            VALUES (%s, %s, %s, %s)
        """
        
        if self.db.db_type == 'postgresql':
            with self.db.cursor() as cur:
                execute_batch(cur, sql, batch, page_size=BATCH_SIZE)
        else:
            self.db.executemany(sql, batch)
        
        self.stats['erros'] += len(batch)
    
    def import_oba(self, cem_info: dict):
        logger.info(f"  Importando OBA (mapeamento alternativo)...")
        path = os.path.join(cem_info['path'], cem_info['files']['oba'])
        if not os.path.exists(path):
            return
        
        self._refresh_lote_cache()
        
        batch = []
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            if reader.fieldnames:
                reader.fieldnames = [clean_header(h) for h in reader.fieldnames]
            for row in reader:
                cem = clean_str(get_csv_field(row, 'CEMITERIOQ'))
                quadra = clean_str(get_csv_field(row, 'QUADRAIOQ'))
                lote = clean_str(get_csv_field(row, 'LOTEAIOQ'))
                
                if not quadra or not lote:
                    continue
                
                quadra_id = self.quadra_cache.get((2, quadra))
                lote_id = self.lote_cache.get((quadra_id, lote)) if quadra_id else None
                
                batch.append((cem, quadra, lote, lote_id))
                
                if len(batch) >= BATCH_SIZE:
                    self._insert_oba_batch(batch)
                    batch = []
        
        if batch:
            self._insert_oba_batch(batch)
    
    def _insert_oba_batch(self, batch: list):
        sql = """
            INSERT INTO lote_oba (cemiterio_legado, quadra_legado, lote_legado, lote_id)
            VALUES (%s, %s, %s, %s)
        """ if self.db.db_type == 'postgresql' else """
            INSERT INTO `lote_oba` (`cemiterio_legado`, `quadra_legado`, `lote_legado`, `lote_id`)
            VALUES (%s, %s, %s, %s)
        """
        
        if self.db.db_type == 'postgresql':
            with self.db.cursor() as cur:
                execute_batch(cur, sql, batch, page_size=BATCH_SIZE)
        else:
            self.db.executemany(sql, batch)
    
    def import_historico(self, cem_info: dict):
        logger.info(f"  Importando histórico de validades (TTT)...")
        path = os.path.join(cem_info['path'], cem_info['files']['historico'])
        if not os.path.exists(path):
            return
        
        self._refresh_lote_cache()
        
        batch = []
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            if reader.fieldnames:
                reader.fieldnames = [clean_header(h) for h in reader.fieldnames]
            for row in reader:
                cem = clean_str(get_csv_field(row, 'CEMITERIOQ'))
                quadra = clean_str(get_csv_field(row, 'QUADRAIOQ'))
                lote = clean_str(get_csv_field(row, 'LOTEAIOQ'))
                tipo = clean_str(get_csv_field(row, 'TIPOAIOQ'))
                gavetas = parse_int(get_csv_field(row, 'GAVETAIOQ'))
                processo = clean_str(get_csv_field(row, 'PROCESSOQ'))
                validade = parse_date(get_csv_field(row, 'VALIDADEQ'))
                
                if not quadra or not lote:
                    continue
                
                quadra_id = self.quadra_cache.get((2, quadra))
                lote_id = self.lote_cache.get((quadra_id, lote)) if quadra_id else None
                
                batch.append((cem, quadra, lote, tipo, gavetas, processo, validade, lote_id))
                
                if len(batch) >= BATCH_SIZE:
                    self._insert_historico_batch(batch)
                    batch = []
        
        if batch:
            self._insert_historico_batch(batch)
    
    def _insert_historico_batch(self, batch: list):
        sql = """
            INSERT INTO lote_historico_validade (cemiterio_legado, quadra_legado, lote_legado,
                tipo, gavetas, processo, validade, lote_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """ if self.db.db_type == 'postgresql' else """
            INSERT INTO `lote_historico_validade` (`cemiterio_legado`, `quadra_legado`, `lote_legado`,
                `tipo`, `gavetas`, `processo`, `validade`, `lote_id`)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        if self.db.db_type == 'postgresql':
            with self.db.cursor() as cur:
                execute_batch(cur, sql, batch, page_size=BATCH_SIZE)
        else:
            self.db.executemany(sql, batch)
    
    def print_stats(self):
        logger.info("=" * 60)
        logger.info("ESTATÍSTICAS DE IMPORTAÇÃO")
        logger.info("=" * 60)
        for key, value in self.stats.items():
            logger.info(f"  {key:20s}: {value:>10,}")
        logger.info("=" * 60)

# =====================================================================
# MAIN
# =====================================================================

def main():
    parser = argparse.ArgumentParser(description='Importar CSVs para PostgreSQL/MySQL')
    parser.add_argument('--db', choices=['postgresql', 'mysql'], required=True, help='Tipo de banco')
    parser.add_argument('--host', default='localhost', help='Host do banco')
    parser.add_argument('--port', type=int, help='Porta (padrão: 5432 PG, 3306 MySQL)')
    parser.add_argument('--database', required=True, help='Nome do banco')
    parser.add_argument('--user', required=True, help='Usuário')
    parser.add_argument('--password', required=True, help='Senha')
    parser.add_argument('--schema-only', action='store_true', help='Apenas criar schema, não importar dados')
    
    args = parser.parse_args()
    
    # Portas padrão
    if args.port is None:
        args.port = 5432 if args.db == 'postgresql' else 3306
    
    # Conectar
    db_kwargs = {
        'host': args.host,
        'port': args.port,
        'database': args.database,
        'user': args.user,
        'password': args.password
    }
    
    db = DatabaseConnection(args.db, **db_kwargs)
    
    try:
        db.connect()
        
        # Verificar se tabelas existem
        if args.db == 'postgresql':
            exists = db.fetchone("SELECT 1 FROM information_schema.tables WHERE table_name='cemiterio'")
        else:
            exists = db.fetchone("SELECT 1 FROM information_schema.tables WHERE table_schema=%s AND table_name='cemiterio'", (args.database,))
        
        if not exists:
            logger.warning("Tabelas não existem. Execute o script SQL de schema primeiro:")
            logger.warning(f"  {args.db}_schema.sql")
            return 1
        
        if args.schema_only:
            logger.info("Schema verificado. Use --schema-only apenas para validar.")
            return 0
        
        # Importar
        importer = CemiterioImporter(db)
        importer.run_full_import()
        
    except Exception as e:
        logger.error(f"Erro fatal: {e}")
        return 1
    finally:
        db.close()
    
    return 0

if __name__ == '__main__':
    sys.exit(main())