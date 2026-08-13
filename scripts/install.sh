#!/usr/bin/env bash
set -euo pipefail

REPO="1arley/devcli"
INSTALL_DIR="${DEVCLI_INSTALL_DIR:-$HOME/.devcli/bin}"
VERSION="${DEVCLI_VERSION:-latest}"

log()  { printf "\033[32m%s\033[0m\n" "$*"; }
warn() { printf "\033[33m%s\033[0m\n" "$*"; }
die()  { printf "\033[31m%s\033[0m\n" "$*" >&2; exit 1; }

detect_platform() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "$os" in
    linux) os="linux" ;;
    darwin) os="darwin" ;;
    *) die "Unsupported OS: $os" ;;
  esac

  case "$arch" in
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *) die "Unsupported architecture: $arch" ;;
  esac

  printf "%s-%s" "$os" "$arch"
}

get_latest_version() {
  if [ "$VERSION" != "latest" ]; then
    printf "%s" "$VERSION"
    return
  fi
  curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    | grep -o '"tag_name"[^,]*' \
    | sed 's/.*"v//; s/"//'
}

main() {
  local platform filename url version
  platform="$(detect_platform)"
  version="$(get_latest_version)"
  filename="devcli-${version}-${platform}"
  url="https://github.com/$REPO/releases/download/v${version}/${filename}"

  mkdir -p "$INSTALL_DIR"

  log "Installing devcli v$version ($platform)"
  log "Downloading $url"

  curl -fsSL "$url" -o "$INSTALL_DIR/dev"
  chmod +x "$INSTALL_DIR/dev"

  case "${SHELL:-}" in
    *bash) LINE="export PATH=\"$INSTALL_DIR:\$PATH\""; RC="$HOME/.bashrc" ;;
    *zsh)  LINE="export PATH=\"$INSTALL_DIR:\$PATH\""; RC="$HOME/.zshrc" ;;
    *fish) LINE="set -gx PATH $INSTALL_DIR \$PATH"; RC="$HOME/.config/fish/config.fish" ;;
    *)     LINE="export PATH=\"$INSTALL_DIR:\$PATH\""; RC="$HOME/.profile" ;;
  esac

  if ! grep -qF "$INSTALL_DIR" "$RC" 2>/dev/null; then
    printf '\n%s\n' "$LINE" >> "$RC"
    warn "Added devcli to PATH in $RC"
  fi

  log "Installed to $INSTALL_DIR/dev"
  log "Run 'source $RC' or open a new terminal, then use 'dev'"
}

main "$@"