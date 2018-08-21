#!/bin/bash
set -e

if [ -z "$1" ]
  then 
  echo $1
  echo "Missing destination folder path."
  exit 1
fi

destination=$1
echo "Start copying to $1"
rsync -rv --exlcude-from=exclude.txt "./*" $destination/
files_to_exclude="`cat ./exclude.txt`"
# robocopy *.* "$destination" /MIR > xcopy.out  #/EXCLUDE:".\exclude.txt" /exclude:exclude.txt 
# xcopy  "*.*" "$destination"  /exclude:exclude.txt /y #> xcopy.out /r /i /s /y

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
