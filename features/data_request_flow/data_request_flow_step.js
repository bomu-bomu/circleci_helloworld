const assert = require('assert');
const {
  Given, When, Then, AfterAll,
} = require('cucumber');
const config = require('../../config.js');
const uuidv1 = require('uuid/v1');
const zkProof = require('../idp/zkProof.js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const redis = require('redis');

const sub = redis.createClient({ host: config.REDIS_IP, port: config.REDIS_PORT });


// IDP create identity and RP create request
let namespace = process.env.NS;
let identifier = process.env.ID;
const identity_ial = process.env.IDENTITY_IAL || '2.3'; // For IDP create identity
// RP create request
const min_idp = process.env.MIN_IDP;
const min_ial = process.env.MIN_IAL;
const min_aal = process.env.MIN_AAL;
// IDP create response
const ial = process.env.IAL;
const aal = process.env.AAL;
const status = process.env.STATUS;
// AS register service
const service_id = process.env.SERVICE_ID || 'bank_statement';
// Timed out for RP wait status from IDP
const timeoutWaitStatus = parseInt(process.env.TIMEOUT_STATUS_FROM_IDP || '20000');
// Timed out for RP wait data from AS
const timeoutWaitDataFromAS = parseInt(process.env.TIMEOUT_DATA_FROM_AS || '20000');
// Timed out for exit test when test finish
const exitWhenFinish = parseInt(process.env.EXIT_WHEN_FINISH) || 4000;
// prevent duplicate accessor_id
const nonce = uuidv1();

let getReferenceId;
function referenceId() {
  getReferenceId = uuidv1();
  return getReferenceId;
}

let RequestStatusFromRpPlatform;
let ReceiveDataRequestedFromPlatform;
let RequestFromIdpPlatform;
let DataRequestFromAsPlatform;
let DataResponseToPlatform;

sub.on('message', (ch, message) => {
  const result = JSON.parse(message);
  if (ch === 'receive_request_status_from_platform') { // RP receive request status from platform
    if (result.refId === getReferenceId) {
      RequestStatusFromRpPlatform = result;
    }
  } else if (ch === 'receive_data_requested_from_platform') { // RP receive data requested from platform
    if (result.refId === getReferenceId) {
      ReceiveDataRequestedFromPlatform = result;
    }
  } else if (ch === 'callback_from_idp_platform') { // IDP receive call back from platform
    RequestFromIdpPlatform = result;
  } else if (ch === 'receive_data_request_from_platform') { // AS receive data request from platform
    DataRequestFromAsPlatform = result;
  } else if (ch === 'response_data_to_platform') { // AS response data to platform
    DataResponseToPlatform = result;
  }
});

// RP subscribe
sub.subscribe('receive_request_status_from_platform');
sub.subscribe('receive_data_requested_from_platform');

// IDP subscribe
sub.subscribe('callback_from_idp_platform');

// AS subscribe
sub.subscribe('receive_data_request_from_platform');
sub.subscribe('response_data_to_platform');

AfterAll(() => {
  setTimeout(() => {
    try {
      const testResult = exec(`sh ${path.join(__dirname, '..', '..', 'scripts', 'test-result-to-junit-xml.sh')} test-result-dataRequest`);
      testResult.stdout.on('data', (data) => {
        console.log(data);
      });
      testResult.stderr.on('data', (data) => {
        console.log(data);
      });
    } catch (error) {
      throw error;
    } finally {
      setTimeout(() => {
        process.exit(0);
      }, exitWhenFinish);
    }
  }, 1000);
});

// ########### IDP ###########
Given('IDP client making a request for set callback url', function (data) {
  const dataRequest = JSON.parse(data);
  this.requestBody = {
    ...dataRequest,
    url: config.CALLBACK_URL_IDP,
  };
  console.log('\nIDP client making a request for set callback url\n', this.requestBody);
});

Given('IDP client making a request for set accessor callback url', function (data) {
  const dataRequest = JSON.parse(data);
  this.requestBody = {
    ...dataRequest,
    url: config.ACCESSOR_CALLBACK_URL_IDP,
  };
  console.log('\nIDP client making a request for set callback url\n', this.requestBody);
});

Given('IDP client making a request for create new identity', function (data) {
  const dataRequest = JSON.parse(data);
  const ns = namespace == null ? uuidv1() : namespace;
  const id = identifier == null ? uuidv1() : identifier;
  const sid = `${ns}-${id}`;
  zkProof.genNewKeyPair(sid);
  const accessor_public_key = fs.readFileSync(`${config.keyPath + sid}.pub`, 'utf8');
  this.requestBody = {
    ...dataRequest,
    namespace: ns,
    identifier: id,
    reference_id: uuidv1(),
    accessor_type: 'awesome-type',
    accessor_public_key,
    accessor_id: `some-awesome-accessor-for-${sid}-with-nonce-${nonce}`,
    ial: identity_ial == null ? dataRequest.ial : parseFloat(identity_ial),
  };
  namespace = this.requestBody.namespace;
  identifier = this.requestBody.identifier;
  fs.writeFileSync(`${config.keyPath}accessor_id_${this.requestBody.accessor_id}`, sid, 'utf8');
  console.log('\nIDP Create new identity \n', this.prettyPrintJSON(this.requestBody));
});

Given('IDP client should receive request from IDP platform', function (callback) {
  const _this = this;

  const interval = setInterval(() => {
    if (RequestFromIdpPlatform) {
      console.log('\nIDP client receive request from IDP platform\n', RequestFromIdpPlatform);
      clearInterval(interval);
      callback();
    }
  }, 500);
});

Given('IDP client making a request for create response', function (data, callback) {
  if (RequestFromIdpPlatform) {
    const sid = `${RequestFromIdpPlatform.namespace}-${RequestFromIdpPlatform.identifier}`;
    const dataRequest = JSON.parse(data);
    this.requestBody = {
      ...dataRequest,
      request_id: RequestFromIdpPlatform.request_id,
      namespace: RequestFromIdpPlatform.namespace,
      identifier: RequestFromIdpPlatform.identifier,
      status: status == null ? dataRequest.status : status.toLowerCase() === 'random' ? randomStatus : status,
      ial: ial == null ? dataRequest.ial : parseFloat(ial),
      aal: aal == null ? dataRequest.aal : parseFloat(aal),
      secret: fs.readFileSync(`${config.keyPath}secret_${sid}`, 'utf8'),
      signature: zkProof.signMessage(RequestFromIdpPlatform.request_message, config.keyPath + sid),
      accessor_id: `some-awesome-accessor-for-${sid}-with-nonce-${nonce}`,
    };

    console.log('\nIDP client making a request for create response\n', this.requestBody);
    callback();
  } else {
    callback(new Error('There is no callback from platform to IDP client'));
  }
});

When('IDP client make a POST request for {string} to {string}', async function (string, uri) {
  console.log('\nIDP client make a POST request for', string, ' to ', uri);
  await this.httpPost('IDP', uri);
});

When('IDP client make a POST request for create new identity to {string}', async function (uri) {
  console.log('\nIDP client make a POST request for create new identity to ', uri);
  await this.httpPost('IDP', uri);
});

Then('The response for create new identity', function (callback) {
  if (this.actualResponse) {
    console.log('\nThe response for create new identity: ', this.prettyPrintJSON(this.actualResponse));
    const sid = `${namespace}-${identifier}`;
    fs.writeFileSync(`${config.keyPath}secret_${sid}`, this.actualResponse.secret, 'utf8');
    callback();
  }
});


// ########### RP ###########
Given('RP client making a request for create request', async function (data) {
  await this.waitForCallback();
  const dataRequest = JSON.parse(data);
  this.requestBody = {
    ...dataRequest,
    reference_id: referenceId(),
    callback_url: config.CALLBACK_URL_RP + getReferenceId,
    min_ial: min_ial == null ? dataRequest.min_ial : parseFloat(min_ial),
    min_aal: min_aal == null ? dataRequest.min_aal : parseFloat(min_aal),
    min_idp: min_idp == null ? dataRequest.min_idp : parseInt(min_idp),
  };
  console.log('\nRP client making a request for create request \n', this.requestBody);
});

When('RP client make a POST request for create request to {string}', async function (uri) {
  uri = `/rp/requests/${namespace}/${identifier}`;
  console.log(`\nRP client make a POST request for create request to ${uri}`);
  await this.httpPost('RP', uri);
});

Then('RP client should receive request status {string}', { timeout: timeoutWaitStatus }, function (expectedValue, callback) {
  const _this = this;
  const interval = setInterval(() => {
    if (RequestStatusFromRpPlatform) {
      if (RequestStatusFromRpPlatform.status === expectedValue && RequestStatusFromRpPlatform.min_idp === RequestStatusFromRpPlatform.answered_idp_count) {
        clearInterval(interval);
        // clearTimeout(_timeout);
        assert.equal(RequestStatusFromRpPlatform.status, expectedValue, _this.prettyPrintError(RequestStatusFromRpPlatform.status, expectedValue));
        if (RequestStatusFromRpPlatform.status !== 'completed') {
          console.log('\nRP client receive request status:', RequestStatusFromRpPlatform.status, ' and answered IDP count:', RequestStatusFromRpPlatform.answered_idp_count);
        } else {
          console.log('\nRP client receive request status:', RequestStatusFromRpPlatform.status, 'and \nservice list:', RequestStatusFromRpPlatform.service_list);
        }
        callback();
      }
    }
  }, 500);
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
});

// ########### AS ###########
Given('AS client making a request for register service', function (data) {
  const dataRequest = JSON.parse(data);
  this.requestBody = {
    ...dataRequest,
    url: config.CALLBACK_URL_AS + service_id,
    service_id,
    min_ial: min_ial == null ? dataRequest.min_ial : parseFloat(min_ial),
    min_aal: min_aal == null ? dataRequest.min_aal : parseFloat(min_aal),
  };
  console.log('\nAS client making a request for register service\n', this.requestBody);
});

Given('AS client should receive data request from platform', function (callback) {
  const _this = this;

  const interval = setInterval(() => {
    if (DataRequestFromAsPlatform) {
      console.log('\nAS client receive data request from platform\n', DataRequestFromAsPlatform);
      clearInterval(interval);
      callback();
    }
  }, 500);
});

When('AS client make a POST request for {string} to {string}', async function (string, uri) {
  console.log(`\nAS client make a POST request for ${string} to ${uri}`);
  await this.httpPost('AS', uri);
});

When('AS client response data request to platform', function (callback) {
  const _this = this;

  const interval = setInterval(() => {
    if (DataResponseToPlatform) {
      console.log('\nAS client response data request to platform\n', DataResponseToPlatform);
      clearInterval(interval);
      callback();
    }
  }, 500);
});

// ########### Common ###########
Given('The {string} platform is running', (string, callback) => {
  callback();
});

Given('Platform send data request to AS client', (callback) => {
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
  console.log(`${property} is ${actualValue}`);
});

