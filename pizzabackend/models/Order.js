const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderNumber: {
      type: String,
      unique: true,
    },
    customerName: {
      type: String,
      required: true
    },
    items: [
      {
        menuItemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MenuItem',
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        size: { type: String, enum: ['Small', 'Medium', 'Large', 'Not Applicable'] },
        foodType: { type: String, enum: ['Veg', 'Non-Veg', 'Not Applicable'] },
        customizations: [
          {
            name: { type: String },
            option: { type: String },
            price: { type: Number }
          }
        ]
      },
    ],
    status: {
      type: String,
      enum: ['Pending', 'Preparing', 'Out for delivery', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    statusUpdates: [
      {
        status: { type: String },
        time: { type: Date, default: Date.now },
        note: { type: String }
      }
    ],
    deliveryAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deliveryAgentName: {
      type: String,
      default: 'Unassigned'
    },
    date: { type: Date, default: Date.now },
    time: { 
      type: String,
      default: function() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
    },
    amount: { type: Number, required: true },
    address: { 
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      landmark: { type: String }
    },
    fullAddress: {
      type: String,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['Online', 'Cash on Delivery'],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    paymentDetails: {
      orderId: { type: String }, // Payment gateway order ID
      paymentId: { type: String }, // Payment gateway payment ID
      signature: { type: String } // Payment gateway signature
    },
    customerPhone: { type: String, required: true },
    notes: { type: String },
    estimatedDeliveryTime: { type: Date },
  },
  { timestamps: true }
);

// Generate unique order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const count = await mongoose.models.Order.countDocuments({}) + 1;
    this.orderNumber = `${count.toString().padStart(4, '0')}`;
    
    // Add initial status update
    if (!this.statusUpdates || this.statusUpdates.length === 0) {
      this.statusUpdates = [{
        status: this.status,
        time: date,
        note: 'Order created'
      }];
    }
    
    // Format the full address for easier display
    if (this.address && !this.fullAddress) {
      this.fullAddress = `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}`;
    }
  }
  next();
});

// Method to calculate formatted date string for frontend
orderSchema.methods.getFormattedDate = function() {
  const date = this.date;
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

module.exports = mongoose.model('Order', orderSchema);