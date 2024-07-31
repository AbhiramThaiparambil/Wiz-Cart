const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  shipment_address: {
    type: {
      name: {
        type: String,
        required: true
      },
      mobile: {
        type: String,
        required: true
      },
      pincode: {
        type: String,
        required: true
      },
      locality: {
        type: String,
        required: true
      },
      address: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      landmark: {
        type: String
      },
      altmobile: {
        type: String
      },
      addresstype: {
        type: String
      }
    },
    required: true
  },
  product: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    }
  }],
  orderDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['Credit Card', 'Debit Card', 'COD', 'Bank Transfer'],
    required: true
  }
});

module.exports = mongoose.model('Order', OrderSchema);
