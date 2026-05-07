#!/bin/bash
# Install the Thunderbird Agent extension into the current user's Thunderbird profile.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_DIR/dist"
XPI_FILE="$DIST_DIR/thunderbird-agent.xpi"

find_profile() {
    local profile_roots=(
        "$HOME/.thunderbird"
        "$HOME/.var/app/org.mozilla.Thunderbird/.thunderbird"
        "$HOME/.var/app/org.mozilla.thunderbird/.thunderbird"
        "$HOME/.var/app/eu.betterbird.Betterbird/.thunderbird"
    )
    local profiles_dir=""
    local profile=""

    for candidate in "${profile_roots[@]}"; do
        if [[ -d "$candidate" ]]; then
            profiles_dir="$candidate"
            break
        fi
    done

    if [[ -z "$profiles_dir" ]]; then
        echo "Error: Thunderbird profiles directory not found (checked ${profile_roots[*]})" >&2
        exit 1
    fi

    if [[ -f "$profiles_dir/profiles.ini" ]] && command -v python3 >/dev/null 2>&1; then
        profile=$(python3 - "$profiles_dir" <<'PY'
import configparser
import os
import sys

root = sys.argv[1]
ini_path = os.path.join(root, 'profiles.ini')
config = configparser.RawConfigParser()
config.read(ini_path)

def resolve_path(path_value, is_relative=True):
    path_value = (path_value or '').strip()
    if not path_value:
        return ''
    return os.path.join(root, path_value) if is_relative else path_value

# Thunderbird commonly stores the active install mapping under [Install*].
for section in config.sections():
    if not section.startswith('Install'):
        continue
    install_default = resolve_path(config.get(section, 'Default', fallback=''), True)
    if install_default:
        print(install_default)
        raise SystemExit(0)

chosen = None
for section in config.sections():
    if not section.startswith('Profile'):
        continue
    if config.get(section, 'Default', fallback='0') == '1':
        chosen = section
        break

if chosen is None:
    for section in config.sections():
        if section.startswith('Profile'):
            chosen = section
            break

if chosen is None:
    raise SystemExit(0)

path_value = config.get(chosen, 'Path', fallback='').strip()
is_relative = config.get(chosen, 'IsRelative', fallback='1').strip() == '1'
resolved = resolve_path(path_value, is_relative)
if resolved:
    print(resolved)
PY
)
    fi

    if [[ -z "$profile" ]]; then
        profile=$(ls -d "$profiles_dir"/*.default-release 2>/dev/null | head -1)
    fi
    if [[ -z "$profile" ]]; then
        profile=$(ls -d "$profiles_dir"/*.default 2>/dev/null | head -1)
    fi

    if [[ -z "$profile" || ! -d "$profile" ]]; then
        echo "Error: No Thunderbird profile found in $profiles_dir" >&2
        exit 1
    fi

    echo "$profile"
}

if [[ ! -f "$XPI_FILE" ]]; then
    echo "Build artifact missing; running npm run build..."
    (cd "$PROJECT_DIR" && npm run build --silent)
fi

PROFILE_DIR=$(find_profile)
EXTENSIONS_DIR="$PROFILE_DIR/extensions"

echo "Installing to profile: $PROFILE_DIR"
mkdir -p "$EXTENSIONS_DIR"
cp "$XPI_FILE" "$EXTENSIONS_DIR/thunderbird-agent@tkasperczyk.dev.xpi"

echo "Installed Thunderbird Agent. Restart Thunderbird to activate."
echo
echo "Useful next steps:"
echo "  Build artifact: $XPI_FILE"
echo "  CLI doctor:     node $PROJECT_DIR/packages/cli/thunderbird-agent.cjs doctor"
echo "  Main docs:      $PROJECT_DIR/README.md"
echo "  Agent docs:     $PROJECT_DIR/docs/agents/README.md"
