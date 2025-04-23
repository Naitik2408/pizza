const Order = require('../models/Order');
const User = require('../models/User');

// Fetch all orders
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('customer').populate('deliveryAgent');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Replace the existing assignDeliveryAgent function with this improved version:

// Assign delivery agent
const assignDeliveryAgent = async (req, res) => {
  const { id } = req.params;
  const { deliveryAgent, deliveryAgentName } = req.body;

  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Update both the delivery agent ID and name
    if (!deliveryAgent || deliveryAgent === null) {
      // If no agent ID provided, mark as unassigned
      order.deliveryAgent = null;
      order.deliveryAgentName = 'Unassigned';

      // Add status update entry
      order.statusUpdates.push({
        status: order.status,
        time: new Date(),
        note: 'Delivery agent unassigned'
      });
    } else {
      // Verify the agent exists
      const agent = await User.findById(deliveryAgent);
      if (!agent) {
        return res.status(400).json({ message: 'Delivery agent not found' });
      }

      // Update both ID and name fields
      order.deliveryAgent = deliveryAgent;
      order.deliveryAgentName = deliveryAgentName || agent.name;

      // Add status update entry
      order.statusUpdates.push({
        status: order.status,
        time: new Date(),
        note: `Assigned to delivery agent: ${order.deliveryAgentName}`
      });
    }

    const updatedOrder = await order.save();

    console.log(`Order ${id} assigned to agent: ${updatedOrder.deliveryAgentName} (ID: ${updatedOrder.deliveryAgent || 'null'})`);

    res.json({
      success: true,
      message: 'Delivery agent assigned successfully',
      order: {
        _id: updatedOrder._id,
        deliveryAgent: updatedOrder.deliveryAgent,
        deliveryAgentName: updatedOrder.deliveryAgentName
      }
    });
  } catch (error) {
    console.error('Error assigning delivery agent:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all delivery agents
const getDeliveryAgents = async (req, res) => {
  try {
    const deliveryAgents = await User.find({ role: 'delivery' }).select('-password');
    res.json(deliveryAgents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Add this improved version of getAssignedOrders:

// Get all orders assigned to the logged in delivery agent
const getAssignedOrders = async (req, res) => {
  try {
    const userId = req.user._id; // Get the current delivery agent's ID
    console.log(`Finding orders assigned to delivery agent ID: ${userId}`);

    // Find orders assigned to this delivery agent
    // Include all statuses except 'Cancelled' (optionally filter out 'Delivered' too if you want)
    const orders = await Order.find({
      deliveryAgent: userId,
      status: { $nin: ['Cancelled'] }
    }).sort({ date: -1 });

    console.log(`Found ${orders.length} assigned orders for agent ID: ${userId}`);
    
    // If debugging, log the first order's details
    if (orders.length > 0) {
      console.log('Sample order details:', {
        id: orders[0]._id,
        status: orders[0].status,
        deliveryAgentId: orders[0].deliveryAgent,
        deliveryAgentName: orders[0].deliveryAgentName
      });
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching assigned orders:', error);
    res.status(500).json({ message: 'Failed to fetch assigned orders' });
  }
};

module.exports = { getOrders, updateOrderStatus, assignDeliveryAgent, getDashboardStats, getDeliveryAgents, getAssignedOrders };