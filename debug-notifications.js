// Debug Notification Data Script
// Add this temporarily to your app/_layout.tsx to debug notification data

// In the notification received listener, add this debug code:
console.log('=== NOTIFICATION DEBUG ===');
console.log('Full notification object:', JSON.stringify(notification, null, 2));
console.log('Notification data:', notification.request.content.data);
console.log('Data type:', typeof notification.request.content.data);
console.log('Data keys:', Object.keys(notification.request.content.data || {}));

// Check the specific fields we need:
const data = notification.request.content.data;
console.log('orderId:', data?.orderId);
console.log('orderNumber:', data?.orderNumber); 
console.log('customerName:', data?.customerName);
console.log('amount:', data?.amount);
console.log('type:', data?.type);

// Check if the type matches what we expect:
const notificationType = data?.type;
console.log('Type check - is new_order_alarm?', notificationType === 'new_order_alarm');
console.log('Type check - is new_order?', notificationType === 'new_order');
console.log('Role check - is admin?', role === 'admin');
console.log('Role check - is delivery?', role === 'delivery');

// Check if condition will pass:
const shouldTriggerAlarm = (notificationType === 'new_order_alarm' || notificationType === 'new_order') && 
                          (role === 'admin' || role === 'delivery');
console.log('SHOULD TRIGGER ALARM?', shouldTriggerAlarm);
console.log('=== END DEBUG ===');

// If you see this debug output but the alarm doesn't trigger, 
// there might be an issue with the orderAlertService.playOrderAlert() call
