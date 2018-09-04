#!/bin/bash

config_file="_config.yml"	
if [ ! -z "$1" ]	
  then 	
    config_file+=",$1"
    echo "Using configuration from: $config_file"	
fi

rm -rf _site/ && rm -rf .sass-cache && rm -rf .jekyll-cache && rm -rf .asset-cache
docker pull tmitev/docs-seed:site
docker build -t tmitev/docs-seed:site .
docker run --rm --env CONFIG_FILE=$config_file --env JEKYLL_COMMAND=build -t -v "/$(pwd):/app_root" -p 4000:4000 -t tmitev/docs-seed:site
