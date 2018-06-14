const assert = require('assert');
const { Given, When, Then } = require('cucumber');
const uuidv1 = require('uuid/v1');
const config = require('../../config.js');
const redis = require('redis');

const sub = redis.createClient({ host: process.env.REDIS_IP, port: process.env.REDIS_PORT });

let getReferenceId;

// RP create request
let namespace = process.env.NS || 'cid';
let identifier = process.env.ID || '1234';
// RP create request
const withDataRequest = process.env.DATA_REQUEST || 'no';
let min_idp = process.env.MIN_IDP;
let min_ial = process.env.MIN_IAL;
let min_aal = process.env.MIN_AAL;
// Timeout for RP wait status from IDP
const timeoutWaitStatus = parseInt(process.env.TIMEOUT_STATUS_FROM_IDP || '-1');
// Timeout for RP wait data from AS
const timeoutWaitDataFromAS = parseInt(process.env.TIMEOUT_DATA_FROM_AS || '-1');

const param = process.env.PARAM;

if (param) {
  const _param = JSON.parse(param);
  namespace = _param.ns || 'cid';
  identifier = _param.id || '1234';
  min_idp = _param.min_idp;
  min_ial = _param.min_ial;
  min_aal = _param.min_aal;
}

const arrayDataRequest = [
  {
    service_id: 'bank_statement',
    as_id_list: ['as1', 'as2', 'as3'],
    count: 1,
    request_params: { format: 'pdf' },
  },
];

function referenceId() {
  getReferenceId = uuidv1();
  return getReferenceId;
}

let RequestStatusFromRpPlatform;
let ReceiveDataRequestedFromPlatform;

sub.on('message', (ch, message) => {
  if (ch === 'receive_request_status_from_platform') {
    const result = JSON.parse(message);
    if (result.refId === getReferenceId) {
      RequestStatusFromRpPlatform = result;
    }
  } else if (ch === 'receive_data_requested_from_platform') {
    const result = JSON.parse(message);
    if (result.refId === getReferenceId) {
      ReceiveDataRequestedFromPlatform = result;
    }
  }
});

sub.subscribe('receive_request_status_from_platform');
sub.subscribe('receive_data_requested_from_platform');

// ########### RP ###########
Given('RP client making a request for create request', async function (data) {
  const dataRequest = JSON.parse(data);
  this.requestBody = {
    ...dataRequest,
    reference_id: referenceId(),
    callback_url: `${config.CALLBACK_URL_RP}${getReferenceId}`,
    data_request_list:
      withDataRequest.toLowerCase() == 'yes' ? arrayDataRequest : [],
    min_ial: min_ial == null ? dataRequest.min_ial : parseFloat(min_ial),
    min_aal: min_aal == null ? dataRequest.min_aal : parseFloat(min_aal),
    min_idp: min_idp == null ? dataRequest.min_idp : parseInt(min_idp),
  };
  console.log('\nRP client making a request for create request \n', this.requestBody);
});

When('RP client make a POST request for create request to {string}', function (uri) {
  uri = `/rp/requests/${namespace}/${identifier}`;
  console.log(`\nRP client make a POST request for create request to ${uri}`);
  return this.httpPost('RP', uri);
});

Then('RP client should receive request status {string}', { timeout: timeoutWaitStatus }, function (expectedValue, callback) {
  const _this = this;

  const interval = setInterval(() => {
    if (RequestStatusFromRpPlatform) {
      if (RequestStatusFromRpPlatform.status === expectedValue && RequestStatusFromRpPlatform.min_idp === RequestStatusFromRpPlatform.answered_idp_count) {
        clearInterval(interval);
        // clearTimeout(_timeout);
        assert.equal(RequestStatusFromRpPlatform.status, expectedValue, _this.prettyPrintError(RequestStatusFromRpPlatform, expectedValue));
        if (RequestStatusFromRpPlatform.status !== 'completed') {
          console.log('\nRP client receive request status:', RequestStatusFromRpPlatform.status, ' and answered IDP count:', RequestStatusFromRpPlatform.answered_idp_count);
        } else {
          console.log('\nRP client receive request status:', RequestStatusFromRpPlatform.status, 'and \nservice list:', RequestStatusFromRpPlatform.service_list);
        }
        callback();
      }
    }
  }, 100);

  //   let _timeout = setTimeout(function() {
  //     if (!RequestStatusFromRpPlatform) {
  //       //Not receive data from platform
  //       clearInterval(interval);
  //       clearTimeout(_timeout);
  //       callback(
  //         new Error("Function time out RP client not receive request status from platform")
  //       );

  //     } else {
  //       //Receive data but unexpected
  //       clearInterval(interval);
  //       clearTimeout(_timeout);
  //       assert.equal(
  //         RequestStatusFromRpPlatform, //actual value
  //         expectedValue,
  //         "Function time out" +
  //           _this.prettyPrintError(RequestStatusFromRpPlatform.status, expectedValue)
  //       );
  //     }
  //   }, timeoutWaitStatus);
});

Then('RP client should receive data requested', { timeout: timeoutWaitDataFromAS }, function (callback) {
  const _this = this;
  const uri = `/rp/requests/data/${ReceiveDataRequestedFromPlatform.request_id}`;

  const interval = setInterval(async () => {
    await _this.httpGet('RP', uri);
    console.log('\nRP client receive data requested\n', _this.prettyPrintJSON(_this.actualResponse));
    clearInterval(interval);
    callback();
  }, 500);

  // let _this=this
  // let interval = setInterval(function() {
  //   if (ReceiveDataRequestedFromPlatform) {
  //     clearInterval(interval);
  //     clearTimeout(_timeout);
  //     console.log("\nRP client receive data requested\n",_this.prettyPrintJSON(ReceiveDataRequestedFromPlatform))
  //     //console.log("\nRP client receive data requested\n");
  //     callback();
  //   }
  // }, 500);

  // let _timeout = setTimeout(function() {
  //   if (!ReceiveDataRequestedFromPlatform){
  //     clearInterval(interval);
  //     clearTimeout(_timeout);
  //     callback(new Error("Function time out RP client not receive data requested from platform"));
  //   }
  // }, timeoutWaitDataFromAS);
});

// ########### Common ###########
Given('The {string} platform is running', (string, callback) => {
  callback();
});

Then('The response status code should be {string}', function (
  expectedValue,
  callback,
) {
  assert.equal(
    this.statusCode,
    expectedValue,
    this.prettyPrintError(this.statusCode, expectedValue),
  );
  console.log(`\nThe response status code ${this.statusCode}`);
  callback();
});

Then('The response property {string} is', async function (property) {
  const actualValue = this.getValue(this.actualResponse, property);
  console.log(`\n${property} is ${actualValue}`);
});
