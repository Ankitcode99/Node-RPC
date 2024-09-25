const express = require('express');
const { RPCObserver, RPCRequest } = require('./rpc');
const app = express()

const PORT = 5000

app.use(express.json());

const fakeCustomerResponse = {
    _id: '123abc',
    name: 'Customer',
    email: 'email@example.com'
}

RPCObserver("CUSTOMER_RPC", fakeCustomerResponse)

app.get('/wishlist', async (req, res) => {

    const requestPayload = {
        productId: '123',
        customerId: '123abc'
    }

    try {
        const rpcResponse = await RPCRequest("PRODUCT_RPC", requestPayload)
        console.log("rpcResponse for Customer : ")
        console.log(rpcResponse)
        res.status(200).json(rpcResponse)
    } catch (error) {
        console.log(error)
        return res.status(500).json(error)
    }
})

app.get('/', (req, res) => {
    res.json({
        "msg": "Hi from Customer Service!!!"
    })
})

app.listen(PORT, () => {
    console.clear();
    console.log(`Customer Server is running on ${PORT}`);
})