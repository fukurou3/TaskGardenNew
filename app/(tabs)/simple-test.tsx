// Simple test for gesture handling - Step 5: Add TaskItem component
import React, { useState, useCallback, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Add TaskDatabase and TaskItem imports
import TasksDatabase from '@/lib/TaskDatabase';
import { TaskItem } from '@/features/tasks/components/TaskItem';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { FontSizeContext } from '@/context/FontSizeContext';
import type { DisplayableTaskItem, Task } from '@/features/tasks/types';
import { calculateNextDisplayInstanceDate, calculateActualDueDate } from '@/features/tasks/utils';
import dayjs from 'dayjs';

export default function SimpleTestScreen() {
  const router = useRouter();
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const { fontSizeKey } = useContext(FontSizeContext);
  
  const [pressCount, setPressCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [sampleTask, setSampleTask] = useState<DisplayableTaskItem | null>(null);
  
  // Add SharedValue
  const isPressed = useSharedValue(false);
  const scale = useSharedValue(1);

  // Initialize database and load tasks
  useEffect(() => {
    const initializeAndLoadTasks = async () => {
      try {
        await TasksDatabase.initialize();
        const taskRows = await TasksDatabase.getAllTasks();
        setTaskCount(taskRows ? taskRows.length : 0);
        console.log('📊 Database initialized, task count:', taskRows ? taskRows.length : 0);
        
        // Create a sample task for testing
        if (taskRows && taskRows.length > 0) {
          const parsedTasks: Task[] = taskRows.map(t => JSON.parse(t));
          const firstTask = parsedTasks[0];
          
          const displaySortDate = calculateNextDisplayInstanceDate(firstTask) || calculateActualDueDate(firstTask);
          
          const sampleDisplayableTask: DisplayableTaskItem = {
            ...firstTask,
            keyId: firstTask.id,
            displayOrder: 0,
            isCompletedInstance: !!firstTask.completedAt,
            isTaskFullyCompleted: !!firstTask.completedAt,
            displaySortDate,
            instanceDate: firstTask.completedAt ? dayjs(firstTask.completedAt).format('YYYY-MM-DD') : undefined,
          };
          
          setSampleTask(sampleDisplayableTask);
          console.log('📋 Sample task created:', sampleDisplayableTask.title);
        }
      } catch (error) {
        console.error('❌ Database error:', error);
      }
    };
    
    initializeAndLoadTasks();
  }, []);

  const handleLongPress = useCallback(async () => {
    try {
      console.log('🔥 Long press handled - testing database operations');
      setPressCount(prev => prev + 1);
      
      // Test database operation that might cause crash
      const tasks = await TasksDatabase.getAllTasks();
      console.log('📊 Current tasks count:', tasks ? tasks.length : 0);
      setTaskCount(tasks ? tasks.length : 0);
    } catch (error) {
      console.error('❌ Error in handleLongPress:', error);
    }
  }, []);

  const simpleGesture = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      'worklet';
      console.log('Long press detected - with SharedValue test');
      isPressed.value = true;
      scale.value = withSpring(1.1);
      runOnJS(handleLongPress)();
    })
    .onEnd(() => {
      'worklet';
      console.log('Long press ended - with SharedValue test');
      isPressed.value = false;
      scale.value = withSpring(1);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Simple Gesture Test</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>
          Long press the TaskItem below to test gesture handling with real component
        </Text>
        
        <Text style={styles.counter}>Press count: {pressCount}</Text>
        <Text style={styles.counter}>Task count: {taskCount}</Text>
        
        {sampleTask ? (
          <GestureDetector gesture={simpleGesture}>
            <Animated.View style={[styles.taskContainer, animatedStyle]}>
              <TaskItem
                task={sampleTask}
                onToggle={() => console.log('Task toggle clicked')}
                isSelecting={false}
                selectedIds={[]}
                onLongPressSelect={() => console.log('Task long press select')}
                currentTab="incomplete"
                isDraggable={false}
              />
            </Animated.View>
          </GestureDetector>
        ) : (
          <Text style={styles.counter}>Loading task...</Text>
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instruction: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  counter: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#007AFF',
  },
  testBox: {
    width: 200,
    height: 100,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskContainer: {
    width: '90%',
    maxWidth: 400,
  },
  testText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});