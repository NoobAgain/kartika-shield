@echo off
rem Menjalankan Caraka terus-menerus di Windows. Bila berhenti atau galat, dimulai ulang otomatis dalam 10 detik.
cd /d "%~dp0"
if not exist caraka.config.json copy caraka.config.contoh.json caraka.config.json >nul
if exist rahasia-caraka.bat call rahasia-caraka.bat
echo Caraka siaga. Catatan ada di caraka.log. Tutup jendela ini untuk menghentikan.
:ulang
node caraka.js >> caraka.log 2>&1
echo %date% %time% Caraka berhenti, mulai ulang dalam 10 detik >> caraka.log
timeout /t 10 /nobreak >nul
goto ulang
