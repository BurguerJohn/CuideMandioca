#!/usr/bin/env bash
# Inicializador do "Cuide bem da sua mandioca" para Linux.
#
# Abre o jogo no modo certo para o seu ambiente gráfico:
#   sobreposicao  a festa transparente por cima da área de trabalho, com o clique atravessando (X11 com compositor);
#   janela        uma janela comum, com o céu de fundo (Wayland, ou X11 sem compositor: ali o transparente sairia preto).
# Funciona na pasta do jogo empacotado (ao lado do executável CuideBemDaSuaMandioca) e na pasta do projeto (npm install antes).
set -u

AQUI="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"

uso() {
  cat <<'AJUDA'
Uso: bash iniciar-linux.sh [opções] [argumentos do Electron]

  --janela            abre numa janela comum, com fundo (sem transparência)
  --sobreposicao      abre a festa transparente por cima da tela (X11 com compositor; no Wayland usa o XWayland)
  --sem-gpu           desliga a aceleração por placa de vídeo (se a janela transparente sair preta ou piscar)
  --sem-sandbox       abre sem o sandbox do Chromium (o inicializador já faz isso sozinho quando o sistema não deixa)
  --mostrar-comando   só mostra o que seria executado
  -h, --ajuda         esta ajuda

Sem opção, o modo é escolhido pelo ambiente: Wayland ou X11 sem compositor abre em janela; X11 com compositor, em sobreposição.
Também dá para fixar o modo com a variável ARRAIA_MODO=janela|sobreposicao e ARRAIA_SEM_GPU=1.
AJUDA
}

MODO="${ARRAIA_MODO:-}"
SEM_GPU="${ARRAIA_SEM_GPU:-0}"
SEM_SANDBOX=0
SO_MOSTRAR=0
EXTRAS=()
for arg in "$@"; do
  case "$arg" in
    --janela) MODO=janela ;;
    --sobreposicao) MODO=sobreposicao ;;
    --sem-gpu) SEM_GPU=1 ;;
    --sem-sandbox) SEM_SANDBOX=1 ;;
    --mostrar-comando) SO_MOSTRAR=1 ;;
    -h | --ajuda | --help) uso; exit 0 ;;
    *) EXTRAS+=("$arg") ;;
  esac
done
case "$MODO" in
  '' | janela | sobreposicao) ;;
  *) echo "[mandioca] ARRAIA_MODO inválido ('$MODO'): use janela ou sobreposicao." >&2; exit 2 ;;
esac

# O que vamos executar: o jogo empacotado ou o projeto com o Electron do node_modules.
if [ -f "$AQUI/CuideBemDaSuaMandioca" ]; then
  # Se os arquivos vieram de um Windows (um depot da Steam enviado de lá, por exemplo), o bit de executável pode ter se perdido: devolve.
  if [ "$SO_MOSTRAR" = 0 ]; then
    chmod +x "$AQUI/CuideBemDaSuaMandioca" "$AQUI/chrome_crashpad_handler" "$AQUI/instalar-linux.sh" 2>/dev/null || true
  fi
  PROGRAMA=("$AQUI/CuideBemDaSuaMandioca")
  SANDBOX="$AQUI/chrome-sandbox"
elif [ -x "$AQUI/node_modules/.bin/electron" ]; then
  PROGRAMA=("$AQUI/node_modules/.bin/electron" "$AQUI")
  SANDBOX="$AQUI/node_modules/electron/dist/chrome-sandbox"
elif command -v electron >/dev/null 2>&1; then
  PROGRAMA=(electron "$AQUI")
  SANDBOX=""
else
  echo "[mandioca] Não achei o jogo para abrir." >&2
  echo "[mandioca] Na pasta do projeto, rode primeiro: npm install" >&2
  exit 1
fi

# O ambiente gráfico.
SESSAO="${XDG_SESSION_TYPE:-}"
if [ -z "$SESSAO" ]; then
  if [ -n "${WAYLAND_DISPLAY:-}" ]; then SESSAO=wayland
  elif [ -n "${DISPLAY:-}" ]; then SESSAO=x11
  fi
fi
if [ "$SO_MOSTRAR" = 0 ] && [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then
  echo "[mandioca] Não há ambiente gráfico (DISPLAY e WAYLAND_DISPLAY vazios)." >&2
  exit 1
fi

# Aberto pela Steam, o Linux antigo dela (steam-runtime) põe as próprias bibliotecas na frente (libstdc++, libgcc...), e o Chromium do Electron
# precisa das do sistema, mais novas. Tira só as pastas desse runtime antigo do LD_LIBRARY_PATH (o runtime novo, em contêiner, não passa por aqui).
# ARRAIA_MANTER_LD=1 não mexe em nada.
LD_ORIGINAL="${LD_LIBRARY_PATH:-}"
LD_MUDOU=0
if [ -n "$LD_ORIGINAL" ] && [ "${ARRAIA_MANTER_LD:-0}" != 1 ]; then
  LD_NOVO=""
  IFS=: read -r -a LD_PARTES <<<"$LD_ORIGINAL"
  for parte in "${LD_PARTES[@]}"; do
    case "$parte" in
      *steam-runtime*) ;;
      *) LD_NOVO="${LD_NOVO:+$LD_NOVO:}$parte" ;;
    esac
  done
  if [ "$LD_NOVO" != "$LD_ORIGINAL" ]; then
    # (um LD_LIBRARY_PATH vazio contaria a pasta atual na busca: se não sobrou nada, some de vez)
    if [ -n "$LD_NOVO" ]; then export LD_LIBRARY_PATH="$LD_NOVO"; else unset LD_LIBRARY_PATH; fi
    LD_MUDOU=1
  fi
fi

# O modo: a escolha manual vale mais; senão, Wayland abre em janela, e no X11 só com compositor (xprop acha pela seleção _NET_WM_CM_S0).
MOTIVO=escolha
if [ -z "$MODO" ]; then
  MODO=sobreposicao
  MOTIVO=x11
  if [ "$SESSAO" = wayland ]; then
    MODO=janela
    MOTIVO=wayland
  elif command -v xprop >/dev/null 2>&1 && ! xprop -root _NET_WM_CM_S0 2>/dev/null | grep -q 'window id'; then
    MODO=janela
    MOTIVO=sem-compositor
  fi
fi
export ARRAIA_MODO="$MODO"

# As chaves do Chromium (as mesmas que o jogo aplica sozinho; aqui vão na linha de comando porque algumas são lidas antes do JavaScript).
CHAVES=()
if [ "$MODO" = sobreposicao ]; then
  CHAVES+=(--enable-transparent-visuals)
  [ "$SESSAO" = wayland ] && CHAVES+=(--ozone-platform=x11)
elif [ "$SESSAO" = wayland ]; then
  CHAVES+=(--ozone-platform-hint=auto)
fi
[ "$SEM_GPU" = 1 ] && CHAVES+=(--disable-gpu)

# Sandbox: sem o chrome-sandbox com setuid root, o Chromium precisa de namespaces de usuário. Onde o sistema não deixa (Ubuntu 24.04 e
# parecidos), o jogo só abre com --no-sandbox.
if [ "$SEM_SANDBOX" = 0 ] && [ -n "$SANDBOX" ] && [ -e "$SANDBOX" ]; then
  if [ "$(stat -c '%a %U' "$SANDBOX" 2>/dev/null)" != "4755 root" ] && ! unshare --user true >/dev/null 2>&1; then
    SEM_SANDBOX=1
    echo "[mandioca] O sistema não permite o sandbox do Chromium sem root: abrindo com --no-sandbox." >&2
  fi
fi
[ "$SEM_SANDBOX" = 1 ] && CHAVES+=(--no-sandbox)

if [ "$SO_MOSTRAR" = 1 ]; then
  printf 'ARRAIA_MODO=%s (%s)\n' "$MODO" "$MOTIVO"
  [ "${LD_MUDOU:-0}" = 1 ] && printf 'LD_LIBRARY_PATH=%s (sem o steam-runtime antigo)\n' "$LD_NOVO"
  printf '%q ' "${PROGRAMA[@]}" ${CHAVES[@]+"${CHAVES[@]}"} ${EXTRAS[@]+"${EXTRAS[@]}"}
  printf '\n'
  exit 0
fi

echo "[mandioca] modo: $MODO ($MOTIVO)" >&2
exec "${PROGRAMA[@]}" ${CHAVES[@]+"${CHAVES[@]}"} ${EXTRAS[@]+"${EXTRAS[@]}"}
