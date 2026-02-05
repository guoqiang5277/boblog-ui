#!/bin/bash
# Bash completion for build.sh

_build_sh_completion() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    # 可用的选项
    opts="--release"

    # 如果当前输入是以 - 开头，提供选项补全
    if [[ ${cur} == -* ]] ; then
        COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
        return 0
    fi
}

# 注册补全函数
complete -F _build_sh_completion ./build.sh
complete -F _build_sh_completion build.sh
