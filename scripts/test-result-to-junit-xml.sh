#!/bin/bash

cat $(dirname $0)/../$1.json | $(dirname $0)/../node_modules/.bin/cucumber-junit > ./test-result/$1.xml
echo "$PWD: ==============="
ls -lr 

ls -l test-result
