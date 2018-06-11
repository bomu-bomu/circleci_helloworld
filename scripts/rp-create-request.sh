#!/bin/bash
set -e

# trap "exit" INT TERM
# trap "kill 0" EXIT

DATA_REQUEST=$1

if [ "$(echo "$DATA_REQUEST")" == "" ];then
DATA_REQUEST="no"
fi

if [ "$(echo "$DATA_REQUEST")" == "yes" ] || [ "$(echo "$DATA_REQUEST")" == "Yes" ] || [ "$(echo "$DATA_REQUEST")" == "YES" ];
then
    RP_CREATE_REQUEST=yes DATA_REQUEST=yes PARAM=$2 $(dirname $0)/../node_modules/.bin/cucumber-js $(dirname $0)/../features/rp/create_request.feature -t @WithDataRequest --require $(dirname $0)/../features/rp/
else
    RP_CREATE_REQUEST=yes PARAM=$2 $(dirname $0)/../node_modules/.bin/cucumber-js $(dirname $0)/../features/rp/create_request.feature -t @NoDataRequest --require $(dirname $0)/../features/rp/
fi