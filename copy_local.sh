#!/bin/bash

if [ -z "$1" ]
  then 
  echo $1
  echo "Missing destination folder path."
  exit 1
fi

destination=$1
echo "Start copying to $1"

if [ -z "$2" ] || [ "$2" = "false" ]; then
  files_to_exclude="`cat ./exclude_files.txt`"
  dirs_to_exclude="`cat ./exclude_dirs.txt`"
  robocopy . "$destination" //XD $dirs_to_exclude //XF $files_to_exclude //E
else
  rsync -arv --exclude-from=./.exclude $(pwd)/ "$destination" 
fi

#shopt -s extglob
#cp -rf $(ls !(.git|.vscode|_site|.asset-cache|.contentignore|.gitignore|docs-watcher/node_modules)) $destination

echo "Copying finished."

echo "Adding build related files to .gitignore..."
merged_file_name="./.merged_tmp"
dest_gitignore="$destination/.gitignore"

cat $dest_gitignore ./.contentignore > $merged_file_name
sort -u $merged_file_name > $dest_gitignore
rm $merged_file_name

echo "Finished."
