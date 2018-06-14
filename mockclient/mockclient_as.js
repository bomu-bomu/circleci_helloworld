const express = require('express');
const bodyParser = require('body-parser');
const shell = require('shelljs');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const config = require('../config.js');

const MOCK_SERVER_AS_IP = process.env.MOCK_SERVER_AS_IP || 'localhost';
const MOCK_SERVER_AS_PORT = process.env.MOCK_SERVER_AS_PORT || 1090;
const AS_API_IP = config.AS_API_IP || 'localhost';
const AS_API_PORT = config.AS_API_PORT || '8082';
const SERVICE_ID = process.env.SERVICE_ID || 'bank_statement';
const autoResponse = process.env.AUTO_RESPONSE || 'no';
const largeData = process.env.LARGE_DATA || 'no';

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection:', p, '\nreason:', reason.stack || reason);
});

function _autoResponse() {
  return autoResponse.toLowerCase() === 'yes';
}

if (!_autoResponse()) {
  const redis = require('redis');
  var pub = redis.createClient({
    host: config.REDIS_IP,
    port: config.REDIS_PORT,
  });
}

let objData;
if (largeData.toLowerCase() == 'yes') {
  const dataFromFile = fs.readFileSync(path.join(__dirname, 'file5mb'), 'utf8');
  objData = { data: dataFromFile };
}

if (_autoResponse()) {
  const serviceFromFile = fs.readFileSync(path.join(__dirname, '..', 'features', 'as', 'service.json'), 'utf8');
  const service = JSON.parse(serviceFromFile);
  service.forEach(async (element) => {
    try {
      const response = await fetch(`http://${AS_API_IP}:${AS_API_PORT}/as/service/${element.service_id}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      const responseJson = await response.json();
      if (!responseJson) {
        shell.exec(`${path.join(__dirname, '..', 'scripts', 'as-register-service.sh')} '${element.service_id}' '${element.service_name}' '${element.min_ial}' '${element.min_aal}'`);
      }
    } catch (error) {
      throw error;
    }
  });
}

app.post('/as/service/:service_id', async (req, res) => {
  const request = req.body;

  if (!_autoResponse()) {
    pub.publish('receive_data_request_from_platform', JSON.stringify(request));
  }

  const data = { data: 'mock data' };

  const _data = largeData.toLowerCase() == 'yes' ? objData : data;

  res.status(200).json(_data);

  if (!_autoResponse()) {
    pub.publish('response_data_to_platform', JSON.stringify(_data));
  }

  if (_autoResponse()) {
    const paramToScript =
      largeData.toLowerCase() == 'yes' ? 'LARGE_DATA' : JSON.stringify(data);
    try {
      shell.exec(`${path.join(
        __dirname,
        '..',
        'scripts',
        'as-response-data.sh',
      )} '${JSON.stringify(request)}' '${paramToScript}'`);
    } catch (error) {
      throw error;
    }
  }
});

app.listen(MOCK_SERVER_AS_PORT, () => {
  console.log(`Mock server AS listen on port ${MOCK_SERVER_AS_PORT}`);
});
