#!/bin/bash

config_file = "_config.yml"
if [ ! -z "$1" ]
  then 
    config_file = $1
fi

echo "Start building..."

bundle exec jekyll build --config $config_file
