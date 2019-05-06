const EngagementService = require('engagement-client-js');

//region Edit the sample’s constants:

//API_KEY is the API key provided by Genesys that you must use with all the requests // to PureEngage Cloud APIs.
const API_KEY = "API_KEY"; 

//API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
const API_BASEPATH = "API_BASEPATH";

//SERVICE_NAME is the name of the Callback execution service that you need to provision in Designer.
const SERVICE_NAME = "SERVICE_NAME";

//START is the start time used to look for availability.
const START = '<Start time. For example, 2018-06-10T25:05:00.000Z in ISO 8601; format yyyy-MM-ddTHH:mm:ss.SSSZ using UTC as the timezone>';

//endregion

async function getAvailability () {
    //region Initialize the new CallbacksApi class instance.
    var availabilityApi = new EngagementService.AvailabilityApi();
    availabilityApi.apiClient.basePath = API_BASEPATH;
    availabilityApi.apiClient.enableCookies = false
    //endregion

    //region Send the request
    //Send the request and parse the results.
    //Congratulations, you are done!
    try {
        var opts ={
            start: START
        }
        const response = await availabilityApi.queryAvailabilityV2(API_KEY, SERVICE_NAME, opts) 
        console.log('Request status corrId : ' + response.status.corrId );
        console.log('Availability response. Duration Minutes : ' + response.data.durationMin + ', Timezone : ' + response.data.timezone + ', Number of slots: ' + response.data.slots.length);
    }
    catch (error) {
        console.log('Failed to get availability. Error : ' + error);
    }
    //endregion
}

getAvailability();