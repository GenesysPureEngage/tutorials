const EngagementService = require('engagement-client-js');

//region Edit the sample’s constants:

// API_KEY is the API key provided by Genesys that you must use with all the requests // to PureEngage Cloud APIs.
var API_KEY = "API_KEY"; 

// API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
var API_BASEPATH = "API_BASEPATH";

// SERVICE_NAME is the name of the Callback execution service that you need to provision in Designer.
var SERVICE_NAME = "SERVICE_NAME";

// PHONE_NUMBER is the phone number where you want to receive the callback.
var PHONE_NUMBER = "PHONE_NUMBER"; 

//endregion

async function bookCallback () {
  var body = new EngagementService.CreateCallbackParms();
  body.phoneNumber = PHONE_NUMBER
  body.serviceName = SERVICE_NAME



  //region Initialize the new CallbacksApi class instance.
  var callBackApi = new EngagementService.CallbacksApi();
  callBackApi.apiClient.basePath = API_BASEPATH;
  callBackApi.apiClient.enableCookies = false
  //endregion

  //region Callback Creation.
  //We book the callback by passing the API key, the parameters. The response contains the id of the created callback 
  try{
    const response = await callBackApi.bookCallbackExternal(API_KEY,body)
    console.log('Callback created: '+response.data.id)
  }catch(error){
    console.error('Failed to create Callback: '+error)
  }
  //endregion
}

bookCallback();