#!/bin/bash

    node ./mockclient/mockclient_idp.js & 
    node ./mockclient/mockclient_as.js & 
    node ./mockclient/mockclient_rp.js & 
    ./node_modules/.bin/cucumber-js features/data_request_flow/data_request_flow.feature --require features/data_request_flow/

