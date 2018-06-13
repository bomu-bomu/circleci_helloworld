const express = require("express");
const bodyParser = require("body-parser");
const exec = require("child_process").exec;
const path = require("path");
var redis = require("redis");
const config = require("../config.js");

var pub = redis.createClient({
  host: config.REDIS_IP,
  port: config.REDIS_PORT
});

const MOCK_SERVER_RP_IP = process.env.MOCK_SERVER_RP_IP || "localhost";
const MOCK_SERVER_RP_PORT = process.env.MOCK_SERVER_RP_PORT || 1070;

process.on("unhandledRejection", function(reason, p) {
  console.error("Unhandled Rejection:", p, "\nreason:", reason.stack || reason);
});

const app = express();

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

function RPCreateRequest(data_request, data) {
  const RPStdout = exec(
    `sh ${path.join(
      __dirname,
      "..",
      "scripts",
      "rp-create-request.sh"
    )} '${data_request}' '${JSON.stringify(data)}'`
  );
  RPStdout.stdout.on("data", function(data) {
    console.log(data);
  });
  RPStdout.stderr.on("data", function(data) {
    console.log(data);
  });
}

app.post("/rp/request/:referenceId", (req, res) => {
  if (req.body.type == "request_event") {
    //Receive data requested from platform
    if (
      req.body.status === "completed" &&
      req.body.service_list &&
      req.body.service_list.length > 0
    ) {
      let data = { ...req.body, refId: req.params.referenceId };
      pub.publish("receive_data_requested_from_platform", JSON.stringify(data));
    }
    //Receive request status that idp response from platform
    let data = { ...req.body, refId: req.params.referenceId };
    pub.publish("receive_request_status_from_platform", JSON.stringify(data));
  }
  res.status(200).end();
});

app.post("/createRequest", (req, res) => {
  let data_request = "no";
  try {
    let { data } = req.body;

    console.log("Create Request ===> ", data);

    if (data.data_request_list.length > 0) {
      data_request = "yes";
    }

    RPCreateRequest(data_request, data);

    res.status(200).end();
  } catch (error) {
    res.status(500).end();
  }
});

app.listen(MOCK_SERVER_RP_PORT, () => {
  console.log(`Mock server RP listen on port ${MOCK_SERVER_RP_PORT}`);
});
