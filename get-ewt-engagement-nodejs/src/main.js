const EngagementService = require('engagement-client-js');

//region Edit the sample’s constants:

// API_KEY is the API key provided by Genesys that you must use with all the requests // to PureEngage Cloud APIs.
var API_KEY = "API_KEY"; 

// API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
var API_BASEPATH = "API_BASEPATH";

// COMMA_SEPARATED_VQ_NAMES is the comma separated list of the Virtual Queue names for which Estimated Wait Time (EWT) is required.
var COMMA_SEPARATED_VQ_NAMES = '<Comma separated Virtual Queue (VQ) names>';

//endregion

async function getEstimatedWaitTime() {
    //region Initialize the new CallbacksApi class instance.
    var estimatedWaitTimeApi = new EngagementService.EstimatedWaitTimeApi();
    estimatedWaitTimeApi.apiClient.basePath = API_BASEPATH;
    estimatedWaitTimeApi.apiClient.enableCookies = false
    //endregion

    //region Send the request
    // Send the request and parse the results.
    // Congratulations, you are done!
    try {
        var opts={mode: 'mode1'}
        const response = await estimatedWaitTimeApi.estimatedWaitTimeAPI1(API_KEY, COMMA_SEPARATED_VQ_NAMES, opts) 
        console.log('Request status corrId : ' + response.status.corrId );
        //console.log('Estimated Wait Time (EWT) response. Number of items in response array: ' + response.data.length);
        for(var i =0; i < response.data.length; i++){
            // If there is a problem getting the Estimated Wait Time for a Virtual Queue then -1 is returned as the value of 'estimatedWaitTime' property.
            // The 'message' property provides information about the error.
            if( response.data[i].estimatedWaitTime >= 0 ) {
                console.log('Response item index ' + i + ', Virtual Queue : ' + response.data[i].virtualQueue + ', Estimated Wait Time (EWT) in seconds : ' + response.data[i].estimatedWaitTime );
            } else {
                console.log('Response item index ' + i + ', Virtual Queue : ' + response.data[i].virtualQueue + ', Error Message : ' + response.data[i].message );
            }
        }
    }
    catch (error) {
        console.log('Failed to get EWT. Error : ' + error);
    }
    //endregion
}

getEstimatedWaitTime();