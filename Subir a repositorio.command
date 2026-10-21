#!/bin/bash
# Inicializa el repositorio (si hace falta), crea el commit y lo sube.
# Uso: doble clic y pegar la URL del repositorio cuando la pida.
set -e
cd "$(dirname "$0")" || exit 1

if ! command -v git >/dev/null 2>&1; then
  echo "Git no está instalado. Instalalo desde https://git-scm.com/download/mac"
  read -r -p "Pulsá Enter para cerrar..."
  exit 1
fi

if [ ! -d .git ]; then
  echo "Inicializando repositorio Git..."
  git init
fi

git add .
if git diff --cached --quiet; then
  echo "No hay cambios nuevos para confirmar."
else
  git commit -m "Lienzo: editor de diseño gráfico" || {
    echo
    echo "Git necesita tu nombre y email. Configuralos una vez con:"
    echo '  git config --global user.name "Tu Nombre"'
    echo '  git config --global user.email "tu@email.com"'
    echo
    read -r -p "Pulsá Enter para cerrar..."
    exit 1
  }
fi

git branch -M main 2>/dev/null || true

if ! git remote get-url origin >/dev/null 2>&1; then
  echo
  echo "Pegá la URL del repositorio vacío (GitHub, GitLab, etc.)."
  echo "Ejemplo: https://github.com/tuusuario/lienzo.git"
  read -r -p "URL: " REPO_URL
  if [ -z "$REPO_URL" ]; then
    echo "No se indicó una URL. El commit quedó hecho localmente."
    read -r -p "Pulsá Enter para cerrar..."
    exit 1
  fi
  git remote add origin "$REPO_URL"
fi

echo
echo "Subiendo a $(git remote get-url origin) ..."
git push -u origin main
echo
echo "Listo. El repositorio ya tiene el proyecto."
read -r -p "Pulsá Enter para cerrar..."
