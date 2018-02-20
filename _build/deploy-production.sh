#!/usr/bin/env bash

SYNC='rsync -rvcz --delete --exclude '.git' --inplace'
DEST='/usr/share/nginx/html/angular'
USER='nginx'
declare -a HOSTS=("ordkendowww01.telerik.local" "ordkendowww02.telerik.local")

for host in "${HOSTS[@]}"
do
   echo "[$(date +%T)] Uploading documentation to $host"
   $SYNC . $USER@$host:$DEST
done

echo "[$(date +%T)] Done"
