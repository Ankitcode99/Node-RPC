const express = require('express');
const { RPCObserver, RPCRequest } = require('./rpc');
const app = express()

const PORT = 3000

app.use(express.json());

const fakeProductResponse = {
    name: "iPhone 13",
    brand: "Apple Inc.",
    price: 79500
}

RPCObserver("PRODUCT_RPC", fakeProductResponse)

app.get('/customer', async (req, res) => {
    const requestPayload = {
        customerId: '123abc'
    }

    try {
        const rpcResponse = await RPCRequest("CUSTOMER_RPC", requestPayload)
        console.log("rpcResponse for Product : " + rpcResponse)
        res.status(200).json(rpcResponse)
    } catch (error) {
        console.log(error)
        return res.status(500).json(error)
    }
})


app.get('/', (req, res) => {
    res.json({
        "msg": "Hi from Product Service!!!"
    })
})

app.listen(PORT, () => {
    console.clear();
    console.log(`Product Server is running on ${PORT}`);
})