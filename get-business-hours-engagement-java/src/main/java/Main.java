
import java.util.List;
import java.util.Map;

import com.genesys.internal.common.ApiCallback;
import com.genesys.internal.common.ApiException;
import com.genesys.internal.engagement.api.AvailabilityApi;
import com.genesys.internal.engagement.model.OpenForResponse200;

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

        // BUSINESSHOURS_SERVICE is the name of the Business hours service that you need to provision in Designer.
        String BUSINESSHOURS_SERVICE = System.getenv("BUSINESSHOURS_SERVICE");

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
                                    logger.info("Business is open for : " + (result.getData()).getOpenFor()+ " seconds" );                                   
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