@echo off
"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -u root -proot -e "CREATE DATABASE IF NOT EXISTS `cemiterios_migracao` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; SELECT 'Database created' as status;"
pause