@echo off
"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -u root -proot cemiterios_migracao < "D:\SYSTRAT\Novos Projetos\Gestao Cemiterios\cemiterio\mysql_schema.sql"
echo Schema aplicado.
pause