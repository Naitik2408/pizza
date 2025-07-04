import React from 'react';
import {
  View,
  Text,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface LoadingModalProps {
  visible: boolean;
  message?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({
  visible,
  message = 'Loading...'
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 150,
  },
  message: {
    marginTop: 15,
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },
});

export default LoadingModal;
