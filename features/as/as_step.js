const assert = require("assert");
const { Given, When, Then, Before } = require("cucumber");
const config = require("../../config.js");
const path = require('path');
const fs = require('fs');

let req_body = process.env.REQ_BODY;
let response_data = process.env.RESPONSE_DATA;
//AS register service
let service_id = process.env.SERVICE_ID || "bank_statement";
let service_name = process.env.SERVICE_NAME || "Bank statement description";
let min_ial = parseFloat(process.env.MIN_IAL);
let min_aal = parseFloat(process.env.MIN_AAL);


Before("@ResponseDataRequest",function(){
  if(req_body){
    DataRequestFromAsPlatform = JSON.parse(req_body);
  }
  else{
    callback(new Error("There is no data request from platform"));
  }
  if(response_data){
    if(response_data == "LARGE_DATA"){
      let filePath = path.join(__dirname,'..','..','/mockclient','file5mb');
      let _data = fs.readFileSync(filePath,'utf8');
      DataResponseToPlatform = JSON.parse(_data);
    }
    else{
      DataResponseToPlatform = JSON.parse(response_data);
    }
  }

})

//########### AS ###########
Given("AS client making a request for register service",function(data){
    let dataRequest = JSON.parse(data);
    this.requestBody = {
      ...dataRequest,
      url: config.CALLBACK_URL_AS + service_id,
      service_id:service_id,
      service_name:service_name,
      min_ial:min_ial == null ? dataRequest.min_ial : parseFloat(min_ial),
      min_aal:min_aal == null ? dataRequest.min_aal : parseFloat(min_aal)
    };
    console.log("\nAS client making a request for register service\n",this.requestBody);
  })
  
  Given("AS client should receive data request from platform",function(callback){
    if(DataRequestFromAsPlatform){
      this.DataRequestFromAsPlatform = DataRequestFromAsPlatform;
      callback();
    }
    console.log("\nAS client receive data request from platform\n",this.DataRequestFromAsPlatform);
  });
  
  When("AS client make a POST request for {string} to {string}",function(string,uri){
    uri = `/as/service/${service_id}`
    console.log(`\nAS client make a POST request for ${string} to ${uri}`)
    return this.httpPost("AS", uri);
  });
  
  When("AS client response data request to platform",function(callback){
    if(DataResponseToPlatform){
      this.DataResponseToPlatform = DataResponseToPlatform
      console.log("\nAS client response data request to platform\n",this.DataResponseToPlatform);
      callback();
    }
  });
  
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
    callback();
    console.log(`\nThe response status code ${this.statusCode}`)
  });

  