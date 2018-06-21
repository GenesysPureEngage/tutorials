const request = require('request-promise');
  
const API_BASEPATH = '<API Base path e.g. http://localhost:8080>';
const API_KEY = '<API Key>';
const OFFICEHOURS_SERVICE = '<Office hours service name>';
const OPENFOR_API_PATH =  '/interactions/v3/callbacks/openfor/' + OFFICEHOURS_SERVICE;

async function getOfficeHoursOpenFor() {

    //region Create the request options.
    // Here we create the options to be sent as part of the request. This may vary slightly according to the client module ( we are using request-promise ) used for making the HTTP request.
    // In the options we specify the API url, method as GET and the header parameters.
    // The Office Hours service to get office hours for is specified in the URL. The Office Hours service is configured in Platform Administrator.
    // The header parameter 'Content-Type' must be application/json.
    // The header parameter 'x-api-key' is the API key provided by Genesys to use with all the requests to PureEngage Cloud APIs
    // Detailed description of the request parameters can be found at <TODO: API documentation link>
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
    // Send the request and parse the results
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
