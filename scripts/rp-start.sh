#!/bin/bash
set -e

trap "exit" INT TERM ERR
trap "kill 0" EXIT

RP_CREATE_REQUEST=yes node $(dirname $0)/../mockclient/mockclient_rp.js

wait

