@echo off
rem Abre la oficina con tus sesiones reales de Claude Code. Necesita Node.js.
cd /d "%~dp0"
start "" http://localhost:8765/oficina.html
node collector\recolector.mjs --servir
pause
