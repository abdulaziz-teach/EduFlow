@echo off
title EduFlow Backend Server (Port 5000)
color 0A
echo ===================================================
echo       EduFlow Platform - Backend Server
echo       API Manzili: http://localhost:5000/api
echo ===================================================
cd /d "%~dp0\backend"
node src/server.js
pause
