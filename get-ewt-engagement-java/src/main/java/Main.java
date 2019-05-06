
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
import com.genesys.engagement.api.EstimatedWaitTimeApi;
import com.genesys.engagement.model.EstimatedWaitTimeResponse200;
import com.google.gson.JsonElement;
import com.google.gson.JsonPrimitive;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Main {

    private static final Logger logger = LoggerFactory.getLogger(Main.class);

    public static void main(String[] args) {

        //region Constants Initialization.
       
        //API_KEY is the API key provided by Genesys that you must use with all the requests // to PureEngage Cloud APIs.
        String API_KEY = System.getenv("API_KEY"); 
        
        //API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
        String API_BASEPATH = System.getenv("API_BASEPATH"); 
        
        //COMMA_SEPARATED_VQ_NAMES is the comma separated list of the Virtual Queue names for which Estimated Wait Time (EWT) is required.
        String COMMA_SEPARATED_VQ_NAMES =  System.getenv("COMMA_SEPARATED_VQ_NAMES");

        //endregion

        //region Initialize EstimatedWaitTimeApi  instance.
        //We need to set the url for this API, then we need to customize JSON serializer
        EstimatedWaitTimeApi estimatedWaitTimeApi = new EstimatedWaitTimeApi();
        estimatedWaitTimeApi.getApiClient().setBasePath(API_BASEPATH);
        JSON.createGson().registerTypeAdapter(Date.class, new JsonSerializer<Date>() {
            public JsonElement serialize(Date date, Type typeOfSrc, JsonSerializationContext context) {
                TimeZone tz = TimeZone.getTimeZone("UTC");
                DateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"); // Quoted "Z" to indicate UTC, no
                                                                                      // timezone offset
                df.setTimeZone(tz);
                String nowAsISO = df.format(date);

                return nowAsISO == null ? null : new JsonPrimitive(nowAsISO);
            }
        }).create();
        //endregion

        try {
            
            estimatedWaitTimeApi.estimatedWaitTimeAPI1Async(API_KEY, COMMA_SEPARATED_VQ_NAMES, "mode1",
                new  ApiCallback<EstimatedWaitTimeResponse200>() {
                        //region Response Handling
                        @Override
                        public void onSuccess(EstimatedWaitTimeResponse200 result, int statusCode,
                                Map<String, List<String>> responseHeaders) {
                                    logger.info("Request status corrId : " + result.getStatus().getCorrId());
                                    for(int i =0; i < result.getData().size(); i++){
                                        // If there is a problem getting the Estimated Wait Time for a Virtual Queue then -1 is returned as the value of 'estimatedWaitTime' property.
                                        // The 'message' property provides information about the error.
                                        if( result.getData().get(i).getEstimatedWaitTime() >= 0 ) {
                                            logger.info("Response item index " + i + ", Virtual Queue : " + result.getData().get(i).getVirtualQueue() + ", Estimated Wait Time (EWT) in seconds : " + result.getData().get(i).getEstimatedWaitTime());
                                        } else {
                                            logger.info("Response item index " + i + ", Virtual Queue : " + result.getData().get(i).getVirtualQueue() + ", Error Message : " + result.getData().get(i).getMessage() );
                                        }
                                    }
                        }
                        //endregion

                        //region Error Handling
                        //Get the code associated to the error 
                        @Override
                        public void onFailure(ApiException e, int statusCode,
                                Map<String, List<String>> responseHeaders) {
                                    logger.error("Failed to get EWT. Error: "+ e.getMessage()+ " status code "+ statusCode);
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
    }
}
