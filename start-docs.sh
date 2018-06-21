#!/bin/bash

rm -rf _site/
docker pull tmitev/docs-seed:site
docker build -t tmitev/docs-seed:site .
docker run --rm -t -i -v $(pwd)/app_root -p 4000:4000 -t tmitev/docs-seed:site
