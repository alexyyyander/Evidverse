# Snapshot file
# Unset all aliases to avoid conflicts with functions
# Functions
gawklibpath_append () 
{ 
    [ -z "$AWKLIBPATH" ] && AWKLIBPATH=`gawk 'BEGIN {print ENVIRON["AWKLIBPATH"]}'`;
    export AWKLIBPATH="$AWKLIBPATH:$*"
}
gawklibpath_default () 
{ 
    unset AWKLIBPATH;
    export AWKLIBPATH=`gawk 'BEGIN {print ENVIRON["AWKLIBPATH"]}'`
}
gawklibpath_prepend () 
{ 
    [ -z "$AWKLIBPATH" ] && AWKLIBPATH=`gawk 'BEGIN {print ENVIRON["AWKLIBPATH"]}'`;
    export AWKLIBPATH="$*:$AWKLIBPATH"
}
gawkpath_append () 
{ 
    [ -z "$AWKPATH" ] && AWKPATH=`gawk 'BEGIN {print ENVIRON["AWKPATH"]}'`;
    export AWKPATH="$AWKPATH:$*"
}
gawkpath_default () 
{ 
    unset AWKPATH;
    export AWKPATH=`gawk 'BEGIN {print ENVIRON["AWKPATH"]}'`
}
gawkpath_prepend () 
{ 
    [ -z "$AWKPATH" ] && AWKPATH=`gawk 'BEGIN {print ENVIRON["AWKPATH"]}'`;
    export AWKPATH="$*:$AWKPATH"
}

# setopts 3
set -o braceexpand
set -o hashall
set -o interactive-comments

# aliases 0

# exports 37
declare -x APPLICATION_INSIGHTS_NO_STATSBEAT="true"
declare -x BROWSER="/home/dubdoo/.vscode-server/cli/servers/Stable-b6a47e94e326b5c209d118cf0f994d6065585705/server/bin/helpers/browser.sh"
declare -x CODEX_INTERNAL_ORIGINATOR_OVERRIDE="codex_vscode"
declare -x CUDA_HOME="/usr/local/cuda"
declare -x CUDA_ROOT="/usr/local/cuda"
declare -x DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/1004/bus"
declare -x ELECTRON_RUN_AS_NODE="1"
declare -x HOME="/home/dubdoo"
declare -x LANG="C.UTF-8"
declare -x LD_LIBRARY_PATH="/usr/local/cuda/lib64:"
declare -x LIBRARY_PATH="/usr/local/cuda/lib64:"
declare -x LOGNAME="dubdoo"
declare -x MOTD_SHOWN="pam"
declare -x PATH="/home/dubdoo/.codex/tmp/arg0/codex-arg0ronMcb:/home/dubdoo/.vscode-server/cli/servers/Stable-b6a47e94e326b5c209d118cf0f994d6065585705/server/bin/remote-cli:/home/dubdoo/.local/bin:/usr/local/cuda/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin:/home/dubdoo/.vscode-server/extensions/openai.chatgpt-0.4.74-linux-x64/bin/linux-x86_64"
declare -x PKG_CONFIG_PATH=":/usr/local/lib/pkgconfig"
declare -x RUST_LOG="warn"
declare -x SHELL="/usr/bin/bash"
declare -x SHLVL="1"
declare -x SSH_CLIENT="111.49.121.182 19930 22"
declare -x SSH_CONNECTION="111.49.121.182 19930 10.0.0.243 22"
declare -x SSL_CERT_DIR="/usr/lib/ssl/certs"
declare -x SSL_CERT_FILE="/usr/lib/ssl/certs/ca-certificates.crt"
declare -x USER="dubdoo"
declare -x VSCODE_AGENT_FOLDER="/home/dubdoo/.vscode-server"
declare -x VSCODE_CLI_REQUIRE_TOKEN="7102ec4b-5253-4cc2-aa4f-03fab953bb16"
declare -x VSCODE_CWD="/home/dubdoo"
declare -x VSCODE_ESM_ENTRYPOINT="vs/workbench/api/node/extensionHostProcess"
declare -x VSCODE_HANDLES_SIGPIPE="true"
declare -x VSCODE_HANDLES_UNCAUGHT_ERRORS="true"
declare -x VSCODE_IPC_HOOK_CLI="/run/user/1004/vscode-ipc-a5ce11b3-580a-4b84-8f2d-cc111b282cb7.sock"
declare -x VSCODE_NLS_CONFIG="{\"userLocale\":\"en\",\"osLocale\":\"en\",\"resolvedLanguage\":\"en\",\"defaultMessagesFile\":\"/home/dubdoo/.vscode-server/cli/servers/Stable-b6a47e94e326b5c209d118cf0f994d6065585705/server/out/nls.messages.json\",\"locale\":\"en\",\"availableLanguages\":{}}"
declare -x VSCODE_RECONNECTION_GRACE_TIME="10800000"
declare -x XDG_DATA_DIRS="/usr/share/gnome:/usr/local/share:/usr/share:/var/lib/snapd/desktop"
declare -x XDG_RUNTIME_DIR="/run/user/1004"
declare -x XDG_SESSION_CLASS="user"
declare -x XDG_SESSION_ID="8512"
declare -x XDG_SESSION_TYPE="tty"
