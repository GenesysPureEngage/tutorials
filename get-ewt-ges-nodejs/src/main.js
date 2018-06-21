const request = require('request-promise');
  
const API_BASEPATH = '<API Base path e.g. http://localhost:8080>';
const API_KEY = '<API Key>';
const VQ_NAME = '<Virtual Queue (VQ) name>';
const EWT_API_PATH = '/ewt/v3/vq/' + VQ_NAME;

async function getEstimatedWaitTime() {
    //region Create the request options.
    // Here we create the options to be sent as part of the request. This may vary slightly according to the client module ( we are using request-promise ) used for making the HTTP request.
    // In the options we specify the API url, method as GET and the header parameters.
    // The API_BASEPATH as used in example is the base URL to access PureEngage Cloud APIs.
    // The VQ name to get the Estimated Wait Time (EWT) for is apecified in the URL. The VQ name is the name of the Virtual Queue and it is configured in Platform Administrator.
    // The header parameter 'Content-Type' must be application/json.
    // The header parameter 'x-api-key' is the API key provided by Genesys to use with all the requests to PureEngage Cloud APIs
    // Detailed description of request parameters can be found at <TODO: API documentation link>
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
    // Send the request and parse the results
    try {
        const response = await request(options);
        if (!response) {
            console.log('Invalid null or undefined response.');
            return;
        }
        console.log('Estimated Wait Time (EWT) in seconds : ' + response.data.ewt);
    }
    catch (error) {
        console.log('Failed to get Estimated Wait Time (EWT). Error : ' + error);
    }
    //endregion
}

getEstimatedWaitTime();