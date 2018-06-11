const { spawnSync } = require('child_process');

const IDP_API_IP = process.env.IDP_API_IP || "localhost";
const IDP_API_PORT = process.env.IDP_API_PORT || 8081;
const IDP_API_ADDRESS = `http://${IDP_API_IP}:${IDP_API_PORT}`;

const RP_API_IP = process.env.RP_API_IP || "localhost";
const RP_API_PORT = process.env.RP_API_PORT || 8082;
const RP_API_ADDRESS = `http://${RP_API_IP}:${RP_API_PORT}`;

const AS_API_IP = process.env.AS_API_IP || "localhost";
const AS_API_PORT = process.env.AS_API_PORT || 8083;
const AS_API_ADDRESS = `http://${AS_API_IP}:${AS_API_PORT}`;

const MOCK_SERVER_RP_IP = process.env.MOCK_SERVER_RP_IP || "localhost";
const MOCK_SERVER_RP_PORT = process.env.MOCK_SERVER_RP_PORT || "1070";
const CALLBACK_URL_RP =
  `http://${MOCK_SERVER_RP_IP}:${MOCK_SERVER_RP_PORT}/rp/request/` ||
  "http://localhost:1070/rp/request/";

const MOCK_SERVER_IDP_IP = process.env.MOCK_SERVER_IDP_IP || "localhost";
const MOCK_SERVER_IDP_PORT = process.env.MOCK_SERVER_IDP_PORT || "1080";
const CALLBACK_URL_IDP =
  `http://${MOCK_SERVER_IDP_IP}:${MOCK_SERVER_IDP_PORT}/idp/request/` ||
  "http://localhost:1080/idp/request/";
const ACCESSOR_CALLBACK_URL_IDP = `http://${MOCK_SERVER_IDP_IP}:${MOCK_SERVER_IDP_PORT}/idp/accessor` ||
"http://localhost:1080/idp/accessor";

const MOCK_SERVER_AS_IP = process.env.MOCK_SERVER_AS_IP || "localhost";
const MOCK_SERVER_AS_PORT = process.env.MOCK_SERVER_AS_PORT || "1090";
const CALLBACK_URL_AS =
  `http://${MOCK_SERVER_AS_IP}:${MOCK_SERVER_AS_PORT}/as/service/` ||
  "http://localhost:1090/as/service/";

const REDIS_IP = process.env.REDIS_IP || "localhost";
const REDIS_PORT = process.env.REDIS_PORT || "6379";

const keyPath = './persistent_db/dev_user_key/';

module.exports = {
  IDP_API_IP: IDP_API_IP,
  IDP_API_PORT: IDP_API_PORT,
  IDP_API_ADDRESS: IDP_API_ADDRESS,

  RP_API_IP: RP_API_IP,
  RP_API_PORT: RP_API_PORT,
  RP_API_ADDRESS: RP_API_ADDRESS,

  AS_API_IP: AS_API_IP,
  AS_API_PORT: AS_API_PORT,
  AS_API_ADDRESS: AS_API_ADDRESS,

  CALLBACK_URL_RP: CALLBACK_URL_RP,
  CALLBACK_URL_IDP: CALLBACK_URL_IDP,
  CALLBACK_URL_AS: CALLBACK_URL_AS,
  ACCESSOR_CALLBACK_URL_IDP:ACCESSOR_CALLBACK_URL_IDP,

  REDIS_IP: REDIS_IP,
  REDIS_PORT: REDIS_PORT,

  keyPath:keyPath
};
