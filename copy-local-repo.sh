#!/bin/bash

echo "local repo $1; copying content from $2";
mkdir -p components/$1;
cp -r $2/docs/* components/$1/;
