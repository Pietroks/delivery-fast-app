@echo off
:: Script para liberar as portas do Expo Metro (8081) e API Fastify (3000) no Firewall do Windows
chcp 65001 >nul
echo.
echo =========================================================================
echo   Delivery Fast - Liberacao de Portas e Firewall para o Expo Go
echo =========================================================================
echo.

:: Verifica permissões de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [AVISO] Solicitando permissao de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo [1/3] Configurando perfil de rede para Privado...
powershell -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue"

echo [2/3] Liberando porta 8081 (Metro Bundler do Expo)...
netsh advfirewall firewall delete rule name="Expo Metro Bundler" >nul 2>&1
netsh advfirewall firewall add rule name="Expo Metro Bundler" dir=in action=allow protocol=TCP localport=8081 profile=any >nul

echo [3/3] Liberando porta 3000 (API Backend Delivery Fast)...
netsh advfirewall firewall delete rule name="Delivery Fast Backend API" >nul 2>&1
netsh advfirewall firewall add rule name="Delivery Fast Backend API" dir=in action=allow protocol=TCP localport=3000 profile=any >nul

echo.
echo =========================================================================
echo   SUCESSO! As portas 8081 e 3000 foram liberadas no Firewall do Windows.
echo   Agora o Expo Go no seu celular conseguira conectar perfeitamente!
echo =========================================================================
echo.
pause
