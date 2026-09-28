$connStr = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=D:\SYSTRAT\Novos Projetos\Gestão Cemitérios\cemiterio\Cemiterio Central\;Extended Properties=dBASE IV;'
try {
    $conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
    $conn.Open()
    $schema = $conn.GetSchema('Tables')
    $schema | Select-Object TABLE_NAME, TABLE_TYPE | Format-Table -AutoSize
    
    foreach ($table in $schema.Rows) {
        $name = $table.TABLE_NAME
        Write-Host "=== $name ==="
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT TOP 1 * FROM [$name]"
        $reader = $cmd.ExecuteReader()
        $schemaTable = $reader.GetSchemaTable()
        $schemaTable | Select-Object ColumnName, DataType, ColumnSize, NumericPrecision, NumericScale | Format-Table -AutoSize
        $reader.Close()
        Write-Host ""
    }
    $conn.Close()
} catch {
    Write-Host "Erro: $($_.Exception.Message)"
}