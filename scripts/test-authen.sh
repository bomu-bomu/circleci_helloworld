#!/bin/bash

node ./mockclient/mockclient_idp.js & 
node ./mockclient/mockclient_rp.js & 
./node_modules/.bin/cucumber-js features/authentication_flow/authentication_flow.feature --require features/authentication_flow/