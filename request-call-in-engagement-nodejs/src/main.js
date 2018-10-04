const request = require('request-promise');
//region Edit constants
// Start by editing the sample's constants:
// API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
// GROUP_NAME is the name of the Call-In configuration group. The Call-In configuration 
// is created in Platform Administrator.
// API_KEY is the API key provided by Genesys that you must use with all the requests
// to PureEngage Cloud APIs.
const API_BASEPATH = '<API Base path. For example: http://localhost:3005>';
const API_KEY = '<API Key>';
const GROUP_NAME = '<Group name for Call-In>';
const PHONE_NUMBER = '<The optional customer phone number including the area code>';
const CALL_IN_API_PATH = '/engagement/v3/call-in/requests/create';
//endregion

async function requestCallIn() {

    //region Create the Call-In request body.
    // First, you need to create the request body that is sent as part of the
    // HTTP POST request. The 'groupName' parameter is mandatory.
    // Tip: This group name is the name of Call-In configuration in Platform Administrator.
    // The optional parameters 'phoneNumber' and 'userData' can be used to provide 
    // additional information.
    // The detailed description of all the parameters is available in the Call-In API Reference.
    let bodyData = JSON.stringify({
        'groupName': GROUP_NAME,
        'phoneNumber': PHONE_NUMBER
    });
    //endregion

    //region Create the Call-In request options.
    // Now that you have created the body of your Call-In request, you can create the options
    // that will be sent as part of the request. These options may vary slightly according to the
    // client module that is used to handle the HTTP request (request-promise in this example).
    // In the options, specify the API URL, the method as POST, the header parameters,
    // and the request body that you created in the first step. 
    // The API_BASEPATH constant used here is the base URL of the PureEngage Cloud APIs.
    // The header parameter 'Content-Type' must be 'application/json'.
    // The header parameter 'x-api-key' is the API key provided by Genesys and which
    // must be used in all the requests to the PureEngage Cloud APIs.
    const requestOptions = {
        uri: API_BASEPATH + CALL_IN_API_PATH,
        method: 'POST',
        body: bodyData,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        }
    };
    //endregion

    //region Send the request
    // Send the request and parse the results. The user can call the 
    // phone number ( 'toPhoneNumber' property ) in the response before the 
    // expiration time ( 'expirationTime' property ) and type in the access 
    // code ( 'accessCode' property ). The access code is available  only 
    // if the feature is enabled in the configuration group. Similarly, the 
    // 'fromPhoneNumber' property is available only if the request contained 
    // the optional 'phoneNumber' parameter.
    // Congratulations, you are done!
    try {
        let callInResponse = await request(requestOptions);
        if (!callInResponse) {
            console.log('Invalid null or undefined response.');
            return;
        }

        callInResponse = JSON.parse(callInResponse);
        console.log('Request status corrId : ' + callInResponse.status.corrId);
        console.log('Successfully created Call-In request with id : ' + callInResponse.data.id + 
                        ', fromPhoneNumber : ' + callInResponse.data.fromPhoneNumber + 
                        ', toPhoneNumber : ' + callInResponse.data.toPhoneNumber + 
                        ', accessCode : ' + callInResponse.data.accessCode +
                        ', expirationTime : ' + callInResponse.data.expirationTime +
                        ', groupName : ' + callInResponse.data.groupName);

    } catch (error) {
        console.log("Failed to create Call-In request. Error : " + error);
    }
    //endregion

}

requestCallIn();