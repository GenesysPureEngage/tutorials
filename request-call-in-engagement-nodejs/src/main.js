const request = require('request-promise');
//region Edit constants
// Start by editing the sample's constants:
// API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
// GROUP_NAME is the name of the Click-To-Call-In configuration group. The Click-To-Call-In configuration 
// is created in Platform Administrator.
// API_KEY is the API key provided by Genesys that you must use with all the requests
// to PureEngage Cloud APIs.
const API_BASEPATH = '<API Base path. For example: http://localhost:3005>';
const API_KEY = '<API Key>';
const GROUP_NAME = '<Group name for Click-To-Call-In>';
const FROM_PHONE_NUMBER = '<The optional customer phone number including the area code>';
const CLICK_TO_CALL_IN_API_PATH = '/engagement/v3/call-in/requests/create';
//endregion

async function requestClickToCallIn() {

    //region Create the Click-To-Call-In request body.
    // First, you need to create the request body that is sent as part of the
    // HTTP POST request. The 'groupName' parameter is mandatory.
    // Tip: This group name is the name of Click-To-Call-In configuration in Platform Administrator.
    // The optional parameters 'fromPhoneNumber' and 'userData' can be used to provide 
    // additional information.
    // The detailed description of all the parameters is available in the Click-To-Call-In API Reference.
    let bodyData = JSON.stringify({
        'groupName': GROUP_NAME,
        'fromPhoneNumber': FROM_PHONE_NUMBER
    });
    //endregion

    //region Create the Click-To-Call-In request options.
    // Now that you have created the body of your Click-To-Call-In request, you can create the options
    // that will be sent as part of the request. These options may vary slightly according to the
    // client module that is used to handle the HTTP request (request-promise in this example).
    // In the options, specify the API URL, the method as POST, the header parameters,
    // and the request body that you created in the first step. 
    // The API_BASEPATH constant used here is the base URL of the PureEngage Cloud APIs.
    // The header parameter 'Content-Type' must be 'application/json'.
    // The header parameter 'x-api-key' is the API key provided by Genesys and which
    // must be used in all the requests to the PureEngage Cloud APIs.
    const requestOptions = {
        uri: API_BASEPATH + CLICK_TO_CALL_IN_API_PATH,
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
    // the optional 'fromPhoneNumber' parameter.
    // Congratulations, you are done!
    try {
        let clickToCallInResponse = await request(requestOptions);
        if (!clickToCallInResponse) {
            console.log('Invalid null or undefined response.');
            return;
        }

        clickToCallInResponse = JSON.parse(clickToCallInResponse);
        console.log('Request status corrId : ' + clickToCallInResponse.status.corrId);
        console.log('Successfully created Click-To-Call-In request with id : ' + clickToCallInResponse.data.id + 
                        ', fromPhoneNumber : ' + clickToCallInResponse.data.fromPhoneNumber + 
                        ', toPhoneNumber : ' + clickToCallInResponse.data.toPhoneNumber + 
                        ', accessCode : ' + clickToCallInResponse.data.accessCode +
                        ', expirationTime : ' + clickToCallInResponse.data.expirationTime +
                        ', groupName : ' + clickToCallInResponse.data.groupName);

    } catch (error) {
        console.log("Failed to create Click-To-Call-In request. Error : " + error);
    }
    //endregion

}

requestClickToCallIn();