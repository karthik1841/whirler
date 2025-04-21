import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { auth, db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Heart, Footprints, Flame, Trophy, Coins, Star, Award, TrendingUp, BarChart2, Zap } from 'lucide-react-native';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 40;

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
  success: '#2a5298',
  disabled: 'rgba(255, 255, 255, 0.6)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  border: 'rgba(148, 163, 184, 0.1)',
  shadow: '#000',
  secondaryText: '#94a3b8',
  chartGradient: ['#4FC3F7', '#1E1E2D'] as [string, string],
};

// Sample data for charts
const weeklySteps = [5000, 6500, 8000, 7200, 9000, 8500, 10000];
const weeklyCalories = [250, 300, 280, 320, 350, 400, 380];
const weeklyHeartRate = [72, 75, 70, 68, 73, 71, 69];

const ChartBar = ({ value, maxValue, label, color, index }: { value: number, maxValue: number, label: string, color: string, index: number }) => {
  const height = (value / maxValue) * 100;
  return (
    <View style={styles.chartBarContainer}>
      <LinearGradient
        colors={colors.chartGradient}
        style={[styles.chartBar, { height: `${height}%` }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <Text style={styles.chartLabel}>{label}</Text>
      <Text style={styles.chartValue}>{value}</Text>
    </View>
  );
};

export default function HomeScreen() {
  const user = auth.currentUser;
  const [profilePhoto, setProfilePhoto] = useState<string | null | undefined>(user?.photoURL);
  const [isLoading, setIsLoading] = useState(true);
  const [stepCount, setStepCount] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [coins, setCoins] = useState(0);
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);

  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (!user) return;
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          setProfilePhoto(data.photoUrl || user?.photoURL || null);
        }
      } catch (error) {
        console.error('Error fetching profile photo:', error);
      }
    };
    fetchProfilePhoto();
  }, [user]);

  // Calculate calories based on steps (average 0.04 calories per step)
  useEffect(() => {
    setCaloriesBurned(Math.round(stepCount * 0.04));
  }, [stepCount]);

  // Function to collect coins
  const collectCoins = (amount: number) => {
    setCoins(prevCoins => prevCoins + amount);
    setShowCoinAnimation(true);
    setTimeout(() => setShowCoinAnimation(false), 2000);
  };

  // Function to handle achievement completion
  const handleAchievementComplete = (achievement: string) => {
    // Award coins based on achievement
    switch(achievement) {
      case 'Step Master':
        collectCoins(50);
        break;
      case 'Fitness Streak':
        collectCoins(100);
        break;
      case 'Calorie Burner':
        collectCoins(75);
        break;
      case 'Quick Starter':
        collectCoins(60);
        break;
      case 'Heart Health':
        collectCoins(80);
        break;
      case 'Energy Boost':
        collectCoins(90);
        break;
    }
  };

  const handleProfilePress = () => {
    router.push('/profile');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradient}
        style={styles.gradientBackground}
      />
      
      <ScrollView style={styles.scrollView}>
        {/* Header with Profile Image and Coins */}
        <View style={styles.header}>
          <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={handleProfilePress}>
                <Image
                  source={{
                    uri: profilePhoto || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
                  }}
                  style={styles.profileImage}
                />
              </TouchableOpacity>
              <View style={styles.greetingContainer}>
                <Text style={styles.greeting}>Welcome back,</Text>
                <TouchableOpacity onPress={handleProfilePress}>
                  <Text style={styles.username}>
                    {user?.displayName || user?.email?.split('@')[0] || 'User'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.coinsContainer}
                onPress={() => collectCoins(10)} // Add 10 coins when tapped
              >
                <Coins size={24} color={colors.accent} />
                <Text style={styles.coinsText}>{coins}</Text>
                {showCoinAnimation && (
                  <View style={styles.coinAnimation}>
                    <Text style={styles.coinAnimationText}>+10</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Heart size={24} color={colors.accent} />
            <Text style={styles.statNumber}>72</Text>
            <Text style={styles.statLabel}>BPM</Text>
          </View>
          <View style={styles.statCard}>
            <Footprints size={24} color={colors.accent} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Steps</Text>
          </View>
          <View style={styles.statCard}>
            <Flame size={24} color={colors.accent} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>

        {/* Weekly Stats Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Weekly Progress</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <TrendingUp size={24} color={colors.accent} />
              <Text style={styles.chartTitle}>Steps & Calories</Text>
            </View>
            <View style={styles.chartBars}>
              {weeklySteps.map((value, index) => (
                <ChartBar
                  key={index}
                  value={value}
                  maxValue={10000}
                  label={['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                  color={colors.accent}
                  index={index}
                />
              ))}
            </View>
                  </View>
                </View>

        {/* Heart Rate Chart */}
        <View style={styles.chartSection}>
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <BarChart2 size={24} color={colors.accent} />
              <Text style={styles.chartTitle}>Heart Rate Trend</Text>
            </View>
            <View style={styles.chartBars}>
              {weeklyHeartRate.map((value, index) => (
                <ChartBar
                  key={index}
                  value={value}
                  maxValue={100}
                  label={['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                  color={colors.error}
                  index={index}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.achievementsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Achievements</Text>
            <View style={styles.totalCoins}>
              <Coins size={20} color={colors.accent} />
              <Text style={styles.totalCoinsText}>{coins}</Text>
            </View>
          </View>
          <View style={styles.achievementsContainer}>
            <View style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Trophy size={28} color={colors.accent} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>Step Master</Text>
                <Text style={styles.achievementDescription}>Reached 10,000 steps in a day</Text>
                <View style={styles.achievementReward}>
                  <Coins size={18} color={colors.accent} />
                  <Text style={styles.achievementCoins}>+50</Text>
                </View>
              </View>
            </View>
            <View style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Star size={28} color={colors.accent} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>Fitness Streak</Text>
                <Text style={styles.achievementDescription}>7 days of consistent workouts</Text>
                <View style={styles.achievementReward}>
                  <Coins size={18} color={colors.accent} />
                  <Text style={styles.achievementCoins}>+100</Text>
                </View>
              </View>
            </View>
            <View style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Award size={28} color={colors.accent} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>Calorie Burner</Text>
                <Text style={styles.achievementDescription}>Burned 500 calories in one workout</Text>
                <View style={styles.achievementReward}>
                  <Coins size={18} color={colors.accent} />
                  <Text style={styles.achievementCoins}>+75</Text>
                </View>
              </View>
            </View>
            <View style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Zap size={28} color={colors.accent} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>Quick Starter</Text>
                <Text style={styles.achievementDescription}>Completed 5 workouts in a week</Text>
                <View style={styles.achievementReward}>
                  <Coins size={18} color={colors.accent} />
                  <Text style={styles.achievementCoins}>+60</Text>
                </View>
              </View>
            </View>
            <View style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Heart size={28} color={colors.accent} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>Heart Health</Text>
                <Text style={styles.achievementDescription}>Maintained optimal heart rate for 30 minutes</Text>
                <View style={styles.achievementReward}>
                  <Coins size={18} color={colors.accent} />
                  <Text style={styles.achievementCoins}>+80</Text>
                </View>
              </View>
            </View>
            <View style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Flame size={28} color={colors.accent} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>Energy Boost</Text>
                <Text style={styles.achievementDescription}>Burned 1000 calories in a day</Text>
                <View style={styles.achievementReward}>
                  <Coins size={18} color={colors.accent} />
                  <Text style={styles.achievementCoins}>+90</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  header: {
    padding: 20,
    paddingTop: 60,
  },
  blurContainer: {
    padding: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 32,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    color: colors.secondaryText,
    letterSpacing: 0.5,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlay,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  coinsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  coinAnimation: {
    position: 'absolute',
    top: -20,
    right: 0,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    opacity: 0,
    transform: [{ translateY: -20 }],
  },
  coinAnimationText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 24,
    borderRadius: 32,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statLabel: {
    fontSize: 16,
    color: colors.secondaryText,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  chartSection: {
    padding: 20,
  },
  chartContainer: {
    padding: 24,
    borderRadius: 32,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 12,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingBottom: 24,
  },
  chartBarContainer: {
    alignItems: 'center',
    width: (CHART_WIDTH - 40) / 7,
  },
  chartBar: {
    width: '80%',
    borderRadius: 12,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 8,
  },
  chartValue: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
    fontWeight: 'bold',
  },
  achievementsSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  totalCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlay,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalCoinsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
  },
  achievementsContainer: {
    gap: 16,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 32,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  achievementIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  achievementDescription: {
    fontSize: 16,
    color: colors.secondaryText,
    marginBottom: 12,
    lineHeight: 22,
  },
  achievementReward: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  achievementCoins: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
});