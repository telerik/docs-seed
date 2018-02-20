#!/bin/bash

function copy {
  echo "copying ..."
  rsync -r $1 $2
}

# The repo for which we would build the site has been already pulled out...
# TODO: Guard check for all the parameters...

# Here we should copy from .tmp to the corresponding directories. 
# From the config file, we would get the controls/libraries and the rest of the docs (installation, FAQ, etc) 
# to place in the 'components' section of the site.

ROOT_PATH=".tmp/"$1
echo "copying from "$ROOT_PATH

CONTROLS_PATH=$2
# echo "control are in '"CONTROLS_PATH"' folder'"

# TODO: Copy the files/directories including assets and _config to the necessary place 

echo "Start building..."
bundle exec jekyll $3 --config _config.yml
