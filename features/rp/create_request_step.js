const assert = require("assert");
const { Given, When, Then} = require("cucumber");
const uuidv1 = require('uuid/v1');
const config = require("../../config.js");
const redis = require("redis");
const sub = redis.createClient({host:process.env.REDIS_IP,port:process.env.REDIS_PORT});

let getReferenceId;

//RP create request
let namespace = process.env.NS || "cid";
let identifier = process.env.ID || "1234";
//RP create request
let withDataRequest = process.env.DATA_REQUEST || "no";
let min_idp = process.env.MIN_IDP;
let min_ial = process.env.MIN_IAL;
let min_aal = process.env.MIN_AAL;
let idp_list=[];
let request_message;
let request_timeout;
let data_request_list=[];
//Timeout for RP wait status from IDP
let timeoutWaitStatus = parseInt(process.env.TIMEOUT_STATUS_FROM_IDP || '-1');
//Timeout for RP wait data from AS
let timeoutWaitDataFromAS = parseInt(process.env.TIMEOUT_DATA_FROM_AS || '-1');

let arrayDataRequest = [
  {
    service_id: "bank_statement",
    as_id_list: ["as1", "as2", "as3"],
    count: 1,
    request_params: { format: "pdf" }
  }
];

let param = process.env.PARAM;

if (param) {
  let _param = JSON.parse(param);
  namespace = _param.namespace || "cid";
  identifier = _param.identifier || "1234";
  min_idp = _param.min_idp;
  min_ial = _param.min_ial;
  min_aal = _param.min_aal;
  idp_list = _param.idp_list;
  request_message = _param.request_message;
  request_timeout = parseInt(_param.request_timeout);
  if(_param.data_request_list && _param.data_request_list.length > 0){
    arrayDataRequest = _param.data_request_list;
  }
}

function referenceId() {
  getReferenceId = uuidv1();
  return getReferenceId;
}

let RequestStatusFromRpPlatform;
let ReceiveDataRequestedFromPlatform;

sub.on("message", function(ch, message) {
  if(ch === 'receive_request_status_from_platform'){
    let result = JSON.parse(message);
    if(result.refId === getReferenceId){
      RequestStatusFromRpPlatform = result
    }
  }
  else if(ch === 'receive_data_requested_from_platform'){
    let result = JSON.parse(message);
    if(result.refId === getReferenceId){
    ReceiveDataRequestedFromPlatform = result;
  }
}

});

sub.subscribe("receive_request_status_from_platform");
sub.subscribe("receive_data_requested_from_platform");

//########### RP ###########
Given("RP client making a request for create request", async function(data) {
  let dataRequest = JSON.parse(data);
  this.requestBody = {
    ...dataRequest,
    reference_id: referenceId(),
    callback_url: `${config.CALLBACK_URL_RP}${getReferenceId}`,
    idp_list:idp_list,
    data_request_list:
      withDataRequest.toLowerCase() == "yes" ? arrayDataRequest : [],
    min_ial: min_ial == null ? dataRequest.min_ial : parseFloat(min_ial),
    min_aal: min_aal == null ? dataRequest.min_aal : parseFloat(min_aal),
    min_idp: min_idp == null ? dataRequest.min_idp : parseInt(min_idp),
    request_message:request_message, //JSON.stringify(dataRequest.request_message),
    request_timeout:request_timeout
  };

  console.log("\nRP client making a request for create request \n",this.requestBody);
});

When("RP client make a POST request for create request to {string}", async function(uri) {
  uri = `/rp/requests/${namespace}/${identifier}`;
  console.log(`\nRP client make a POST request for create request to ${uri}`);
  await this.httpPost("RP", uri);
});

Then("RP client should receive request status {string}",{ timeout: timeoutWaitStatus },function(expectedValue, callback) {
    let _this = this;

    let interval = setInterval(function() {
      if(RequestStatusFromRpPlatform){
        if(RequestStatusFromRpPlatform.timed_out){
          callback(new Error("RP client receive request timed out and status:"+RequestStatusFromRpPlatform.status+" and answered IDP count:"+RequestStatusFromRpPlatform.answered_idp_count))
        }
        else if (RequestStatusFromRpPlatform.closed){
          callback(new Error("RP client receive request closed and status:"+RequestStatusFromRpPlatform.status+" and answered IDP count:"+RequestStatusFromRpPlatform.answered_idp_count))
        }
        else if (RequestStatusFromRpPlatform.status === expectedValue && RequestStatusFromRpPlatform.min_idp === RequestStatusFromRpPlatform.answered_idp_count) {
          clearInterval(interval);
          //clearTimeout(_timeout);
          assert.equal(RequestStatusFromRpPlatform.status,expectedValue,_this.prettyPrintError(RequestStatusFromRpPlatform, expectedValue));
          if(RequestStatusFromRpPlatform.status !== 'completed'){
            console.log("\nRP client receive request status:",RequestStatusFromRpPlatform.status," and answered IDP count:",RequestStatusFromRpPlatform.answered_idp_count);
          }
          else{
            console.log("\nRP client receive request status:",RequestStatusFromRpPlatform.status,"and \nservice list:",RequestStatusFromRpPlatform.service_list);
          }
          callback();
        }
      } 
    }, 100);
  }
);

Then("RP client should receive data requested",{ timeout: timeoutWaitDataFromAS }, function(callback) {
  let _this = this;
  let uri = `/rp/requests/data/${ReceiveDataRequestedFromPlatform.request_id}`

  let interval = setInterval(async function(){
      await _this.httpGet("RP", uri);
      console.log('\nRP client receive data requested\n',_this.prettyPrintJSON(_this.actualResponse));
      clearInterval(interval);
      callback();
  },500);
});

//########### Common ###########
Given("The {string} platform is running", function(string, callback) {
  callback();
});

Then("The response status code should be {string}", function(
  expectedValue,
  callback
) {
  assert.equal(
    this.statusCode,
    expectedValue,
    this.prettyPrintError(this.statusCode, expectedValue)
  );
  console.log(`\nThe response status code ${this.statusCode}`);
  callback();
});

Then("The response property {string} is", async function(property) {
  const actualValue = this.getValue(this.actualResponse, property);
  console.log("\n" + property + " is " + actualValue);
});
