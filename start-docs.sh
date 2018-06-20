#!/bin/bash

rm -rf _site/
docker pull tmitev/docs-seed
docker run --rm -it -p 4000:4000 -v $(pwd):/app tmitev/docs-seed
