#!/bin/bash

component=$1;
repo=$2;
component_path=$3;
branch=${4:-master};
docs_path="components/$component_path";
tmp_dir=$(mktemp -d);
repo_dir=".tmp/$component";
tags_data="_data/components/$component.yml";

mkdir -p "$docs_path";
mkdir -p "_data/components";

echo "checking out docs from $repo...";

if ! [[ -d $repo_dir ]]
then
  echo "$repo_dir not present, cloning repository...";
  mkdir -p .tmp;
  git clone --quiet $repo $repo_dir;
else
  sh -c "cd $repo_dir && git fetch --quiet origin && git fetch --tags origin";
fi

echo -ne > $tags_data # truncate the tags file

# checkout master
git archive --format=tar --remote=$repo_dir origin/$branch docs | tar -x -f - -C $tmp_dir --strip-components=1;

TAGS=$(git ls-remote --tags $repo  | grep -v -F "^{}" | cut -d'/' -f3 | sort -r);
MINOR_VERSIONS=$(echo "$TAGS" | cut -d '.' -f1,2 | uniq)
# echo "tags:
# ---
# $TAGS
# ---"
#
# echo "minor versions:
# ---
# $MINOR_VERSIONS
# ---"

echo "> checking out tags..."

for version in $(echo "$MINOR_VERSIONS");
do
  tag=$(echo "$TAGS" | grep $version | head -n1)

  break # skipping tag generation until https://github.com/telerik/k2-site/issues/66 is fixed

  tag_path=$tmp_dir/$version.X;
  echo " - $version.X" >> $tags_data;
  mkdir -p $tag_path;
  git archive --format=tar --remote=$repo_dir $tag docs | tar -x -f - -C $tag_path --strip-components=1;

  find $tag_path -name "*.md" \
      -exec sed -e "s/{% slug /{% slug ${version}.X_/g" -i {} \; \
      -exec sed -e "s/slug: /slug: ${version}.X_/g" -i {} \;
done

echo "> copying docs..."

copy_docs() {
    if command -v rsync >/dev/null 2>&1; then
        rsync --archive --delete $tmp_dir/ $docs_path/;
    else
        rm -rf $docs_path/*;
        cp -r $tmp_dir/* $docs_path/;
    fi
}

copy_docs

rm -rf $tmp_dir;
