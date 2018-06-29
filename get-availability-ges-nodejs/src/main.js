const request = require('request-promise');
//region Edit constants
// First, edit the sample's constants: 
// API_BASEPATH is the base URL used to access PureEngage Cloud APIs. 
// SERVICE_NAME is the name of the Callback service that you need 
// to provision in Platform Administrator.
// START is the start time used to look for availability.
// API_KEY is the API key provided by Genesys that you must use with 
// all the requests to PureEngage Cloud APIs.
const API_BASEPATH = '<API Base path; for example, http://localhost:8080>';
const API_KEY = '<API Key>';
const SERVICE_NAME = '<Callback execution service name>';
const AVAILABILITY_API_PATH =  '/interactions/v3/callbacks/availability/' + SERVICE_NAME;
const START = '<Start time. For example, 2018-06-10T25:05:00.000Z in ISO 8601; format yyyy-MM-ddTHH:mm:ss.SSSZ using UTC as the timezone>';
//endregion
async function getAvailability() {

    //region Create the request options.
    // Create the options that are sent as part of the request. These options
    // might vary slightly depending on the client module that is used to handle 
    // the HTTP request (request-promise in this example).
    // The query retrieves the availability for the service name included in the URL.
    // In the options, specify the API URL, the method as GET, the query parameters, 
    // and the header parameters.
    // The 'start' query parameter is the start time to look for available slots. If
    // not specified, it is assumed to be now.
    // The 'number-of-days' query parameter is the number of days in the future to look
    // for availability from the start time (or from now if you do not specify a start time).
    // The query parameter 'max-time-slots' controls the maximum number of slots that 
    // the response will include.
    // The header parameter 'Content-Type' must be 'application/json'.
    // The header parameter 'x-api-key' is the API key provided by Genesys to use with all
    // of your requests.    
    // Additional parameters are available to query agent availability. You can find the list of 
    // these optional parameters and detailed descriptions in the GES API Reference:
    // https://developer.genhtcc.com/reference/ges/Availability/index.html#queryAvailabilityV2
    const options = {
        method: 'GET',
        uri: API_BASEPATH + AVAILABILITY_API_PATH,
        qs: {
            'start': START,
            'number-of-days': 7,
            'max-time-slots': 5
        },
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
        console.log('Availability response. Duration Minutes : ' + response.data.durationMin + ', Timezone : ' + response.data.timezone + ', Number of slots: ' + response.data.slots.length);
        response.data.slots.forEach( (slot, index) => {
            console.log('Slot ' + index + ' : UTC time : ' + slot.utcTime + ', Local time : ' + slot.localTime  + ', Capacity : ' + slot.capacity + ', Total : ' + slot.total);
        });
    }
    catch (error) {
        console.log('Failed to get availability. Error : ' + error);
    }
    //endregion
}

getAvailability();