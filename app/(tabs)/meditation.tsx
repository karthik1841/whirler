import { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Platform, 
  Dimensions, 
  useWindowDimensions,
  Animated,
  ImageBackground,
  Easing,
  SafeAreaView
} from 'react-native';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Clock, Star, ChevronRight, Circle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import LottieView from 'lottie-react-native';
import { BlurView } from 'expo-blur';

const meditations = [
  {
    id: 1,
    title: 'Mindful Breathing',
    duration: 600, // 10 minutes in seconds
    description: 'Focus on your breath to find inner peace',
    animation: 'https://lottie.host/a5137d3b-3529-488d-bd7c-e13eafb0d381/ymRGVtyVJk.lottie',
    audio: require('@/assets/music/meditation-music-322801.mp3'),
    category: 'Beginner',
    benefits: ['Reduces stress', 'Improves focus', 'Calms the mind'],
    color: '#7C83FD'
  },
  {
    id: 2,
    title: 'Body Scan',
    duration: 900, // 15 minutes in seconds
    description: 'Release tension throughout your body',
    animation: 'https://lottie.host/91e51a85-fba0-46ef-ad34-41f2fe7b69d1/NlLBrg5c39.lottie',
    audio: require('@/assets/music/breath-of-life_15-minutes-320860.mp3'),
    category: 'Intermediate',
    benefits: ['Reduces physical tension', 'Improves body awareness', 'Promotes relaxation'],
    color: '#96BAFF'
  },
  {
    id: 3,
    title: 'Loving Kindness',
    duration: 1200, // 20 minutes in seconds
    description: 'Cultivate compassion for yourself and others',
    animation: 'https://lottie.host/4ac7bf4f-f059-4723-b713-d682abd0d581/NFD5ZqPAUX.lottie',
    audio: require('@/assets/music/relaxing-krishna-flute-music-deep-sleep-relaxing-music-292793.mp3'),
    category: 'Advanced',
    benefits: ['Increases empathy', 'Reduces negative emotions', 'Builds positive relationships'],
    color: '#B8E0D2'
  },
  {
    id: 4,
    title: 'Evening Relaxation',
    duration: 1500, // 25 minutes in seconds
    description: 'Unwind and prepare for restful sleep',
    animation: 'https://lottie.host/e9db1f44-932f-49f7-91ba-31c58459983f/eW5FTonKC9.lottie',
    audio: require('@/assets/music/Flute.mp3'),
    category: 'All Levels',
    benefits: ['Improves sleep quality', 'Reduces insomnia', 'Calms the nervous system'],
    color: '#D6EAFF'
  },
];

export default function Meditate() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isSmallScreen = width < 360;
  const isTablet = width > 768;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMeditation, setCurrentMeditation] = useState(meditations[0]);
  const [progress, setProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(currentMeditation.duration);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showBenefits, setShowBenefits] = useState(false);
  const [showBreathingCircle, setShowBreathingCircle] = useState(false);
  const animationRef = useRef<LottieView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Breathing animation values
  const breathingAnim = useRef(new Animated.Value(0)).current;
  const breathingTextAnim = useRef(new Animated.Value(0)).current;
  const breathingTextOpacity = useRef(new Animated.Value(0)).current;
  const breathingTextScale = useRef(new Animated.Value(0.8)).current;
  const breathingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const breathingPhaseRef = useRef<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');
  const breathingTextRef = useRef('Inhale');

  // Add background animation values
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    // Animate the background gradient
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();
    
    // Initialize audio when component mounts
    initializeAudio();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    return () => {
      cleanupAudio();
    };
  }, []);

  // Separate effect to handle meditation changes
  useEffect(() => {
    if (currentMeditation) {
      initializeAudio();
    }
  }, [currentMeditation]);

  const initializeAudio = async () => {
    // Prevent multiple simultaneous initialization attempts
    if (isInitializing) {
      console.log('Audio initialization already in progress');
      return;
    }
    
    try {
      console.log('Starting audio initialization...');
      setIsInitializing(true);
      setAudioError(null);
      setIsAudioReady(false);
      
      // First, unload any existing sound
      if (soundRef.current) {
        console.log('Unloading existing sound');
        try {
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.log('Error unloading existing sound (can be ignored):', e);
        }
        soundRef.current = null;
      }
      
      // Set audio mode
      console.log('Setting audio mode');
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('Creating sound from:', currentMeditation.audio);
      
      // Create the sound with a timeout to prevent hanging
      const soundPromise = Audio.Sound.createAsync(
        currentMeditation.audio,
        { 
          isLooping: true, 
          isMuted: isMuted,
          volume: 1.0,
          rate: 1.0,
          shouldPlay: false
        }
      );
      
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Audio creation timed out')), 5000);
      });
      
      const result = await Promise.race([soundPromise, timeoutPromise]) as { sound: Audio.Sound };
      const { sound } = result;
      
      console.log('Sound created successfully');
      
      // Store the sound reference
      soundRef.current = sound;
      setIsAudioReady(true);
      
      // If we were playing before, start playing the new sound
      if (isPlaying) {
        console.log('Resuming playback after initialization');
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
      setAudioError(error instanceof Error ? error.message : 'Unknown error');
      setIsAudioReady(false);
      
      // Try to recover by resetting the audio state
      soundRef.current = null;
    } finally {
      setIsInitializing(false);
    }
  };

  const cleanupAudio = async () => {
    try {
    if (soundRef.current) {
        console.log('Completely cleaning up audio');
        try {
          // First stop any playback
          await soundRef.current.stopAsync();
          // Then unload the audio
      await soundRef.current.unloadAsync();
        } catch (e) {
          console.log('Error cleaning up audio (can be ignored):', e);
        }
        soundRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (error) {
      console.error('Error in cleanupAudio:', error);
    }
  };

  // Breathing animation effect
  useEffect(() => {
    if (showBreathingCircle && isPlaying) {
      startBreathingAnimation();
    } else {
      stopBreathingAnimation();
    }
    
    return () => {
      stopBreathingAnimation();
    };
  }, [showBreathingCircle, isPlaying]);

  const startBreathingAnimation = () => {
    // Reset animation values
    breathingAnim.setValue(0);
    breathingTextAnim.setValue(0);
    breathingTextOpacity.setValue(0);
    breathingTextScale.setValue(0.8);
    
    // Start the breathing cycle
    runBreathingCycle();
  };

  const stopBreathingAnimation = () => {
    if (breathingTimerRef.current) {
      clearTimeout(breathingTimerRef.current);
      breathingTimerRef.current = null;
    }
  };

  const runBreathingCycle = () => {
    // Inhale phase (4 seconds)
    breathingPhaseRef.current = 'inhale';
    breathingTextRef.current = 'Inhale';
    updateBreathingText();
    
    Animated.parallel([
      Animated.timing(breathingAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(breathingTextOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(breathingTextScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Hold phase (4 seconds)
      breathingPhaseRef.current = 'hold';
      breathingTextRef.current = 'Hold';
      updateBreathingText();
      
      Animated.parallel([
        Animated.timing(breathingTextOpacity, {
          toValue: 0.7,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(breathingTextScale, {
          toValue: 0.9,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        breathingTimerRef.current = setTimeout(() => {
          // Exhale phase (6 seconds)
          breathingPhaseRef.current = 'exhale';
          breathingTextRef.current = 'Exhale';
          updateBreathingText();
          
          Animated.parallel([
            Animated.timing(breathingAnim, {
              toValue: 0,
              duration: 6000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(breathingTextOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(breathingTextScale, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
            ]),
          ]).start(() => {
            // Pause phase (2 seconds)
            breathingPhaseRef.current = 'pause';
            breathingTextRef.current = 'Pause';
            updateBreathingText();
            
            Animated.parallel([
              Animated.timing(breathingTextOpacity, {
                toValue: 0.7,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(breathingTextScale, {
                toValue: 0.9,
                duration: 500,
                useNativeDriver: true,
              }),
            ]).start(() => {
              breathingTimerRef.current = setTimeout(() => {
                // Continue the cycle if still playing
                if (isPlaying && showBreathingCircle) {
                  runBreathingCycle();
                }
              }, 2000);
            });
          });
        }, 4000);
      });
    });
  };

  const updateBreathingText = () => {
    breathingTextAnim.setValue(0);
    Animated.timing(breathingTextAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    try {
      console.log('Play/Pause pressed, isAudioReady:', isAudioReady, 'soundRef:', !!soundRef.current);
      
      // If audio is not ready, try to initialize it
      if (!isAudioReady || !soundRef.current) {
        console.log('Audio not ready, attempting to initialize...');
        await initializeAudio();
        
        // If still not ready after initialization, show error
        if (!isAudioReady || !soundRef.current) {
          setAudioError('Failed to initialize audio player');
          return;
        }
      }
      
      if (!isPlaying) {
        console.log('Starting playback');
        try {
          await soundRef.current.playAsync();
        animationRef.current?.play();
          
          // Start the timer
        timerRef.current = setInterval(() => {
          setRemainingTime((prev) => {
            if (prev <= 0) {
              handleMeditationComplete();
              return 0;
            }
            return prev - 1;
          });
          setProgress((prev) => {
            const newProgress = prev + (100 / currentMeditation.duration);
            return Math.min(newProgress, 100);
          });
        }, 1000);
        } catch (playError) {
          console.error('Error playing audio:', playError);
          setAudioError('Failed to play audio: ' + (playError instanceof Error ? playError.message : 'Unknown error'));
          return;
        }
      } else {
        console.log('Pausing playback');
        try {
          await soundRef.current.pauseAsync();
        animationRef.current?.pause();
          
        if (timerRef.current) {
          clearInterval(timerRef.current);
            timerRef.current = null;
        }
        } catch (pauseError) {
          console.error('Error pausing audio:', pauseError);
          setAudioError('Failed to pause audio: ' + (pauseError instanceof Error ? pauseError.message : 'Unknown error'));
          return;
      }
      }
      
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error in handlePlayPause:', error);
      setAudioError(error instanceof Error ? error.message : 'Unknown error');
      
      // Try to recover by reinitializing audio
      setIsAudioReady(false);
      await initializeAudio();
    }
  };

  const handleMeditationComplete = async () => {
    try {
      console.log('Meditation complete');
    setIsPlaying(false);
      
      if (soundRef.current) {
        await soundRef.current.stopAsync();
      }
      
    animationRef.current?.pause();
      
    if (timerRef.current) {
      clearInterval(timerRef.current);
        timerRef.current = null;
    }
      
    // You could add completion rewards or statistics here
    } catch (error) {
      console.error('Error completing meditation:', error);
    }
  };

  const handleMeditationChange = async (meditation: typeof meditations[0]) => {
    try {
      console.log('Changing meditation to:', meditation.title);
      
      // First, stop any playing audio and reset state
      if (isPlaying) {
        console.log('Stopping current playback before changing meditation');
    setIsPlaying(false);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
      
      // Reset UI state
    setProgress(0);
    setRemainingTime(meditation.duration);
    setCurrentMeditation(meditation);
      setShowBenefits(false);
      setIsAudioReady(false);
      setAudioError(null);
      
      // Completely clean up existing audio
      if (soundRef.current) {
        console.log('Completely unloading existing audio');
        try {
          // First stop any playback
          await soundRef.current.stopAsync();
          // Then unload the audio
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.log('Error cleaning up audio (can be ignored):', e);
        }
        soundRef.current = null;
      }
      
      // Force audio mode reset to ensure clean state
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.log('Error resetting audio mode (can be ignored):', e);
      }
      
      // Initialize new audio
      await initializeAudio();
    } catch (error) {
      console.error('Error changing meditation:', error);
      setAudioError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const toggleMute = async () => {
    try {
      console.log('Toggling mute, isAudioReady:', isAudioReady, 'soundRef:', !!soundRef.current);
      
      // If audio is not ready, try to initialize it
      if (!isAudioReady || !soundRef.current) {
        console.log('Audio not ready for mute toggle, attempting to initialize...');
        await initializeAudio();
        
        // If still not ready after initialization, show error
        if (!isAudioReady || !soundRef.current) {
          setAudioError('Failed to initialize audio player for mute toggle');
          return;
        }
      }
      
      try {
        await soundRef.current.setIsMutedAsync(!isMuted);
        setIsMuted(!isMuted);
      } catch (muteError) {
        console.error('Error toggling mute:', muteError);
        setAudioError('Failed to toggle mute: ' + (muteError instanceof Error ? muteError.message : 'Unknown error'));
      }
    } catch (error) {
      console.error('Error in toggleMute:', error);
      setAudioError(error instanceof Error ? error.message : 'Unknown error');
      
      // Try to recover by reinitializing audio
      setIsAudioReady(false);
      await initializeAudio();
    }
  };

  const filteredMeditations = activeTab === 'all' 
    ? meditations 
    : meditations.filter(m => m.category.toLowerCase() === activeTab.toLowerCase());

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  // Interpolate background colors
  const gradientStart = backgroundAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#1e3c72', '#2a5298', '#1e3c72'],
  });
  
  const gradientMiddle = backgroundAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#2a5298', '#2d63b5', '#2a5298'],
  });
  
  const gradientEnd = backgroundAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#2d63b5', '#3370d6', '#2d63b5'],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
        <Animated.View style={[styles.backgroundContainer, { backgroundColor: '#1e3c72' }]}>
      <LinearGradient
            colors={['#1e3c72', '#2a5298']}
            style={styles.overlayGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
          />
          
          {/* Background pattern */}
          <View style={styles.backgroundPattern}>
            {Array.from({ length: 20 }).map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.backgroundDot,
                  { 
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    opacity: 0.1 + Math.random() * 0.2,
                    width: 2 + Math.random() * 4,
                    height: 2 + Math.random() * 4,
                  }
                ]} 
              />
            ))}
          </View>
          
          <Animated.View 
            style={[
              styles.header,
              { 
                opacity: headerOpacity,
                transform: [{ translateY: headerTranslateY }],
                paddingTop: Platform.OS === 'ios' ? (isLandscape ? 10 : 60) : (isLandscape ? 10 : 40),
              }
            ]}
          >
            <Text style={[
              styles.title,
              { fontSize: isSmallScreen ? 28 : (isTablet ? 42 : 36) }
            ]}>Meditate</Text>
            <Text style={[
              styles.subtitle,
              { fontSize: isSmallScreen ? 14 : (isTablet ? 18 : 16) }
            ]}>Find peace within yourself</Text>
          </Animated.View>

          <Animated.ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            contentContainerStyle={isLandscape ? styles.landscapeContent : {}}
          >
            <Animated.View style={[styles.playerCard, { opacity: fadeAnim }]}>
              <LinearGradient
                colors={[currentMeditation.color, `${currentMeditation.color}80`]}
                style={[
                  styles.playerGradient,
                  { flex: isLandscape ? 1 : undefined }
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
            <View style={styles.animationContainer}>
              <LottieView
                ref={animationRef}
                source={{ uri: currentMeditation.animation }}
                style={styles.animation}
                autoPlay={false}
                loop={true}
              />
                </View>
                
                <View style={styles.meditationInfo}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{currentMeditation.category}</Text>
            </View>
            <Text style={styles.currentTitle}>{currentMeditation.title}</Text>
            <Text style={styles.currentDescription}>{currentMeditation.description}</Text>
                  
                  <TouchableOpacity 
                    style={styles.benefitsButton}
                    onPress={() => setShowBenefits(!showBenefits)}
                  >
                    <Text style={styles.benefitsButtonText}>
                      {showBenefits ? 'Hide Benefits' : 'Show Benefits'}
                    </Text>
                    <ChevronRight 
                      size={16} 
                      color="#ffffff" 
                      style={[
                        styles.benefitsIcon,
                        showBenefits && styles.benefitsIconRotated
                      ]} 
                    />
                  </TouchableOpacity>
                  
                  {showBenefits && (
                    <View style={styles.benefitsContainer}>
                      {currentMeditation.benefits.map((benefit, index) => (
                        <View key={index} style={styles.benefitItem}>
                          <Star size={16} color="#ffffff" style={styles.benefitIcon} />
                          <Text style={styles.benefitText}>{benefit}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
            <Text style={styles.currentDuration}>{formatTime(remainingTime)}</Text>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>

            <View style={styles.controls}>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => {
                  const currentIndex = meditations.findIndex(m => m.id === currentMeditation.id);
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : meditations.length - 1;
                  handleMeditationChange(meditations[prevIndex]);
                }}
              >
                      <SkipBack size={isSmallScreen ? 20 : (isTablet ? 28 : 24)} color="#ffffff" />
              </TouchableOpacity>
              
              <TouchableOpacity
                      style={[
                        styles.playButton,
                        { 
                          marginHorizontal: isSmallScreen ? 16 : (isTablet ? 32 : 24),
                          padding: isSmallScreen ? 10 : (isTablet ? 16 : 12)
                        }
                      ]}
                onPress={handlePlayPause}
                      disabled={isInitializing}
                    >
                      {isInitializing ? (
                        <Text style={styles.loadingText}>...</Text>
                      ) : isPlaying ? (
                        <Pause size={isSmallScreen ? 28 : (isTablet ? 40 : 32)} color="#ffffff" />
                      ) : (
                        <Play size={isSmallScreen ? 28 : (isTablet ? 40 : 32)} color="#ffffff" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => {
                  const currentIndex = meditations.findIndex(m => m.id === currentMeditation.id);
                  const nextIndex = currentIndex < meditations.length - 1 ? currentIndex + 1 : 0;
                  handleMeditationChange(meditations[nextIndex]);
                }}
              >
                <SkipForward size={24} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleMute}
              >
                {isMuted ? (
                  <VolumeX size={24} color="#ffffff" />
                ) : (
                  <Volume2 size={24} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
                  
                  {audioError && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>Audio Error: {audioError}</Text>
                      <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={initializeAudio}
                        disabled={isInitializing}
                      >
                        <Text style={styles.retryButtonText}>
                          {isInitializing ? 'Initializing...' : 'Retry'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  <TouchableOpacity
                    style={[
                      styles.breathingToggle,
                      showBreathingCircle && styles.breathingToggleActive
                    ]}
                    onPress={() => setShowBreathingCircle(!showBreathingCircle)}
                  >
                    <Text style={styles.breathingToggleText}>
                      {showBreathingCircle ? 'Hide Breathing Guide' : 'Show Breathing Guide'}
                    </Text>
                  </TouchableOpacity>
                  
                  {showBreathingCircle && (
                    <View style={styles.breathingContainer}>
                      <Animated.View 
                        style={[
                          styles.breathingCircle,
                          {
                            transform: [
                              { scale: breathingAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.6, 1.2]
                                })
                              }
                            ],
                            opacity: breathingAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.7, 1]
                            })
                          }
                        ]}
                      >
                        <Animated.View 
                          style={[
                            styles.breathingInnerCircle,
                            {
                              transform: [
                                { scale: breathingAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.8, 1]
                                  })
                                }
                              ],
                              opacity: breathingAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 0.8]
                              })
                            }
                          ]}
                        />
                        
                        <Animated.View 
                          style={[
                            styles.breathingPulseCircle,
                            {
                              transform: [
                                { scale: breathingAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.9, 1.3]
                                  })
                                }
                              ],
                              opacity: breathingAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 0.6]
                              })
                            }
                          ]}
                        />
                        
                        <Animated.View 
                          style={[
                            styles.breathingCenterDot,
                            {
                              transform: [
                                { scale: breathingAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.7, 1.2]
                                  })
                                }
                              ],
                              opacity: breathingAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.8, 1]
                              })
                            }
                          ]}
                        />
                      </Animated.View>
                      
                      <Animated.View 
                        style={[
                          styles.breathingTextContainer,
                          {
                            opacity: breathingTextOpacity,
                            transform: [
                              { scale: breathingTextScale },
                              { translateY: breathingTextAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [10, 0]
                                })
                              }
                            ]
                          }
                        ]}
                      >
                        <Text style={styles.breathingText}>{breathingTextRef.current}</Text>
                      </Animated.View>
                      
                      <View style={styles.breathingInstructionsContainer}>
                        <Text style={styles.breathingInstructions}>
                          Follow the circle: {breathingPhaseRef.current === 'inhale' ? 'Breathe in' : 
                                           breathingPhaseRef.current === 'hold' ? 'Hold your breath' : 
                                           breathingPhaseRef.current === 'exhale' ? 'Breathe out' : 
                                           'Pause briefly'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>

            <View style={styles.tabsContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsContent}
              >
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                  onPress={() => setActiveTab('all')}
                >
                  <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'beginner' && styles.activeTab]}
                  onPress={() => setActiveTab('beginner')}
                >
                  <Text style={[styles.tabText, activeTab === 'beginner' && styles.activeTabText]}>Beginner</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'intermediate' && styles.activeTab]}
                  onPress={() => setActiveTab('intermediate')}
                >
                  <Text style={[styles.tabText, activeTab === 'intermediate' && styles.activeTabText]}>Intermediate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'advanced' && styles.activeTab]}
                  onPress={() => setActiveTab('advanced')}
                >
                  <Text style={[styles.tabText, activeTab === 'advanced' && styles.activeTabText]}>Advanced</Text>
                </TouchableOpacity>
              </ScrollView>
          </View>

          <Text style={styles.sectionTitle}>More Meditations</Text>
          
            {filteredMeditations.map((meditation) => (
            <TouchableOpacity
              key={meditation.id}
              style={[
                styles.meditationCard,
                currentMeditation.id === meditation.id && styles.selectedCard
              ]}
              onPress={() => handleMeditationChange(meditation)}
              >
                <LinearGradient
                  colors={[meditation.color, `${meditation.color}80`]}
                  style={styles.meditationCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
            >
              <View style={styles.meditationAnimationContainer}>
                <LottieView
                  source={{ uri: meditation.animation }}
                  style={styles.meditationAnimation}
                  autoPlay={true}
                  loop={true}
                />
              </View>
              <View style={styles.meditationInfo}>
                    <View style={styles.meditationHeader}>
                      <View style={styles.categoryBadgeSmall}>
                        <Text style={styles.categoryTextSmall}>{meditation.category}</Text>
                      </View>
                      <View style={styles.durationContainer}>
                        <Clock size={14} color="#ffffff" style={styles.durationIcon} />
                        <Text style={styles.durationText}>{formatTime(meditation.duration)}</Text>
                      </View>
                    </View>
                <Text style={styles.meditationTitle}>{meditation.title}</Text>
                <Text style={styles.meditationDescription}>{meditation.description}</Text>
              </View>
                </LinearGradient>
            </TouchableOpacity>
          ))}
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>Take a moment to breathe and find your inner peace</Text>
    </View>
          </Animated.ScrollView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  backgroundContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#1e3c72',
  },
  overlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  backgroundDot: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 2,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'DMSerifDisplay' : 'serif',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif',
    color: '#ffffff',
    opacity: 0.8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  landscapeContent: {
    paddingBottom: 40,
  },
  playerCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  playerGradient: {
    padding: 20,
  },
  animationContainer: {
    width: '100%',
    height: 200,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  meditationInfo: {
    width: '100%',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    fontFamily: Platform.OS === 'ios' ? 'InterSemiBold' : 'sans-serif',
    fontSize: 14,
    color: '#ffffff',
  },
  currentTitle: {
    fontFamily: Platform.OS === 'ios' ? 'InterSemiBold' : 'sans-serif',
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 8,
  },
  currentDescription: {
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif',
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 16,
  },
  benefitsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitsButtonText: {
    fontFamily: Platform.OS === 'ios' ? 'InterSemiBold' : 'sans-serif',
    fontSize: 14,
    color: '#ffffff',
    marginRight: 4,
  },
  benefitsIcon: {
    transform: [{ rotate: '0deg' }],
  },
  benefitsIconRotated: {
    transform: [{ rotate: '90deg' }],
  },
  benefitsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitIcon: {
    marginRight: 8,
  },
  benefitText: {
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif',
    fontSize: 14,
    color: '#ffffff',
  },
  currentDuration: {
    fontFamily: Platform.OS === 'ios' ? 'InterSemiBold' : 'sans-serif',
    fontSize: 32,
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  controlButton: {
    padding: 12,
  },
  playButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 40,
    marginHorizontal: 24,
  },
  tabsContainer: {
    marginBottom: 24,
  },
  tabsContent: {
    paddingRight: 20,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabText: {
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif',
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
  activeTabText: {
    opacity: 1,
    fontFamily: Platform.OS === 'ios' ? 'InterSemiBold' : 'sans-serif',
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'InterSemiBold' : 'sans-serif',
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 16,
  },
  meditationCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  selectedCard: {
    borderColor: '#ffffff',
    borderWidth: 2,
  },
  meditationCardGradient: {
    flexDirection: 'row',
    padding: 12,
  },
  meditationAnimationContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  meditationAnimation: {
    width: '100%',
    height: '100%',
  },
  meditationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadgeSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryTextSmall: {
    fontFamily: Platform.OS === 'ios' ? 'InterSemiBold' : 'sans-serif',
    fontSize: 12,
    color: '#ffffff',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationIcon: {
    marginRight: 4,
  },
  durationText: {
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif',
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
  meditationTitle: {
    fontFamily: Platform.OS === 'ios' ? 'InterSemiBold' : 'sans-serif',
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  meditationDescription: {
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif',
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif',
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  breathingToggle: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 16,
  },
  breathingToggleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  breathingToggleText: {
    fontFamily: Platform.OS === 'ios' ? 'InterSemiBold' : 'sans-serif',
    fontSize: 14,
    color: '#ffffff',
  },
  breathingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    height: 250,
  },
  breathingCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    position: 'relative',
  },
  breathingInnerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    position: 'absolute',
  },
  breathingPulseCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    position: 'absolute',
  },
  breathingCenterDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    position: 'absolute',
  },
  breathingTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 90,
  },
  breathingText: {
    fontFamily: Platform.OS === 'ios' ? 'InterSemiBold' : 'sans-serif',
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
  },
  breathingInstructionsContainer: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  breathingInstructions: {
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif',
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  errorText: {
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'InterSemiBold' : 'sans-serif',
    fontSize: 14,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});