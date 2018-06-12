#!/bin/bash

case ${START} in
    authen)
        ./scripts/test-authen.sh
    ;;
    dataRequest)
        ./scripts/test-dataRequest.sh
    ;;
    mock-idp)
        ./scripts/idp-start.sh
    ;;
    mock-as)
        ./scripts/as-start.sh
    ;;
    mock-rp)
        ./scripts/rp-start.sh
esac