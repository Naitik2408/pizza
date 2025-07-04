// Format currency
export const formatCurrency = (amount: number, currency = '₹'): string => {
  return `${currency}${amount.toFixed(2)}`;
};

// Format date
export const formatDate = (dateString: string): string => {
  if (!dateString) return 'Unknown date';

  try {
    const date = new Date(dateString);
    const today = new Date();

    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      // Format as "Today, HH:MM AM/PM"
      return `Today, ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      })}`;
    } else {
      // Format as "MMM DD, YYYY"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Invalid date';
  }
};

// Format time
export const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  } catch (e) {
    console.error('Error formatting time:', e);
    return '';
  }
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } else {
      return formatDate(dateString);
    }
  } catch (e) {
    console.error('Error formatting relative time:', e);
    return '';
  }
};

// Format phone number
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phone;
};

// Format order number
export const formatOrderNumber = (orderNumber: string): string => {
  if (!orderNumber) return 'N/A';
  return orderNumber.toUpperCase();
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Capitalize first letter
export const capitalizeFirst = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format percentage
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};
