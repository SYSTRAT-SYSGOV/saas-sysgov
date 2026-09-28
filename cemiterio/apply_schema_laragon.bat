@echo off
echo Aplicando schema MySQL...
"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -u root -proot cemiterios_migracao < "D:\SYSTRAT\Novos Projetos\Gestão Cemitérios\cemiterio\mysql_schema.sql"
echo Schema aplicado.
pause