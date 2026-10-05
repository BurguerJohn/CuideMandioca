#!/usr/bin/env bash
# Põe o "Cuide bem da sua mandioca" no menu de aplicativos do Linux (e, se quiser, para abrir ao iniciar a sessão).
#
#   bash instalar-linux.sh                 cria o atalho no menu
#   bash instalar-linux.sh --autostart     cria o atalho e também abre o jogo ao iniciar a sessão
#   bash instalar-linux.sh --remover       tira os atalhos
# Os atalhos chamam o iniciar-linux.sh desta pasta (se a pasta mudar de lugar, rode de novo).
set -eu

AQUI="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
DADOS="${XDG_DATA_HOME:-$HOME/.local/share}"
CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}"
NOME=cuidebemdasuamandioca
MENU="$DADOS/applications/$NOME.desktop"
AUTO="$CONFIG/autostart/$NOME.desktop"
ICONE_DESTINO="$DADOS/icons/hicolor/256x256/apps/$NOME.png"

AUTOSTART=0
REMOVER=0
for arg in "$@"; do
  case "$arg" in
    --autostart) AUTOSTART=1 ;;
    --remover) REMOVER=1 ;;
    -h | --ajuda | --help) sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opção desconhecida: $arg" >&2; exit 2 ;;
  esac
done

if [ "$REMOVER" = 1 ]; then
  rm -f "$MENU" "$AUTO" "$ICONE_DESTINO"
  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$DADOS/applications" >/dev/null 2>&1 || true
  echo "Atalhos removidos."
  exit 0
fi

# O ícone: na pasta do projeto fica em desktop/icon.png; no jogo empacotado, ao lado deste script.
ICONE=""
for candidato in "$AQUI/icone.png" "$AQUI/desktop/icon.png"; do
  [ -f "$candidato" ] && ICONE="$candidato" && break
done
if [ -n "$ICONE" ]; then
  mkdir -p "$(dirname "$ICONE_DESTINO")"
  cp "$ICONE" "$ICONE_DESTINO"
fi

# O arquivo .desktop: o Exec precisa de aspas se o caminho tiver espaço ou caracteres especiais.
entrada() {
  local extra="$1"
  local caminho="$AQUI/iniciar-linux.sh"
  caminho="${caminho//\\/\\\\}"
  caminho="${caminho//\"/\\\"}"
  caminho="${caminho//\$/\\\$}"
  caminho="${caminho//\`/\\\`}"
  cat <<ENTRADA
[Desktop Entry]
Type=Application
Version=1.0
Name=Cuide bem da sua mandioca
Comment=A festa junina de pixel que vive na sua área de trabalho
Exec=bash "$caminho"
Path=$AQUI
Icon=$([ -n "$ICONE" ] && echo "$NOME" || echo "applications-games")
Terminal=false
Categories=Game;Simulation;
StartupWMClass=$NOME
${extra}
ENTRADA
}

mkdir -p "$(dirname "$MENU")"
entrada "" >"$MENU"
chmod +x "$MENU" 2>/dev/null || true
echo "Atalho do menu: $MENU"

if [ "$AUTOSTART" = 1 ]; then
  mkdir -p "$(dirname "$AUTO")"
  entrada "X-GNOME-Autostart-enabled=true" >"$AUTO"
  echo "Abrir ao iniciar a sessão: $AUTO"
else
  rm -f "$AUTO"
fi
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$DADOS/applications" >/dev/null 2>&1 || true
echo "Pronto. Procure por \"Cuide bem da sua mandioca\" no menu de aplicativos."
