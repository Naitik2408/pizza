const Order = require('../models/Order');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private
const placeOrder = asyncHandler(async (req, res) => {
  const {
    items,
    amount,
    address,
    paymentMethod,
    paymentDetails,
    notes,
    subTotal,
    tax,
    deliveryFee,
    discounts
  } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  // Get user details for customer info
  const user = await User.findById(req.user._id);

  // Process items to ensure they have all required fields and calculate totals
  // Update the processedItems section in the placeOrder function
  const processedItems = items.map(item => {
    // Extract the base price (before customizations)
    const basePrice = item.basePrice || item.price;
    let totalItemPrice = basePrice;

    // Process customizations into a standardized format
    let processedCustomizations = [];
    if (item.customizations) {
      // If customizations is already an array of objects
      if (Array.isArray(item.customizations)) {
        processedCustomizations = item.customizations.map(custom => ({
          name: custom.name || 'Unknown',
          option: custom.option || '',
          price: Number(custom.price || 0)
        }));

        // Add prices from customizations
        totalItemPrice += processedCustomizations.reduce((sum, custom) =>
          sum + (custom.price || 0), 0);
      }
      // If customizations is an object (legacy format)
      else if (typeof item.customizations === 'object') {
        processedCustomizations = Object.entries(item.customizations).map(([name, option]) => {
          // Handle string options and object options
          if (typeof option === 'string') {
            return { name, option, price: 0 };
          } else {
            const price = Number(option.price || 0);
            totalItemPrice += price;
            return {
              name,
              option: option.name || option.option || '',
              price
            };
          }
        });
      }
    }

    // Process add-ons into a standardized format
    let processedAddOns = [];
    if (item.addOns) {
      // If add-ons is already an array
      if (Array.isArray(item.addOns)) {
        processedAddOns = item.addOns.map(addon => ({
          name: addon.name || 'Unknown',
          option: addon.option || addon.name || '',
          price: Number(addon.price || 0)
        }));

        // Add prices from add-ons
        totalItemPrice += processedAddOns.reduce((sum, addon) =>
          sum + (addon.price || 0), 0);
      }
      // If add-ons is an object (possible legacy format)
      else if (typeof item.addOns === 'object') {
        processedAddOns = Object.entries(item.addOns).map(([id, addon]) => {
          const addonName = typeof addon === 'string' ? addon : addon.name;
          const addonPrice = typeof addon === 'string' ? 0 : Number(addon.price || 0);
          totalItemPrice += addonPrice;
          return {
            name: addonName,
            option: addonName,
            price: addonPrice
          };
        });
      }
    }

    // Log the processed customizations for debugging
    console.log(`[${item.name}] Processed customizations:`, JSON.stringify(processedCustomizations));
    console.log(`[${item.name}] Processed add-ons:`, JSON.stringify(processedAddOns));

    // Return the processed item with correct customization data
    return {
      menuItemId: item.id || item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      size: item.size || 'Medium',
      foodType: item.foodType || 'Not Applicable',
      basePrice: basePrice,
      totalItemPrice: totalItemPrice,
      customizations: processedCustomizations,
      addOns: processedAddOns,
      specialInstructions: item.specialInstructions || ''
    };
  });

  // Log the processed items for debugging
  console.log('Processed order items:', JSON.stringify(processedItems, null, 2));

  const order = new Order({
    customer: req.user._id,
    customerName: user.name,
    items: processedItems,
    amount,
    address,
    fullAddress: `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`,
    paymentMethod,
    paymentDetails,
    customerPhone: user.phone || req.body.customerPhone,
    notes,
    deliveryAgentName: 'Unassigned',
    subTotal: subTotal || processedItems.reduce((sum, item) => sum + (item.totalItemPrice * item.quantity), 0),
    tax,
    deliveryFee,
    discounts
  });

  const createdOrder = await order.save();
  res.status(201).json(createdOrder);
});

// @desc    Get logged in user's orders
// @route   GET /api/orders/my-orders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .sort({ createdAt: -1 });

  // Format orders for the customer view
  const formattedOrders = orders.map(order => {
    return {
      id: order.orderNumber,
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      date: order.getFormattedDate(),
      time: order.time,
      createdAt: order.createdAt,
      amount: order.amount,
      items: order.items.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        foodType: item.foodType,
        // Include all customization types
        customizations: item.customizations || [],
        addOns: item.addOns || [],
        toppings: item.toppings || [],
        specialInstructions: item.specialInstructions || '',
        hasCustomizations: !!(
          (item.customizations && item.customizations.length) ||
          (item.addOns && item.addOns.length) ||
          (item.toppings && item.toppings.length) ||
          item.specialInstructions
        ),
        totalPrice: (item.totalItemPrice || item.price) * item.quantity
      })),
      fullAddress: order.fullAddress,
      address: order.address,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryAgent: order.deliveryAgent ? {
        _id: order.deliveryAgent,
        name: order.deliveryAgentName,
        phone: '' // This would need to come from populating the delivery agent
      } : null,
      statusUpdates: order.statusUpdates.map(update => ({
        status: update.status,
        time: update.time,
        note: update.note
      })),
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      notes: order.notes
    };
  });

  res.json(formattedOrders);
});

// @desc    Get order by ID for logged in user
// @route   GET /api/orders/my-orders/:id
// @access  Private
const getMyOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Make sure the order belongs to the logged in user
  if (order.customer.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Format the order with detailed customization info
  const formattedOrder = {
    ...order.toObject(),
    items: order.items.map(item => {
      return {
        ...item,
        customizations: item.customizations || [],
        addOns: item.addOns || [],
        toppings: item.toppings || [],
        totalPrice: (item.totalItemPrice || item.price) * item.quantity,
        hasCustomizations: !!(
          (item.customizations && item.customizations.length) ||
          (item.addOns && item.addOns.length) ||
          (item.toppings && item.toppings.length) ||
          item.specialInstructions
        )
      };
    })
  };

  res.json(formattedOrder);
});

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;

  const count = await Order.countDocuments({});
  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .skip(pageSize * (page - 1))
    .limit(pageSize);

  const formattedOrders = orders.map(order => {
    return {
      id: order.orderNumber,
      _id: order._id,
      customer: order.customerName,
      status: order.status,
      deliveryAgent: order.deliveryAgentName,
      date: order.getFormattedDate(),
      time: order.time,
      amount: order.amount,
      items: order.items.map(item => ({
        name: item.name || "Unnamed Item",
        quantity: item.quantity || 1,
        price: item.price || 0,
        size: item.size || "Regular",
        foodType: item.foodType || "Not Applicable",
        customizations: item.customizations || [],
        addOns: item.addOns || [],
        toppings: item.toppings || [],
        hasCustomizations: !!(
          (item.customizations && item.customizations.length) ||
          (item.addOns && item.addOns.length) ||
          (item.toppings && item.toppings.length) ||
          item.specialInstructions
        ),
        // Count total customizations
        customizationCount:
          (item.customizations ? item.customizations.length : 0) +
          (item.addOns ? item.addOns.length : 0) +
          (item.toppings ? item.toppings.length : 0) +
          (item.specialInstructions ? 1 : 0)
      })),
      totalItemsCount: order.totalItemsCount || order.items.reduce((sum, item) => sum + (item.quantity || 1), 0),
      address: order.fullAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerPhone: order.customerPhone,
      notes: order.notes || ''
    };
  });

  res.json({
    orders: formattedOrders,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});

// @desc    Get order by ID (admin)
// @route   GET /api/orders/:id
// @access  Private/Admin
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name email')
    .populate('deliveryAgent', 'name');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Transform the order to include detailed item information with customizations
  const transformedOrder = {
    _id: order._id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    status: order.status,
    date: order.date,
    time: order.time || new Date(order.date).toLocaleTimeString(),
    amount: order.amount,
    items: order.items.map(item => {
      // Make sure we have valid data for each item
      return {
        name: item.name || "Unnamed Item",
        quantity: item.quantity || 1,
        price: item.price || 0,
        basePrice: item.basePrice || item.price || 0,
        size: item.size || "Regular",
        foodType: item.foodType || "Not Applicable",
        customizations: Array.isArray(item.customizations) ? item.customizations : [],
        addOns: Array.isArray(item.addOns) ? item.addOns : [],
        toppings: Array.isArray(item.toppings) ? item.toppings : [],
        specialInstructions: item.specialInstructions || "",
        totalItemPrice: item.totalItemPrice || item.price || 0,
        menuItemId: item.menuItemId || "",
        // Calculate customization total
        customizationTotal: [
          ...(item.customizations || []),
          ...(item.addOns || []),
          ...(item.toppings || [])
        ].reduce((sum, customization) => sum + (customization.price || 0), 0)
      };
    }),
    fullAddress: order.fullAddress,
    paymentMethod: order.paymentMethod || "Not specified",
    paymentStatus: order.paymentStatus || "Not specified",
    customerPhone: order.customerPhone || "Not available",
    notes: order.notes || "",
    deliveryAgentName: order.deliveryAgentName,
    statusUpdates: order.statusUpdates || []
  };

  res.json(transformedOrder);
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Update status and add to status history
  order.status = status;
  order.statusUpdates.push({
    status,
    time: Date.now(),
    note: note || `Status updated to ${status}`
  });

  // If status is "Out for delivery", set estimated delivery time to 30 minutes from now
  if (status === 'Out for delivery' && !order.estimatedDeliveryTime) {
    const estimatedTime = new Date();
    estimatedTime.setMinutes(estimatedTime.getMinutes() + 30);
    order.estimatedDeliveryTime = estimatedTime;
  }

  const updatedOrder = await order.save();

  res.json({
    success: true,
    order: {
      id: updatedOrder.orderNumber,
      _id: updatedOrder._id,
      status: updatedOrder.status,
      estimatedDeliveryTime: updatedOrder.estimatedDeliveryTime
    }
  });
});

// @desc    Assign delivery agent to order
// @route   PUT /api/orders/:id/delivery-agent
// @access  Private/Admin
const assignDeliveryAgent = asyncHandler(async (req, res) => {
  const { deliveryAgentId, deliveryAgentName } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // If setting to unassigned
  if (deliveryAgentName === 'Unassigned') {
    order.deliveryAgent = null;
    order.deliveryAgentName = 'Unassigned';

    // Add note to status updates
    order.statusUpdates.push({
      status: order.status,
      time: Date.now(),
      note: 'Delivery agent unassigned'
    });
  } else {
    // Verify the delivery agent exists
    const agent = await User.findById(deliveryAgentId);

    if (!agent) {
      res.status(400);
      throw new Error('Delivery agent not found');
    }

    // Check if the agent is available (isOnline)
    if (agent.role === 'delivery' && agent.deliveryDetails) {
      if (!agent.deliveryDetails.isOnline) {
        res.status(400);
        throw new Error('Delivery agent is currently offline');
      }

      if (agent.deliveryDetails.status !== 'approved') {
        res.status(400);
        throw new Error('Delivery agent is not approved');
      }
    }

    order.deliveryAgent = deliveryAgentId;
    order.deliveryAgentName = deliveryAgentName || agent.name;

    // Add note to status updates
    order.statusUpdates.push({
      status: order.status,
      time: Date.now(),
      note: `Assigned to ${order.deliveryAgentName}`
    });
  }

  const updatedOrder = await order.save();

  res.json({
    success: true,
    order: {
      id: updatedOrder.orderNumber,
      _id: updatedOrder._id,
      deliveryAgent: updatedOrder.deliveryAgentName
    }
  });
});

// @desc    Filter orders
// @route   GET /api/orders/filter
// @access  Private/Admin
const filterOrders = asyncHandler(async (req, res) => {
  const { status, date, deliveryAgent } = req.query;
  const filterOptions = {};

  if (status) {
    filterOptions.status = status;
  }

  if (date) {
    // Convert date string to Date object range for the whole day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    filterOptions.date = { $gte: startDate, $lte: endDate };
  }

  if (deliveryAgent) {
    if (deliveryAgent === 'Unassigned') {
      filterOptions.deliveryAgentName = 'Unassigned';
    } else {
      filterOptions.deliveryAgentName = deliveryAgent;
    }
  }

  const pageSize = 10;
  const page = Number(req.query.page) || 1;

  const count = await Order.countDocuments(filterOptions);
  const orders = await Order.find(filterOptions)
    .sort({ createdAt: -1 })
    .skip(pageSize * (page - 1))
    .limit(pageSize);

  const formattedOrders = orders.map(order => {
    return {
      id: order.orderNumber,
      _id: order._id,
      customer: order.customerName,
      status: order.status,
      deliveryAgent: order.deliveryAgentName,
      date: order.getFormattedDate(),
      time: order.time,
      amount: order.amount,
      items: order.items.map(item => ({
        name: item.name || "Unnamed Item",
        quantity: item.quantity || 1,
        price: item.price || 0,
        size: item.size || "Regular",
        foodType: item.foodType || "Not Applicable",
        hasCustomizations: !!(
          (item.customizations && item.customizations.length) ||
          (item.addOns && item.addOns.length) ||
          (item.toppings && item.toppings.length) ||
          item.specialInstructions
        ),
        customizationCount:
          (item.customizations ? item.customizations.length : 0) +
          (item.addOns ? item.addOns.length : 0) +
          (item.toppings ? item.toppings.length : 0) +
          (item.specialInstructions ? 1 : 0)
      })),
      totalItemsCount: order.totalItemsCount || order.items.reduce((sum, item) => sum + (item.quantity || 1), 0),
      address: order.fullAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerPhone: order.customerPhone,
      notes: order.notes || ''
    };
  });

  res.json({
    orders: formattedOrders,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});

// @desc    Search orders
// @route   GET /api/orders/search
// @access  Private/Admin
const searchOrders = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  // Search by order number, customer name, or item name
  const orders = await Order.find({
    $or: [
      { orderNumber: { $regex: query, $options: 'i' } },
      { customerName: { $regex: query, $options: 'i' } },
      { 'items.name': { $regex: query, $options: 'i' } }
    ]
  }).limit(20);

  const formattedOrders = orders.map(order => {
    return {
      id: order.orderNumber,
      _id: order._id,
      customer: order.customerName,
      status: order.status,
      deliveryAgent: order.deliveryAgentName,
      date: order.getFormattedDate(),
      time: order.time,
      amount: order.amount,
      items: order.items.map(item => ({
        name: item.name || "Unnamed Item",
        quantity: item.quantity || 1,
        price: item.price || 0,
        size: item.size || "Regular",
        foodType: item.foodType || "Not Applicable",
        hasCustomizations: !!(
          (item.customizations && item.customizations.length) ||
          (item.addOns && item.addOns.length) ||
          (item.toppings && item.toppings.length) ||
          item.specialInstructions
        ),
        customizationCount:
          (item.customizations ? item.customizations.length : 0) +
          (item.addOns ? item.addOns.length : 0) +
          (item.toppings ? item.toppings.length : 0) +
          (item.specialInstructions ? 1 : 0)
      })),
      address: order.fullAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerPhone: order.customerPhone,
      notes: order.notes || ''
    };
  });

  res.json(formattedOrders);
});

// @desc    Get delivery orders for a specific delivery agent
// @route   GET /api/orders/delivery
// @access  Private/Delivery
const getDeliveryOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    deliveryAgent: req.user._id,
    status: { $in: ['Preparing', 'Out for delivery'] }
  }).sort({ date: 1 });

  const formattedOrders = orders.map(order => {
    return {
      id: order.orderNumber,
      _id: order._id,
      customer: order.customerName,
      status: order.status,
      address: order.fullAddress,
      customerPhone: order.customerPhone,
      date: order.getFormattedDate(),
      time: order.time,
      amount: order.amount,
      totalItems: order.totalItemsCount || order.items.reduce((sum, item) => sum + (item.quantity || 1), 0),
      notes: order.notes || '',
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus
    };
  });

  res.json(formattedOrders);
});

// @desc    Get delivery order by ID for delivery agent
// @route   GET /api/orders/delivery/:id
// @access  Private/Delivery
const getDeliveryOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Ensure the order is assigned to this delivery agent
  if (order.deliveryAgent.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized - this order is not assigned to you');
  }

  // Format order for delivery view
  const formattedOrder = {
    id: order.orderNumber,
    _id: order._id,
    customer: order.customerName,
    status: order.status,
    address: order.fullAddress,
    fullAddress: order.fullAddress,
    customerPhone: order.customerPhone,
    date: order.getFormattedDate(),
    time: order.time,
    amount: order.amount,
    items: order.items.map(item => ({
      name: item.name || "Unnamed Item",
      quantity: item.quantity || 1,
      price: item.price || 0,
      size: item.size || "Regular",
      foodType: item.foodType || "Not Applicable"
    })),
    notes: order.notes || '',
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus
  };

  res.json(formattedOrder);
});

// @desc    Update delivery order status by delivery agent
// @route   PUT /api/orders/delivery/:id/status
// @access  Private/Delivery
const updateDeliveryOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (status !== 'Out for delivery' && status !== 'Delivered') {
    res.status(400);
    throw new Error('Delivery agents can only update to Out for delivery or Delivered status');
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Ensure the order is assigned to this delivery agent
  if (order.deliveryAgent.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized - this order is not assigned to you');
  }

  // Update status
  order.status = status;
  order.statusUpdates.push({
    status,
    time: Date.now(),
    note: `Status updated to ${status} by delivery agent`
  });

  const updatedOrder = await order.save();

  res.json({
    success: true,
    status: updatedOrder.status
  });
});

module.exports = {
  placeOrder,
  getMyOrders,
  getMyOrderById,
  getOrders,
  getOrderById,
  updateOrderStatus,
  assignDeliveryAgent,
  filterOrders,
  searchOrders,
  getDeliveryOrders,
  getDeliveryOrderById,
  updateDeliveryOrderStatus
};