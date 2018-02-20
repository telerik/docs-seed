#!/bin/bash

repo_url=$1;
repo_dir=$2;

check_out_latest() {
    cd $repo_dir;
    latestTag=git describe --tags `git rev-list --tags --max-count=1`;
    git checkout $latestTag;
}

if [ -n "$TASKS_BRANCH" ];
then
    branch=$TASKS_BRANCH;
else
    branch=$3;
fi

if [ -n "$DEV" ];
then
    echo 'We are in development mode, symlink kendo-common-tasks';
    echo 'Create $repo_dir';
    rm -rf $repo_dir;
    echo 'Creating symlink from local path.';
    ln -s branch './.tmp'
else
    echo "Cleaning $repo_dir";
    rm -rf $repo_dir
    echo "Create $repo_dir";
    mkdir -p $repo_dir;
    echo "Cloning in branch: $branch";
    git clone -b $branch --quiet $repo_url $repo_dir;
    # optionaly checkout latest tag
    # check_out_latest
fi

echo 'Copy common-tasks docs-public content'
# Copy static assets except plunker template, they are used during build time.
mkdir -p "./_src" && cp -r "$repo_dir/docs-public" "./_src";

echo 'Copy common-tasks docs-public/plunker content'
# Copy plunker templates in npm from where they will be requested during runtime.
mkdir -p "./npm" && cp -r "$repo_dir/docs-public/plunker" "./npm";

# See the following issue - https://github.com/rails/sass-rails/issues/363
echo 'Rename docs.css to docs.scss in order to be imported by https://github.com/rails/sprockets'
mv "./_src/docs-public/docs.css" "./_src/docs-public/_docs.scss";
