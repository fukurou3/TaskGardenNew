// FlatList + GestureDetector test to reproduce crash
import React, { useState, useCallback, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, useAnimatedReaction } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Test data
const testData = [
  { id: '1', title: 'Test Task 1', keyId: '1' },
  { id: '2', title: 'Test Task 2', keyId: '2' },
  { id: '3', title: 'Test Task 3', keyId: '3' },
  { id: '4', title: 'Test Task 4', keyId: '4' },
  { id: '5', title: 'Test Task 5', keyId: '5' },
];

// Gesture item component similar to SafeGestureTaskItem
const GestureListItem = ({ 
  item, 
  index,
  scrollEnabled,
  onLongPressStart
}: {
  item: any;
  index: number;
  scrollEnabled: Animated.SharedValue<boolean>;
  onLongPressStart: (itemId: string) => void;
}) => {
  const itemId = item.keyId;
  const scale = useSharedValue(1);

  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      'worklet';
      try {
        console.log('🔥 FlatList item long press detected:', itemId);
        scale.value = withSpring(1.1);
        scrollEnabled.value = false;
        runOnJS(onLongPressStart)(itemId);
      } catch (error) {
        runOnJS(console.error)('Error in FlatList long press:', error);
      }
    })
    .onEnd(() => {
      'worklet';
      try {
        console.log('🔥 FlatList item long press ended:', itemId);
        scale.value = withSpring(1);
        scrollEnabled.value = true;
      } catch (error) {
        runOnJS(console.error)('Error in FlatList long press end:', error);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View style={[styles.listItem, animatedStyle]}>
        <Text style={styles.itemText}>{item.title}</Text>
        <Text style={styles.itemSubtext}>Index: {index} | ID: {itemId}</Text>
      </Animated.View>
    </GestureDetector>
  );
};

export default function FlatListTestScreen() {
  const router = useRouter();
  const [pressCount, setPressCount] = useState(0);
  
  // SharedValues like in original draggable-test
  const scrollEnabled = useSharedValue(true);
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);

  // Sync SharedValue with React state like in original
  useAnimatedReaction(
    () => scrollEnabled.value,
    (current) => {
      runOnJS(setIsScrollEnabled)(current);
    }
  );

  const handleLongPressStart = useCallback((itemId: string) => {
    try {
      console.log('🎯 FlatList long press start:', itemId);
      setPressCount(prev => prev + 1);
    } catch (error) {
      console.error('❌ Error in handleLongPressStart:', error);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FlatList + Gesture Test</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>
          Long press any item in the FlatList below
        </Text>
        
        <Text style={styles.counter}>Press count: {pressCount}</Text>
        <Text style={styles.counter}>Scroll enabled: {isScrollEnabled ? 'Yes' : 'No'}</Text>
        
        <Animated.FlatList
          data={testData}
          renderItem={({ item, index }) => (
            <GestureListItem
              item={item}
              index={index}
              scrollEnabled={scrollEnabled}
              onLongPressStart={handleLongPressStart}
            />
          )}
          keyExtractor={(item) => item.keyId}
          scrollEnabled={isScrollEnabled}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          showsVerticalScrollIndicator={true}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  instruction: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  counter: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#007AFF',
  },
  listItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  itemSubtext: {
    fontSize: 14,
    color: '#666666',
  },
});