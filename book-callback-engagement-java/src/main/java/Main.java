
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
import com.genesys.engagement.api.CallbacksApi;
import com.genesys.engagement.model.CreateCallbackParms;
import com.genesys.engagement.model.CreateCallbackResponse200;
import com.google.gson.JsonElement;
import com.google.gson.JsonPrimitive;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Main {

    private static final Logger logger = LoggerFactory.getLogger(Main.class);

    public static void main(String[] args) {

	    String xApiKey = "xApiKey_example"; 
        String apiUrl = "<apiUrl>";

        String serviceName = "serviceName_example";
        String phonenumber = "<phoneNumber>"; 
    
        CreateCallbackParms callbackParams = new CreateCallbackParms();
        callbackParams.setServiceName(serviceName);
        callbackParams.setPhoneNumber(phonenumber);


        //region Initialize new CallbacksApi class instance
        //We need to set the apiUrl for this API, then we need to customize JSON serializer
        CallbacksApi callbacksApi = new CallbacksApi();
        callbacksApi.getApiClient().setBasePath(apiUrl);
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
            callbacksApi.bookCallbackExternalAsync( callbackParams, xApiKey,
                    new  ApiCallback<CreateCallbackResponse200>() {
                        //region Response Handling
                        //Get the Callback Id that was created 
                        @Override
                        public void onSuccess(CreateCallbackResponse200 result, int statusCode,
                                Map<String, List<String>> responseHeaders) {
                                    logger.info("Callback created: "+ result.getData().getId());
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
            System.err.println("Exception when calling CallbacksApi#bookCallbackExternal");
            e.printStackTrace();
        }
    }
}