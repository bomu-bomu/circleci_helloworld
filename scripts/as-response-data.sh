#!/bin/bash
set -e

AUTO_RESPONSE=yes REQ_BODY=$1 RESPONSE_DATA=$2 $(dirname $0)/../node_modules/.bin/cucumber-js $(dirname $0)/../features/as/response_data_request.feature -t @ResponseDataRequest --require $(dirname $0)/../features/as/