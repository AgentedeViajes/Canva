#!/bin/bash
# Abre Lienzo en el navegador. Si el servidor local no está activo, lo inicia.
cd "$(dirname "$0")" || exit 1
PORT=4173
URL="http://127.0.0.1:${PORT}/"

if ! curl -s -m 1 -o /dev/null "$URL"; then
  echo "Iniciando Lienzo en el puerto ${PORT}..."
  nohup node server.mjs > /tmp/lienzo-server.log 2>&1 &
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 0.4
    if curl -s -m 1 -o /dev/null "$URL"; then break; fi
  done
fi

open "$URL"
echo "Lienzo abierto en ${URL}"
echo "Podés cerrar esta ventana de Terminal."
