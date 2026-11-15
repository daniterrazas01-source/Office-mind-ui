#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Publica en monitos.json lo que hace un monito con tarea programada y sube el cambio.
La página web de la oficina lee este archivo; por eso todo lo que hay aquí es público.

  python3 publicar.py estado <id> trabajando <area> "<actividad>"
  python3 publicar.py estado <id> listo
  python3 publicar.py reporte <id> <archivo.json>     (el resumen; se guardan los 10 más nuevos)
"""
import json
import subprocess
import sys
from datetime import datetime, timezone

ARCHIVO = "monitos.json"


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, timeout=120)


def main():
    if len(sys.argv) < 4 or sys.argv[1] not in ("estado", "reporte"):
        sys.exit(__doc__)
    accion, mid = sys.argv[1], sys.argv[2]
    git("pull", "-q", "--rebase", "origin", "datos")
    with open(ARCHIVO, encoding="utf-8") as f:
        datos = json.load(f)
    m = next((x for x in datos["monitos"] if x.get("id") == mid), None)
    if m is None:
        sys.exit("No hay un monito con id " + mid)
    ahora = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if accion == "estado":
        m["estado"] = sys.argv[3]
        m["area"] = sys.argv[4] if len(sys.argv) > 4 else m.get("area", "internet")
        m["actividad"] = sys.argv[5] if len(sys.argv) > 5 else ""
    else:
        with open(sys.argv[3], encoding="utf-8") as f:
            r = json.load(f)
        if not r.get("id"):
            sys.exit("El resumen necesita un campo id (la fecha, AAAA-MM-DD)")
        m["reportes"] = [r] + [x for x in m.get("reportes", []) if x.get("id") != r["id"]]
        del m["reportes"][10:]
    m["actualizado"] = datos["actualizado"] = ahora
    with open(ARCHIVO, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
        f.write("\n")
    git("add", ARCHIVO)
    git("-c", "user.name=Oficina", "-c", "user.email=oficina@localhost", "commit", "-q", "-m", "%s: %s" % (mid, accion))
    for intento in range(4):
        r = git("push", "-q", "origin", "HEAD:datos")
        if r.returncode == 0:
            print("publicado:", mid, accion)
            return
        git("pull", "-q", "--rebase", "origin", "datos")
    sys.exit("No se pudo subir: " + r.stderr[-300:])


if __name__ == "__main__":
    main()
