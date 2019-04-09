var EngagementService = require('engagement-client-js');

//region Edit constants
// Start by editing the sample's constants:
// API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
// SERVICE_NAME is the name of the Callback execution service that you need 
// to provision in Designer.
// API_KEY is the API key provided by Genesys that you must use with all the requests
// to PureEngage Cloud APIs.
// PHONE_NUMBER is the phone number where you want to receive the callback

var API_KEY = "API_KEY"; 
var API_BASEPATH = "API_BASEPATH";

var SERVICE_NAME = "SERVICE_NAME";
var PHONE_NUMBER = "PHONE_NUMBER"; 

var body = new EngagementService.CreateCallbackParms();
body.phoneNumber = PHONE_NUMBER
body.serviceName = SERVICE_NAME

//region Initialize new CallbacksApi class instance
//We need to set the apiUrl for this API
var callBackApi = new EngagementService.CallbacksApi();
callBackApi.apiClient.basePath = API_BASEPATH;
//endregion
//"https://api-g1-usw1.genhtcc.com/engagement/v3"

//region Response Handling
//Get the Callback Id that was created 
var callback = function(error, data, response) {
  
  if (error) {
    console.error(error);
  } else {
    console.log('Callback created: '+data["data"]["id"]);
  }
  
};
//endregion

//region Callback Creation
//We book the callback by passing api key, the params and the callback to handle the response
callBackApi.bookCallbackExternal(API_KEY,body,callback)
//endregion