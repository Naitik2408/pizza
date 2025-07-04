import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { ChevronLeft, Tag } from 'lucide-react-native';
import { router } from 'expo-router';

// Sample mock data for UI development
const MOCK_OFFERS = [
  {
    _id: '1',
    title: 'Pizza Friday Deal',
    description: 'Get 25% off on all large pizzas every Friday. Order now and enjoy our delicious selection!',
    discountPercentage: 25,
    validUntil: '2025-05-30T00:00:00.000Z',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    itemId: 'pizza1'
  },
  {
    _id: '2',
    title: 'Buy 1 Get 1 Free',
    description: 'Order any medium pizza and get a second one free. Perfect for sharing with friends and family.',
    discountPercentage: 50,
    validUntil: '2025-05-20T00:00:00.000Z',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    itemId: 'pizza2'
  },
  {
    _id: '3',
    title: 'Free Drink with Combo',
    description: 'Get a free soft drink when you order any pizza combo. Choose from our refreshing selection.',
    discountPercentage: 15,
    validUntil: '2025-05-25T00:00:00.000Z',
    image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  }
];

type Offer = {
  _id: string;
  title: string;
  description: string;
  discountPercentage: number;
  validUntil: string;
  image: string;
  itemId?: string;
};

export default function TodaysOffers() {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleOfferPress = (offer: Offer) => {
    // Simple UI response for now
    alert(`You selected: ${offer.title}`);
  };

  const renderOffer = ({ item }: { item: Offer }) => (
    <TouchableOpacity 
      style={styles.offerCard}
      onPress={() => handleOfferPress(item)}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.offerImage} />
      ) : (
        <View style={styles.placeholderImage}>
          <Tag size={40} color="#FF6B00" />
        </View>
      )}
      
      <View style={styles.offerContent}>
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{item.discountPercentage}% OFF</Text>
        </View>
        
        <Text style={styles.offerTitle}>{item.title}</Text>
        <Text style={styles.offerDescription}>{item.description}</Text>
        <Text style={styles.validUntil}>Valid until: {formatDate(item.validUntil)}</Text>
        
        <TouchableOpacity style={styles.claimButton}>
          <Text style={styles.claimButtonText}>Claim Offer</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Today's Offers</Text>
      </View>

      <FlatList
        data={MOCK_OFFERS}
        renderItem={renderOffer}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.offersList}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
  },
  offersList: {
    padding: 15,
  },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  offerImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerContent: {
    padding: 16,
  },
  discountBadge: {
    position: 'absolute',
    top: -15,
    right: 15,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  discountText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  offerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 8,
  },
  offerDescription: {
    fontSize: 15,
    color: '#555',
    marginBottom: 12,
    lineHeight: 22,
  },
  validUntil: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  claimButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  claimButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});