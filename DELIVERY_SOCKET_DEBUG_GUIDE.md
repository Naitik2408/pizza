# Delivery Socket Debug Guide - New Order Assignment Issue

## Problem
- Order status updates work correctly ✅
- New order assignments don't trigger automatically ❌
- Alarms don't ring for new assignments ❌
- Manual refresh is required to see new assigned orders ❌

## Root Cause Analysis

### What's Working:
1. **Socket connection** - Socket connects successfully
2. **Order status updates** - Using `assigned_order_update` event correctly
3. **Socket rooms** - Delivery agent joins rooms properly

### What's NOT Working:
1. **New order assignment events** - `new_order_assigned` events not being received
2. **Alarm system** - Not triggering because events aren't received

## Backend Event Flow (What Should Happen)

When admin assigns order to delivery agent:

1. **Admin calls**: `/api/orders/:id/assign-delivery-agent`
2. **Backend emits**:
   ```javascript
   // To admin
   io.to('role:admin').emit('delivery_assignment_update', assignmentUpdate);
   io.to('role:admin').emit('order_update', { ...assignmentUpdate, triggerType: 'delivery_assignment' });
   
   // To delivery agent
   io.to(`user:${order.deliveryAgent}`).emit('new_order_assigned', {
     _id: order._id,
     orderNumber: order.orderNumber,
     status: order.status,
     customerName: order.customerName,
     address: order.fullAddress,
     amount: order.amount,
     // ... more data
   });
   ```

## Debugging Steps Added

### 1. Enhanced Socket Setup Logging
```typescript
console.log('🔌 Setting up socket for delivery agent:', { 
  userId: currentUserId, 
  role: currentRole,
  hasToken: !!currentToken,
  socketExists: !!socket,
  socketConnected: socket?.connected,
  userEmail: email,
  userName: name
});
```

### 2. Room Joining Verification
```typescript
console.log('🏠 Joining rooms: user:' + currentUserId + ' and role:' + currentRole);
```

### 3. All Events Monitoring
```typescript
socket.onAny((event, ...args) => {
  console.log(`🔔 Socket event received: ${event}`, args);
  
  // Special debug for delivery-related events
  if (event.includes('order') || event.includes('delivery') || event.includes('assigned')) {
    console.log(`🎯 DELIVERY-RELATED EVENT: ${event}`, JSON.stringify(args, null, 2));
  }
});
```

### 4. Alternative Event Listeners
Added listeners for events that might be coming with different names:
- `delivery_assignment_update`
- `order_update` (with triggerType: 'delivery_assignment')

## Testing Instructions

### Step 1: Check Frontend Console
1. Open delivery agent assigned orders page
2. Look for these logs:
   ```
   🔌 Setting up socket for delivery agent: { userId: 'xxx', role: 'delivery', ... }
   ✅ Socket connected in delivery orders screen
   🔗 Socket ID: xxx
   🏠 Joining rooms: user:xxx and role:delivery
   ```

### Step 2: Test Order Assignment
1. Open admin panel in another tab
2. Assign an order to the delivery agent
3. Check delivery agent console for:
   ```
   🔔 Socket event received: new_order_assigned { ... }
   🎯 DELIVERY-RELATED EVENT: new_order_assigned { ... }
   ✅ New order assigned to delivery agent: { ... }
   ```

### Step 3: Check Alternative Events
If `new_order_assigned` is not received, look for:
```
🔔 Socket event received: delivery_assignment_update { ... }
🔔 Socket event received: order_update { ... }
🎯 DELIVERY-RELATED EVENT: delivery_assignment_update { ... }
```

## Potential Issues & Solutions

### Issue 1: userId Mismatch
**Problem**: Frontend userId doesn't match backend deliveryAgent ID
**Check**: Compare the userId in frontend logs with the deliveryAgentId in admin assignment
**Solution**: Ensure consistent user ID format

### Issue 2: Socket Room Not Joined
**Problem**: Delivery agent not in correct socket room
**Check**: Look for "🏠 Joining rooms" logs
**Solution**: Verify `joinSocketRooms` function is working

### Issue 3: Backend Not Emitting
**Problem**: Backend not emitting `new_order_assigned` event
**Check**: Backend logs when assigning order
**Solution**: Verify `emitDeliveryAgentAssignment` function is called

### Issue 4: Event Name Mismatch
**Problem**: Backend emitting different event name than expected
**Check**: Monitor all socket events with `onAny` listener
**Solution**: Listen for the actual event being emitted

## Quick Test Commands

```bash
# Check if backend is running
curl http://localhost:5000/

# Check frontend console for socket logs
# (Open browser dev tools)

# Run debug script
bash debug-delivery-socket.sh
```

## Expected Behavior After Fix

1. **Assignment happens**: Admin assigns order to delivery agent
2. **Event received**: Frontend logs `🎯 DELIVERY-RELATED EVENT: new_order_assigned`
3. **Alarm triggers**: Logs show `🔊 Triggering system-level alert...` and `📢 Setting urgent alarm...`
4. **UI updates**: Orders list updates automatically without refresh
5. **Alert shown**: "🍕 New Delivery Assignment!" popup appears

## Next Steps

1. Run the debugging and check console logs
2. Identify which specific event is being emitted by backend
3. Verify userId matches between frontend and backend
4. Ensure socket rooms are joined correctly
5. Test alarm permissions if events are working
