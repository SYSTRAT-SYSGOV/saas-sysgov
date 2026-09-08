@echo off
chcp 65001 >nul
echo ========================================================
echo  SYSGOV - Atualizar PHP do Sistema para PHP 8.4.20
echo ========================================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando privilégios de Administrador...
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

powershell -NoProfile -Command ^
    "$path = [Environment]::GetEnvironmentVariable('PATH', 'Machine');" ^
    "if ($path -match 'php-8\.3\.28-Win32-vs16-x64') {" ^
    "    $newPath = $path -replace 'php-8\.3\.28-Win32-vs16-x64', 'php-8.4.20-Win32-vs17-x64';" ^
    "    [Environment]::SetEnvironmentVariable('PATH', $newPath, 'Machine');" ^
    "    Write-Host 'SUCESSO: PATH do Sistema atualizado para PHP 8.4.20!' -ForegroundColor Green;" ^
    "} else {" ^
    "    Write-Host 'AVISO: A entrada php-8.3.28 não foi encontrada no PATH do Sistema.' -ForegroundColor Yellow;" ^
    "}"

echo.
echo Pressione qualquer tecla para fechar...
pause >nul
