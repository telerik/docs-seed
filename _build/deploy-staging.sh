#!/bin/bash

if [ $# -eq 0 ]
then
    echo "Usage: $(basename "$0") <dist-dir> <rsync-location>"
    echo "       <dist-dir>: the directory that will contain the built site"
    echo "       <rsync-location>: the location where the site will be deployed via rsync"
    exit 1
fi

DIST_DIR=$1
RSYNC_TO=$2

function log {
    echo "[$(date +%T)] $1"
}

log "Generating documentation..."

export JEKYLL_ENV=production

ruby2.2 /usr/local/bin/bundle --without development --path ~/gems2.2

ruby2.2 /usr/local/bin/bundle exec jekyll build --config _config.yml,_production-angular.yml --destination $DIST_DIR

if [ ! $? -eq 0 ]
then
    echo "Unable to generate documentation."
    exit 1
fi

log "Uploading to staging..."
rsync -avcz --delete $DIST_DIR $RSYNC_TO

if [ ! $? -eq 0 ]
then
    echo "Unable to upload to staging."
    exit 1
fi

log "Deployed to staging."

