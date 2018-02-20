#!/bin/bash

if [ $# -eq 0 ]; then
    echo "  Usage: $0 <starting-page> <pause> <config-file>"
    echo "Example: $0 http://localhost:4000"
    exit 1
fi
PAUSE=$4
PAUSE="${PAUSE:=1}"
CONFIG=$2
CONFIG="${CONFIG:=check-links.ini}"
LINKS_FILE=$2
if [ "$1" == "--links-file" ]; then
    CONFIG=$3
    CONFIG="${CONFIG:=check-links.ini}"
    LINKS_FILE=$2
    linkchecker --no-status --verbose --file-output=text/output --config=_build/$CONFIG -P$PAUSE -r0 --stdin < $LINKS_FILE
else
    linkchecker --no-status --verbose --file-output=text/output --config=_build/$CONFIG -P$PAUSE $1
fi;