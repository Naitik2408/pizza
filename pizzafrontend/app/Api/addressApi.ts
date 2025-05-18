import { API_URL } from '../../config';

// Update your Address interface to include the landmark property
export interface Address {
  _id: string;
  userId: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault?: boolean;
  phone?: string;
  landmark?: string; // Add this line to include landmark
}

export const getAddresses = async (token: string): Promise<Address[]> => {
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

export const addAddress = async (token: string, address: Omit<Address, '_id' | 'id'>): Promise<Address[]> => {
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
  address: Omit<Address, '_id' | 'id'>
): Promise<Address[]> => {
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

export const deleteAddress = async (token: string, addressId: string): Promise<Address[]> => {
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

export const setDefaultAddress = async (token: string, addressId: string): Promise<Address[]> => {
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