#!/bin/bash

rm -rf _site/
docker pull tmitev/docs-seed:site
docker build -t tmitev/docs-seed:site .
docker run --rm -it -t -i --mount type=bind,src="$(pwd)"/,dst=/app_root -p 4000:4000 -t tmitev/docs-seed:site
