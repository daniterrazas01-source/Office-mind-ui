#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Avisa al relevo de la oficina qué hace esta sesión de Claude Code.

Es un hook de Claude Code (PreToolUse, UserPromptSubmit, Stop, Notification, SessionStart).
Sirve igual en la laptop que en las sesiones de la nube. No hace ningún trabajo ni toca
archivos del proyecto. Si algo falla, se calla para no estorbar.

Necesita dos datos, por variable de entorno o en ~/.claude/oficina_relevo.json:
  OFICINA_RELEVO_URL    dirección del worker, p. ej. https://oficina-relevo.TU-CUENTA.workers.dev
  OFICINA_RELEVO_LLAVE  la llave de escritura (en la nube no hace falta: la pone el proxy)
Opcional: OFICINA_EQUIPO (cómo se llama este aparato en el gafete) y OFICINA_DISPOSITIVO.
"""
import json
import os
import re
import sys
import tempfile
import time
import urllib.request

CADA = 15  # segundos mínimos entre avisos (salvo al terminar)
QUE = {
    "Read": ("biblioteca", "Leyendo {f}"), "Grep": ("biblioteca", "Buscando en el código"),
    "Glob": ("biblioteca", "Buscando archivos"), "Write": ("escritorio", "Creando {f}"),
    "Edit": ("escritorio", "Editando {f}"), "NotebookEdit": ("escritorio", "Editando {f}"),
    "WebSearch": ("internet", "Buscando en internet"), "WebFetch": ("internet", "Leyendo una página"),
    "Agent": ("sala de juntas", "Pidiendo ayuda a un ayudante"), "Task": ("sala de juntas", "Pidiendo ayuda a un ayudante"),
    "EnterPlanMode": ("centro de pensado", "Planeando"), "ExitPlanMode": ("centro de pensado", "Planeando"),
    "TodoWrite": ("centro de pensado", "Organizando pendientes"),
}


def config():
    c = {}
    try:
        with open(os.path.expanduser("~/.claude/oficina_relevo.json"), encoding="utf-8") as f:
            c = json.load(f)
    except Exception:
        pass
    return {
        "url": (os.environ.get("OFICINA_RELEVO_URL") or c.get("url") or "").rstrip("/"),
        "llave": os.environ.get("OFICINA_RELEVO_LLAVE") or c.get("llave") or "",
        "equipo": os.environ.get("OFICINA_EQUIPO") or c.get("equipo") or "",
        "dispositivo": os.environ.get("OFICINA_DISPOSITIVO") or c.get("dispositivo") or ("nube" if os.environ.get("CLAUDE_CODE_REMOTE_SDK_URL") else "laptop"),
    }


def corto(texto, palabras=10, letras=60):
    t = " ".join(str(texto or "").split()[:palabras])
    return t if len(t) <= letras else t[:letras - 1] + "…"


def titulo_y_modelo(ruta):
    """El título de la sesión y el modelo, sacados del final del transcript."""
    if not ruta:
        return None, None
    try:
        with open(ruta, "rb") as f:
            f.seek(0, 2)
            f.seek(max(0, f.tell() - 2_000_000))
            cola = f.read().decode("utf-8", "ignore")
    except Exception:
        return None, None
    titulo = None
    for clave in ("customTitle", "aiTitle"):
        h = re.findall(r'"%s"\s*:\s*"((?:[^"\\]|\\.)*)"' % clave, cola)
        if h:
            try:
                titulo = json.loads('"' + h[-1] + '"').strip() or None
            except Exception:
                titulo = None
            if titulo:
                break
    m = re.findall(r'"model"\s*:\s*"([^"]+)"', cola)
    modelo = next((x for x in ("haiku", "sonnet", "opus", "fable") if m and x in m[-1].lower()), None)
    return titulo, modelo


def main():
    c = config()
    if not c["url"]:
        return
    d = json.loads(sys.stdin.buffer.read().decode("utf-8-sig", "replace") or "{}")
    de_ayudante = bool(d.get("agent_id"))  # lo hace un ayudante (subagente): no sale como monito aparte, se anota en su sesión
    if os.path.exists(os.path.join(str(d.get("cwd") or ""), ".claude", "hooks", "oficina_terrazas.py")):
        return  # este proyecto ya avisa a la oficina con su propio hook (dragtrim): no se duplica
    ses = re.sub(r"[^A-Za-z0-9]", "", str(d.get("session_id") or "x"))[:12] or "x"
    guarda = os.path.join(tempfile.gettempdir(), "oficina_aviso_%s.json" % ses)
    try:
        with open(guarda, encoding="utf-8") as f:
            g = json.load(f)
    except Exception:
        g = {"enviado": 0}

    ev, tool, inp = d.get("hook_event_name"), d.get("tool_name") or "", d.get("tool_input") or {}
    area, actividad, estado, urgente, archivo = "escritorio", "Trabajando", "trabajando", False, None
    if de_ayudante and ev != "PreToolUse":
        return
    if ev == "PreToolUse":
        ruta = inp.get("file_path") or inp.get("notebook_path") or ""
        nombre = os.path.basename(str(ruta).replace("\\", "/")) if ruta else "un archivo"
        if tool in QUE:
            area, actividad = QUE[tool][0], QUE[tool][1].format(f=nombre)
        elif tool == "Bash":
            actividad = inp.get("description") or "Usando la terminal"
        elif tool == "Workflow":
            g["ultra"] = True
            actividad = "Trabajando en modo Ultra"
        if tool in ("Write", "Edit", "NotebookEdit") and ruta:
            archivo = {"nombre": nombre, "tipo": "creado" if tool == "Write" else "editado"}
    elif ev == "UserPromptSubmit":
        actividad, g["ultra"] = "Leyendo el mensaje", False
    elif ev in ("Stop", "SessionStart", "SessionEnd") or (ev == "Notification" and d.get("notification_type") == "idle_prompt"):
        area, actividad, estado, urgente, g["ultra"] = "descanso", "Esperando instrucciones", "esperando", True, False
    elif ev == "Notification":
        actividad, estado = "Esperando permiso", "esperando"
    else:
        return

    if de_ayudante:      # se manda como dato de la sesión: ella sigue "coordinando" y la oficina pone a su agente a hacerlo
        g["ayudante"] = {"actividad": corto(actividad), "area": area, "visto": time.time()}
        area, actividad, archivo = g.get("area") or "sala de juntas", g.get("actividad") or "Coordinando a su ayudante", None
    elif estado == "trabajando":
        g["area"], g["actividad"] = area, actividad
    else:
        g.pop("ayudante", None)
    if not urgente and time.time() - g.get("enviado", 0) < CADA:
        with open(guarda, "w", encoding="utf-8") as f:
            json.dump(g, f, ensure_ascii=False)
        return
    titulo, modelo = titulo_y_modelo(d.get("transcript_path"))
    g["titulo"], g["modelo"] = titulo or g.get("titulo"), modelo or g.get("modelo")
    nombre = g["titulo"] or os.path.basename(str(d.get("cwd") or "").replace("\\", "/")) or ("Sesión " + ses[:4])
    aviso = {"id": "ses-" + ses, "nombre": corto(nombre, 6, 18), "titulo": corto(nombre, 12, 60),
             "proyecto": os.path.basename(str(d.get("cwd") or "").replace("\\", "/")),
             "area": area, "actividad": corto(actividad), "estado": estado,
             "modo": "ultra" if g.get("ultra") and estado == "trabajando" else "normal",
             "dispositivo": c["dispositivo"], "origen": c["dispositivo"]}
    if g.get("modelo"):
        aviso["modelo"] = g["modelo"]
    ay = g.get("ayudante")
    if ay and estado == "trabajando" and time.time() - ay.get("visto", 0) < 180:
        aviso["ayudante_actividad"], aviso["ayudante_area"] = ay["actividad"], ay["area"]
    if c["equipo"]:
        aviso["equipo"] = c["equipo"]
    if archivo:
        aviso["archivo"] = archivo
    cabeceras = {"Content-Type": "application/json", "User-Agent": "oficina-aviso"}
    if c["llave"]:
        cabeceras["Authorization"] = "Bearer " + c["llave"]
    req = urllib.request.Request(c["url"] + "/aviso", data=json.dumps(aviso).encode("utf-8"), headers=cabeceras, method="POST")
    urllib.request.urlopen(req, timeout=8).read()
    g["enviado"] = time.time()
    with open(guarda, "w", encoding="utf-8") as f:
        json.dump(g, f, ensure_ascii=False)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
