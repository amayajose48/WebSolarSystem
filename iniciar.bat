@echo off
cd /d "C:\Users\USUARIO\Desktop\cosmo_claude"

echo Iniciando servidor local...
start http://localhost:8000

python -m http.server 8000

pause