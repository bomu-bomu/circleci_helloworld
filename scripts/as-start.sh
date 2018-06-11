#!/bin/bash
set -e

trap "exit" INT TERM ERR
trap "kill 0" EXIT

AUTO_RESPONSE=yes node $(dirname $0)/../mockclient/mockclient_as.js

wait

