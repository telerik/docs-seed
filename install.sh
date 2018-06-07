#!/bin/bash

echo 'Start installing...'
echo "Installing ruby gems..."

bundle --without development --path ~/gems

echo "Installation finished."
