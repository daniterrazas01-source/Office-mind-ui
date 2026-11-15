#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Publica en monitos.json lo que hace un monito con tarea programada y sube el cambio.
La página web de la oficina lee este archivo; por eso todo lo que hay aquí es público.

  python3 publicar.py estado <id> trabajando <area> "<actividad>"
  python3 publicar.py estado <id> listo
  python3 publicar.py reporte <id> <archivo.json>     (el resumen; se guardan los 30 más nuevos)
  python3 publicar.py sincronizar <carpeta>           (copia lo que ArtifactData guardó con out_dir:
                                                       <carpeta>/monitos/<id>.json y
                                                       <carpeta>/monitos/<id>/reportes/<fecha>.json,
                                                       <carpeta>/monitos/<id>/memoria/<nota>.json y
                                                       <carpeta>/avisos/<id>.json)
"""
import json
import subprocess
import sys
from datetime import datetime, timezone

ARCHIVO = "monitos.json"


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, timeout=120)


def documento(ruta):
    """Un documento guardado por ArtifactData: a veces viene envuelto en {"id", "data", "version"}."""
    with open(ruta, encoding="utf-8") as f:
        j = json.load(f)
    return j["data"] if isinstance(j, dict) and isinstance(j.get("data"), dict) and ("version" in j or "id" in j) else j


def subir(mensaje):
    git("add", ARCHIVO)
    if git("diff", "--cached", "--quiet").returncode == 0:
        print("sin cambios")
        return
    git("-c", "user.name=Oficina", "-c", "user.email=oficina@localhost", "commit", "-q", "-m", mensaje)
    for intento in range(4):
        r = git("push", "-q", "origin", "HEAD:datos")
        if r.returncode == 0:
            print("publicado:", mensaje)
            return
        git("pull", "-q", "--rebase", "origin", "datos")
    sys.exit("No se pudo subir: " + r.stderr[-300:])


def sincronizar(carpeta):
    import glob
    import os
    git("pull", "-q", "--rebase", "origin", "datos")
    with open(ARCHIVO, encoding="utf-8") as f:
        datos = json.load(f)
    antes = json.dumps(datos, sort_keys=True, ensure_ascii=False)
    fichas = sorted(glob.glob(os.path.join(carpeta, "monitos", "*.json")))
    if not fichas:
        sys.exit("No encontré fichas en " + os.path.join(carpeta, "monitos"))
    for ruta in fichas:
        mid = os.path.basename(ruta)[:-5]
        ficha = documento(ruta)
        m = next((x for x in datos["monitos"] if x.get("id") == mid), None)
        if m is None:
            m = {"id": mid, "reportes": []}
            datos["monitos"].append(m)
        viejos = {r.get("id"): r for r in m.get("reportes", [])}
        viejo_m = dict(m)
        m.clear()
        m.update(ficha)
        m["id"] = mid
        for rr in glob.glob(os.path.join(carpeta, "monitos", mid, "reportes", "*.json")):
            r = documento(rr)
            r["id"] = os.path.basename(rr)[:-5]
            viejos[r["id"]] = r
        m["reportes"] = sorted(viejos.values(), key=lambda r: str(r.get("creado") or r.get("id")), reverse=True)[:30]
        notas = []                                         # su memoria: se copia completa, tal como está en la base
        for rr in sorted(glob.glob(os.path.join(carpeta, "monitos", mid, "memoria", "*.json"))):
            n = documento(rr)
            n["id"] = os.path.basename(rr)[:-5]
            notas.append(n)
        m["memoria"] = notas if notas else viejo_m.get("memoria", [])   # si no llegó ninguna, se queda la que había
    avisos = []                                            # avisos de la oficina (cambios, novedades)
    for rr in glob.glob(os.path.join(carpeta, "avisos", "*.json")):
        a = documento(rr)
        a["id"] = os.path.basename(rr)[:-5]
        avisos.append(a)
    if avisos:
        datos["avisos"] = sorted(avisos, key=lambda a: str(a.get("creado") or a.get("id")), reverse=True)[:20]
    if json.dumps(datos, sort_keys=True, ensure_ascii=False) == antes:
        print("sin cambios")
        return
    datos["actualizado"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(ARCHIVO, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
        f.write("\n")
    subir("sincronizado con la base de la oficina")


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "sincronizar":
        return sincronizar(sys.argv[2])
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
        del m["reportes"][30:]
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
