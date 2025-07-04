import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    Switch,
    Platform
} from 'react-native';
import { AntDesign, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectTotal } from '../../../../redux/slices/cartSlice';
import { RootState } from '../../../../redux/store';
import {
    getAddresses,
    addAddress,
    deleteAddress,
    setDefaultAddress
} from '@/services/addressApi';
import { Address } from '../../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AddressSelectionProps {
    onProceedToPayment: (address: Address) => void;
    onBack: () => void;
}

const AddressSelection = ({ onProceedToPayment, onBack }: AddressSelectionProps) => {
    const router = useRouter();
    const total = useSelector(selectTotal);
    const { token, isGuest } = useSelector((state: RootState) => state.auth);

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [showAddNew, setShowAddNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingAddresses, setFetchingAddresses] = useState(true);

    // New address form state
    const [newAddress, setNewAddress] = useState<Omit<Address, 'id' | '_id' | 'isDefault'>>({
        name: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: ''
    });
    const [makeDefault, setMakeDefault] = useState(false);

    // Fetch addresses on component mount
    useEffect(() => {
        fetchUserAddresses();
    }, []);

    // Helper function to store guest addresses in AsyncStorage
    const storeGuestAddresses = async (addresses: Address[]) => {
        try {
            await AsyncStorage.setItem('guestAddresses', JSON.stringify(addresses));
        } catch (error) {
            console.error('Error storing guest addresses:', error);
        }
    };

    // Helper function to get guest addresses from AsyncStorage
    const getGuestAddresses = async (): Promise<Address[]> => {
        try {
            const storedAddresses = await AsyncStorage.getItem('guestAddresses');
            return storedAddresses ? JSON.parse(storedAddresses) : [];
        } catch (error) {
            console.error('Error retrieving guest addresses:', error);
            return [];
        }
    };

    const fetchUserAddresses = async () => {
        try {
            setFetchingAddresses(true);

            // For guest users, fetch from AsyncStorage
            if (isGuest) {
                const guestAddresses = await getGuestAddresses();
                setAddresses(guestAddresses);

                // Set selected address to default or first
                const defaultAddress = guestAddresses.find((addr: Address) => addr.isDefault);
                if (defaultAddress) {
                    // Use type assertion with fallback to null
                    const defaultId = defaultAddress.id || defaultAddress._id || null;
                    setSelectedAddressId(defaultId);
                } else if (guestAddresses.length > 0) {
                    // Use type assertion with fallback to null
                    const firstId = guestAddresses[0].id || guestAddresses[0]._id || null;
                    setSelectedAddressId(firstId);
                }

                setFetchingAddresses(false);
                return;
            }

            // For authenticated users, fetch from server
            if (token) {
                const fetchedAddresses = await getAddresses(token);

                // Map backend _id to id for consistency in the frontend
                const formattedAddresses = fetchedAddresses.map((addr: any) => ({
                    ...addr,
                    id: addr._id || addr.id
                }));

                setAddresses(formattedAddresses);

                // Set selected address to default or first
                const defaultAddress = formattedAddresses.find((addr: Address) => addr.isDefault);
                if (defaultAddress) {
                    // Use type assertion with fallback to null
                    const defaultId = defaultAddress.id || defaultAddress._id || null;
                    setSelectedAddressId(defaultId);
                } else if (formattedAddresses.length > 0) {
                    // Use type assertion with fallback to null
                    const firstId = formattedAddresses[0].id || formattedAddresses[0]._id || null;
                    setSelectedAddressId(firstId);
                }
            }
        } catch (error) {
            console.error('Error fetching addresses:', error);
            Alert.alert('Error', 'Failed to load your addresses. Please try again.');
        } finally {
            setFetchingAddresses(false);
        }
    };

    const handleDeleteAddress = async (addressId: string) => {
        Alert.alert(
            'Delete Address',
            'Are you sure you want to delete this address?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);

                            if (isGuest) {
                                // Handle delete for guest users
                                const updatedAddresses = addresses.filter(addr =>
                                    addr.id !== addressId && addr._id !== addressId
                                );

                                setAddresses(updatedAddresses);
                                await storeGuestAddresses(updatedAddresses);

                                // If the deleted address was selected, select another one
                                // If the deleted address was selected, select another one
                                if (selectedAddressId === addressId) {
                                    const defaultAddress = updatedAddresses.find(addr => addr.isDefault);
                                    if (defaultAddress) {
                                        // Use type assertion to tell TypeScript this won't be undefined
                                        const newAddressId = defaultAddress.id || defaultAddress._id || null;
                                        setSelectedAddressId(newAddressId);
                                    } else if (updatedAddresses.length > 0) {
                                        // Use type assertion to tell TypeScript this won't be undefined
                                        const newAddressId = updatedAddresses[0].id || updatedAddresses[0]._id || null;
                                        setSelectedAddressId(newAddressId);
                                    } else {
                                        setSelectedAddressId(null);
                                    }
                                }
                            } else if (token) {
                                // For authenticated users, call API
                                const updatedAddresses = await deleteAddress(token, addressId);

                                // Map backend _id to id for consistency
                                const formattedAddresses = updatedAddresses.map((addr: any) => ({
                                    ...addr,
                                    id: addr._id || addr.id
                                }));

                                setAddresses(formattedAddresses);

                                // Update selected address if needed
                                if (selectedAddressId === addressId) {
                                    const defaultAddress = formattedAddresses.find(addr => addr.isDefault);
                                    if (defaultAddress) {
                                        setSelectedAddressId(defaultAddress.id || defaultAddress._id);
                                    } else if (formattedAddresses.length > 0) {
                                        setSelectedAddressId(formattedAddresses[0].id || formattedAddresses[0]._id);
                                    } else {
                                        setSelectedAddressId(null);
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Error deleting address:', error);
                            Alert.alert('Error', 'Failed to delete address. Please try again.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSetDefaultAddress = async (addressId: string) => {
        try {
            setLoading(true);

            if (isGuest) {
                // For guest users, update local storage
                const updatedAddresses = addresses.map(addr => ({
                    ...addr,
                    isDefault: (addr.id === addressId || addr._id === addressId)
                }));

                setAddresses(updatedAddresses);
                await storeGuestAddresses(updatedAddresses);
                setSelectedAddressId(addressId);
            } else if (token) {
                // For authenticated users, call API
                const updatedAddresses = await setDefaultAddress(token, addressId);

                // Map backend _id to id for consistency
                const formattedAddresses = updatedAddresses.map((addr: any) => ({
                    ...addr,
                    id: addr._id || addr.id
                }));

                setAddresses(formattedAddresses);
                setSelectedAddressId(addressId);
            }
        } catch (error) {
            console.error('Error setting default address:', error);
            Alert.alert('Error', 'Failed to update address. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNewAddress = async () => {
        // Validate form
        if (!newAddress.name || !newAddress.phone || !newAddress.addressLine1 ||
            !newAddress.city || !newAddress.state || !newAddress.zipCode) {
            Alert.alert('Missing Information', 'Please fill all required fields');
            return;
        }

        // Basic phone validation
        if (!/^\d{10}$/.test(newAddress.phone)) {
            Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
            return;
        }

        try {
            setLoading(true);

            if (isGuest) {
                // For guest users, store in AsyncStorage
                const newId = `guest-${Date.now()}`;
                const createdAddress: Address = {
                    ...newAddress,
                    id: newId,
                    isDefault: makeDefault || addresses.length === 0 // First address is default
                };

                // If making default, update other addresses
                let updatedAddresses = [...addresses];
                if (makeDefault || addresses.length === 0) {
                    updatedAddresses = updatedAddresses.map(addr => ({
                        ...addr,
                        isDefault: false
                    }));
                }

                // Add new address and select it
                updatedAddresses = [...updatedAddresses, createdAddress];
                setAddresses(updatedAddresses);
                setSelectedAddressId(newId);

                // Save to AsyncStorage
                await storeGuestAddresses(updatedAddresses);

                resetAddressForm();
                Alert.alert('Success', 'Address added successfully');
                return;
            } else if (token) {
                // For authenticated users, send to API
                const addressData = {
                    addressLine1: newAddress.addressLine1,
                    city: newAddress.city,
                    state: newAddress.state,
                    zipCode: newAddress.zipCode,
                    phone: newAddress.phone,
                    landmark: newAddress.landmark,
                    isDefault: makeDefault
                };

                // Send to API
                const updatedAddresses = await addAddress(token, addressData);

                // Map backend _id to id for consistency
                const formattedAddresses = updatedAddresses.map((addr: any) => ({
                    ...addr,
                    id: addr._id || addr.id
                }));

                setAddresses(formattedAddresses);

                // Find the newly added address (it should be the default one or the last one added)
                const newlyAddedAddress = makeDefault
                    ? formattedAddresses.find(addr => addr.isDefault)
                    : formattedAddresses[formattedAddresses.length - 1];

                if (newlyAddedAddress) {
                    setSelectedAddressId(newlyAddedAddress.id || newlyAddedAddress._id);
                }

                resetAddressForm();
                Alert.alert('Success', 'Address added successfully');
            }
        } catch (error) {
            console.error('Error adding address:', error);
            Alert.alert('Error', 'Failed to add address. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetAddressForm = () => {
        setShowAddNew(false);
        setNewAddress({
            name: '',
            phone: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            state: '',
            zipCode: ''
        });
        setMakeDefault(false);
    };

    const handleContinue = () => {
        if (!selectedAddressId) {
            Alert.alert('Select Address', 'Please select a delivery address to continue');
            return;
        }

        const selectedAddress = addresses.find(addr =>
            addr.id === selectedAddressId || addr._id === selectedAddressId
        );

        if (selectedAddress) {
            setLoading(true);

            // Simulate API call delay
            setTimeout(() => {
                setLoading(false);
                onProceedToPayment(selectedAddress);
            }, 500);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack}>
                    <AntDesign name="arrowleft" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Delivery Address</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Guest user notification banner */}
            {isGuest && (
                <View style={styles.guestBanner}>
                    <MaterialIcons name="info-outline" size={18} color="#FF6B00" />
                    <Text style={styles.guestBannerText}>
                        You're browsing as a guest. Addresses will be saved temporarily.
                    </Text>
                </View>
            )}

            {fetchingAddresses ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF6B00" />
                    <Text style={styles.loadingText}>Loading addresses...</Text>
                </View>
            ) : (
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {!showAddNew ? (
                        // Address selection view
                        <>
                            <Text style={styles.sectionTitle}>Select a delivery address</Text>

                            {addresses.length === 0 ? (
                                <View style={styles.noAddressContainer}>
                                    <MaterialIcons name="location-off" size={50} color="#CCC" />
                                    <Text style={styles.noAddressText}>You don't have any saved addresses</Text>
                                    <Text style={styles.noAddressSubtext}>Add an address to continue</Text>
                                </View>
                            ) : (
                                addresses.map((address, index) => (
                                    <TouchableOpacity
                                        key={address.id || address._id || `address-${index}`}
                                        style={[
                                            styles.addressCard,
                                            (selectedAddressId === address.id || selectedAddressId === address._id) && styles.selectedAddressCard
                                        ]}
                                        onPress={() => setSelectedAddressId(address.id || address._id || null)}
                                    >
                                        <View style={styles.addressHeader}>
                                            <View style={styles.addressNameContainer}>
                                                <Text style={styles.addressName}>{address.name}</Text>
                                                {address.isDefault && (
                                                    <View style={styles.defaultBadge}>
                                                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {(selectedAddressId === address.id || selectedAddressId === address._id) && (
                                                <View style={styles.selectedIndicator}>
                                                    <AntDesign name="check" size={16} color="#FFF" />
                                                </View>
                                            )}
                                        </View>

                                        <Text style={styles.addressPhone}>{address.phone}</Text>
                                        <Text style={styles.addressText}>{address.addressLine1}</Text>
                                        {address.addressLine2 && (
                                            <Text style={styles.addressText}>{address.addressLine2}</Text>
                                        )}
                                        <Text style={styles.addressText}>
                                            {address.city}, {address.state} {address.zipCode}
                                        </Text>

                                        <View style={styles.addressActions}>
                                            {!address.isDefault && (
                                                <TouchableOpacity
                                                    style={styles.addressAction}
                                                    onPress={() => {
                                                        const addressId = address.id || address._id;
                                                        if (addressId) {
                                                            handleSetDefaultAddress(addressId);
                                                        }
                                                    }}
                                                >
                                                    <MaterialIcons name="stars" size={16} color="#FF6B00" />
                                                    <Text style={styles.addressActionText}>Set as Default</Text>
                                                </TouchableOpacity>
                                            )}

                                            <TouchableOpacity
                                                style={styles.addressAction}
                                                onPress={() => {
                                                    const addressId = address.id || address._id;
                                                    if (addressId) {
                                                        handleDeleteAddress(addressId);
                                                    }
                                                }}
                                            >
                                                <MaterialIcons name="delete-outline" size={16} color="#FF6B00" />
                                                <Text style={styles.addressActionText}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}

                            <TouchableOpacity
                                style={styles.addNewButton}
                                onPress={() => setShowAddNew(true)}
                            >
                                <AntDesign name="plus" size={18} color="#FF6B00" />
                                <Text style={styles.addNewButtonText}>Add New Address</Text>
                            </TouchableOpacity>

                            {isGuest && addresses.length > 0 && (
                                <View style={styles.guestNote}>
                                    <MaterialIcons name="info-outline" size={16} color="#666" />
                                    <Text style={styles.guestNoteText}>
                                        Create an account to save your addresses permanently.
                                    </Text>
                                </View>
                            )}
                        </>
                    ) : (
                        // Add new address form
                        <>
                            <Text style={styles.sectionTitle}>Add New Address</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Address Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Home, Office, etc."
                                    value={newAddress.name}
                                    onChangeText={text => setNewAddress({ ...newAddress, name: text })}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Phone Number</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="10-digit phone number"
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    value={newAddress.phone}
                                    onChangeText={text => setNewAddress({ ...newAddress, phone: text })}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Address Line 1</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Street address, house number"
                                    value={newAddress.addressLine1}
                                    onChangeText={text => setNewAddress({ ...newAddress, addressLine1: text })}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Address Line 2 (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Apartment, floor, landmark"
                                    value={newAddress.addressLine2}
                                    onChangeText={text => setNewAddress({ ...newAddress, addressLine2: text })}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, styles.halfInput]}>
                                    <Text style={styles.inputLabel}>City</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="City"
                                        value={newAddress.city}
                                        onChangeText={text => setNewAddress({ ...newAddress, city: text })}
                                    />
                                </View>

                                <View style={[styles.inputGroup, styles.halfInput]}>
                                    <Text style={styles.inputLabel}>State</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="State"
                                        value={newAddress.state}
                                        onChangeText={text => setNewAddress({ ...newAddress, state: text })}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>PIN Code</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="6-digit PIN code"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={newAddress.zipCode}
                                    onChangeText={text => setNewAddress({ ...newAddress, zipCode: text })}
                                />
                            </View>

                            <View style={styles.switchContainer}>
                                <Text style={styles.switchText}>Make this my default address</Text>
                                <Switch
                                    value={makeDefault}
                                    onValueChange={setMakeDefault}
                                    trackColor={{ false: "#E5E5E5", true: "#FFE0CC" }}
                                    thumbColor={makeDefault ? "#FF6B00" : "#FFF"}
                                />
                            </View>

                            <View style={styles.formButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setShowAddNew(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={handleAddNewAddress}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Save Address</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {isGuest && (
                                <View style={styles.guestFormNote}>
                                    <MaterialIcons name="info-outline" size={16} color="#666" />
                                    <Text style={styles.guestNoteText}>
                                        As a guest user, this address will only be stored for this session.
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            )}

            {/* Continue Button (only shown when selecting address and not adding new) */}
            {!showAddNew && !fetchingAddresses && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.continueButton,
                            (!selectedAddressId || addresses.length === 0) && styles.disabledButton
                        ]}
                        onPress={handleContinue}
                        disabled={loading || !selectedAddressId || addresses.length === 0}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Text style={styles.continueButtonText}>
                                Continue to Payment - ₹{total.toFixed(2)}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        flex: 1,
        textAlign: 'center',
    },
    guestBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF0E6',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE0CC',
    },
    guestBannerText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 13,
        color: '#FF6B00',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 15,
    },
    addressCard: {
        backgroundColor: '#FFF',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    selectedAddressCard: {
        borderColor: '#FF6B00',
        backgroundColor: '#FFF',
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    addressNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addressName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginRight: 8,
    },
    defaultBadge: {
        backgroundColor: '#E0F2F1',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    defaultBadgeText: {
        fontSize: 10,
        color: '#00897B',
        fontWeight: '600',
    },
    selectedIndicator: {
        backgroundColor: '#FF6B00',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addressPhone: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    addressText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    addNewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderWidth: 1,
        borderColor: '#FF6B00',
        borderRadius: 10,
        borderStyle: 'dashed',
        marginBottom: 20,
    },
    addNewButtonText: {
        color: '#FF6B00',
        fontWeight: '600',
        marginLeft: 8,
    },
    guestNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    guestNoteText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 13,
        color: '#666',
    },
    guestFormNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    switchText: {
        fontSize: 14,
        color: '#555',
    },
    formButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 20,
    },
    cancelButton: {
        backgroundColor: '#F5F5F5',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    footer: {
        backgroundColor: '#FFF',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    continueButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    continueButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    noAddressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        backgroundColor: '#FFF',
        borderRadius: 10,
        marginBottom: 20,
    },
    noAddressText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginTop: 15,
        marginBottom: 5,
    },
    noAddressSubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    addressActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 10,
    },
    addressAction: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 15,
    },
    addressActionText: {
        fontSize: 12,
        color: '#FF6B00',
        marginLeft: 4,
    },
    disabledButton: {
        backgroundColor: '#CCCCCC',
    },
});

export default AddressSelection;