const { Module } = require("module");
const mongoose = require("mongoose");


const cart = new mongoose.Schema({
    user_id: {
        required: true,
        type: mongoose.Types.ObjectId,
    },
    Product: [
        {
            productId: mongoose.Types.ObjectId,
            quantity: Number
        }
    ],
});
module.exports = mongoose.model("cart",cart);
