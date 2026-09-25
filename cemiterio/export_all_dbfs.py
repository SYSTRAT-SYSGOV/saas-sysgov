import struct
import csv
import os
import sys
from datetime import datetime

def read_dbf_full(filepath, encoding='cp850'):
    """Read entire DBF file and return (fields, records)"""
    with open(filepath, 'rb') as f:
        # Read header (32 bytes)
        header = f.read(32)
        if len(header) < 32:
            raise ValueError(f"Arquivo muito pequeno: {filepath}")
        
        version = header[0]
        year = header[1] + 1900
        month = header[2]
        day = header[3]
        num_records = struct.unpack('<I', header[4:8])[0]
        header_len = struct.unpack('<H', header[8:10])[0]
        record_len = struct.unpack('<H', header[10:12])[0]
        
        # Read field descriptors
        f.seek(32)
        fields = []
        field_offsets = []
        offset = 1  # byte 0 = delete flag
        
        while True:
            field_data = f.read(32)
            if len(field_data) < 32:
                break
            if field_data[0] == 0x0D:  # Terminator
                break
            
            name = field_data[0:11].rstrip(b'\x00').decode('ascii', errors='replace')
            field_type = chr(field_data[11])
            field_length = field_data[16]
            field_decimal = field_data[17]
            
            fields.append({
                'name': name,
                'type': field_type,
                'length': field_length,
                'decimal': field_decimal
            })
            field_offsets.append(offset)
            offset += field_length
        
        # Verify record length
        if offset != record_len:
            pass  # Some DBFs have extra bytes
        
        # Read all records
        f.seek(header_len)
        records = []
        deleted_count = 0
        
        for i in range(num_records):
            record = f.read(record_len)
            if len(record) < record_len:
                break
            
            deleted = record[0] == 0x2A  # '*' = deleted
            if deleted:
                deleted_count += 1
                continue
            
            values = {}
            for j, field in enumerate(fields):
                start = field_offsets[j]
                end = start + field['length']
                raw = record[start:end]
                
                if field['type'] == 'C':  # Character
                    val = raw.rstrip(b' \x00').decode(encoding, errors='replace')
                    values[field['name']] = val
                elif field['type'] == 'N':  # Numeric
                    val = raw.rstrip(b' \x00').decode('ascii', errors='replace')
                    if not val or val.strip() == '':
                        values[field['name']] = None
                    elif field['decimal'] > 0:
                        try:
                            values[field['name']] = float(val)
                        except:
                            values[field['name']] = val
                    else:
                        try:
                            values[field['name']] = int(val)
                        except:
                            values[field['name']] = val
                elif field['type'] == 'D':  # Date (YYYYMMDD)
                    val = raw.decode('ascii', errors='replace').strip()
                    if val and val != '00000000' and val != '11111111':
                        try:
                            values[field['name']] = f"{val[0:4]}-{val[4:6]}-{val[6:8]}"
                        except:
                            values[field['name']] = val
                    else:
                        values[field['name']] = None
                elif field['type'] == 'L':  # Logical
                    values[field['name']] = raw[0:1] in (b'Y', b'y', b'T', b't')
                elif field['type'] == 'M':  # Memo
                    values[field['name']] = raw.decode(encoding, errors='replace').rstrip()
                else:
                    values[field['name']] = raw.decode(encoding, errors='replace').rstrip()
            
            records.append(values)
        
        return fields, records, deleted_count

def write_csv(fields, records, output_path):
    """Write records to CSV"""
    fieldnames = [f['name'] for f in fields]
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

def write_parquet(fields, records, output_path):
    """Write records to Parquet (requires pyarrow)"""
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
        
        # Convert to pyarrow table
        arrays = {}
        for field in fields:
            name = field['name']
            vals = [r.get(name) for r in records]
            
            if field['type'] == 'C':
                arrays[name] = pa.array(vals, type=pa.string())
            elif field['type'] == 'N':
                if field['decimal'] > 0:
                    arrays[name] = pa.array(vals, type=pa.float64())
                else:
                    arrays[name] = pa.array(vals, type=pa.int64())
            elif field['type'] == 'D':
                # Convert date strings to date32
                date_vals = []
                for v in vals:
                    if v is None:
                        date_vals.append(None)
                    else:
                        try:
                            dt = datetime.strptime(v, '%Y-%m-%d')
                            date_vals.append(dt.date())
                        except:
                            date_vals.append(None)
                arrays[name] = pa.array(date_vals, type=pa.date32())
            elif field['type'] == 'L':
                arrays[name] = pa.array(vals, type=pa.bool_())
            else:
                arrays[name] = pa.array(vals, type=pa.string())
        
        table = pa.table(arrays)
        pq.write_table(table, output_path, compression='snappy')
        return True
    except ImportError:
        print(f"  ⚠ pyarrow não instalado, pulando Parquet: {output_path}")
        return False

def process_directory(input_dir, output_base, format='both'):
    """Process all DBF files in a directory"""
    dbf_files = [f for f in os.listdir(input_dir) if f.upper().endswith('.DBF')]
    print(f"\n{'='*60}")
    print(f"Processando: {input_dir}")
    print(f"Arquivos DBF encontrados: {len(dbf_files)}")
    print(f"{'='*60}")
    
    summary = []
    
    for dbf_file in sorted(dbf_files):
        input_path = os.path.join(input_dir, dbf_file)
        base_name = os.path.splitext(dbf_file)[0]
        
        # Create output subdirectory
        rel_dir = os.path.relpath(input_dir, r"D:\SYSTRAT\Novos Projetos\Gestão Cemitérios\cemiterio")
        out_dir = os.path.join(output_base, rel_dir)
        os.makedirs(out_dir, exist_ok=True)
        
        try:
            print(f"\n  Lendo: {dbf_file}...")
            fields, records, deleted = read_dbf_full(input_path)
            
            print(f"    Campos: {len(fields)} | Registros válidos: {len(records)} | Excluídos: {deleted}")
            for field in fields:
                print(f"      {field['name']}: {field['type']}({field['length']},{field['decimal']})")
            
            # Write CSV
            if format in ('csv', 'both'):
                csv_path = os.path.join(out_dir, f"{base_name}.csv")
                write_csv(fields, records, csv_path)
                print(f"    [OK] CSV: {csv_path}")
            
            # Write Parquet
            if format in ('parquet', 'both'):
                pq_path = os.path.join(out_dir, f"{base_name}.parquet")
                if write_parquet(fields, records, pq_path):
                    print(f"    [OK] Parquet: {pq_path}")
            
            summary.append({
                'table': base_name,
                'fields': len(fields),
                'records': len(records),
                'deleted': deleted,
                'csv': f"{base_name}.csv" if format in ('csv', 'both') else None,
                'parquet': f"{base_name}.parquet" if format in ('parquet', 'both') else None
            })
            
        except Exception as e:
            print(f"    [ERRO] {e}")
            summary.append({
                'table': base_name,
                'error': str(e)
            })
    
    return summary

def main():
    base_input = r"D:\SYSTRAT\Novos Projetos\Gestão Cemitérios\cemiterio"
    base_output = r"D:\SYSTRAT\Novos Projetos\Gestão Cemitérios\cemiterio\exported_data"
    
    dirs = [
        os.path.join(base_input, "Cemiterio Central"),
        os.path.join(base_input, "Cemiterio Independencia")
    ]
    
    all_summary = {}
    
    for d in dirs:
        if os.path.exists(d):
            summary = process_directory(d, base_output, format='both')
            all_summary[os.path.basename(d)] = summary
    
    # Write summary report
    summary_path = os.path.join(base_output, "EXTRACTION_SUMMARY.txt")
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write("RELATÓRIO DE EXTRAÇÃO DBF → CSV/Parquet\n")
        f.write("=" * 60 + "\n")
        f.write(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Origem: {base_input}\n")
        f.write(f"Destino: {base_output}\n")
        f.write(f"Encoding: CP850 → UTF-8\n\n")
        
        total_records = 0
        total_tables = 0
        
        for dir_name, summary in all_summary.items():
            f.write(f"\n{dir_name.upper()}\n")
            f.write("-" * 40 + "\n")
            for s in summary:
                if 'error' in s:
                    f.write(f"  {s['table']}: ERRO - {s['error']}\n")
                else:
                    f.write(f"  {s['table']}: {s['records']} regs, {s['fields']} campos, {s['deleted']} excluídos\n")
                    total_records += s['records']
                    total_tables += 1
        
        f.write(f"\n{'='*60}\n")
        f.write(f"TOTAL: {total_tables} tabelas, {total_records} registros válidos\n")
    
    print(f"\n{'='*60}")
    print(f"EXTRAÇÃO CONCLUÍDA")
    print(f"Resumo salvo em: {summary_path}")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()