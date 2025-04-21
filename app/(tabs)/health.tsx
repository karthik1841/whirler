import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  ViewStyle,
  TextStyle,
  Image,
  Dimensions,
  SafeAreaView,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Heart, Activity, Moon, Battery, Info, ChevronRight, Plus, X, Droplet, Brain, RefreshCw, CheckCircle, XCircle, Flame } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  withSequence,
  withDelay,
  withRepeat,
} from 'react-native-reanimated';
import * as Animatable from 'react-native-animatable';
import { LineChart } from 'react-native-chart-kit';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

// Update theme colors to match meditation app's color scheme
const theme = {
  primary: '#1E3A8A',    // Deep Indigo
  secondary: '#1E40AF',  // Indigo
  accent: '#2563EB',    // Blue
  success: '#22C55E',   // Green
  warning: '#F59E0B',   // Amber
  error: '#EF4444',     // Red
  background: {
    light: '#1E3A8A',    // Deep Indigo
    card: 'rgba(30, 41, 59, 0.7)', // Slate 800 with opacity
    input: 'rgba(51, 65, 85, 0.5)', // Slate 700 with opacity
  },
  text: {
    primary: '#F8FAFC',   // Slate 50
    secondary: '#CBD5E1', // Slate 300
    accent: '#6366F1',    // Indigo
    muted: '#94A3B8',    // Slate 400
  },
  border: {
    default: 'rgba(148, 163, 184, 0.1)', // Slate 400 with opacity
    active: '#6366F1',    // Indigo
  }
};

type HealthCondition = 'diabetes' | 'hypertension' | 'thyroid';

interface Recommendation {
  id: number;
  text: string;
  condition: HealthCondition;
  priority: 'high' | 'medium' | 'low';
}

interface HealthMetric {
  id: string;
  title: string;
  value: string;
  range: string;
  icon: any;
  color: string;
}

const recommendations: Recommendation[] = [
  { id: 1, text: 'Monitor blood sugar before and after meals', condition: 'diabetes', priority: 'high' },
  { id: 2, text: 'Choose low-GI foods like whole grains', condition: 'diabetes', priority: 'medium' },
  { id: 3, text: 'Aim for 30 min of moderate exercise daily', condition: 'diabetes', priority: 'medium' },
  { id: 4, text: 'Reduce salt intake to manage blood pressure', condition: 'hypertension', priority: 'high' },
  { id: 5, text: 'Practice stress-reducing activities like yoga', condition: 'hypertension', priority: 'medium' },
  { id: 6, text: 'Limit caffeine and alcohol consumption', condition: 'hypertension', priority: 'medium' },
  { id: 7, text: 'Eat selenium-rich foods like fish or nuts', condition: 'thyroid', priority: 'high' },
  { id: 8, text: 'Ensure adequate iodine intake', condition: 'thyroid', priority: 'high' },
  { id: 9, text: 'Get regular thyroid function tests', condition: 'thyroid', priority: 'medium' },
];

const healthMetrics: HealthMetric[] = [
  { id: 'activity', title: 'Activity', value: '0', range: 'Steps Today', icon: Activity, color: '#4ECDC4' },
  { id: 'calories', title: 'Calories', value: '0', range: 'Burned Today', icon: Flame, color: '#FF9F43' },
  { id: 'sleep', title: 'Sleep', value: '7h 30m', range: 'Last Night', icon: Moon, color: '#6C5CE7' },
  { id: 'energy', title: 'Energy', value: '85%', range: 'Good Level', icon: Battery, color: '#FFD166' },
];

const diseaseOptions = [
  { 
    id: 'diabetes', 
    label: 'Diabetes', 
    icon: Droplet, 
    color: '#FF6B6B',
  },
  { 
    id: 'hypertension', 
    label: 'Hypertension', 
    icon: Activity, 
    color: '#4FC3F7',
  },
  { 
    id: 'thyroid', 
    label: 'Thyroid', 
    icon: Brain, 
    color: '#FF4757',
  },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface WeeklyHealthData {
  date: string;
  heartRate: number;
  steps: number;
  sleep: number;
  energy: number;
}

const generateWeeklyData = (): WeeklyHealthData[] => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      heartRate: Math.floor(Math.random() * (85 - 65) + 65),
      steps: Math.floor(Math.random() * (12000 - 6000) + 6000),
      sleep: Math.floor(Math.random() * (8 - 6) * 10) / 10,
      energy: Math.floor(Math.random() * (100 - 70) + 70),
    };
  });
};

const WeeklyHealthReport = React.memo(() => {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const chartWidth = isSmallScreen ? width - 40 : isLandscape ? 300 : width - 60;
  const chartHeight = isSmallScreen ? 120 : isLandscape ? 150 : isTablet ? 200 : 180;

  // Get the steps from the parent component
  const steps = healthMetrics[1].value;

  const weeklyData = [
    {
      id: 'steps',
      title: 'Daily Steps',
      value: steps,
      trend: -2,
      color: '#4ECDC4',
      icon: <Activity size={isSmallScreen ? 20 : 24} color="#4ECDC4" />,
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          data: [8200, 8500, 8800, 8600, 8900, 8700, parseInt(steps) || 0],
        }],
      },
    },
    {
      id: 'sleep',
      title: 'Sleep Duration',
      value: '7.5 hrs',
      trend: 8,
      color: '#6C5CE7',
      icon: <Moon size={isSmallScreen ? 20 : 24} color="#6C5CE7" />,
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          data: [7.2, 7.4, 7.5, 7.3, 7.6, 7.8, 7.5],
        }],
      },
    },
    {
      id: 'energy',
      title: 'Energy Level',
      value: '85%',
      trend: 3,
      color: '#FFD166',
      icon: <Battery size={isSmallScreen ? 20 : 24} color="#FFD166" />,
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          data: [80, 82, 85, 83, 86, 84, 85],
        }],
      },
    },
  ];

  return (
    <View style={[
      styles.weeklyReportContainer,
      isLandscape && styles.weeklyReportContainerLandscape,
      isTablet && styles.weeklyReportContainerTablet
    ]}>
      <Text style={[
        styles.weeklyReportTitle,
        isSmallScreen && styles.weeklyReportTitleSmall,
        isTablet && styles.weeklyReportTitleTablet
      ]}>Weekly Health Overview</Text>
      <View style={[
        styles.metricsGrid,
        isLandscape && styles.metricsGridLandscape,
        isTablet && styles.metricsGridTablet
      ]}>
        {weeklyData.map((metric) => (
          <View key={metric.id} style={[
            styles.weeklyMetricCard,
            isLandscape && styles.weeklyMetricCardLandscape,
            isTablet && styles.weeklyMetricCardTablet
          ]}>
            <View style={styles.metricHeader}>
              {metric.icon}
              <Text style={[
                styles.metricTitle,
                isSmallScreen && styles.metricTitleSmall,
                isTablet && styles.metricTitleTablet
              ]}>{metric.title}</Text>
            </View>
            <Text style={[
              styles.metricValue,
              isSmallScreen && styles.metricValueSmall,
              isTablet && styles.metricValueTablet
            ]}>{metric.value}</Text>
            <View style={styles.metricTrendContainer}>
              <Text style={[
                styles.metricTrend,
                { color: metric.trend >= 0 ? '#4ECDC4' : '#FF6B6B' }
              ]}>
                {metric.trend >= 0 ? '↑' : '↓'} {Math.abs(metric.trend)}%
              </Text>
            </View>
            <View style={[
              styles.chartContainer,
              isLandscape && styles.chartContainerLandscape,
              isTablet && styles.chartContainerTablet
            ]}>
              <LineChart
                data={metric.chartData}
                width={chartWidth}
                height={chartHeight}
                chartConfig={{
                  backgroundColor: '#1E1E1E',
                  backgroundGradientFrom: '#1E1E1E',
                  backgroundGradientTo: '#1E1E1E',
                  decimalPlaces: 0,
                  color: (opacity = 1) => metric.color,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: isSmallScreen ? "4" : isTablet ? "8" : "6",
                    strokeWidth: "2",
                    stroke: metric.color
                  },
                  propsForLabels: {
                    fontSize: isSmallScreen ? 10 : isTablet ? 14 : 12,
                  }
                }}
                bezier
                style={styles.chart}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

interface DosAndDonts {
  id: string;
  title: string;
  disease: string;
  dos: string[];
  donts: string[];
}

const dosAndDonts: DosAndDonts[] = [
  {
    id: 'diabetes-guidelines',
    title: 'Diabetes Management',
    disease: 'diabetes',
    dos: [
      'Monitor blood sugar regularly',
      'Follow a balanced diet',
      'Exercise regularly',
      'Take medications as prescribed',
      'Stay hydrated'
    ],
    donts: [
      'Consume excessive salt',
      'Skip medications',
      'Smoke or drink alcohol',
      'Ignore high blood pressure readings',
      'Lead a stressful lifestyle'
    ]
  },
  {
    id: 'hypertension-guidelines',
    title: 'Hypertension Management',
    disease: 'hypertension',
    dos: [
      'Monitor blood pressure regularly',
      'Reduce salt intake',
      'Exercise regularly',
      'Manage stress',
      'Take medications as prescribed'
    ],
    donts: [
      'Consume excessive salt',
      'Skip medications',
      'Smoke or drink alcohol',
      'Ignore high blood pressure readings',
      'Lead a stressful lifestyle'
    ]
  },
  {
    id: 'thyroid-guidelines',
    title: 'Thyroid Management',
    disease: 'thyroid',
    dos: [
      'Take medications consistently',
      'Get regular check-ups',
      'Maintain a balanced diet',
      'Exercise regularly',
      'Get adequate sleep'
    ],
    donts: [
      'Skip medications',
      'Ignore symptoms',
      'Consume excessive iodine',
      'Skip regular check-ups',
      'Lead an irregular lifestyle'
    ]
  }
];

export default function HealthScreen() {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isTablet = width >= 768;
  const isLandscape = width > height;
  
  const [userDiseases, setUserDiseases] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recommendedActivities, setRecommendedActivities] = useState<Recommendation[]>([]);
  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [distance, setDistance] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [level, setLevel] = useState(1);
  const [experience, setExperience] = useState(0);
  const [streak, setStreak] = useState(0);

  const headerOpacity = useSharedValue(0);
  const refreshRotation = useSharedValue(0);
  
  const headerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(headerOpacity.value, { duration: 800, easing: Easing.out(Easing.exp) }),
    transform: [{ translateY: withTiming(headerOpacity.value ? 0 : 20, { duration: 800 }) }],
  }));

  const refreshIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${refreshRotation.value}deg` }],
    };
  });

  useEffect(() => {
    headerOpacity.value = 1;
    loadUserData();
  }, []);

  useEffect(() => {
    if (isRefreshing) {
      refreshRotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      refreshRotation.value = withTiming(0, { duration: 0 });
    }
  }, [isRefreshing]);

  const loadUserData = async () => {
    try {
      // Load step counter data
      const stepData = await AsyncStorage.getItem('stepCounterData');
      if (stepData) {
        const data = JSON.parse(stepData);
        setSteps(data.steps || 0);
        setCalories(data.calories || 0);
        setDistance(data.distance || 0);
        setTotalSteps(data.totalSteps || 0);
        setLevel(data.level || 1);
        setExperience(data.experience || 0);
        setStreak(data.streak || 0);
        
        // Update health metrics with real data
        healthMetrics[1].value = data.steps?.toString() || '0';
        healthMetrics[2].value = data.calories?.toString() || '0';
      }
      
      // Load user profile data from Firebase
      const user = auth.currentUser;
      if (user) {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          const diseases = data.diseases || [];
          setUserDiseases(diseases);
          
          const filteredRecommendations = recommendations.filter(rec => 
            diseases.includes(rec.condition)
          );
          setRecommendedActivities(filteredRecommendations);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUserData();
    setIsRefreshing(false);
  };

  type ResponsiveStyles = {
    metricCardContainer: ViewStyle;
    metricCard: ViewStyle;
    metricHeader: ViewStyle;
    metricIconContainer: ViewStyle;
    metricTitle: TextStyle;
    metricValue: TextStyle;
    metricRange: TextStyle;
  };

  const getResponsiveStyles = (): ResponsiveStyles => ({
    metricCardContainer: {
      width: '48%',
      marginBottom: isSmallScreen ? 10 : (isTablet ? 20 : 15),
      aspectRatio: 1,
    },
    metricCard: {
      padding: isSmallScreen ? 12 : (isTablet ? 20 : 15),
      height: '100%',
    },
    metricHeader: {
      marginBottom: isSmallScreen ? 8 : (isTablet ? 12 : 10),
      flexDirection: 'row',
      alignItems: 'center',
    },
    metricIconContainer: {
      width: isSmallScreen ? 40 : (isTablet ? 60 : 50),
      height: isSmallScreen ? 40 : (isTablet ? 60 : 50),
      borderRadius: isSmallScreen ? 20 : (isTablet ? 30 : 25),
      marginRight: 10,
    },
    metricTitle: {
      fontSize: isSmallScreen ? 14 : (isTablet ? 20 : 18),
      textAlign: 'left',
    },
    metricValue: {
      fontSize: isSmallScreen ? 20 : (isTablet ? 32 : 24),
      textAlign: 'left',
    },
    metricRange: {
      fontSize: isSmallScreen ? 12 : (isTablet ? 16 : 14),
      textAlign: 'left',
        },
      });

  const renderMetricCard = React.useCallback((metric: HealthMetric, index: number) => {
    // Special handling for steps and calories
    if (metric.id === 'activity') {
      metric.value = steps.toString();
    } else if (metric.id === 'calories') {
      metric.value = calories.toString();
    }

    const responsiveStyles = getResponsiveStyles();

    return (
      <Animatable.View 
        key={metric.id}
        animation="fadeInUp"
        delay={index * 100}
        duration={500}
        style={[styles.metricCardContainer, responsiveStyles.metricCardContainer]}
      >
        <View style={[styles.metricCard, responsiveStyles.metricCard]}>
          <View style={[styles.metricHeader, responsiveStyles.metricHeader]}>
            <View style={[styles.metricIconContainer, responsiveStyles.metricIconContainer]}>
              <metric.icon size={isSmallScreen ? 24 : (isTablet ? 32 : 28)} color={metric.color} />
            </View>
            <Text style={[styles.metricTitle, responsiveStyles.metricTitle]}>{metric.title}</Text>
          </View>
          <Text style={[styles.metricValue, responsiveStyles.metricValue]}>{metric.value}</Text>
          <Text style={[styles.metricRange, responsiveStyles.metricRange]}>{metric.range}</Text>
        </View>
      </Animatable.View>
    );
  }, [isSmallScreen, isTablet, isLandscape, steps, calories]);

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return theme.error;
      case 'medium': return theme.warning;
      case 'low': return theme.success;
      default: return theme.primary;
    }
  };

  const renderDosAndDonts = () => {
    const userDiseasesList = userDiseases.map(disease => disease.toLowerCase());
    const filteredDiseases = dosAndDonts.filter(item => 
      userDiseasesList.includes(item.disease.toLowerCase())
    );

    if (filteredDiseases.length === 0) {
      return (
        <View style={styles.dosDontsContainer}>
          <Text style={styles.noGuidelinesText}>
            Add health conditions in your profile to see personalized health guidelines
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.dosDontsContainer}>
        <Text style={[styles.title, { marginBottom: 15 }]}>Health Guidelines</Text>
        {filteredDiseases.map((item: DosAndDonts, index: number) => (
          <View key={index} style={styles.diseaseGuidelines}>
            <View style={styles.diseaseHeader}>
              <Text style={styles.diseaseName}>{item.title}</Text>
          </View>
            <View style={styles.guidelinesRow}>
              <View style={styles.dosContainer}>
                <Text style={[styles.guidelinesTitle, { color: theme.success }]}>Do's</Text>
                {item.dos.map((doItem: string, idx: number) => (
                  <View key={idx} style={styles.guidelineItem}>
                    <CheckCircle size={16} color={theme.success} />
                    <Text style={styles.guidelineText}>{doItem}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.dontsContainer}>
                <Text style={[styles.guidelinesTitle, { color: theme.error }]}>Don'ts</Text>
                {item.donts.map((dontItem: string, idx: number) => (
                  <View key={idx} style={styles.guidelineItem}>
                    <XCircle size={16} color={theme.error} />
                    <Text style={styles.guidelineText}>{dontItem}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          {
            padding: isSmallScreen ? 10 : (isTablet ? 20 : 15),
          }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <Animated.View style={[styles.header, headerStyle]}>
          <View style={styles.headerContent}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>Health Metrics</Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={isRefreshing}
              >
                <Animated.View style={[styles.refreshingIcon, refreshIconStyle]}>
                  <RefreshCw size={isSmallScreen ? 20 : 24} color={theme.text.primary} />
                </Animated.View>
              </TouchableOpacity>
        </View>
            <Text style={[styles.subtitle, isSmallScreen && styles.subtitleSmall]}>Your wellness companion</Text>
          </View>
        </Animated.View>

        <View style={styles.metricsContainer}>
          <View style={styles.metricsRow}>
            {healthMetrics.slice(0, 2).map((metric, index) => renderMetricCard(metric, index))}
        </View>
          <View style={styles.metricsRow}>
            {healthMetrics.slice(2, 4).map((metric, index) => renderMetricCard(metric, index + 2))}
                </View>
        </View>

        {/* Step Statistics Section */}
        <View style={[
          styles.sectionContainer,
          isSmallScreen && styles.sectionContainerSmall,
          isTablet && styles.sectionContainerTablet
        ]}>
          <Text style={[
            styles.sectionTitle,
            isSmallScreen && styles.sectionTitleSmall,
            isTablet && styles.sectionTitleTablet
          ]}>Step Statistics</Text>
          
          <View style={[
            styles.statsContainer,
            isSmallScreen && styles.statsContainerSmall,
            isTablet && styles.statsContainerTablet
          ]}>
            <View style={[
              styles.statCard,
              isSmallScreen && styles.statCardSmall,
              isTablet && styles.statCardTablet
            ]}>
              <Activity size={isSmallScreen ? 20 : 24} color="#4ECDC4" />
              <Text style={[
                styles.statValue,
                isSmallScreen && styles.statValueSmall,
                isTablet && styles.statValueTablet
              ]}>{steps.toLocaleString()}</Text>
              <Text style={[
                styles.statLabel,
                isSmallScreen && styles.statLabelSmall,
                isTablet && styles.statLabelTablet
              ]}>Today's Steps</Text>
        </View>

            <View style={[
              styles.statCard,
              isSmallScreen && styles.statCardSmall,
              isTablet && styles.statCardTablet
            ]}>
              <Flame size={isSmallScreen ? 20 : 24} color="#FF9F43" />
              <Text style={[
                styles.statValue,
                isSmallScreen && styles.statValueSmall,
                isTablet && styles.statValueTablet
              ]}>{calories.toLocaleString()}</Text>
              <Text style={[
                styles.statLabel,
                isSmallScreen && styles.statLabelSmall,
                isTablet && styles.statLabelTablet
              ]}>Calories Burned</Text>
                  </View>
            
            <View style={[
              styles.statCard,
              isSmallScreen && styles.statCardSmall,
              isTablet && styles.statCardTablet
            ]}>
              <Activity size={isSmallScreen ? 20 : 24} color="#6C5CE7" />
              <Text style={[
                styles.statValue,
                isSmallScreen && styles.statValueSmall,
                isTablet && styles.statValueTablet
              ]}>{distance.toFixed(2)} km</Text>
              <Text style={[
                styles.statLabel,
                isSmallScreen && styles.statLabelSmall,
                isTablet && styles.statLabelTablet
              ]}>Distance</Text>
                </View>
        </View>

          <View style={[
            styles.levelContainer,
            isSmallScreen && styles.levelContainerSmall,
            isTablet && styles.levelContainerTablet
          ]}>
            <View style={styles.levelInfo}>
              <Text style={[
                styles.levelLabel,
                isSmallScreen && styles.levelLabelSmall,
                isTablet && styles.levelLabelTablet
              ]}>Level {level}</Text>
              <Text style={[
                styles.experienceLabel,
                isSmallScreen && styles.experienceLabelSmall,
                isTablet && styles.experienceLabelTablet
              ]}>{experience} / {level * 100} XP</Text>
                  </View>
            <View style={styles.experienceBar}>
              <View 
                style={[
                  styles.experienceFill, 
                  { width: `${Math.min(100, (experience % 100) / 100 * 100)}%` }
                ]} 
              />
                </View>
        </View>

          {streak > 0 && (
            <View style={[
              styles.streakContainer,
              isSmallScreen && styles.streakContainerSmall,
              isTablet && styles.streakContainerTablet
            ]}>
              <Flame size={isSmallScreen ? 20 : 24} color="#FF9F43" />
              <Text style={[
                styles.streakText,
                isSmallScreen && styles.streakTextSmall,
                isTablet && styles.streakTextTablet
              ]}>{streak} Day{streak !== 1 ? 's' : ''} Streak</Text>
            </View>
          )}
        </View>

        <View style={styles.recommendationsContainer}>
          <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>Recommendations</Text>
          {recommendedActivities.length > 0 ? (
            recommendedActivities.map((rec) => (
              <View key={rec.id} style={styles.recommendationItem}>
                <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(rec.priority) }]} />
                <Text style={[styles.recommendationText, isSmallScreen && styles.recommendationTextSmall]}>
                  {rec.text}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noGuidelinesText}>Add health conditions in your profile to see personalized recommendations</Text>
          )}
          </View>

        {renderDosAndDonts()}
        
        <WeeklyHealthReport />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background.light,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: theme.background.light,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.text.secondary,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'column',
    gap: 15,
    padding: 15,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  metricCardContainer: {
    width: '48%',
    aspectRatio: 1,
  },
  metricCard: {
    height: '100%',
    padding: 15,
    borderRadius: 20,
    backgroundColor: theme.background.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    justifyContent: 'center',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background.input,
  },
  metricTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text.primary,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginVertical: 5,
  },
  metricRange: {
    fontSize: 14,
    color: theme.text.secondary,
    opacity: 0.8,
  },
  recommendationsContainer: {
    padding: 15,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.background.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    marginBottom: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
    backgroundColor: theme.background.input,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  recommendationText: {
    color: theme.text.primary,
    fontSize: 16,
    flex: 1,
    letterSpacing: 0.3,
  },
  weeklyReportContainer: {
    padding: '5%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  weeklyReportTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: '5%',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  weeklyMetricCard: {
    width: '100%',
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weeklyMetricCardLandscape: {
    width: '49%',
    marginBottom: 10,
  },
  weeklyMetricCardTablet: {
    width: '49%',
    marginBottom: 20,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartContainer: {
    marginBottom: 15,
  },
  chartContainerLandscape: {
    marginBottom: 10,
  },
  chartContainerTablet: {
    marginBottom: 20,
  },
  metricRangeSmall: {
    fontSize: 12,
  },
  metricDetails: {
    marginTop: 5,
  },
  metricDetailsText: {
    color: theme.text.secondary,
    fontSize: 14,
    opacity: 0.8,
  },
  noRecommendations: {
    color: theme.text.secondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  noRecommendationsSmall: {
    fontSize: 14,
  },
  goalsContainer: {
    padding: '5%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  goalItem: {
    marginBottom: 15,
    padding: '3%',
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
  },
  goalProgress: {
    height: 8,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 4,
  },
  goalBar: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 4,
  },
  goalText: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  goalTextSmall: {
    fontSize: 14,
  },
  insightsButton: {
    margin: '5%',
    marginTop: 0,
    borderRadius: 15,
    overflow: 'hidden',
  },
  insightsButtonLandscape: {
    margin: '4%',
  },
  insightsContent: {
    padding: '5%',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 15,
  },
  insightsTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  insightsTitleSmall: {
    fontSize: 16,
  },
  insightsSubtitle: {
    color: theme.text.secondary,
    opacity: 0.8,
    marginTop: '1%',
    letterSpacing: 0.3,
  },
  insightsSubtitleSmall: {
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: theme.background.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginBottom: '5%',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  closeModalButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: 20,
  },
  insightCard: {
    alignItems: 'center',
    padding: '5%',
    borderRadius: 15,
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    marginBottom: '5%',
  },
  insightIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '4%',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  insightValue: {
    color: theme.text.primary,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: '1%',
    letterSpacing: 0.5,
  },
  insightRange: {
    color: theme.text.secondary,
    opacity: 0.7,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  insightDetails: {
    marginTop: '5%',
  },
  insightDetailsTitle: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: '4%',
    letterSpacing: 0.5,
  },
  trendContainer: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: '3%',
  },
  trendBar: {
    width: 30,
    height: '100%',
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  trendBarFill: {
    width: '100%',
    borderRadius: 15,
  },
  trendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendLabel: {
    color: theme.text.secondary,
    opacity: 0.7,
    fontSize: 12,
    width: 30,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  metricCardLandscape: {
    width: '49%',
    marginBottom: 10,
  },
  metricCardSmall: {
    width: '49%',
    marginBottom: 10,
  },
  metricCardTablet: {
    width: '49%',
    marginBottom: 20,
  },
  metricIconContainerSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  metricIconContainerTablet: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  metricTitleSmall: {
    fontSize: 16,
  },
  metricTitleTablet: {
    fontSize: 20,
  },
  metricValueSmall: {
    fontSize: 22,
  },
  metricValueTablet: {
    fontSize: 32,
  },
  sectionLandscape: {
    padding: '4%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '3%',
  },
  sectionTitleSmall: {
    fontSize: 16,
  },
  sectionTitleTablet: {
    fontSize: 20,
  },
  recommendationTextSmall: {
    fontSize: 14,
  },
  modalContentSmall: {
    width: '95%',
    padding: '4%',
  },
  modalContentLandscape: {
    maxHeight: '80%',
  },
  modalTitleSmall: {
    fontSize: 20,
    marginBottom: '4%',
  },
  insightValueSmall: {
    fontSize: 28,
  },
  insightRangeSmall: {
    fontSize: 14,
  },
  insightDetailsTitleSmall: {
    fontSize: 16,
    marginBottom: '3%',
  },
  trendLabelSmall: {
    fontSize: 10,
  },
  noGuidelinesText: {
    color: theme.text.secondary,
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
    letterSpacing: 0.3,
    padding: 20,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.background.input,
  },
  refreshingIcon: {
    opacity: 1,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 15,
  },
  scrollViewContentLandscape: {
    padding: '4%',
  },
  weeklyReportContainerLandscape: {
    padding: '4%',
  },
  weeklyReportContainerTablet: {
    padding: '3%',
  },
  weeklyReportTitleTablet: {
    fontSize: 20,
  },
  metricsGridLandscape: {
    gap: 10,
  },
  metricsGridTablet: {
    gap: 20,
  },
  diseaseContainer: {
    padding: '5%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  diseaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  diseaseItem: {
    width: '49%',
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  diseaseIconContainer: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  diseaseLabel: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  guidelinesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  guidelinesTitle: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guidelineText: {
    color: theme.text.primary,
    fontSize: 14,
    marginLeft: 8,
  },
  dosContainer: {
    flex: 1,
  },
  dontsContainer: {
    flex: 1,
  },
  dosDontsContainer: {
    padding: 15,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.background.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    marginTop: 20,
  },
  diseaseGuidelines: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 15,
    backgroundColor: theme.background.input,
  },
  diseaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  diseaseName: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  weeklyReportTitleSmall: {
    fontSize: 16,
  },
  metricTrendContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  metricTrend: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  metricDetailsTextSmall: {
    fontSize: 10,
  },
  headerContent: {
    padding: 20,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: theme.background.card,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border.default,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text.primary,
  },
  titleSmall: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 16,
    color: theme.text.secondary,
    opacity: 0.8,
  },
  subtitleSmall: {
    fontSize: 14,
  },
  metricsContainerLandscape: {
    flexDirection: 'row',
  },
  metricsContainerTablet: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  statsContainerSmall: {
    flexDirection: 'column',
    gap: 10,
  },
  statsContainerTablet: {
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  statCardSmall: {
    padding: 12,
    marginHorizontal: 0,
    marginVertical: 4,
  },
  statCardTablet: {
    padding: 20,
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginVertical: 8,
  },
  statValueSmall: {
    fontSize: 20,
  },
  statValueTablet: {
    fontSize: 28,
  },
  statLabel: {
    fontSize: 14,
    color: theme.text.secondary,
    textAlign: 'center',
  },
  statLabelSmall: {
    fontSize: 12,
  },
  statLabelTablet: {
    fontSize: 16,
  },
  levelContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  levelContainerSmall: {
    padding: 12,
  },
  levelContainerTablet: {
    padding: 20,
  },
  levelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text.primary,
  },
  levelLabelSmall: {
    fontSize: 14,
  },
  levelLabelTablet: {
    fontSize: 18,
  },
  experienceLabel: {
    fontSize: 14,
    color: theme.text.secondary,
  },
  experienceLabelSmall: {
    fontSize: 12,
  },
  experienceLabelTablet: {
    fontSize: 16,
  },
  experienceBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  experienceFill: {
    height: '100%',
    backgroundColor: theme.accent,
    borderRadius: 4,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 67, 0.2)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  streakContainerSmall: {
    padding: 10,
  },
  streakContainerTablet: {
    padding: 16,
  },
  streakText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginLeft: 8,
  },
  streakTextSmall: {
    fontSize: 14,
  },
  streakTextTablet: {
    fontSize: 18,
  },
  sectionContainer: {
    padding: 15,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.background.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    marginBottom: 20,
  },
  sectionContainerSmall: {
    padding: 10,
  },
  sectionContainerTablet: {
    padding: 20,
  },
});
