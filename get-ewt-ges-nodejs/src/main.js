const request = require('request-promise');
//region Edit constants
// Note: You must configure a Virtual Queue in Platform Administrator.
// Start by editing the sample's constants:
// API_BASEPATH is the base URL of the PureEngage Cloud APIs. 
// VQ_NAME is the name of the Virtual Queue that is used to get the Estimated Wait Time (EWT).
// API_KEY is the API key provided by Genesys that you must use with all the requests
// to PureEngage Cloud APIs. 
const API_BASEPATH = '<API Base path, for example http://localhost:8080>';
const API_KEY = '<API Key>';
const VQ_NAME = '<Virtual Queue (VQ) name>';
const EWT_API_PATH = '/engagement/v3/estimated-wait-time/virtual-queues/' + VQ_NAME;
//endregion

async function getEstimatedWaitTime() {
    //region Create the request options.
    // Create the options that are sent as part of the request.  These options
    // might vary slightly according to the client module that is used to handle 
    // the HTTP request (request-promise in this example).
    // In the options, specify the API URL, the method as GET, and the header parameters.
    // The API_BASEPATH is the base URL to access of the PureEngage Cloud APIs.
    // The VQ name specified in the URL is the name of the Virtual Queue that is used to
    // get the Estimated Waiting Time (EWT).
    // The header parameter 'Content-Type' must be 'application/json'.
    // The header parameter 'x-api-key' is the API key provided by Genesys to use with all 
    // the requests to PureEngage Cloud APIs. 
    // Additional parameters are available to get the Estimated Waiting Time. You can find
    // the list of these optional parameters and detailed descriptions in the GES 
    // API Reference:
    // https://developer.genhtcc.com/reference/ges/EWT/index.html#ewtAPI1
    const options = {
        method: 'GET',
        uri: API_BASEPATH + EWT_API_PATH,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        },
        json: true // Automatically parses the JSON string in the response
    };
    //endregion

    //region Send the request
    // Send the request and parse the results.
    // Congratulations, you are done!
    try {
        const response = await request(options);
        if (!response) {
            console.log('Invalid null or undefined response.');
            return;
        }
        console.log('Estimated Wait Time (EWT) in seconds : ' + response.data.estimatedWaitTime);
    }
    catch (error) {
        console.log('Failed to get Estimated Wait Time (EWT). Error : ' + error);
    }
    //endregion
}

getEstimatedWaitTime();