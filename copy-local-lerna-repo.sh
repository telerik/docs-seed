#!/bin/bash
repo=$1
repo_dir=".tmp/$1"
lerna_package=$2
docs_path="components/$3"

rm -rf $docs_path/*;
echo "Copy package docs" + $lerna_package
cp -r $repo_dir/packages/$lerna_package/docs $docs_path

