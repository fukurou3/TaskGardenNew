import { Audio } from 'expo-av';
import { getItem, setItem } from '@/lib/Storage';

const TIMER_SOUND_KEY = '@timer_sound_selection';

export interface SoundOption {
  id: string;
  name: string;
  source: any;
  isSystemSound?: boolean;
}

export const BUILT_IN_SOUNDS: SoundOption[] = [
  {
    id: 'default',
    name: 'デフォルト',
    source: require('@/assets/sounds/bell.mp3'),
  },
  {
    id: 'chime',
    name: 'チャイム',
    source: require('@/assets/sounds/chime.mp3'),
  },
  {
    id: 'ding',
    name: 'ディン',
    source: require('@/assets/sounds/ding.mp3'),
  },
];

class TimerSoundManager {
  private static instance: TimerSoundManager;
  private currentSound: Audio.Sound | null = null;
  private isAudioInitialized: boolean = false;

  private constructor() {}

  static getInstance(): TimerSoundManager {
    if (!TimerSoundManager.instance) {
      TimerSoundManager.instance = new TimerSoundManager();
    }
    return TimerSoundManager.instance;
  }

  async getSavedSoundId(): Promise<string> {
    try {
      const saved = await getItem(TIMER_SOUND_KEY);
      return saved || 'default';
    } catch (error) {
      console.error('Failed to get saved sound:', error);
      return 'default';
    }
  }

  async saveSoundId(soundId: string): Promise<void> {
    try {
      await setItem(TIMER_SOUND_KEY, soundId);
    } catch (error) {
      console.error('Failed to save sound ID:', error);
      throw error;
    }
  }

  async getSoundById(soundId: string): Promise<SoundOption | null> {
    return BUILT_IN_SOUNDS.find(sound => sound.id === soundId) || null;
  }

  async playTimerSound(): Promise<void> {
    try {
      await this.cleanupCurrentSound();

      const soundId = await this.getSavedSoundId();
      const soundOption = await this.getSoundById(soundId);
      
      if (!soundOption) {
        console.warn('Sound not found, using default');
        const defaultSound = BUILT_IN_SOUNDS[0];
        if (defaultSound) {
          await this.playSound(defaultSound);
        }
        return;
      }

      await this.playSound(soundOption);
    } catch (error) {
      console.error('Failed to play timer sound:', error);
    }
  }

  async playSound(soundOption: SoundOption): Promise<void> {
    try {
      await this.cleanupCurrentSound();

      const { sound } = await Audio.Sound.createAsync(soundOption.source);
      this.currentSound = sound;
      
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.cleanupCurrentSound();
        }
      });
    } catch (error) {
      console.error('Failed to play sound:', error);
      throw error;
    }
  }

  async cleanupCurrentSound(): Promise<void> {
    if (this.currentSound) {
      try {
        await this.currentSound.unloadAsync();
      } catch (error) {
        console.error('Failed to cleanup sound:', error);
      } finally {
        this.currentSound = null;
      }
    }
  }

  async initializeAudio(): Promise<void> {
    if (this.isAudioInitialized) {
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.InterruptionModeIOS.MixWithOthers,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.InterruptionModeAndroid.DuckOthers,
        playThroughEarpieceAndroid: false,
      });
      this.isAudioInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error;
    }
  }
}

export default TimerSoundManager;