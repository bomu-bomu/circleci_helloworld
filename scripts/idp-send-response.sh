#!/bin/bash
set -e

AUTO_RESPONSE=yes REQ_BODY=$1 NONCE=$2 STATUS=$3 $(dirname $0)/../node_modules/.bin/cucumber-js $(dirname $0)/../features/idp/create_response.feature -t @CreateResponse --require $(dirname $0)/../features/idp/