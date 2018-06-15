const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const MOCK_SERVER_RP_IP = process.env.MOCK_SERVER_RP_IP || "localhost";
const MOCK_SERVER_RP_PORT = process.env.MOCK_SERVER_RP_PORT || 1070;

async function CreateRequest(data) {
  try { 
    const response = await fetch(
      `http://${MOCK_SERVER_RP_IP}:${MOCK_SERVER_RP_PORT}/createRequest`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data })
      }
    );
    return;
  } catch (error) {
    throw error;
  }
}

try {
  let dataRequest = fs.readFileSync(
    path.join(__dirname,"..","features","rp", "request.json"),
    "utf8"
  );
  let data = JSON.parse(dataRequest);
  data.forEach(element => {
      console.log("Create Request ===> ",element);
    CreateRequest(element);
  });
} catch (error) {
  throw error;
}
