import struct
import os

def read_dbf_records(filepath, max_records=10):
    with open(filepath, 'rb') as f:
        header = f.read(32)
        num_records = struct.unpack('<I', header[4:8])[0]
        header_len = struct.unpack('<H', header[8:10])[0]
        record_len = struct.unpack('<H', header[10:12])[0]
        
        # Read field descriptors
        f.seek(32)
        fields = []
        while True:
            field_data = f.read(32)
            if len(field_data) < 32 or field_data[0] == 0x0D:
                break
            name = field_data[0:11].rstrip(b'\x00').decode('cp850', errors='replace')
            field_type = chr(field_data[11])
            field_length = field_data[16]
            field_decimal = field_data[17]
            fields.append({'name': name, 'type': field_type, 'length': field_length, 'decimal': field_decimal})
        
        # Read records
        f.seek(header_len)
        records = []
        for i in range(min(max_records, num_records)):
            record = f.read(record_len)
            if len(record) < record_len:
                break
            deleted = record[0] == 0x2A
            if deleted:
                continue
            
            values = {}
            offset = 1
            for field in fields:
                raw = record[offset:offset+field['length']]
                offset += field['length']
                
                if field['type'] == 'C':  # Character
                    values[field['name']] = raw.rstrip(b' \x00').decode('cp850', errors='replace')
                elif field['type'] == 'N':  # Numeric
                    val = raw.rstrip(b' \x00').decode('ascii', errors='replace')
                    if field['decimal'] > 0:
                        try:
                            values[field['name']] = float(val) if val else 0
                        except:
                            values[field['name']] = val
                    else:
                        try:
                            values[field['name']] = int(val) if val else 0
                        except:
                            values[field['name']] = val
                elif field['type'] == 'D':  # Date
                    val = raw.decode('ascii', errors='replace').strip()
                    if val and val != '00000000':
                        values[field['name']] = f"{val[6:8]}/{val[4:6]}/{val[0:4]}"
                    else:
                        values[field['name']] = ''
                elif field['type'] == 'L':  # Logical
                    values[field['name']] = raw[0:1] in (b'Y', b'y', b'T', b't')
                else:
                    values[field['name']] = raw
            records.append(values)
        return fields, records

# Extract sample data from key tables
dirs = {
    'Central': r"D:\SYSTRAT\Novos Projetos\Gestão Cemitérios\cemiterio\Cemiterio Central",
    'Independencia': r"D:\SYSTRAT\Novos Projetos\Gestão Cemitérios\cemiterio\Cemiterio Independencia"
}

key_tables = ['DADOS.DBF', 'RESPONSA.DBF', 'LOTES.DBF', 'FALECIDO.DBF', 'FUNCIONA.DBF', 'PEDREIRO.DBF', 'PWUSUA.DBF', 'PWGRUPOS.DBF', 'PWTABELA.DBF', 'OBA.DBF', 'TTT.DBF']

for dir_name, dir_path in dirs.items():
    print(f"\n{'='*70}")
    print(f"AMOSTRAS - {dir_name.upper()}")
    print(f"{'='*70}\n")
    
    for table in key_tables:
        path = os.path.join(dir_path, table)
        if not os.path.exists(path):
            continue
        try:
            fields, records = read_dbf_records(path, 5)
            print(f"--- {table} ---")
            for i, rec in enumerate(records):
                print(f"  [{i+1}] {rec}")
            print()
        except Exception as e:
            print(f"Erro ao ler {table}: {e}\n")

# Also extract some stats
print(f"\n{'='*70}")
print(f"ESTATÍSTICAS")
print(f"{'='*70}\n")

for dir_name, dir_path in dirs.items():
    print(f"{dir_name}:")
    for table in ['DADOS.DBF', 'RESPONSA.DBF', 'LOTES.DBF', 'FALECIDO.DBF']:
        path = os.path.join(dir_path, table)
        if os.path.exists(path):
            with open(path, 'rb') as f:
                header = f.read(32)
                num_records = struct.unpack('<I', header[4:8])[0]
                print(f"  {table}: {num_records} registros")
    print()