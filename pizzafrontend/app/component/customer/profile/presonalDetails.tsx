import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../redux/store';
import { ChevronLeft, Edit, Check, Phone, Mail, MapPin, User as UserIcon } from 'lucide-react-native';
import { router } from 'expo-router';

export default function PersonalDetails() {
  const dispatch = useDispatch();
  const { name, email, token } = useSelector((state: RootState) => state.auth);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize form state with current user data
  const [formData, setFormData] = useState({
    name: name || '',
    email: email || '',
    phone: '',  // These fields don't exist in authSlice yet
    address: '',
  });
  
  const handleChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };
  
  const toggleEditMode = () => {
    if (isEditing) {
      // If cancelling edit mode, reset form data
      setFormData({
        name: name || '',
        email: email || '',
        phone: '',
        address: '',
      });
    }
    setIsEditing(!isEditing);
  };

  // Function to save updated user info
  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      Alert.alert('Success', 'Profile updated successfully');
      setIsLoading(false);
      setIsEditing(false);
      // In a real app, you would update Redux state here with the new values
    }, 1000);
  };

  // Render an info row in view mode
  const renderInfoRow = (icon: React.ReactNode, label: string, value: string, placeholder: string) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || placeholder}</Text>
      </View>
    </View>
  );

  // Render a form field in edit mode
  const renderFormField = (label: string, field: keyof typeof formData, placeholder: string, keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default', multiline = false) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={formData[field]}
        onChangeText={(value) => handleChange(field, value)}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Personal Details</Text>
        {!isLoading && (
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={toggleEditMode}
          >
            {isEditing ? (
              <Text style={styles.editButtonText}>Cancel</Text>
            ) : (
              <>
                <Edit size={16} color="#FF6B00" />
                <Text style={styles.editButtonText}>Edit</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {isEditing ? (
          // Edit Mode - Show form fields
          <View style={styles.form}>
            {renderFormField('Full Name', 'name', 'Your full name')}
            {renderFormField('Email', 'email', 'Your email address', 'email-address')}
            {renderFormField('Phone Number', 'phone', 'Your phone number', 'phone-pad')}
            {renderFormField('Address', 'address', 'Your delivery address', 'default', true)}

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.submitButtonText}>Updating...</Text>
              ) : (
                <View style={styles.submitButtonContent}>
                  <Check size={18} color="#FFF" />
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // View Mode - Show user info
          <View style={styles.infoContainer}>
            {renderInfoRow(
              <UserIcon size={20} color="#4F46E5" />, 
              'Full Name', 
              formData.name, 
              'Not provided'
            )}
            
            {renderInfoRow(
              <Mail size={20} color="#10B981" />, 
              'Email Address', 
              formData.email, 
              'Not provided'
            )}
            
            {renderInfoRow(
              <Phone size={20} color="#F59E0B" />, 
              'Phone Number', 
              formData.phone, 
              'Not provided'
            )}
            
            {renderInfoRow(
              <MapPin size={20} color="#EC4899" />, 
              'Delivery Address', 
              formData.address, 
              'No address provided'
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FF6B0015',
  },
  editButtonText: {
    color: '#FF6B00',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  content: {
    padding: 20,
  },
  // View mode styles
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 16,
    marginTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  // Edit mode styles
  form: {
    marginTop: 10,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});