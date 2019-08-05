
import java.util.List;
import java.util.Map;

import com.genesys.internal.common.ApiCallback;
import com.genesys.internal.common.ApiException;
import com.genesys.internal.engagement.model.QueueStatusResponse200;
import com.genesys.internal.engagement.api.QueueStatusApi;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Main {

    private static final Logger logger = LoggerFactory.getLogger(Main.class);

    public static void main(String[] args) {

        // region Constants Initialization.

        // API_KEY is the API key provided by Genesys that you must use with all the
        // requests // to PureEngage Cloud APIs.
        String API_KEY = System.getenv("API_KEY");

        // API_BASEPATH is the base URL used to access PureEngage Cloud APIs.
        String API_BASEPATH = System.getenv("API_BASEPATH");

        //QUEUE_NAME is the name  of the callback queue..
        String QUEUE_NAME = System.getenv("QUEUE_NAME");

        // endregion

        // region Initialize AvailabilityApi instance

        // We need to set the urrl for this API
        QueueStatusApi queueStatusApi = new QueueStatusApi();
        queueStatusApi.getApiClient().setBasePath(API_BASEPATH);
        // endregion

        try {
            queueStatusApi.queryQueueStatusAsync(API_KEY, QUEUE_NAME
                    , new ApiCallback<QueueStatusResponse200>() {
                        // region Response handling
                        // Get the queue status
                        @Override
                        public void onSuccess(QueueStatusResponse200 result, int statusCode,
                                Map<String, List<String>> responseHeaders) {
                            logger.info("Request status corrId : " + result.getStatus().getCorrId());
                            logger.info("ewt:"+result.getData().getEwt()+", offerImmediateCallback: "+result.getData().isOfferImmediateCallback()+", offerScheduledCallback: "+result.getData().isOfferScheduledCallback());
                            return;
                        }
                        // endregion

                        // region Error Handling
                        // Get the code associated to the error
                        @Override
                        public void onFailure(ApiException e, int statusCode,
                                Map<String, List<String>> responseHeaders) {
                            logger.error(
                                    "QueueStatusApi call error: " + e.getMessage() + " status code " + statusCode);
                            return;
                        }
                        // endregion

                        @Override
                        public void onUploadProgress(long bytesWritten, long contentLength, boolean done) {

                        }

                        @Override
                        public void onDownloadProgress(long bytesRead, long contentLength, boolean done) {

                        }


                    
            });

        } catch (ApiException e) {
            System.err.println("Exception when calling QueueStatusApi#queryQueueStatusAsync");
            e.printStackTrace();
        }
    }
}