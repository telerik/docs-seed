#!/bin/bash

if [ $# -eq 0 ]
then
    echo "Usage: $(basename "$0") <dir> <repo>"
    echo ""
    echo "  Creates snapshots of a directory by committing its contents to a git repository."
    echo "       <dir>: the directory that be uploaded to the repository"
    echo "       <repo>: the git repository that contains snapshots"
    exit 1
fi

SNAPSHOT_TARGET=$1
REPO=$2

function log {
    echo "[$(date +%T)] $1"
}

log "Creating snapshot..."

if [ ! -d _snapshots ]
then
    log "Snapshot repo not found, cloning..."
    git clone --depth 1 $REPO _snapshots;
fi

cd _snapshots

git pull

rsync -av --delete ../$SNAPSHOT_TARGET . --exclude .git;

git add .;
git commit --message "K2 site snapshot at $(date +'%D %T')";
git push -u origin master;

if [ ! $? -eq 0 ]
then
    echo "Unable to create snapshot."
    exit 1
fi

log "Snapshot created."
