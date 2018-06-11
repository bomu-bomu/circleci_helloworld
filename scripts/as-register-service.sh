#!/bin/bash
set -e

AUTO_RESPONSE=yes SERVICE_ID=$1 SERVICE_NAME=$2 MIN_IAL=$3 MIN_AAL=$4 $(dirname $0)/../node_modules/.bin/cucumber-js $(dirname $0)/../features/as/register_service.feature -t @RegisterService --require $(dirname $0)/../features/as/