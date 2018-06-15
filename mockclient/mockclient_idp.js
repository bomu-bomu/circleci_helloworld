const express = require("express");
const bodyParser = require("body-parser");
const shell = require("shelljs");
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const uuidv1 = require("uuid/v1");
const zkProof = require("../features/idp/zkProof.js");
const config = require("../config.js");
const exec = require("child_process").exec;

const MOCK_SERVER_IDP_IP = process.env.MOCK_SERVER_IDP_IP || "localhost";
const MOCK_SERVER_IDP_PORT = process.env.MOCK_SERVER_IDP_PORT || 1080;
const autoResponse = process.env.AUTO_RESPONSE || "no";

//for test data request flow and authen flow
let namespace = process.env.NS || "cid";
let identifier = process.env.ID || "1234";

function _autoResponse() {
  return autoResponse.toLowerCase() === "yes";
}

if (!_autoResponse()) {
  var redis = require("redis");
  var pub = redis.createClient({
    host: config.REDIS_IP,
    port: config.REDIS_PORT
  });
}

process.on("unhandledRejection", function(reason, p) {
  console.error("Unhandled Rejection:", p, "\nreason:", reason.stack || reason);
});

spawnSync("mkdir", ["-p", config.keyPath]);

const app = express();
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

let nonce = uuidv1();
let accessorSign = {};

function CreateIdentitty() {
  if (!_autoResponse()) return;
  try {
    let identityFromFile = fs.readFileSync(
      path.join(__dirname, "..", "features", "idp", "identity.json"),
      "utf8"
    );
    let identity = JSON.parse(identityFromFile);
    identity.forEach(async element => {
      let sid = element.namespace + "-" + element.identifier;
      zkProof.genNewKeyPair(sid);
      let accessor_public_key = fs.readFileSync(
        config.keyPath + sid + ".pub",
        "utf8"
      );
      let reference_id = uuidv1();
      let accessor_id =
        "some-awesome-accessor-for-" + sid + "-with-nonce-" + nonce;
      accessorSign[accessor_id] = sid;

      let detailCreateIdentity = {
        namespace: element.namespace,
        identifier: element.identifier,
        reference_id: reference_id,
        accessor_type: "awesome-type",
        accessor_public_key: accessor_public_key,
        accessor_id: accessor_id,
        ial: element.ial
      };
      let jsonDetailCreateIdentity = JSON.stringify(detailCreateIdentity);
      const createIdentitty = exec(
        `sh ${path.join(
          __dirname,
          "..",
          "scripts",
          "idp-create-identity.sh"
        )} '${jsonDetailCreateIdentity}'`
      );
      createIdentitty.stdout.on("data", function(data) {
        console.log(data);
      });
      createIdentitty.stderr.on("data", function(data) {
        console.log(data);
      });
    });
  } catch (error) {
    throw error;
  }
}

app.post("/idp/request", (req, res) => {
  const request = req.body;
  if (request.type === "onboard_request" || request.type === "onboard_consent_request") {
    //Result consent for onboard
    let sid = fs.readFileSync(
      config.keyPath + "onboardMapping_" + request.request_id,
      "utf8"
    );
    fs.writeFileSync(
      config.keyPath + "secret_" + sid,
      request.secret,
      "utf8"
    );
    if (_autoResponse()) {
      try {
        shell.exec(
          `${path.join(
            __dirname,
            "..",
            "scripts",
            "idp-receive-response-onboard.sh"
          )} '${JSON.stringify(request)}'`
        );
      } catch (error) {
        throw error;
      }
    } else {
      pub.publish(
        "callback_onboard_request_from_idp_platform",
        JSON.stringify(request)
      );
    }
  } else {
    if (_autoResponse()) {
      let status = "random";
      let delayResponse = 0;
      if (request.type === "consent_request") {
        status = "accept";
      } else {
        let namespace = request.namespace;
        //status = "random";
        //let delayResponse = 0;
        let arr = namespace.split("_");
        if (arr.length > 1) {
          try {
            delayResponse = parseInt(arr[1]);
            if (arr[0] !== "accept" && arr[0] !== "reject")
              throw "namespace isn't accept or reject";
            status = arr[0];
          } catch (error) {
            delayResponse = 0;
            status = "random";
          }
        } else {
          if (namespace === "accept" || namespace === "reject")
            status = namespace;
        }
      }
      try {
        setTimeout(function() {
          shell.exec(
            `${path.join(
              __dirname,
              "..",
              "scripts",
              "idp-send-response.sh"
            )} '${JSON.stringify(request)}' '${nonce}' '${status}'`
          );
        }, delayResponse * 1000);
      } catch (error) {
        throw error;
      }
    } else {
      pub.publish("callback_from_idp_platform", JSON.stringify(request));
    }
  }
  res.status(200).end();
});

app.post("/idp/accessor", async (req, res) => {
  let { sid_hash, accessor_id } = req.body;
  let sid = accessorSign[accessor_id];

  if (!_autoResponse()) {
    sid = fs.readFileSync(
      config.keyPath + "accessor_id_" + accessor_id,
      "utf8"
    );
  }

  res.status(200).send({
    signature: zkProof.accessorSign(sid, sid_hash)
  });
});

app.listen(MOCK_SERVER_IDP_PORT, () => {
  console.log(`Mock server IDP listen on port ${MOCK_SERVER_IDP_PORT}`);
  CreateIdentitty();
});
