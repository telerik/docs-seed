#!/bin/bash

repo_dir=".tmp/$1"

# Clean workspace first
clear_command="rm -rf node_modules/ package-lock.json packages/*/package-lock.json"
# Building npm bundle for package interop
build_npm_bundle_command="npm run build-npm-bundles"
# Building cdn bundle for demo site
build_cdn_bundle_command="npm run lerna-command -- --command=build-cdn"
bootstrap_command="npm run bootstrap"

echo 'Bootstrap lerna repo, build npm bundle for package interop and cdn bundle for demo runner';
sh -c "cd $repo_dir && $clear_command && npm install && $bootstrap_command && $build_npm_bundle_command && $build_cdn_bundle_command"
