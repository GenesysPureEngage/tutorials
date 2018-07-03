const request = require('request-promise');
//region Edit constants
// Note:You must provision a Callback execution service and an associated Office Hours 
// service in Platform Administrator.
// Start by editing the sample's constants:
// API_BASEPATH is the base URL used to access PureEngage Cloud APIs. 
// API_KEY is the API key provided by Genesys that you must use with all the requests
// to PureEngage Cloud APIs.
const API_BASEPATH = '<API Base path. For example, http://localhost:8080>';
const API_KEY = '<API Key>';
const OFFICEHOURS_SERVICE = '<Office hours service name>';
const OPENFOR_API_PATH =  '/interactions/v3/callbacks/openfor/' + OFFICEHOURS_SERVICE;
//endregion

async function getOfficeHoursOpenFor() {

    //region Create the request options.
    // Create the options that are sent as part of the request. These options might vary 
    // slightly according to the client module that is used to handle the HTTP request 
    // (request-promise in this example).
    // In the options, specify the API URL, the method as GET, and the header parameters.
    // The Office Hours service used to query open hours is part of the URL.
    // The header parameter 'Content-Type' must be 'application/json'.
    // The header parameter 'x-api-key' is the API key provided by Genesys to use with all the 
    // requests to PureEngage Cloud APIs. 
    // Additional parameters are available to create a callback. You can find the list of 
    // these optional parameters and detailed descriptions in the GES API Reference:
    // https://developer.genhtcc.com/reference/ges/Availability/index.html#openFor
    const options = {
      method: `GET`,
      uri: API_BASEPATH + OPENFOR_API_PATH,
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
        console.log('Office is open for : ' + response.data.open_for + ' seconds' );
    }
    catch (error) {
        console.log('Failed to get office hours. Error : ' + error);
    }
    //endregion
}

getOfficeHoursOpenFor();
