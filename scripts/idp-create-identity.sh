#!/bin/bash
set -e

# if [ "$(echo "$4")" == "CREATE" ]; then
AUTO_RESPONSE=yes REQ_BODY=$1 $(dirname $0)/../node_modules/.bin/cucumber-js $(dirname $0)/../features/idp/create_response.feature -t @CreateIdentity --require $(dirname $0)/../features/idp/
# elif [ "$(echo "$4")" == "CREATED" ]; then
# AUTO_RESPONSE=yes NS=$1 ID=$2 IDENTITY_IAL=$3 $(dirname $0)/../node_modules/.bin/cucumber-js $(dirname $0)/../features/idp/create_response.feature -t @AlreadyCreateidentity --require $(dirname $0)/../features/idp/
# fi
