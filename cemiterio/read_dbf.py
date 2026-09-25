import struct
import os

def read_dbf_header(filepath):
    with open(filepath, 'rb') as f:
        # DBF Header (32 bytes minimum)
        header = f.read(32)
        if len(header) < 32:
            return None
        
        # Byte 0: Version
        version = header[0]
        # Bytes 1-3: Last update (YYMMDD)
        year = header[1] + 1900
        month = header[2]
        day = header[3]
        # Bytes 4-7: Number of records (little endian)
        num_records = struct.unpack('<I', header[4:8])[0]
        # Bytes 8-9: Header length
        header_len = struct.unpack('<H', header[8:10])[0]
        # Bytes 10-11: Record length
        record_len = struct.unpack('<H', header[10:12])[0]
        
        print(f"Arquivo: {os.path.basename(filepath)}")
        print(f"  Versão: {version:#04x}")
        print(f"  Última atualização: {day:02d}/{month:02d}/{year}")
        print(f"  Registros: {num_records}")
        print(f"  Tamanho do cabeçalho: {header_len}")
        print(f"  Tamanho do registro: {record_len}")
        
        # Read field descriptors (each 32 bytes, terminated by 0x0D)
        f.seek(32)
        fields = []
        while True:
            field_data = f.read(32)
            if len(field_data) < 32:
                break
            if field_data[0] == 0x0D:  # Terminator
                break
            
            name = field_data[0:11].rstrip(b'\x00').decode('cp850', errors='replace')
            field_type = chr(field_data[11])
            field_offset = struct.unpack('<I', field_data[12:16])[0]
            field_length = field_data[16]
            field_decimal = field_data[17]
            
            fields.append({
                'name': name,
                'type': field_type,
                'length': field_length,
                'decimal': field_decimal
            })
        
        print(f"  Campos ({len(fields)}):")
        for field in fields:
            print(f"    {field['name']}: {field['type']}({field['length']},{field['decimal']})")
        
        # Read first few records
        f.seek(header_len)
        print(f"  Primeiros 3 registros:")
        for i in range(min(3, num_records)):
            record = f.read(record_len)
            if len(record) < record_len:
                break
            deleted = record[0] == 0x2A  # '*' = deleted
            values = []
            for field in fields:
                start = field_data[12:16]  # This is wrong, need to track offset
            # Simpler: just show raw
            print(f"    Reg {i+1}: deleted={deleted}, data={record[:80]}...")
        
        print()
        return fields

# Process all DBF files in both directories
dirs = [
    r"D:\SYSTRAT\Novos Projetos\Gestão Cemitérios\cemiterio\Cemiterio Central",
    r"D:\SYSTRAT\Novos Projetos\Gestão Cemitérios\cemiterio\Cemiterio Independencia"
]

for d in dirs:
    print(f"\n{'='*60}")
    print(f"Diretório: {d}")
    print(f"{'='*60}\n")
    for f in os.listdir(d):
        if f.upper().endswith('.DBF'):
            try:
                read_dbf_header(os.path.join(d, f))
            except Exception as e:
                print(f"Erro ao ler {f}: {e}\n")