#!/bin/bash

echo 'Clear documentation folder...'
rm -rf 'documentation'

echo "Create documentation folder and copy content...";
cp -r $1 $2
