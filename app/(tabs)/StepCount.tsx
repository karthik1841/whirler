import { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Modal, useWindowDimensions, Alert, Animated, Easing, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, Trophy, Target, Flame, Coins, X, Zap, Star, Heart, Crown, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer } from 'expo-sensors';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Pedometer } from 'expo-sensors';
import { PermissionsAndroid } from 'react-native';
import { translations } from '@/config/translations';
import { useLanguage } from '@/hooks/useLanguage';

const STEP_GOAL = 10000;
const STEP_LENGTH = 0.762; // Average step length in meters
const CALORIES_PER_STEP = 0.04;

const ACHIEVEMENTS = [
  {
    id: 1,
    title: 'First Steps',
    description: 'Complete your first 1,000 steps',
    requirement: 1000,
    coins: 50,
    icon: '🎯',
  },
  {
    id: 2,
    title: 'Walking Warrior',
    description: 'Reach 5,000 steps in one session',
    requirement: 5000,
    coins: 100,
    icon: '⚔️',
  },
  {
    id: 3,
    title: 'Step Master',
    description: 'Complete your daily goal of 10,000 steps',
    requirement: 10000,
    coins: 200,
    icon: '👑',
  },
  {
    id: 4,
    title: 'Calorie Crusher',
    description: 'Burn 200 calories in one session',
    requirement: 200,
    coins: 150,
    type: 'calories',
    icon: '🔥',
  },
  {
    id: 5,
    title: 'Distance Champion',
    description: 'Walk 5 kilometers in one session',
    requirement: 5,
    type: 'distance',
    coins: 300,
    icon: '🌟',
  },
];

const colors = {
  background: '#121212',
  text: '#FFFFFF',
  card: 'rgba(30, 41, 59, 0.7)',
  primary: '#1e3c72',
  secondary: '#2a5298',
  gradient: ['#1e3c72', '#2a5298'] as [string, string],
  accent: '#4FC3F7',
  error: '#FF6B6B',
  warning: '#FFA500',
  success: '#4FC3F7',
  disabled: 'rgba(255, 255, 255, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  border: 'rgba(255, 255, 255, 0.1)',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export default function Steps() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isTablet = width >= 768;
  const { language } = useLanguage();

  const t = (key: string): string | string[] => {
    const keys = key.split('.');
    let value: any = translations[language as keyof typeof translations];
    for (const k of keys) {
      value = value[k];
    }
    return value;
  };

  const [steps, setSteps] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [calories, setCalories] = useState(0);
  const [distance, setDistance] = useState(0);
  const [coins, setCoins] = useState(0);
  const [showAchievements, setShowAchievements] = useState(false);
  const [completedAchievements, setCompletedAchievements] = useState<number[]>([]);
  const [showReward, setShowReward] = useState(false);
  const [currentReward, setCurrentReward] = useState({ coins: 0, title: '' });
  const [dailyStats, setDailyStats] = useState({
    steps: 0,
    calories: 0,
    distance: 0,
    date: new Date().toDateString(),
  });

  // New state variables for enhanced features
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [experience, setExperience] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showStreakAlert, setShowStreakAlert] = useState(false);
  const [lastActiveDate, setLastActiveDate] = useState('');

  const subscription = useRef<any>(null);
  const lastMagnitude = useRef<number>(0);
  const stepCount = useRef(0);
  const lastStepTime = useRef<number>(0);
  const isStepDetected = useRef(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animation values
  const levelUpAnim = useRef(new Animated.Value(0)).current;
  const streakAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  // Constants for gamification
  const EXPERIENCE_PER_STEP = 0.01;
  const EXPERIENCE_PER_LEVEL = 100;
  const STREAK_BONUS_MULTIPLIER = 1.5;

  // Particle system
  const particles = Array(20).fill(0).map((_, i) => ({
    x: useRef(new Animated.Value(0)).current,
    y: useRef(new Animated.Value(0)).current,
    scale: useRef(new Animated.Value(0)).current,
    opacity: useRef(new Animated.Value(0)).current,
    rotation: useRef(new Animated.Value(0)).current,
  }));

  const [refreshing, setRefreshing] = useState(false);
  const refreshRotation = useRef(new Animated.Value(0)).current;

  // Load saved data when component mounts
  useEffect(() => {
    loadSavedData();
    checkStreak();
    startPulseAnimation();
    startParticleAnimation();
  }, [language]);

  // Save data whenever relevant state changes
  useEffect(() => {
    saveData();
  }, [steps, calories, distance, coins, completedAchievements, streak, level, experience]);

  // Check and update streak daily
  useEffect(() => {
    const today = new Date().toDateString();
    if (lastActiveDate && lastActiveDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();
      
      if (lastActiveDate === yesterdayString) {
        // Streak continues
        setStreak(prev => prev + 1);
        if (streak % 7 === 0) {
          // Weekly streak bonus
          setShowStreakAlert(true);
          setCoins(prev => prev + 100);
          startStreakAnimation();
        }
    } else {
        // Streak broken
        setStreak(0);
      }
    }
    
    setLastActiveDate(today);
  }, [lastActiveDate, streak]);
  
  // Update experience and level
  useEffect(() => {
    const newExperience = Math.floor(steps * EXPERIENCE_PER_STEP);
    setExperience(newExperience);
    
    const newLevel = Math.floor(newExperience / EXPERIENCE_PER_LEVEL) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
      setShowLevelUp(true);
      setCoins(prev => prev + (newLevel * 50));
      startLevelUpAnimation();
    }
  }, [steps]);

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('stepCounterData');
      if (savedData) {
        const data = JSON.parse(savedData);
        setSteps(data.steps || 0);
        setCalories(data.calories || 0);
        setDistance(data.distance || 0);
        setCoins(data.coins || 0);
        setCompletedAchievements(data.completedAchievements || []);
        setStreak(data.streak || 0);
        setLevel(data.level || 1);
        setExperience(data.experience || 0);
        setLastActiveDate(data.lastActiveDate || '');
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const saveData = async () => {
    try {
      const dataToSave = {
        steps,
        calories,
        distance,
        coins,
        completedAchievements,
        streak,
        level,
        experience,
        lastActiveDate,
        lastUpdated: new Date().toISOString()
      };
      await AsyncStorage.setItem('stepCounterData', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (subscription.current) {
        subscription.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: (steps / STEP_GOAL) * 100,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();
  }, [steps]);

  const startParticleAnimation = () => {
    particles.forEach((particle, i) => {
      const angle = (i / particles.length) * Math.PI * 2;
      const radius = 100;
      
      Animated.parallel([
        Animated.sequence([
          Animated.timing(particle.x, {
            toValue: Math.cos(angle) * radius,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.x, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(particle.y, {
            toValue: Math.sin(angle) * radius,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.y, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(particle.scale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(particle.opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(particle.rotation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.rotation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  };

  const handleStepIncrement = () => {
    startParticleAnimation();
    
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const startStepCounter = async () => {
    try {
      // Reset counters
      stepCount.current = 0;
      lastMagnitude.current = 0;
      lastStepTime.current = Date.now();
      isStepDetected.current = false;
      
      setSteps(0);
      setCalories(0);
      setDistance(0);
      setDailyStats(prev => ({
        ...prev,
        steps: 0,
        calories: 0,
        distance: 0,
      }));

      // Configure accelerometer
      await Accelerometer.setUpdateInterval(100);

      // Start accelerometer updates
      subscription.current = Accelerometer.addListener(accelerometerData => {
        const { x, y, z } = accelerometerData;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        
        // Initialize last magnitude if not set
        if (lastMagnitude.current === 0) {
          lastMagnitude.current = magnitude;
          return;
        }

        const timeNow = Date.now();
        const timeDiff = timeNow - lastStepTime.current;
        
        // Step detection logic
        const magnitudeDiff = magnitude - lastMagnitude.current;
        const threshold = 0.5; // Adjust this value based on testing
        
        if (magnitudeDiff > threshold && !isStepDetected.current && timeDiff > 200) {
          isStepDetected.current = true;
          stepCount.current += 1;
          lastStepTime.current = timeNow;
          
          // Update UI
          setSteps(stepCount.current);
          handleStepIncrement();
          
          // Update calories
          const newCalories = Math.floor(stepCount.current * CALORIES_PER_STEP);
          setCalories(newCalories);
          
          // Update distance in kilometers
          const newDistance = Number((stepCount.current * STEP_LENGTH / 1000).toFixed(2));
          setDistance(newDistance);
          
          // Update daily stats
          setDailyStats(prev => ({
            ...prev,
            steps: stepCount.current,
            calories: newCalories,
            distance: newDistance,
          }));
        } else if (magnitudeDiff < -threshold) {
          isStepDetected.current = false;
        }
        
        lastMagnitude.current = magnitude;
      });

      setIsTracking(true);
      Alert.alert(
        'Step Counter Started',
        'Walking tracking has begun. Start walking to count steps!'
      );
    } catch (error) {
      console.error('Error starting step counter:', error);
      Alert.alert(
        'Error',
        'Failed to start step counting. Please make sure you have granted the necessary permissions.'
      );
    }
  };

  const stopStepCounter = () => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
    lastMagnitude.current = 0;
    lastStepTime.current = 0;
    isStepDetected.current = false;
    setIsTracking(false);
  };

  useEffect(() => {
    // Check for achievements
    ACHIEVEMENTS.forEach(achievement => {
      if (!completedAchievements.includes(achievement.id)) {
        let completed = false;
        
        if (achievement.type === 'calories' && calories >= achievement.requirement) {
          completed = true;
        } else if (achievement.type === 'distance' && distance >= achievement.requirement) {
          completed = true;
        } else if (!achievement.type && steps >= achievement.requirement) {
          completed = true;
        }

        if (completed) {
          setCompletedAchievements(prev => [...prev, achievement.id]);
          setCoins(prev => prev + achievement.coins);
          setCurrentReward({ coins: achievement.coins, title: achievement.title });
          setShowReward(true);
        }
      }
    });
  }, [steps, calories, distance]);

  const checkStreak = () => {
    const today = new Date().toDateString();
    if (lastActiveDate === today) {
      // Already active today, streak continues
    } else if (lastActiveDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();
      
      if (lastActiveDate === yesterdayString) {
        // Streak continues
        setStreak(prev => prev + 1);
      } else {
        // Streak broken
        setStreak(0);
      }
    }
    
    setLastActiveDate(today);
  };
  
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
  const startLevelUpAnimation = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(bounceAnim, {
          toValue: 0,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setShowLevelUp(false);
    });
  };
  
  const startStreakAnimation = () => {
    Animated.sequence([
      Animated.timing(streakAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(streakAnim, {
        toValue: 0,
        duration: 500,
        delay: 2000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowStreakAlert(false);
    });
  };

  const handleRefresh = () => {
    if (refreshing) return;
    
    setRefreshing(true);
    
    // Reset all counters
    setSteps(0);
    setCalories(0);
    setDistance(0);
    setDailyStats(prev => ({
      ...prev,
      steps: 0,
      calories: 0,
      distance: 0,
    }));

    // Start rotation animation
    Animated.sequence([
      Animated.timing(refreshRotation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(refreshRotation, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setRefreshing(false);
    });
  };

  const spinRefresh = refreshRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSteps(0);
    setCalories(0);
    setDistance(0);
    setDailyStats(prev => ({
      ...prev,
      steps: 0,
      calories: 0,
      distance: 0,
    }));
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradient}
        style={styles.gradientBackground}
      >
        <Animated.ScrollView 
          style={[styles.content, { opacity: fadeAnim }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
              titleColor="#ffffff"
              title="Pull to refresh"
              progressBackgroundColor="#2D2D3D"
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('stepCounter.title')}</Text>
            <View style={styles.headerRight}>
              <View style={styles.coinsContainer}>
                <Coins size={isSmallScreen ? 16 : 20} color="#FCD34D" />
                <Text style={[styles.coinsText, isSmallScreen && styles.coinsTextSmall]}>{coins}</Text>
              </View>
              <TouchableOpacity
                style={[styles.refreshButton, isSmallScreen && styles.refreshButtonSmall]}
                onPress={handleRefresh}
                disabled={refreshing}
              >
                <Animated.View style={{ transform: [{ rotate: spinRefresh }] }}>
                  <RefreshCw 
                    size={isSmallScreen ? 16 : 20} 
                    color="#ffffff" 
                  />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.achievementsButton}
                onPress={() => setShowAchievements(true)}
              >
                <Trophy size={isSmallScreen ? 20 : 24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Level and Experience Bar */}
          <View style={[styles.levelContainer, isSmallScreen && styles.levelContainerSmall]}>
            <View style={styles.levelInfo}>
              <Crown size={isSmallScreen ? 16 : 20} color="#FCD34D" />
              <Text style={[styles.levelText, isSmallScreen && styles.levelTextSmall]}>Level {level}</Text>
            </View>
            <View style={styles.experienceBar}>
              <Animated.View 
                style={[
                  styles.experienceFill, 
                  { 
                    width: `${Math.min(100, (experience % EXPERIENCE_PER_LEVEL) / EXPERIENCE_PER_LEVEL * 100)}%` 
                  }
                ]} 
              />
              </View>
            <Text style={[styles.experienceText, isSmallScreen && styles.experienceTextSmall]}>
              {experience % EXPERIENCE_PER_LEVEL} / {EXPERIENCE_PER_LEVEL} XP
            </Text>
            </View>
          
          {/* Streak Display */}
          {streak > 0 && (
            <View style={[styles.streakContainer, isSmallScreen && styles.streakContainerSmall]}>
              <Flame size={isSmallScreen ? 16 : 20} color="#F97316" />
              <Text style={[styles.streakText, isSmallScreen && styles.streakTextSmall]}>
                {streak} Day{streak !== 1 ? 's' : ''} Streak
              </Text>
              <Text style={[styles.streakBonusText, isSmallScreen && styles.streakBonusTextSmall]}>
                +{Math.floor(STREAK_BONUS_MULTIPLIER * 100 - 100)}% Bonus
              </Text>
            </View>
          )}

          <View style={[styles.counterCard, isSmallScreen && styles.counterCardSmall]}>
            <Animated.View 
              style={[
                styles.stepsDisplay,
                {
                  transform: [
                    { scale: scaleAnim },
                    { rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })},
                  ],
                },
              ]}
            >
              <Text style={[styles.stepsCount, isSmallScreen && styles.stepsCountSmall]}>
                {steps.toLocaleString()}
              </Text>
              <Text style={[styles.stepsLabel, isSmallScreen && styles.stepsLabelSmall]}>{t('stepCounter.steps')}</Text>
              
              {/* Particle effects */}
              {particles.map((particle, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.particle,
                    {
                      transform: [
                        { translateX: particle.x },
                        { translateY: particle.y },
                        { scale: particle.scale },
                        { rotate: particle.rotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        })},
                      ],
                      opacity: particle.opacity,
                    },
                  ]}
                />
              ))}
            </Animated.View>

            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  })},
                ]}
              />
            </View>

            <Text style={[styles.goalText, isSmallScreen && styles.goalTextSmall]}>
              {t('stepCounter.dailyGoal')}: {STEP_GOAL.toLocaleString()} {t('stepCounter.steps')}
            </Text>

            <View style={styles.trackButtonContainer}>
            <TouchableOpacity
                style={[
                  styles.trackButton,
                  isTracking && styles.trackButtonActive,
                  isSmallScreen && styles.trackButtonSmall
                ]}
                onPress={isTracking ? stopStepCounter : startStepCounter}
            >
              {isTracking ? (
                  <Pause size={isSmallScreen ? 20 : 24} color="#ffffff" />
              ) : (
                  <Play size={isSmallScreen ? 20 : 24} color="#ffffff" />
              )}
                <Text style={[styles.trackButtonText, isSmallScreen && styles.trackButtonTextSmall]}>
                  {isTracking ? t('stepCounter.stopTracking') : t('stepCounter.startTracking')}
              </Text>
            </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.statsContainer, isSmallScreen && styles.statsContainerSmall]}>
            <View style={[styles.statCard, isSmallScreen && styles.statCardSmall]}>
              <Target size={isSmallScreen ? 20 : 24} color="#4F46E5" />
              <Text style={[styles.statValue, isSmallScreen && styles.statValueSmall]}>
                {Math.round((steps / STEP_GOAL) * 100)}%
              </Text>
              <Text style={[styles.statLabel, isSmallScreen && styles.statLabelSmall]}>{t('stepCounter.goalProgress')}</Text>
            </View>

            <View style={[styles.statCard, isSmallScreen && styles.statCardSmall]}>
              <Flame size={isSmallScreen ? 20 : 24} color="#4F46E5" />
              <Text style={[styles.statValue, isSmallScreen && styles.statValueSmall]}>{calories}</Text>
              <Text style={[styles.statLabel, isSmallScreen && styles.statLabelSmall]}>{t('stepCounter.calories')}</Text>
            </View>

            <View style={[styles.statCard, isSmallScreen && styles.statCardSmall]}>
              <Trophy size={isSmallScreen ? 20 : 24} color="#4F46E5" />
              <Text style={[styles.statValue, isSmallScreen && styles.statValueSmall]}>{distance}km</Text>
              <Text style={[styles.statLabel, isSmallScreen && styles.statLabelSmall]}>{t('stepCounter.distance')}</Text>
            </View>
          </View>

          <View style={[styles.tipsCard, isSmallScreen && styles.tipsCardSmall]}>
            <Text style={[styles.tipsTitle, isSmallScreen && styles.tipsTitleSmall]}>{t('stepCounter.walkingTips')}</Text>
            <Text style={[styles.tipsText, isSmallScreen && styles.tipsTextSmall]}>
              {(t('stepCounter.tips') as string[]).map((tip: string, index: number) => (
                <Text key={index}>• {tip}{'\n'}</Text>
              ))}
            </Text>
          </View>
        </Animated.ScrollView>

        {/* Level Up Modal */}
        <Modal
          visible={showLevelUp}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLevelUp(false)}
        >
          <View style={styles.modalContainer}>
            <Animated.View 
              style={[
                styles.levelUpModal, 
                isSmallScreen && styles.levelUpModalSmall,
                {
                  transform: [
                    { scale: levelUpAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 1.2, 1]
                    })}
                  ]
                }
              ]}
            >
              <Crown size={isSmallScreen ? 40 : 60} color="#FCD34D" />
              <Text style={[styles.levelUpTitle, isSmallScreen && styles.levelUpTitleSmall]}>
                {t('stepCounter.levelUp.title')}
              </Text>
              <Text style={[styles.levelUpText, isSmallScreen && styles.levelUpTextSmall]}>
                {t('stepCounter.levelUp.message')} {level}
              </Text>
              <Text style={[styles.levelUpReward, isSmallScreen && styles.levelUpRewardSmall]}>
                +{level * 50} {t('stepCounter.levelUp.reward')}
              </Text>
              <TouchableOpacity
                style={[styles.levelUpButton, isSmallScreen && styles.levelUpButtonSmall]}
                onPress={() => setShowLevelUp(false)}
              >
                <Text style={[styles.levelUpButtonText, isSmallScreen && styles.levelUpButtonTextSmall]}>
                  {t('stepCounter.levelUp.button')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        {/* Streak Alert Modal */}
        <Modal
          visible={showStreakAlert}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStreakAlert(false)}
        >
          <View style={styles.modalContainer}>
            <Animated.View 
              style={[
                styles.streakModal, 
                isSmallScreen && styles.streakModalSmall,
                {
                  transform: [
                    { scale: streakAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 1.2, 1]
                    })}
                  ]
                }
              ]}
            >
              <Flame size={isSmallScreen ? 40 : 60} color="#F97316" />
              <Text style={[styles.streakAlertTitle, isSmallScreen && styles.streakAlertTitleSmall]}>
                Streak Bonus!
              </Text>
              <Text style={[styles.streakAlertText, isSmallScreen && styles.streakAlertTextSmall]}>
                {streak} Day{streak !== 1 ? 's' : ''} Streak
              </Text>
              <Text style={[styles.streakAlertReward, isSmallScreen && styles.streakAlertRewardSmall]}>
                +100 Coins
              </Text>
              <TouchableOpacity
                style={[styles.streakAlertButton, isSmallScreen && styles.streakAlertButtonSmall]}
                onPress={() => setShowStreakAlert(false)}
              >
                <Text style={[styles.streakAlertButtonText, isSmallScreen && styles.streakAlertButtonTextSmall]}>
                  Keep Going!
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        {/* Achievements Modal */}
        <Modal
          visible={showAchievements}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAchievements(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('stepCounter.achievements.title')}</Text>
                <TouchableOpacity onPress={() => setShowAchievements(false)}>
                  <X size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.achievementsList}>
                {ACHIEVEMENTS.map((achievement) => (
                  <View key={achievement.id} style={styles.achievementItem}>
                      <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                      <View style={styles.achievementInfo}>
                        <Text style={styles.achievementTitle}>{achievement.title}</Text>
                      <Text style={styles.achievementDescription}>{achievement.description}</Text>
                      </View>
                      <View style={styles.achievementReward}>
                      <Coins size={20} color="#FFD700" />
                        <Text style={styles.achievementCoins}>{achievement.coins}</Text>
                      </View>
                    </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Reward Modal */}
        <Modal
          visible={showReward}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowReward(false)}
        >
          <View style={styles.rewardModalContainer}>
            <View style={[styles.rewardModalContent, isSmallScreen && styles.rewardModalContentSmall]}>
              <Text style={[styles.rewardTitle, isSmallScreen && styles.rewardTitleSmall]}>
                Achievement Unlocked!
              </Text>
              <Text style={[styles.rewardText, isSmallScreen && styles.rewardTextSmall]}>
                {currentReward.title}
              </Text>
              <View style={styles.rewardCoins}>
                <Coins size={isSmallScreen ? 20 : 24} color="#FCD34D" />
                <Text style={[styles.rewardCoinsText, isSmallScreen && styles.rewardCoinsTextSmall]}>
                  +{currentReward.coins}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.rewardButton, isSmallScreen && styles.rewardButtonSmall]}
                onPress={() => setShowReward(false)}
              >
                <Text style={[styles.rewardButtonText, isSmallScreen && styles.rewardButtonTextSmall]}>
                  Awesome!
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coinsText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  coinsTextSmall: {
    fontSize: 14,
  },
  achievementsButton: {
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  counterCardSmall: {
    padding: 16,
  },
  stepsDisplay: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  stepsCount: {
    fontSize: 64,
    fontWeight: 'bold',
    color: colors.text,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  stepsCountSmall: {
    fontSize: 48,
  },
  stepsLabel: {
    fontSize: 20,
    color: colors.text,
    opacity: 0.8,
  },
  stepsLabelSmall: {
    fontSize: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  goalText: {
    fontSize: 16,
    color: colors.text,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 20,
  },
  goalTextSmall: {
    fontSize: 14,
  },
  trackButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    gap: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  trackButtonActive: {
    backgroundColor: colors.secondary,
  },
  trackButtonSmall: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  trackButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  trackButtonTextSmall: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statsContainerSmall: {
    flexDirection: 'column',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statCardSmall: {
    padding: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: 4,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statValueSmall: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.8,
  },
  statLabelSmall: {
    fontSize: 12,
  },
  tipsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tipsCardSmall: {
    padding: 16,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tipsTitleSmall: {
    fontSize: 18,
  },
  tipsText: {
    fontSize: 16,
    color: colors.text,
    opacity: 0.8,
    lineHeight: 24,
  },
  tipsTextSmall: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 8,
  },
  achievementsList: {
    marginBottom: 20,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginBottom: 8,
  },
  achievementIcon: {
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  achievementProgress: {
    fontSize: 14,
    color: '#ec4899',
    fontWeight: '500',
  },
  achievementItemSmall: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  achievementCompleted: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderColor: '#4F46E5',
    borderWidth: 1,
  },
  rewardModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  rewardModalContentSmall: {
    padding: 16,
    borderRadius: 20,
    width: '90%',
  },
  rewardTitle: {
    fontFamily: 'DMSerifDisplay',
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardTitleSmall: {
    fontSize: 20,
    marginBottom: 6,
  },
  rewardText: {
    fontFamily: 'Inter',
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 16,
    textAlign: 'center',
  },
  rewardTextSmall: {
    fontSize: 16,
    marginBottom: 12,
  },
  rewardCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  rewardCoinsText: {
    fontFamily: 'InterSemiBold',
    fontSize: 24,
    color: '#FFD700',
  },
  rewardCoinsTextSmall: {
    fontSize: 20,
  },
  rewardButton: {
    backgroundColor: '#ec4899',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.5)',
  },
  rewardButtonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  rewardButtonText: {
    fontFamily: 'InterSemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  rewardButtonTextSmall: {
    fontSize: 14,
  },
  modalContentSmall: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    alignSelf: 'center',
  },
  modalTitleSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  achievementTitleSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  achievementDescriptionSmall: {
    fontSize: 14,
    color: '#666',
  },
  levelContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  levelContainerSmall: {
    padding: 12,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  levelTextSmall: {
    fontSize: 16,
  },
  experienceBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  experienceFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  experienceText: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.8,
    textAlign: 'right',
  },
  experienceTextSmall: {
    fontSize: 12,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  streakContainerSmall: {
    padding: 10,
  },
  streakText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
  streakTextSmall: {
    fontSize: 14,
  },
  streakBonusText: {
    fontSize: 14,
    color: '#FCD34D',
    marginLeft: 'auto',
  },
  streakBonusTextSmall: {
    fontSize: 12,
  },
  levelUpModal: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  levelUpModalSmall: {
    padding: 16,
    borderRadius: 20,
    width: '90%',
  },
  levelUpTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FCD34D',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  levelUpTitleSmall: {
    fontSize: 24,
  },
  levelUpText: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  levelUpTextSmall: {
    fontSize: 16,
  },
  levelUpReward: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FCD34D',
    marginBottom: 24,
    textAlign: 'center',
  },
  levelUpRewardSmall: {
    fontSize: 20,
  },
  levelUpButton: {
    backgroundColor: '#FCD34D',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.5)',
  },
  levelUpButtonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  levelUpButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  levelUpButtonTextSmall: {
    fontSize: 14,
  },
  streakModal: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  streakModalSmall: {
    padding: 16,
    borderRadius: 20,
    width: '90%',
  },
  streakAlertTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F97316',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  streakAlertTitleSmall: {
    fontSize: 24,
  },
  streakAlertText: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  streakAlertTextSmall: {
    fontSize: 16,
  },
  streakAlertReward: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FCD34D',
    marginBottom: 24,
    textAlign: 'center',
  },
  streakAlertRewardSmall: {
    fontSize: 20,
  },
  streakAlertButton: {
    backgroundColor: '#F97316',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.5)',
  },
  streakAlertButtonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  streakAlertButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  streakAlertButtonTextSmall: {
    fontSize: 14,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FCD34D',
    shadowColor: '#FCD34D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  achievementReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  achievementCoins: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  refreshButtonSmall: {
    padding: 10,
  },
});