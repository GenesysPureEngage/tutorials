const EngagementService = require('engagement-client-js');

//region Edit the sample’s constants:

// API_KEY is the API key provided by Genesys that you must use with all the requests // to PureEngage Cloud APIs.
const API_KEY = "API_KEY"; 

// API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
const API_BASEPATH = "API_BASEPATH";

// BUSINESSHOURS_SERVICE is the name of the Business hours service that you need to provision in Designer.
const BUSINESSHOURS_SERVICE = "BUSINESSHOURS_SERVICE";
//endregion

async function getBusinessHoursOpenFor() {

     //region Initialize the new AvailabilityApi class instance.
    var availabilityApi = new EngagementService.AvailabilityApi();
    availabilityApi.apiClient.basePath = API_BASEPATH;
    availabilityApi.apiClient.enableCookies = false
    //endregion

    //region Send the request
    // Send the request and parse the results.
    // Congratulations, you are done!
    try {
        //See https://developer.genhtcc.com/reference/engagement/Availability/ for possible options
        var opts={
        };
        const response = await availabilityApi.openFor(API_KEY, BUSINESSHOURS_SERVICE, opts);
        console.log('Request status corrId : ' + response.status.corrId );
        console.log('Business is open for : ' + response.data.openFor + ' seconds' );
        
    }
    catch (error) {
        console.log('Failed to get business hours. Error : ' + error);
    }
    //endregion
}

getBusinessHoursOpenFor();
