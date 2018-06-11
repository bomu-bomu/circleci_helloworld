#!/bin/bash
set -e

trap "exit" INT TERM ERR
trap "kill 0" EXIT

AUTO_RESPONSE=yes node $(dirname $0)/../mockclient/mockclient_idp.js &
AUTO_RESPONSE=yes $(dirname $0)/../node_modules/.bin/cucumber-js $(dirname $0)/../features/idp/create_response.feature -t @SetCallback --require $(dirname $0)/../features/idp/
wait