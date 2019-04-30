
import java.lang.reflect.Type;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

import com.genesys.engagement.ApiCallback;
import com.genesys.engagement.ApiException;
import com.genesys.engagement.JSON;
import com.genesys.engagement.api.AvailabilityApi;
import com.genesys.engagement.api.CallbacksApi;
import com.genesys.engagement.model.CreateCallbackParms;
import com.genesys.engagement.model.CreateCallbackResponse200;
import com.genesys.engagement.model.OpenForResponse200;
import com.genesys.engagement.model.OpenForStatus500;
import com.google.gson.JsonElement;
import com.google.gson.JsonPrimitive;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;
import com.google.gson.internal.LinkedTreeMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Main {

    private static final Logger logger = LoggerFactory.getLogger(Main.class);

    public static void main(String[] args) {

        //region Edit the sample’s constants:

        // API_KEY is the API key provided by Genesys that you must use with all the requests // to PureEngage Cloud APIs.
        String API_KEY = "API_KEY"; 

        // API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
        String API_BASEPATH = "API_BASEPATH";

        // BUSINESSHOURS_SERVICE is the name of the Business hours service that you need to provision in Designer.
        String BUSINESSHOURS_SERVICE = "BUSINESSHOURS_SERVICE";

        //endregion



        //region Initialize new AvailabilityApi class instance
        //We need to set the apiUrl for this API
        AvailabilityApi availabilityApi = new AvailabilityApi();
        availabilityApi.getApiClient().setBasePath(API_BASEPATH);
        //endregion

        try {
            availabilityApi.openForAsync(API_KEY, BUSINESSHOURS_SERVICE,null,null,
                    new  ApiCallback<OpenForResponse200>() {
                        //region Response Handling
                        //Get the Callback Id that was created 
                        @Override
                        public void onSuccess(OpenForResponse200 result, int statusCode,
                                Map<String, List<String>> responseHeaders) {
                                    logger.info("Request status corrId : " + result.getStatus().getCorrId() );
                                    logger.info("Business is open for : " + ((LinkedTreeMap)result.getData()).get("openFor")+ " seconds" );                                   
                                    return;
                        }
                        //endregion

                        //region Error Handling
                        //Get the code associated to the error 
                        @Override
                        public void onFailure(ApiException e, int statusCode,
                                Map<String, List<String>> responseHeaders) {
                                    logger.error("AvailabilityApi call error: "+ e.getMessage()+ " status code "+ statusCode);
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
            System.err.println("Exception when calling AvailabilityApi#openForAsync");
            e.printStackTrace();
        }
    }
}