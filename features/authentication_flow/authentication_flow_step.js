const assert = require("assert");
const { Given, When, Then, After } = require("cucumber");
const config = require("../../config.js");
const uuidv1 = require('uuid/v1');
const zkProof = require("../idp/zkProof.js");
const fs = require("fs");
const redis = require("redis");
const sub = redis.createClient({host:config.REDIS_IP,port:config.REDIS_PORT});

let getReferenceId;

//IDP create identity and RP create request
let namespace = process.env.NS || "cid";
let identifier = process.env.ID || "1234";
let identity_ial = process.env.IDENTITY_IAL || 3; //For IDP create identity
//RP create request
let min_idp = process.env.MIN_IDP;
let min_ial = process.env.MIN_IAL;
let min_aal = process.env.MIN_AAL;
//IDP create response
let ial = process.env.IAL;
let aal = process.env.AAL;
let status = process.env.STATUS;
//Timeout for RP wait status from IDP
let timeoutWaitStatus = parseInt(process.env.TIMEOUT_STATUS_FROM_IDP || '10000');
//prevent duplicate accessor_id
const nonce = uuidv1();

let RequestFromIdpPlatform;
let RequestStatusFromRpPlatform;

function referenceId() {
  getReferenceId = uuidv1();
  return getReferenceId;
}

sub.on("message", function(ch, message) {
  let result = JSON.parse(message);
  if(ch === 'receive_request_status_from_platform'){ //RP receive request status from platform
    if(result.refId === getReferenceId){
      RequestStatusFromRpPlatform = result
    }
  }
  else if(ch === 'callback_from_idp_platform'){ //IDP receive call back from platform
    RequestFromIdpPlatform = result;
  }
});

//RP subscribe
sub.subscribe("receive_request_status_from_platform");

//IDP subscribe
sub.subscribe("callback_from_idp_platform");

//########### IDP ###########
Given("IDP client making a request for set callback url", function(data) {
  let dataRequest = JSON.parse(data);
  this.requestBody = {
    ...dataRequest,
    url: config.CALLBACK_URL_IDP
  };
  console.log("\nIDP client making a request for set callback url\n",this.requestBody);
});

Given("IDP client making a request for set accessor callback url", function(data) {
  let dataRequest = JSON.parse(data);
  this.requestBody = {
    ...dataRequest,
    url: config.ACCESSOR_CALLBACK_URL_IDP
  };
  console.log("\nIDP client making a request for set callback url\n",this.requestBody);
});

Given("IDP client making a request for create new identity", function(data) {
  let dataRequest = JSON.parse(data);
    let ns = namespace == null ? dataRequest.namespace : namespace
    let id = identifier == null ? dataRequest.identifier : identifier
    let sid = ns + "-" + id;
    zkProof.genNewKeyPair(sid);
    let accessor_public_key = fs.readFileSync(config.keyPath + sid + '.pub','utf8');
    this.requestBody = {
      ...dataRequest,
      namespace: ns,
      identifier: id,
      reference_id:uuidv1(),
      accessor_type: 'awesome-type',
      accessor_public_key,
      accessor_id: 'some-awesome-accessor-for-' + sid + '-with-nonce-' + nonce,
      ial:identity_ial == null ? dataRequest.ial : parseFloat(identity_ial)
    }
  namespace = this.requestBody.namespace;
  identifier = this.requestBody.identifier;
});

Given("IDP client should receive request from IDP platform",function(callback){

  let _this = this;

  let interval = setInterval(function(){
    if(RequestFromIdpPlatform){
      console.log("\nIDP client receive request from IDP platform\n",RequestFromIdpPlatform)
      clearInterval(interval);
      callback();
    }
  },500);

});

Given("IDP client making a request for create response", function(data,callback) {
  if(RequestFromIdpPlatform){
    let sid =RequestFromIdpPlatform.namespace+"-"+RequestFromIdpPlatform.identifier
        let dataRequest = JSON.parse(data);
        this.requestBody = {
            ...dataRequest,
            request_id: RequestFromIdpPlatform.request_id,
            namespace: RequestFromIdpPlatform.namespace,
            identifier: RequestFromIdpPlatform.identifier,
            status:status == null ? dataRequest.status : status.toLowerCase() === "random" ? randomStatus:status,
            ial:ial == null ? dataRequest.ial  : parseFloat(ial),
            aal:aal == null ? dataRequest.aal  : parseFloat(aal),
            secret:fs.readFileSync(config.keyPath+"secret_"+ sid,'utf8'),
            signature:zkProof.signMessage(RequestFromIdpPlatform.request_message, config.keyPath + sid),
            accessor_id: 'some-awesome-accessor-for-' + sid + '-with-nonce-' + nonce,
          };

        console.log("\nIDP client making a request for create response\n",this.requestBody);
        callback();
  }
  else{
      callback(new Error("There is no callback from platform to IDP client"));
  }
});

When("IDP client make a POST request for {string} to {string}", async function(string,uri) {
  console.log("\nIDP client make a POST request for",string," to ",uri)
  await this.httpPost("IDP", uri);
});

When("IDP client make a POST request for create new identity to {string}",async function(uri) {
  console.log("\nIDP client make a POST request for create new identity to ",uri)
  await this.httpPost("IDP", uri);
});

Then("The response for create new identity",function(callback){
  if(this.actualResponse){
    console.log("\nThe response for create new identity: ",this.prettyPrintJSON(this.actualResponse));
    let sid =  namespace + "-" + identifier;
    fs.writeFileSync(config.keyPath + 'secret_' + sid ,this.actualResponse.secret, 'utf8');
    callback();
  }
})


//########### RP ###########
Given("RP client making a request for create request", async function(data) {
  await this.waitForCallback();
  let dataRequest = JSON.parse(data);
  this.requestBody = {
    ...dataRequest,
    reference_id: referenceId(),
    callback_url:  config.CALLBACK_URL_RP+ getReferenceId,
    min_ial: min_ial == null ? dataRequest.min_ial : parseFloat(min_ial),
    min_aal: min_aal == null ? dataRequest.min_aal : parseFloat(min_aal),
    min_idp: min_idp == null ? dataRequest.min_idp : parseInt(min_idp)
  };
  console.log("\nRP client making a request for create request \n", this.requestBody);
});

When("RP client make a POST request for create request to {string}", function(uri) {
    uri = `/rp/requests/${namespace}/${identifier}`;
    console.log(`\nRP client make a POST request for create request to ${uri}`)
    return this.httpPost("RP", uri);
  });

Then('RP client should receive request status {string}',{timeout:timeoutWaitStatus},function(expectedValue,callback){
  
  let _this = this;
  let interval = setInterval(function() {
    if(RequestStatusFromRpPlatform){
      if (RequestStatusFromRpPlatform.status === expectedValue && RequestStatusFromRpPlatform.min_idp === RequestStatusFromRpPlatform.answered_idp_count) {
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
  }, 500);

  // let _timeout = setTimeout(function() {
  //   if (!RequestStatusFromRpPlatform) {
  //     //Not receive data from platform
  //     clearInterval(interval);
  //     clearTimeout(_timeout);
  //     callback(
  //       new Error("Function time out RP client not receive request status from platform")
  //     );

  //   } else {
  //     //Receive data but unexpected
  //     clearInterval(interval);
  //     clearTimeout(_timeout);
  //     assert.equal(
  //       RequestStatusFromRpPlatform, //actual value
  //       expectedValue,
  //       "Function time out" +
  //         _this.prettyPrintError(RequestStatusFromRpPlatform.status, expectedValue)
  //     );
  //   }
  // }, 10000);
}
);

//########### Common ###########
Given("The {string} platform is running", function(string,callback) {
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
  console.log(`\nThe response status code ${this.statusCode}`)
  callback();
});

Then("The response property {string} is", async function(property) {
    const actualValue = this.getValue(this.actualResponse,property);
    console.log(property + " is " + actualValue);
  });


