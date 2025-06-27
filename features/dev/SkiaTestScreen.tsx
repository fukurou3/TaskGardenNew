import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSystemOverlay } from '@/hooks/useSystemOverlay';

export default function SkiaTestScreen() {
  const [opacity, setOpacity] = useState(0.75);
  
  const systemOverlay = useSystemOverlay({
    defaultOpacity: opacity,
    autoHide: true,
    checkPermissionOnMount: true,
  });

  const handleShowOverlay = async () => {
    try {
      const success = await systemOverlay.showOverlay(opacity);
      Alert.alert('System Overlay', success ? 'Overlay shown successfully' : 'Failed to show overlay');
    } catch (error) {
      Alert.alert('Error', `Failed to show overlay: ${error}`);
    }
  };

  const handleHideOverlay = async () => {
    try {
      const success = await systemOverlay.hideOverlay();
      Alert.alert('System Overlay', success ? 'Overlay hidden successfully' : 'Failed to hide overlay');
    } catch (error) {
      Alert.alert('Error', `Failed to hide overlay: ${error}`);
    }
  };

  const handleToggleOverlay = async () => {
    try {
      const success = await systemOverlay.toggleOverlay(opacity);
      Alert.alert('System Overlay', success ? 'Overlay toggled successfully' : 'Failed to toggle overlay');
    } catch (error) {
      Alert.alert('Error', `Failed to toggle overlay: ${error}`);
    }
  };

  const handleCheckPermission = async () => {
    try {
      const hasPermission = await systemOverlay.checkPermission();
      Alert.alert('Permission Status', hasPermission ? 'Permission granted' : 'Permission not granted');
    } catch (error) {
      Alert.alert('Error', `Failed to check permission: ${error}`);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const granted = await systemOverlay.requestPermission();
      Alert.alert('Permission Request', granted ? 'Permission granted' : 'Please grant permission manually in settings');
    } catch (error) {
      Alert.alert('Error', `Failed to request permission: ${error}`);
    }
  };

  const handleUpdateOpacity = async (newOpacity: number) => {
    try {
      setOpacity(newOpacity);
      const success = await systemOverlay.updateOpacity(newOpacity);
      Alert.alert('Update Opacity', success ? `Opacity updated to ${newOpacity}` : 'Failed to update opacity');
    } catch (error) {
      Alert.alert('Error', `Failed to update opacity: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>System Overlay Test</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Status: {systemOverlay.isVisible ? 'Visible' : 'Hidden'}
          </Text>
          <Text style={styles.statusText}>
            Permission: {systemOverlay.hasPermission === null ? 'Unknown' : systemOverlay.hasPermission ? 'Granted' : 'Denied'}
          </Text>
          <Text style={styles.statusText}>
            Loading: {systemOverlay.isLoading ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.statusText}>
            Opacity: {systemOverlay.opacity.toFixed(2)}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleShowOverlay}>
            <Text style={styles.buttonText}>Show Overlay</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleHideOverlay}>
            <Text style={styles.buttonText}>Hide Overlay</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleToggleOverlay}>
            <Text style={styles.buttonText}>Toggle Overlay</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleCheckPermission}>
            <Text style={styles.buttonText}>Check Permission</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleRequestPermission}>
            <Text style={styles.buttonText}>Request Permission</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Opacity Controls</Text>
        <View style={styles.opacityContainer}>
          {[0.25, 0.5, 0.75, 0.9].map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.opacityButton,
                opacity === value && styles.selectedOpacityButton
              ]}
              onPress={() => handleUpdateOpacity(value)}
            >
              <Text style={[
                styles.opacityButtonText,
                opacity === value && styles.selectedOpacityButtonText
              ]}>
                {(value * 100).toFixed(0)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            This screen tests the native system overlay module.
            The overlay should cover the entire screen including navigation areas.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  opacityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  opacityButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedOpacityButton: {
    backgroundColor: '#007AFF',
  },
  opacityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedOpacityButtonText: {
    color: '#fff',
  },
  infoContainer: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});