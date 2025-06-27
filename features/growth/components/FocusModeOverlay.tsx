import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useSystemOverlay } from '@/hooks/useSystemOverlay';
import { useOverlay } from '@/context/OverlayContext';
import ImmersiveModal from '@/components/ImmersiveModal';
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
  onRestart: () => void;
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
  onRestart,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const size = width * 0.85;
  const strokeWidth = 8;
  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const progress = focusDurationSec > 0 ? Math.max(0, Math.min(1, timeRemaining / focusDurationSec)) : 0;

  // LayeredModalが自動でオーバーレイ管理するため削除

  return (
    <View style={styles.contentContainer}>
        <TouchableOpacity 
          onPress={onToggleMute} 
          style={[styles.audioButton, { top: 60 + insets.top }]}
        >
          <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color="#fff" />
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
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - progress)}
                rotation={90}
                scaleX={-1}
                originX={size / 2}
                originY={size / 2}
                strokeLinecap="round"
              />
            </Svg>
            <View style={[styles.timerTextContainer, { width: size, height: size }]}>
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
              <View style={styles.statusTextContainer}>
                {focusModeStatus === 'paused' && (
                  <Text style={styles.statusText}>
                    {t('focus_mode.paused')}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <View style={styles.controls}>
            {focusModeStatus === 'running' ? (
              <TouchableOpacity 
                onPress={onPause} 
                style={styles.controlButton}
                activeOpacity={0.7}
              >
                <Ionicons name="pause" size={32} color="rgba(255, 255, 255, 0.9)" />
              </TouchableOpacity>
            ) : focusModeStatus === 'paused' ? (
              <TouchableOpacity 
                onPress={onResume} 
                style={styles.controlButton}
                activeOpacity={0.7}
              >
                <Ionicons name="play" size={32} color="rgba(255, 255, 255, 0.9)" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                onPress={onStart} 
                style={styles.controlButton}
                activeOpacity={0.7}
              >
                <Ionicons name="play" size={32} color="rgba(255, 255, 255, 0.9)" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={onRestart} 
              style={styles.controlButton}
              activeOpacity={0.7}
            >
              <Ionicons name="reload" size={32} color="rgba(255, 255, 255, 0.9)" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: 'transparent', // 背景は透明 - LayeredModalが背景を提供
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
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
    zIndex: 10,
    elevation: 10, // Android用
    pointerEvents: 'none',
  },
  timerText: {
    fontSize: 72,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 1.0)',
    letterSpacing: 3,
    textAlign: 'center',
    fontFamily: 'Menlo',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statusTextContainer: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    fontFamily: 'Avenir Next',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    zIndex: 20,
    elevation: 20,
  },
  controlButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    minHeight: 70,
  },
  audioButton: {
    position: 'absolute',
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