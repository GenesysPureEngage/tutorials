const request = require('request-promise');
//region Edit constants
// Start by editing the sample's constants:
// API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
// SERVICE_NAME is the name of the Callback service that you need 
// to provision in Platform Administrator.
// API_KEY is the API key provided by Genesys that you must use with all the requests
// to PureEngage Cloud APIs.
const API_BASEPATH = 'API Base path. For example: http://localhost:3005';
const API_KEY = '<API Key>';
const SERVICE_NAME = '<Callback Service Execution name>';
const CUSTOMER_NUMBER = '<Customer Phone Number including area code>';
const DESIRED_TIME = '<Desired callback time. For example: 2018-06-10T22:05:00.000Z>';
//endregion

async function bookCallback() {

    //region Create the Callback request body.
    // First, you need to create the Callback request body that is sent as part of the
    // HTTP POST request. The '_service_name' and '_customer_number' parameters are 
    // mandatory to book a callback.
    // The '_service_name' parameter is the name of the Virtual Queue service that 
    // is used to book the callback.
    // Tip: This service name is configured in Platform Administrator.
    // The '_customer_number' parameter is the customer's phone number that is used 
    // to call back.
    // Note that if you book a callback with the service name and customer number only, 
    // the system books an immediate callback; it means that the callback is scheduled 
    // for the earliest available timeslot.
    // If you provide the '_desired_time' parameter, the system books a callback scheduled
    // for this particular time.
    // Additional parameters are available to create a callback. You will find the list of 
    // these optional parameters and their detailed description in the GES API Reference
    // here: https://developer.genhtcc.com/reference/ges/Callbacks/index.html#bookCallbackExternal
    let bodyData = JSON.stringify({
        '_service_name': SERVICE_NAME,
        '_customer_number': CUSTOMER_NUMBER,
        '_desired_time': DESIRED_TIME
    });
    //endregion

    //region Create the Callback request options.
    // Now that you have created the body of your callback request, you can create the options
    // that will be sent as part of the request. These options may vary slightly according to the
    // client module that is used to handle the HTTP request (request-promise in this example).
    // In the options, specify the API URL, the method as POST, the header parameters,
    // and the request body that you created in the first step. 
    // The API_BASEPATH constant used here is the base URL of the PureEngage Cloud APIs.
    // The header parameter 'Content-Type' must be 'application/json'.
    // The header parameter 'x-api-key' is the API key provided by Genesys and which
    // must be used in all the requests to the PureEngage Cloud APIs.
    const requestOptions = {
        uri: API_BASEPATH + '/interactions/v3/callbacks/',
        method: 'POST',
        body: bodyData,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        }
    };
    //endregion

    //region Send the request
    // Send the request and parse the results.
    // Congratulations, you are done!
    try {
        let callbackResponse = await request(requestOptions);
        if (!callbackResponse) {
            console.log('Invalid null or undefined response.');
            return;
        }

        callbackResponse = JSON.parse(callbackResponse);
        console.log('Successfully booked callback with id : ' + callbackResponse.data._id + ", Position in queue : " + callbackResponse.data.positioninqueue + ", Priority : " + callbackResponse.data.priority + ", EWT : " + callbackResponse.data.ewt);

    } catch (error) {
        console.log("Failed to create callback. Error : " + error);
    }
    //endregion

}

bookCallback();