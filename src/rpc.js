const amqplib = require('amqplib');
const { v4: uuidv4 } = require('uuid');


let amqplibConnection = null;

const getChannel = async () => {
    if(amqplibConnection === null) {
        amqplibConnection = await amqplib.connect(RMQ_URL)
    }

    return await amqplibConnection.createChannel()
}

const expensiveDBOperation = (payload, fakeResponse) => {
    
    return new Promise((res, rej) => {
        setTimeout(()=>{
            res(fakeResponse)
        }, 3000)
    })
}

const RPCObserver = async (RPC_QUEUE_NAME, fakeResponse) => {
    const channel = await getChannel();
    await channel.assertQueue(RPC_QUEUE_NAME, {
        durable: false,
    })

    channel.prefetch(1); 
    // this property defines how many unacknowledged (unprocessed) messages a consumer 
    // can have at a time before the message broker stops sending more messages to that consumer

    channel.consume(RPC_QUEUE_NAME, async(msg) => {
        if(msg.content) {
            /**
             * fakeResponse: Result from DB processing 
             */
            const payload = JSON.parse(msg.content.toString());
            const response = await expensiveDBOperation(payload, fakeResponse)


            /***
             * send the response
             */
            channel.sendToQueue(
                msg.properties.replyTo, 
                Buffer.from(JSON.stringify(response)), 
                {
                    correlationId: msg.properties.correlationId,
                    /**
                     * This part sets the correlation ID of the response message to 
                     * match the correlation ID of the original request. The correlation ID 
                     * is used to correlate the response with the corresponding request, 
                     * especially when multiple requests are in progress simultaneously.
                     */
                }
            );

            /**
             * ACKNOWLEDGEMENT
             */
            channel.ack(msg)
        }
    }, {
        noAck: false,
    })
}

const requestData = async (RPC_QUEUE_NAME, requestPayload, uuid) => {
    const channel = await getChannel();
    const q = await channel.assertQueue(
        "", 
        {
            exclusive: true,
            arguments: {
                'x-expires': 60000, // Auto-delete after 60,000 milliseconds (1 minute) of idle time
            },        
        }
        
    );

    channel.sendToQueue(RPC_QUEUE_NAME, Buffer.from(JSON.stringify(requestPayload)), {
        replyTo: q.queue,
        correlationId: uuid
    });

    // (await (await amqplib.connect()).createChannel()).sendToQueue()


    return new Promise((resolve, reject) => {
        /**
         * Inorder to prevent request to wait for response indefinitely we added a timeout
         * to the request so that if the response is not received we return appropriate timeout
         * message
         */
        const requestTimelimit = setTimeout(()=>{
            channel.close();
            resolve('API cannot fulfil request at the moment')
        }, 8000)

        channel.consume(
            q.queue, 
            (msg) => {
                if(msg.properties.correlationId === uuid) {
                    resolve(JSON.parse(msg.content.toString()));
                    clearTimeout(requestTimelimit); // no need to call requestTimelimit as we got response
                }else{
                    reject("Data not found")
                }
            },
            {
                noAck: true,
            }
        );
    })
}

const RPCRequest = async (RPC_QUEUE_NAME, requestPayload) => {
    const uuid = uuidv4(); // correlationId of our request
    return await requestData(RPC_QUEUE_NAME, requestPayload, uuid);
}

module.exports = {
    getChannel,
    RPCObserver,
    RPCRequest
}