import { API_URL } from '../../config';

// Detailed Address interface for API operations (extends base Address from types)
interface ApiAddress {
  _id: string;
  userId: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault?: boolean;
  phone?: string;
  landmark?: string;
}

export const getAddresses = async (token: string): Promise<ApiAddress[]> => {
  try {
    const response = await fetch(`${API_URL}/api/users/addresses`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch addresses');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching addresses:', error);
    throw error;
  }
};

export const addAddress = async (token: string, address: Omit<ApiAddress, '_id' | 'userId'>): Promise<ApiAddress[]> => {
  try {
    const response = await fetch(`${API_URL}/api/users/addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(address)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add address');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error adding address:', error);
    throw error;
  }
};

export const updateAddress = async (
  token: string, 
  addressId: string, 
  address: Omit<ApiAddress, '_id' | 'userId'>
): Promise<ApiAddress[]> => {
  try {
    const response = await fetch(`${API_URL}/api/users/addresses/${addressId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(address)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update address');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error updating address:', error);
    throw error;
  }
};

export const deleteAddress = async (token: string, addressId: string): Promise<ApiAddress[]> => {
  try {
    const response = await fetch(`${API_URL}/api/users/addresses/${addressId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete address');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
};

export const setDefaultAddress = async (token: string, addressId: string): Promise<ApiAddress[]> => {
  try {
    const response = await fetch(`${API_URL}/api/users/addresses/${addressId}/default`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to set default address');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error setting default address:', error);
    throw error;
  }
};