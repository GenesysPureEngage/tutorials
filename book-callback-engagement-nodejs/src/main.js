var EngagementService = require('engagement-client-js');


var xApiKey = "xApiKey_example"; 
var apiUrl = "<apiUrl>";

var serviceName = "serviceName_example";
var phonenumber = "<phoneNumber>"; 

var body = new EngagementService.CreateCallbackParms();
body.phoneNumber = serviceName
body.serviceName = phonenumber

//region Initialize new CallbacksApi class instance
//We need to set the apiUrl for this API
var callBackApi = new EngagementService.CallbacksApi();
callBackApi.apiClient.basePath = apiUrl;
//endregion
//"https://api-g1-usw1.genhtcc.com/engagement/v3"

//region Response Handling
//Get the Callback Id that was created 
var callback = function(error, data, response) {
  
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + JSON.stringify(data));
  }
  
};
//endregion

//region Callback Creation
//We book the callback by passing api key, the params and the callback to handle the response
callBackApi.bookCallbackExternal("Jiy7p0ca6t5rIk96TbuYh5ZLjtqaGcrc575i6vN0  ",body,callback)
//endregion