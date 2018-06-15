const assert = require("assert");
const { Given, When, Then, Before } = require("cucumber");
const config = require("../../config.js");
const zkProof = require("./zkProof.js");
const fs = require("fs");
const uuidv1 = require('uuid/v1');

//IDP create identity
let namespace = process.env.NS||"cid";
let identifier = process.env.ID||"1234";
let identity_ial = process.env.IDENTITY_IAL||"2.3";
//IDP create response
let status = process.env.STATUS;
let ial = process.env.IAL;
let aal = process.env.AAL;
//prevent duplicate accessor_id
const nonce = process.env.NONCE;

let RequestFromIdpPlatform;
let ResponseFromConsentOnboard;
let RequestBodyCreateIdentity;
let req_body = process.env.REQ_BODY;

function randomStatus() {
  let rand = Math.floor(Math.random() * 2);
  if(rand == 0) return 'accept';
  return 'reject';
}

Before("@CreateResponse",function(data,callback){
    if(req_body){
        RequestFromIdpPlatform = JSON.parse(req_body);
        callback();
    }
    else{
        callback(new Error("There is no request from platform"));
    }
})

Before("@CreateIdentity",function(data,callback){
  if(req_body){
    RequestBodyCreateIdentity = JSON.parse(req_body);
    callback();
  }
  else{
      callback(new Error("There is no request body for create identity from client"));
  }
})

Before("@ResponseFromConsentOnboard",function(data,callback){
  if(req_body){
    ResponseFromConsentOnboard = JSON.parse(req_body);
      callback();
  }
  else{
      callback(new Error("There is no response from platform"));
  }
})

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
    if(RequestBodyCreateIdentity){
      this.requestBody = {
        ...dataRequest,
        namespace:RequestBodyCreateIdentity.namespace,
        identifier:RequestBodyCreateIdentity.identifier,
        reference_id:RequestBodyCreateIdentity.reference_id,
        accessor_public_key:RequestBodyCreateIdentity.accessor_public_key,
        accessor_id: RequestBodyCreateIdentity.accessor_id,
        ial:RequestBodyCreateIdentity.ial
      }
      console.log("\nIDP Create new identity \n", this.prettyPrintJSON(this.requestBody));

    }
  });
  
  Given("IDP client should receive request from IDP platform",function(callback){
    //If IDP client receive callback from platform before this step
      if(RequestFromIdpPlatform){
        this.RequestFromIdpPlatform = RequestFromIdpPlatform;
        console.log("\nIDP client receive request from IDP platform\n",this.prettyPrintJSON(this.RequestFromIdpPlatform))
        callback();
      }
  });
  
  Given("IDP client making a request for create response", function(data,callback) {
    if(this.RequestFromIdpPlatform){
      let sid =this.RequestFromIdpPlatform.namespace+"-"+this.RequestFromIdpPlatform.identifier
          let dataRequest = JSON.parse(data);
          this.requestBody = {
              ...dataRequest,
              request_id: this.RequestFromIdpPlatform.request_id,
              namespace: this.RequestFromIdpPlatform.namespace,
              identifier: this.RequestFromIdpPlatform.identifier,
              status:status.toLowerCase() === "random" ? randomStatus():status,
              ial:ial == null ? dataRequest.ial  : parseFloat(ial),
              aal:aal == null ? dataRequest.aal  : parseFloat(aal),
              secret:fs.readFileSync(config.keyPath+"secret_"+ sid,'utf8'),
              signature:zkProof.signMessage(this.RequestFromIdpPlatform.request_message, config.keyPath + sid),
              accessor_id: 'some-awesome-accessor-for-' + sid + '-with-nonce-' + nonce,
            };
            console.log("\nIDP client making a request for create response\n",this.prettyPrintJSON(this.requestBody));
            callback();
      }
      else{
          callback(new Error("There is no callback from platform to IDP client"));
      }
  });

  Given("IDP client should receive response from consent for onboard",function(callback){
    if(ResponseFromConsentOnboard){
      console.log("\nIDP client receive response from consent for onboard\n",this.prettyPrintJSON(ResponseFromConsentOnboard))
      callback();
    }
  })
  
  When("IDP client make a POST request for {string} to {string}", async function(string,uri) {
    console.log("\nIDP client make a POST request for",string," to ",uri)
    await this.httpPost("IDP", uri);
  });

  When("IDP client make a POST request for create new identity to {string}",{timeout:-1},async function(uri) {
    console.log("\nIDP client make a POST request for create new identity to ",uri)
    await this.httpPost("IDP", uri);
  });

  Then("The response for create new identity",function(callback){
    if(this.actualResponse){
      console.log("The response for create new identity: ",this.prettyPrintJSON(this.actualResponse));
      let sid =  RequestBodyCreateIdentity.namespace + "-" + RequestBodyCreateIdentity.identifier;
      fs.writeFileSync(config.keyPath + 'onboardMapping_' + this.actualResponse.request_id ,sid, 'utf8');
      callback();
    }
  })

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
      console.log("\n"+property + " is " + actualValue);
    });

    Then("The response property {string} should be {string}", function(property,expectedValue,callback) {
      const actualValue = this.getValue(ResponseFromConsentOnboard,property).toString();
      assert.equal(
        actualValue,
        expectedValue,
        `\r\nExpected: ${expectedValue}\r\nActual: ${actualValue}\r\nResponse: \r\n${this.prettyPrintJSON(ResponseFromConsentOnboard)}`
      );
      console.log(`\nThe response property ${property} ${actualValue}`);
      callback();
    });
  