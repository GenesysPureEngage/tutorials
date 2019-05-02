
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.genesys.engagement.ApiCallback;
import com.genesys.engagement.ApiException;
import com.genesys.engagement.JSON;
import com.genesys.engagement.api.CallInApi;
import com.genesys.engagement.model.CallInRequestsParms;
import com.genesys.engagement.model.CallInRequestsResponse200;
import com.genesys.engagement.model.CallInRequestsResponse400;
import com.google.gson.Gson;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Main {

    private static final Logger logger = LoggerFactory.getLogger(Main.class);

    public static void main(String[] args) {

        //region Constants are set through environment variables.

        // API_KEY is the API key provided by Genesys that you must use with all the requests // to PureEngage Cloud APIs.
        String API_KEY = System.getenv("API_KEY"); 

        // API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
        String API_BASEPATH = System.getenv("API_BASEPATH");

        // GROUP_NAME is the name of the Click-To-Call-In configuration group. The Click-To-Call-In configuration 
        // is created in Platform Administrator.
        String GROUP_NAME = System.getenv("GROUP_NAME");

        // FROM_PHONE_NUMBER is the phone number associated with the request.
        String FROM_PHONE_NUMBER = System.getenv("FROM_PHONE_NUMBER");
        
        //endregion


        //region Create the Click-To-Call-In request body.
        // First, you need to create the request body that is sent as part of the
        // HTTP POST request. The 'groupName' parameter is mandatory.
        // Tip: This group name is the name of Click-To-Call-In configuration in Platform Administrator.
        // The optional parameters 'fromPhoneNumber' and 'userData' can be used to provide 
        // additional information.
        // The detailed description of all the parameters is available in the Click-To-Call-In API Reference.
        CallInRequestsParms requestClientToCallIn = new CallInRequestsParms();
        requestClientToCallIn.setFromPhoneNumber(FROM_PHONE_NUMBER);
        requestClientToCallIn.setGroupName(GROUP_NAME);
        requestClientToCallIn.setUserData("{}");
        
        logger.info(requestClientToCallIn.toString());
        
        //requestClientToCallIn.setCallbackServiceId(null);
        


        //region Initialize the new CallbacksApi class instance.
        CallInApi callInApi = new CallInApi();
        callInApi.getApiClient().setBasePath(API_BASEPATH);
        
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
            callInApi.callInRequestsAsync(requestClientToCallIn, API_KEY, new  ApiCallback<CallInRequestsResponse200>() {
                //region Response Handling
                //Get the Callback Id that was created 
                @Override
                public void onSuccess(CallInRequestsResponse200 result, int statusCode,
                        Map<String, List<String>> responseHeaders) {
                            logger.info("Callback created: "+ result.getData().getId());
                            logger.info("Successfully created Click-To-Call-In request with id : " + result.getData().getId() + 
                                        ", fromPhoneNumber : " + result.getData().getFromPhoneNumber() + 
                                        ", toPhoneNumber : " + result.getData().getToPhoneNumber() + 
                                        ", accessCode : " + result.getData().getAccessCode() +
                                        ", expirationTime : " + result.getData().getExpirationTime() +
                                        ", groupName : " + result.getData().getGroupName());
                            return;
                }
                //endregion

                //region Error Handling
                //Get the code associated to the error 
                @Override
                public void onFailure(ApiException e, int statusCode,
                        Map<String, List<String>> responseHeaders) {
                            
                            logger.error("Callback error: "+ e.getMessage()+ " status code "+ statusCode);
                            return;
                }
                //endregion

                @Override
                public void onUploadProgress(long bytesWritten, long contentLength, boolean done) {
                    // not needed
                }

                @Override
                public void onDownloadProgress(long bytesRead, long contentLength, boolean done) {
                    // not needed
                }

            });
        } catch (ApiException e) {
            logger.error("Failed to get EWT", e);
        }
        //endregion
    }
}