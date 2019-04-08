
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
        //region Initialize Callback API Settings parameters
	    //String xApiKey = "xApiKey_example"; // String | API Key. For example, Z2y9eiTiQZ4ceKNpxy1YAarhpvxJXPCj4rFrbVep
        String xApiKey = "Jiy7p0ca6t5rIk96TbuYh5ZLjtqaGcrc575i6vN0";
        //String apiUrl = "<apiUrl>";
        String apiUrl = "https://api-g1-usw1.genhtcc.com/engagement/v3";
        //endregion

        //region Initialize Callback parameters
        //String serviceName = "serviceName_example"; // String | Name of the callback execution service provisioned in GES
        //String phonenumber = "<phoneNumber>"; // String | Phone Number. For example, 9059683457
        String serviceName = "callback_test";
        String phonenumber = "33782012279";
        
        CreateCallbackParms callbackParams = new CreateCallbackParms();
        callbackParams.setServiceName(serviceName);
        callbackParams.setPhoneNumber(phonenumber);
        //endregion

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

                        @Override
                        public void onFailure(ApiException e, int statusCode,
                                Map<String, List<String>> responseHeaders) {
                                    logger.error("Callback error: "+ e.getMessage()+ " status code "+ statusCode);
                                    return;
                        }

                        @Override
                        public void onSuccess(CreateCallbackResponse200 result, int statusCode,
                                Map<String, List<String>> responseHeaders) {
                                    logger.info("Callback created: "+ result.getData().getId());
                                    return;
                        }

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