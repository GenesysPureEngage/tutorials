const request = require('request-promise');
  
const API_BASEPATH = 'API Base path e.g. http://localhost:3005';
const API_KEY = '<API Key>';
const SERVICE_NAME = '<Service VQ name>';
const CUSTOMER_NUMBER = '<Customer Phone Number including area code>';
const DESIRED_TIME = '<Desired callback time e.g 2018-06-10T22:05:00.000Z>';
 
async function bookCallback() {
      
    //region Create the request body.
    // Create the request body to be sent as part of the HTTP post request.
    // The '_service_name' and '_customer_number' parameters are mandatory.
    // The service name is the name of the Virtual Queue service to book the callback and it is configured in Platform Administrator.
    // The customer number is the customer phone number to be used for callback.
    // If a callback is booked with only service name and customer number, then an immediate callback is booked i.e a callback for earliest available timeslot.
    // If a callback is required at a particular time, then callback time can be provided using an optional parameter '_desired_time'.
    // There are more parameters available. Detailed description of all the available parameters can be found at <TODO: API documentation link>
    let bodyData = JSON.stringify({
        '_service_name': SERVICE_NAME,
        '_customer_number': CUSTOMER_NUMBER,
        '_desired_time': DESIRED_TIME
    });
    //endregion
   
    //region Create the request options.
    // Here we create the options to be sent as part of the request. This may vary slightly according to the client module ( we are using request-promise ) used for making the HTTP request.
    // In the options we specify the API url, method as POST, the request body and the header parameters.
    // The API_BASEPATH as used in example is the base URL to access PureEngage Cloud APIs.
    // The header parameter 'Content-Type' must be application/json.
    // The header parameter 'x-api-key' is the API key provided by Genesys to use with all the requests to PureEngage Cloud APIs
    const requestOptions = {
        uri: API_BASEPATH + '/interactions/v1/callbacks/',
        method: 'POST',
        body: bodyData,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        }
    };
    //endregion
  
    //region Send the request
    // Send the request and parse the results
    try {
        let callbackResponse = await request(requestOptions);
        if( !callbackResponse ) {
            console.log('Invalid null or undefined response.');
            return;
        }
  
        callbackResponse = JSON.parse(callbackResponse);
        console.log('Successfully booked callback with id : ' + callbackResponse.data._id + ", Position in queue : " + callbackResponse.data.positioninqueue + ", Priority : " + callbackResponse.data.priority + ", EWT : " + callbackResponse.data.ewt);
  
    } catch ( error ) {
        console.log("Failed to create callback. Error : " + error);
    }
    //endregion
  
}
   
bookCallback();