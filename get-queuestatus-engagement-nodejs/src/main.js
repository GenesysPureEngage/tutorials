const EngagementService = require('engagement-client-js');

//region Edit the sample’s constants:

//API_KEY is the API key provided by Genesys that you must use with all the requests // to PureEngage Cloud APIs.
const API_KEY = "API_KEY"; 

//API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
const API_BASEPATH = "API_BASEPATH";

//QUEUE_NAME is the name  of the callback queue..
const QUEUE_NAME = "QUEUE_NAME";

//endregion

async function getQueueStatus () {
    //region Initialize the new QueueStatusApi class instance.
    var queueStatusApi = new EngagementService.QueueStatusApi();
    queueStatusApi.apiClient.basePath = API_BASEPATH;
    queueStatusApi.apiClient.enableCookies = false
    //endregion

    //region Send the request
    //Send the request and parse the results.
    //Congratulations, you are done!
    try {
        const response = await queueStatusApi.queryQueueStatus(API_KEY, QUEUE_NAME) 
        console.log('Request status corrId : ' + response.status.corrId );
        console.log('ewt:'+response.data.ewt+', offerImmediateCallback: '+response.data.offerImmediateCallback+', offerScheduledCallback: '+response.data.offerScheduledCallback);
    }
    catch (error) {
        console.log('Failed to get queue status. Error : ' + error);
    }
    //endregion
}

getQueueStatus();