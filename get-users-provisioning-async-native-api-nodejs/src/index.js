require('./cometd-nodejs-client').adapt();
const uuid = require('uuid');
const request = require('request-promise');
const CometDLib = require('cometd');

process.env['FORCE_COLOR'] = true;

const chalk = require('chalk');
const util = require('util');

/******************** CONFIG ****************************/
const BASE_URL = 'https://your-api-server.genhtcc.com';

const config = {
    // Auth server credentials
    AUTH: {
        clientId: 'auth_api_client',
        clientSecret: 'password'
    },

    // Provisioning user credentials
    PROVISIONING: {
        username: 'domain\\user_name',
        password: 'password'
    },

    // API Key (required for access through the API Gateway only)
    API_KEY: 'api_key_if_required',

    // Set to true to view extended output (including raw request and response headers and CometD messages)
    DEBUG: true,

    TRACE_ID: ''
};

function log(msg) {
    if (config.DEBUG === true) {
        console.log(msg);
    }
}

// This patch is required to show raw requests and response in a console
// Works if DEBUG flag is true
function enableHttpDebugOutput() {

    // generate random trace id if it was not set
    if (!config.TRACE_ID) {
        config.TRACE_ID = generateTraceId();
    }

    console.log(chalk.red('\nDEBUG output enabled'));
    console.log(chalk.red(`X-B3-TraceId: ${config.TRACE_ID}\n`));

    // path HTTP requests to log network activity
    const http = require('http');
    const patch = require('monkeypatch');

    patch(http, 'request', (requestUnpatched, options, cb) => {
        const req = requestUnpatched(options, cb);

        patch(req, 'end', (endUnpatched, data) => {
            log(chalk.red(`${req.method}`) + chalk.blue(` ${req.path}`));
            const headers = req.getHeaders();
            if (headers)
                log(chalk.green("HEADERS: ") + chalk.green(util.inspect(headers, {depth: 5})));
            if (data)
                log(chalk.gray(util.inspect(data, {depth: 5})));
            if (req.output)
                log(chalk.gray(util.inspect(req.output, {depth: 5})));


            return endUnpatched(data);
        });

        req.on('response', resp => {
            const headers = resp ? resp.headers : {};

            resp.on('data', data => {
                log(chalk.red("RESPONSE") + chalk.blue(` ${req.path}`));
                if (headers)
                    log(chalk.green("HEADERS: ") + chalk.green(util.inspect(headers, {depth: 5})));

                if (data instanceof Buffer) {
                    log(chalk.gray(util.inspect(data.toString('utf8'), {depth: 5})));
                } else {
                    log(chalk.gray(util.inspect(data, {depth: 5})));
                }
            });
        });

        return req;
    });
}

var _provisioningRequest = request.defaults();
var _cookieJar = request.jar();
var _cometd = new CometDLib.CometD();

// Get auth token from auth server
async function getAuthToken(username, password) {
    log("Retrieving auth token ...");

    const headers = {
        'Authorization': 'Basic ' + Buffer.from(`${config.AUTH.clientId}:${config.AUTH.clientSecret}`, 'utf8').toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-Key': config.API_KEY
    };

    const data = {
        'grant_type': 'password',
        'username': username,
        'password': password,
        'client_id': 'external_api_client',
        'scope': '*'
    };

    const res = await request({
        url: `${BASE_URL}/auth/v3/oauth/token`,
        method: 'POST',
        headers: headers,
        json: true,
        jar: _cookieJar,
        form: data
    });

    log(`Done: ${res['access_token']}`);

    return res['access_token'] || "";
}

function generateTraceId() {
    return uuid().replace(/-/g, '').substring(0, 15);
}

// Initialize provisioning
async function initializeProvisioning(accessToken) {
    log("Initialize provisioning ...");

    // Set default headers
    let defaultHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-API-Key': config.API_KEY
    };

    // Set trace id header to trace requests if required
    if (config.TRACE_ID) {
        defaultHeaders['X-B3-TraceId'] = config.TRACE_ID;
    }

    _provisioningRequest = request.defaults({
        //resolveWithFullResponse: true,
        jar: _cookieJar,
        headers: defaultHeaders,
        json: true,
    });

    // Initialize
    const resp = await _provisioningRequest({
        url: `${BASE_URL}/provisioning/v3/initialize-provisioning`,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-API-Key': config.API_KEY
        },
        json: true,
        jar: _cookieJar,
        method: 'POST'
    });

    // Save PROVISIONING_SESSIONID in cookies for CometD
    let sessionCookie = `PROVISIONING_SESSIONID=${resp['data']['sessionId']}`;

    _cookieJar.setCookie(sessionCookie, `${BASE_URL}/provisioning/v3/`, {secure: false});

    return resp;
}

function onCometdMessage(msg) {
    msg = msg.data;

    log(`CometD Message on channel: ${msg.channel} with data: ${JSON.stringify(msg.data)}`);

    if (msg.channel === 'operations') {
        onOperationsAsyncResponse(msg.data.id, msg.data.data);
    }
}

// Initialize CometD library
async function initializeCometd() {
    log("Initialize CometD ...");

    const transport = _cometd.findTransport('long-polling');

    // To make CometD operational you should provide valid session stickiness AWALB cookie
    // with PROVISIONING_SESSIONID session cookie in requests
    // So it SHOULD use same cookie storage as other requests
    transport.context = {cookieJar: _cookieJar};

    _cometd.configure({
        url: `${BASE_URL}/provisioning/v3/notifications`,
        requestHeaders: {
            'X-API-Key': config.API_KEY
        }
    });

    log('Starting cometd handshake...');

    // Start cometd handshake
    let clientId = "";
    try {
        await new Promise((resolve, reject) => {
            _cometd.handshake(reply => {
                log(JSON.stringify(reply));
                clientId = reply.clientId;
                reply.successful
                    ? resolve(reply)
                    : reject(reply)
            })
        });
    } catch (err) {
        throw(`CometD handshake failed: ${JSON.stringify(err)}`);
    }

    // Add subscription listener
    _cometd.addListener('/meta/subscribe', function (resp) {
        log('event', JSON.stringify(resp));
    });

    log('Handshake successful');

    await new Promise((resolve, reject) => {
        // const channel = '/meta/subscribe'
        const channel = '/*';
        // const channel = '/' + clientId;

        _cometd.subscribe(
            channel,                    // channel name
            msg => {
                log('!', msg);
                onCometdMessage(msg)    // async callback
            },
            result => {
                log(JSON.stringify(result));

                const status = result.successful
                    ? 'successful'
                    : 'failed';
                log(`${channel} subscription ${status}.`);
                if (result.successful)
                    resolve();
                else
                    reject(result);
            }
        );
    });
}

let _asyncCallbacks = {};

function onOperationsAsyncResponse(id, response) {
    // Call registered async callback
    if (_asyncCallbacks[id])
        _asyncCallbacks[id](JSON.parse(response.data)["data"]);
}

async function _getUsersAsync(opts, callback) {
    // ID of callback
    const id = uuid();
    _asyncCallbacks[id] = callback;
    log(`Getting Users Async [id: ${id}] with opts ${JSON.stringify(opts)}`);

    const data = opts || {};
    data['_aioId'] = id;

    const response = await _provisioningRequest({
        url: `${BASE_URL}/provisioning/v3/operations/get-users`,
        method: 'POST',
        qs: data
    });

    log(`Got response from Users Async [id: ${id}]: ${JSON.stringify(response)}`);

    return response;
}

async function getUsers(opts) {
    return new Promise(async (resolve, reject) => {
        await
            _getUsersAsync(opts, async (results) => {
                resolve(results);
            })
    });
}

async function logout() {
    return await _provisioningRequest({
        url: `${BASE_URL}/provisioning/v3/logout`,
        method: 'POST'
    });
}


async function main() {
    try {
        console.log(chalk.red.bold('********************************************'));
        console.log(chalk.red.bold('*** Provisioning API test utility v. 1.0 ***'));
        console.log(chalk.red.bold('********************************************'));

        if (config.DEBUG === true) {
            enableHttpDebugOutput();
        }

        log('Initializing ...');

        const accessToken = await getAuthToken(config.PROVISIONING.username, config.PROVISIONING.password);
        const resp = await initializeProvisioning(accessToken);

        console.log(`Provisioning SESSIONID is: ${resp['data']['sessionId']}`);

        await initializeCometd();

        log('Initialization completed');

        console.log('Reading user sample');

        const users = await getUsers({
            limit: 1,
            // filterName: 'FirstNameOrLastNameMatches',
            // filterParameters: 'Test',

            calcValid: true,
            fields: '*',
            noSpinner: true,
            offset: 0,
            order: 'Ascending',
            sortBy: 'firstName,lastName',
            subresources: 'skills'

            // limit: 1,
            // filterName: "FirstNameOrLastNameMatches",
            // filterParameters: "Shimazaki"
        });

        if (users) {
            console.log(chalk.magenta.bold(util.inspect(users, {depth: 5})));
        }

    } catch (err) {
        // Process error
        console.log(chalk.red(err));
        process.exit(1);
    } finally {
        // Cleanup
        _cometd.disconnect();
        await logout();
    }

    process.exit(0);
}

if (exports && module && module.parent) {
    exports.run = main;
} else {
    main();
}