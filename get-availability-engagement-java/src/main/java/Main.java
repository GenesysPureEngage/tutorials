
import java.util.List;
import java.util.Map;

import com.genesys.engagement.ApiCallback;
import com.genesys.engagement.ApiException;
import com.genesys.engagement.api.AvailabilityApi;
import com.genesys.engagement.model.AvailabilitiesResponse200;

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

        // SERVICE_NAME is the name of the Callback execution service that you need to provision in Designer.
        String SERVICE_NAME = System.getenv("SERVICE_NAME");

        //endregion



        //region Initialize new AvailabilityApi class instance
        //We need to set the apiUrl for this API
        AvailabilityApi availabilityApi = new AvailabilityApi();
        availabilityApi.getApiClient().setBasePath(API_BASEPATH);
        //endregion

        try {
            availabilityApi.queryAvailabilityV2Async(API_KEY, SERVICE_NAME, null, null, null, null, null, null, null, true,
                    new  ApiCallback<AvailabilitiesResponse200>() {
                        //region Response Handling
                        //Get the Callback Id that was created 
                        @Override
                        public void onSuccess(AvailabilitiesResponse200 result, int statusCode,
                                Map<String, List<String>> responseHeaders) {
                                    logger.info("Request status corrId : " + result.getStatus().getCorrId() );
                                    logger.info("Availability response. Duration Minutes : " + result.getData().getDurationMin() + ", Timezone : " + result.getData().getTimezone()+ ", Number of slots: " + result.getData().getSlots().size());
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
            System.err.println("Exception when calling AvailabilityApi#queryAvailabilityV2Async");
            e.printStackTrace();
        }
    }
}