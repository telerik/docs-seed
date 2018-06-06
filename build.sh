#!/bin/bash

repository=$1
branch=$2
clone_path=".tmp/"

rm -rf $clone_path
mkdir $clone_path

git clone -b $branch $repository $clone_path

cp -r $clone_path/* "./"

echo "Installing ruby gems.."
bundle --without development --path ~/gems

echo "Start building..."
bundle exec jekyll build --config _config.yml
