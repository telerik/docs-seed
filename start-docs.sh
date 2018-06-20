#!/bin/bash

rm -rf _site/
docker pull tmitev/docs-seed:site
docker build -t tmitev/docs-seed:site .
docker run --rm -it -p 4400:4000 -v $(pwd)/app tmitev/docs-seed:site
