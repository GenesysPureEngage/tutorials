const EngagementService = require('engagement-client-js');

//region Edit the sample’s constants:

// API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
const API_BASEPATH = '<API Base path. For example: http://localhost:3005>';

// API_KEY is the API key provided by Genesys that you must use with all the requests
// to PureEngage Cloud APIs.
const API_KEY = '<API Key>';

// GROUP_NAME is the name of the Click-To-Call-In configuration group. The Click-To-Call-In configuration 
// is created in Platform Administrator.
const GROUP_NAME = '<Group name for Click-To-Call-In>';

// FROM_PHONE_NUMBER is the phone number associated with the request.
const FROM_PHONE_NUMBER = '<The optional customer phone number including the area code>';

//endregion

async function requestClickToCallIn() {

    //region Create the Click-To-Call-In request body.
    // First, you need to create the request body that is sent as part of the
    // HTTP POST request. The 'groupName' parameter is mandatory.
    // Tip: This group name is the name of Click-To-Call-In configuration in Platform Administrator.
    // The optional parameters 'fromPhoneNumber' and 'userData' can be used to provide 
    // additional information.
    // The detailed description of all the parameters is available in the Click-To-Call-In API Reference.
    var requestClientToCallIn = new EngagementService.CallInRequestsParms();
    requestClientToCallIn.fromPhoneNumber = FROM_PHONE_NUMBER;
    requestClientToCallIn.groupName =GROUP_NAME;
    requestClientToCallIn.userData = {
        "priority": "high",
        "email": "customer@email.com"
    };
    //endregion
  

    //region Initialize the new CallbacksApi class instance.
    var callInApi = new EngagementService.CallInApi();
    callInApi.apiClient.basePath = API_BASEPATH;
    callInApi.apiClient.enableCookies = false
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
        let clickToCallInResponse = await callInApi.callInRequests(API_KEY, requestClientToCallIn);
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
