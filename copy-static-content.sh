#!/bin/bash

echo "Copying static content"

copy_content() {
    test -d $1/components && cp -r $1/components/* components
    test -d $1/getting-started && cp -r $1/getting-started/* .
    test -d $1/root && cp -r $1/root/* .
}

echo "Remove old content"
rm -rf components/* .tmp/* ./npm/*
find . -depth 1 -type f \( -iname "*.md" ! -iname "README.md" ! -iname "CODEOWNERS.md" \) | xargs rm -f $1
rm -f *.html

mkdir -p components

echo "Copying common content"
copy_content _common

if [ -n "$SKIP_COMMON_CONTENT" ];
then
    echo "We are building a components only version of the site";
    test -d $1/components && cp $1/components/*.html components
else
    echo "Copying platform content"
    copy_content $1
fi
