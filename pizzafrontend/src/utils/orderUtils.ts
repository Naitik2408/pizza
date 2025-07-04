// Utility functions for consistent order ID formatting across the application

/**
 * Format order ID for display
 * @param {string} orderNumber - The order number from the backend
 * @param {string} fallbackId - Fallback ID if orderNumber is not available
 * @returns {string} Formatted order ID
 */
export const formatOrderId = (orderNumber: string | undefined, fallbackId?: string): string => {
  if (orderNumber) {
    // If it's already in the correct format (PZ20240704001), return as is
    if (orderNumber.startsWith('PZ') && orderNumber.length === 13) {
      return orderNumber;
    }
    
    // If it's a legacy format (just numbers), add PZ prefix
    if (/^\d+$/.test(orderNumber)) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `PZ${year}${month}${day}${orderNumber.padStart(3, '0')}`;
    }
    
    // Return as is if already prefixed
    return orderNumber;
  }
  
  // Fallback to _id if orderNumber is not available
  if (fallbackId) {
    return `PZ${fallbackId.slice(-8).toUpperCase()}`;
  }
  
  return 'PZ-INVALID';
};

/**
 * Display order ID with consistent formatting
 * @param {string} orderNumber - The order number from the backend
 * @param {string} fallbackId - Fallback ID if orderNumber is not available
 * @returns {string} Display-ready order ID with # prefix
 */
export const displayOrderId = (orderNumber: string | undefined, fallbackId?: string): string => {
  const formattedId = formatOrderId(orderNumber, fallbackId);
  return `#${formattedId}`;
};

/**
 * Extract readable components from order ID
 * @param {string} orderNumber - The order number
 * @returns {object} Object containing date and sequence info
 */
export const parseOrderId = (orderNumber: string): { date: string; sequence: string; isValid: boolean } => {
  if (!orderNumber || !orderNumber.startsWith('PZ') || orderNumber.length !== 13) {
    return { date: 'Invalid', sequence: 'Invalid', isValid: false };
  }
  
  const dateStr = orderNumber.slice(2, 10); // YYYYMMDD
  const sequence = orderNumber.slice(10); // DDD
  
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  
  const date = `${day}/${month}/${year}`;
  
  return { date, sequence, isValid: true };
};

/**
 * Get order ID for search/filtering
 * @param {string} orderNumber - The order number
 * @returns {string} Searchable order ID
 */
export const getSearchableOrderId = (orderNumber: string | undefined): string => {
  if (!orderNumber) return '';
  
  // Return both the full ID and just the sequence part for search
  const parsed = parseOrderId(orderNumber);
  if (parsed.isValid) {
    return `${orderNumber} ${parsed.sequence}`;
  }
  
  return orderNumber;
};

/**
 * Validate order ID format
 * @param {string} orderNumber - The order number to validate
 * @returns {boolean} True if valid format
 */
export const isValidOrderId = (orderNumber: string): boolean => {
  if (!orderNumber) return false;
  
  // Check if it matches the PZ format: PZ + YYYYMMDD + DDD
  const regex = /^PZ\d{8}\d{3}$/;
  return regex.test(orderNumber);
};
