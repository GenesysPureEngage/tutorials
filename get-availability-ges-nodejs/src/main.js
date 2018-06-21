const request = require('request-promise');
  
const API_BASEPATH = '<API Base path e.g. http://localhost:8080>';
const API_KEY = '<API Key>';
const SERVICE_NAME = '<Service Virtual Queue (VQ) name>';
const AVAILABILITY_API_PATH =  '/interactions/v3/callbacks/availability/' + SERVICE_NAME;
const START = '<Start time e.g 2018-06-10T25:05:00.000Z in ISO 8601 format yyyy-MM-ddTHH:mm:ss.SSSZ using UTC as the timezone>';

async function getAvailability() {

    //region Create the request options.
    // Here we create the options to be sent as part of the request. This may vary slightly according to the client module ( we are using request-promise ) used for making the HTTP request.
    // In the options we specify the API url, method as GET, the query parameters and the header parameters.
    // The API_BASEPATH as used in example is the base URL to access PureEngage Cloud APIs.
    // The service name to get availability for is apecified in the URL. The service name parameter is the name of the Virtual Queue and it is configured in Platform Administrator.
    // The query parameter 'start' tells from what time onwards to look for available slots. If not specified, it is assumed to be now.
    // The query parameter 'number-of-days' tells the number of days in future to look for availability from start ( or from 'now' if start is not specified ).
    // The query parameter 'max-time-slots' controls the maximum number of slots returned by the request.
    // The header parameter 'Content-Type' must be application/json.
    // The header parameter 'x-api-key' is the API key provided by Genesys to use with all the requests to PureEngage Cloud APIs
    // There are more parameters available. Detailed description of all the available parameters can be found at <TODO: API documentation link>
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
    // Send the request and parse the results
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