#!/bin/bash

config_file="_config.yml"
if [ ! -z "$1" ]
  then 
    echo "Using configuration file: $1"
    config_file=$1
fi

echo "Start building..."

bundle exec jekyll build --config $config_file
