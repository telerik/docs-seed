#!/bin/bash

clone_path = ".tmp/"
if [ ! -z "$1" ]
  then 
    clone_path = $1
fi

echo "Start copying..."

cp -r $clone_path/* "./"

echo "Copying finished."
