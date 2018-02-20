#!/bin/bash

repo_dir=".tmp/$1"
repo=$2
docs_path="components/"

mkdir -p "_data/components";

if [ -n "$MONOREPO_BRANCH" ];
then
    branch=$MONOREPO_BRANCH;
else
    branch=$3;
fi

if ! [[ -d $repo_dir ]]
then
    echo "$repo_dir not present, cloning repository...";
    mkdir -p .tmp;
    echo "Cloning branch $branch";
    git clone -b $branch --quiet $repo $repo_dir
else
    echo "$repo_dir exits, checking branch $branch and getting latest";
    sh -c "cd $repo_dir && git checkout $branch && git pull --quiet";
fi