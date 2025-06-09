import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  width: number;
  subColor: string;
  isDark: boolean;
  isMuted: boolean;
  focusModeStatus: 'idle' | 'running' | 'paused';
  timeRemaining: number;
  focusDurationSec: number;
  formatTime: (sec: number) => string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onToggleMute: () => void;
}

export default function FocusModeOverlay({
  visible,
  width,
  subColor,
  isDark,
  isMuted,
  focusModeStatus,
  timeRemaining,
  focusDurationSec,
  formatTime,
  onStart,
  onPause,
  onResume,
  onStop,
  onToggleMute,
}: Props) {
  if (!visible) return null;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const size = width * 0.85; // サイズを大幅に拡大
  const strokeWidth = 8;
  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const progress = timeRemaining / focusDurationSec;
  return (
    <View
      style={[
        styles.overlay,
        {
          top: -insets.top,
          bottom: -insets.bottom,
          left: -insets.left,
          right: -insets.right,
        },
      ]}
    >
      <TouchableOpacity onPress={onToggleMute} style={styles.audioButton}>
        <Ionicons name={isMuted ? 'volume-mute' : 'musical-notes'} size={24} color="#fff" />
      </TouchableOpacity>
      <View style={styles.timerContainer}>
        <View style={styles.circularTimerContainer}>
          <Svg width={size} height={size} style={styles.progressCircle}>
            {/* 背景の円 */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* プログレス円 */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255, 255, 255, 0.85)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference * progress} ${circumference}`}
              rotation={-90}
              originX={size / 2}
              originY={size / 2}
              strokeLinecap="round"
            />
          </Svg>
        </View>
        <View style={styles.timerTextContainer}>
          <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
          <Text style={styles.statusText}>
            {focusModeStatus === 'running' ? t('focus_mode.focusing') : 
             focusModeStatus === 'paused' ? t('focus_mode.paused') : t('focus_mode.ready')}
          </Text>
        </View>
        <View style={styles.controls}>
          {focusModeStatus === 'running' ? (
            <TouchableOpacity onPress={onPause} style={[styles.controlButton, styles.primaryButton]}>
              <Ionicons name="pause" size={32} color="rgba(255, 255, 255, 0.9)" />
            </TouchableOpacity>
          ) : focusModeStatus === 'paused' ? (
            <TouchableOpacity onPress={onResume} style={[styles.controlButton, styles.primaryButton]}>
              <Ionicons name="play" size={32} color="rgba(255, 255, 255, 0.9)" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onStart} style={[styles.controlButton, styles.primaryButton]}>
              <Ionicons name="play" size={32} color="rgba(255, 255, 255, 0.9)" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onStop} style={[styles.controlButton, styles.secondaryButton]}>
            <Ionicons name="stop" size={28} color="rgba(255, 255, 255, 0.7)" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  timerContainer: {
    alignItems: 'center',
    padding: 40,
  },
  circularTimerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressCircle: {
    // SVGの位置
  },
  timerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 40,
    zIndex: 10,
    elevation: 10, // Android用
  },
  timerText: {
    fontSize: 48,
    fontWeight: '100',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'System',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '200',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  controlButton: {
    padding: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    minHeight: 70,
  },
  primaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  audioButton: {
    position: 'absolute',
    top: 60,
    right: 30,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
});
