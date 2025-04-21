import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, TextInput, Modal, Switch, Platform, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, LogOut, User as UserIcon, Plus, Clock, Bell, Heart, Activity, Droplet, Brain } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { Picker } from '@react-native-picker/picker';
import { useLanguage } from '@/hooks/useLanguage';
import { translations } from '@/config/translations';

interface Profile {
  photoUrl: string | null | undefined;
  height: number | null | undefined;
  weight: number | null | undefined;
  gender: string | null | undefined;
  age: number | null | undefined;
  diseases: string[];
  wakeUpTime: Date | null;
  sleepTime: Date | null;
  isAlarmEnabled: boolean;
  language: string;
}

interface HealthMetrics {
  height: number | null;
  weight: number | null;
  age: number | null;
  gender: string | null;
}

const languages = [
  { code: 'en', name: 'English', localName: 'English' },
  { code: 'hi', name: 'Hindi', localName: 'हिन्दी' },
  { code: 'te', name: 'Telugu', localName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', localName: 'ಕನ್ನಡ' },
];

// Remove theme object and replace with single color scheme
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

const calculateBMIPercentage = (bmi: string) => {
  const bmiNum = parseFloat(bmi);
  if (bmiNum < 18.5) return 25;
  if (bmiNum < 25) return 50;
  if (bmiNum < 30) return 75;
  return 100;
};

const getBMIColor = (bmi: string) => {
  const bmiNum = parseFloat(bmi);
  if (bmiNum < 18.5) return '#FF6B6B';
  if (bmiNum < 25) return '#4FC3F7';
  if (bmiNum < 30) return '#FFA500';
  return '#FF0000';
};

const getBMICategory = (bmi: string | null) => {
  if (!bmi) return null;
  const bmiNum = parseFloat(bmi);
  if (bmiNum < 18.5) return 'Underweight';
  if (bmiNum < 25) return 'Normal';
  if (bmiNum < 30) return 'Overweight';
  return 'Obese';
};

const diseaseOptions = [
  { 
    id: 'diabetes', 
    label: 'Diabetes', 
    icon: Droplet, 
    color: '#1e3c72',
  },
  { 
    id: 'hypertension', 
    label: 'Hypertension', 
    icon: Activity, 
    color: '#2a5298',
  },
  { 
    id: 'thyroid', 
    label: 'Thyroid', 
    icon: Brain, 
    color: '#1e3c72',
  },
];

type TranslationKey = keyof typeof translations.en;

export default function ProfileScreen() {
  const user = auth.currentUser;
  const { language, changeLanguage } = useLanguage();
  const [profile, setProfile] = useState<Profile>({
    photoUrl: null,
    height: null,
    weight: null,
    gender: null,
    age: null,
    diseases: [],
    wakeUpTime: null,
    sleepTime: null,
    isAlarmEnabled: false,
    language: language,
  });
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [selectedTimeType, setSelectedTimeType] = useState<'wakeUp' | 'sleep'>('wakeUp');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const circularProgressRef = useRef<AnimatedCircularProgress>(null);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>({
    height: null,
    weight: null,
    age: null,
    gender: null,
  });
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);
  const [selectedGender, setSelectedGender] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkNotificationPermission();
    } else {
      setError('No user logged in');
      setLoading(false);
    }
  }, [user]);

  const checkNotificationPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationPermission(status === 'granted');
  };

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotificationPermission(status === 'granted');
    return status === 'granted';
  };

  const scheduleNotification = async (time: Date, type: 'wakeUp' | 'sleep') => {
    if (!notificationPermission) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }

    const trigger = new Date(time);
    trigger.setSeconds(0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: type === 'wakeUp' ? 'Time to Wake Up!' : 'Time to Sleep!',
        body: type === 'wakeUp' ? 'Start your day with energy!' : 'Get some rest for tomorrow!',
        sound: true,
      },
      trigger: {
        hour: trigger.getHours(),
        minute: trigger.getMinutes(),
        repeats: true,
        channelId: 'default',
      },
    });
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setIsTimePickerVisible(false);
    if (selectedTime) {
      const updates = selectedTimeType === 'wakeUp' 
        ? { wakeUpTime: selectedTime }
        : { sleepTime: selectedTime };
      
      updateProfile(updates);
      if (profile.isAlarmEnabled) {
        scheduleNotification(selectedTime, selectedTimeType);
      }
    }
  };

  const toggleAlarm = async (value: boolean) => {
    updateProfile({ isAlarmEnabled: value });
    if (value) {
      if (profile.wakeUpTime) await scheduleNotification(profile.wakeUpTime, 'wakeUp');
      if (profile.sleepTime) await scheduleNotification(profile.sleepTime, 'sleep');
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const fetchProfile = async () => {
    if (!user) {
      setError('No user logged in');
      setLoading(false);
      return;
    }
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const data = profileSnap.data();
        setProfile({
          ...data,
          diseases: data.diseases || [],
          wakeUpTime: data.wakeUpTime?.toDate() || null,
          sleepTime: data.sleepTime?.toDate() || null,
        } as Profile);
      } else {
        const newProfile: Profile = {
          photoUrl: null,
          height: null,
          weight: null,
          gender: null,
          age: null,
          diseases: [],
          wakeUpTime: null,
          sleepTime: null,
          isAlarmEnabled: false,
          language: language,
        };
        await setDoc(profileRef, newProfile);
        setProfile(newProfile);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
      setLoading(false);
    }
  };

  const pickImage = async () => {
    if (!user) {
      setError('No user logged in');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          photoUrl: result.assets[0].uri,
        });
        setProfile((prev) => ({ ...prev, photoUrl: result.assets[0].uri }));
      } catch (error) {
        console.error('Error updating profile photo:', error);
        setError('Failed to update profile photo');
      }
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      setError('No user logged in');
      return;
    }
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, updates);
      setProfile((prev) => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    }
  };

  const calculateBMI = () => {
    if (profile.height && profile.weight) {
      const heightInMeters = profile.height / 100;
      return (profile.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return null;
  };

  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateHealthMetrics = async (updates: Partial<HealthMetrics>) => {
    if (!user) {
      setError('No user logged in');
      return;
    }
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, updates);
      setHealthMetrics(prev => ({ ...prev, ...updates }));
      setProfile(prev => ({ ...prev, ...updates }));
      setIsEditingMetrics(false);
    } catch (error) {
      console.error('Error updating health metrics:', error);
      setError('Failed to update health metrics');
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await changeLanguage(newLanguage);
      await updateProfile({ language: newLanguage });
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>{t('profile.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colors.gradient}
        style={styles.gradientBackground}
      />
      
      <ScrollView style={styles.scrollView}>
        <Animatable.View animation="fadeInDown" duration={1000}>
          <View style={styles.header}>
            <BlurView intensity={80} tint="dark" style={[styles.profileContainer, { backgroundColor: colors.card }]}>
              <View style={styles.profileHeader}>
                <View style={styles.headerButtons}>
                <Animatable.View animation="pulse" iterationCount="infinite" style={styles.signOutButton}>
                  <TouchableOpacity onPress={handleSignOut}>
                    <LinearGradient
                        colors={colors.gradient}
                      style={styles.signOutGradient}
                    >
                        <LogOut size={20} color={colors.text} />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animatable.View>
                </View>
                <View style={styles.profileImageContainer}>
                  <Animatable.Image 
                    animation="bounceIn"
                    duration={1500}
                    source={{ 
                      uri: profile.photoUrl || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop'
                    }} 
                    style={styles.profileImage} 
                  />
                  <Animatable.View animation="bounceIn" duration={500}>
                    <TouchableOpacity style={styles.editImageButton} onPress={pickImage}>
                      <Camera size={20} color={colors.text} />
                    </TouchableOpacity>
                  </Animatable.View>
                </View>
              </View>
              <Animatable.Text animation="fadeIn" duration={1000} style={[styles.name, { color: colors.text }]}>
                {user?.displayName || t('profile.user')}
              </Animatable.Text>
              <Animatable.Text animation="fadeIn" duration={1000} delay={200} style={[styles.email, { color: colors.text }]}>
                {user?.email}
              </Animatable.Text>
            </BlurView>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={1000} delay={400}>
          <View style={[styles.section, styles.bmiSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profile.healthStatus')}</Text>
            </View>
            <BlurView intensity={80} tint="dark" style={styles.card}>
              {bmi ? (
                <View style={styles.bmiContainer}>
                  <AnimatedCircularProgress
                    ref={circularProgressRef}
                    size={200}
                    width={15}
                    fill={calculateBMIPercentage(bmi)}
                    tintColor={getBMIColor(bmi)}
                    backgroundColor="rgba(255, 255, 255, 0.2)"
                    rotation={-90}
                    arcSweepAngle={180}
                    lineCap="round"
                  >
                    {() => (
                      <View style={styles.speedometerContent}>
                        <Text style={styles.speedometerText}>{bmi}</Text>
                        <Text style={styles.speedometerLabel}>BMI</Text>
                      </View>
                    )}
                  </AnimatedCircularProgress>
                  <View style={styles.bmiLabels}>
                    <View style={styles.bmiLabelItem}>
                      <View style={[styles.bmiIndicator, { backgroundColor: '#FF6B6B' }]} />
                      <Text style={[styles.labelText, bmiCategory === 'Underweight' && styles.activeLabel]}>
                        {t('profile.underweight')}
                      </Text>
                    </View>
                    <View style={styles.bmiLabelItem}>
                      <View style={[styles.bmiIndicator, { backgroundColor: '#4FC3F7' }]} />
                      <Text style={[styles.labelText, bmiCategory === 'Normal' && styles.activeLabel]}>
                        {t('profile.normal')}
                      </Text>
                    </View>
                    <View style={styles.bmiLabelItem}>
                      <View style={[styles.bmiIndicator, { backgroundColor: '#FFA500' }]} />
                      <Text style={[styles.labelText, bmiCategory === 'Overweight' && styles.activeLabel]}>
                        {t('profile.overweight')}
                      </Text>
                    </View>
                    <View style={styles.bmiLabelItem}>
                      <View style={[styles.bmiIndicator, { backgroundColor: '#FF0000' }]} />
                      <Text style={[styles.labelText, bmiCategory === 'Obese' && styles.activeLabel]}>
                        {t('profile.obese')}
                      </Text>
                    </View>
                  </View>
                  <Animatable.Text animation="fadeIn" duration={1000} style={styles.bmiText}>
                    BMI: {bmi} ({bmiCategory})
                  </Animatable.Text>
                </View>
              ) : (
                <Text style={styles.noConditions}>{t('profile.bmiNotAvailable')}</Text>
              )}
            </BlurView>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={1000} delay={200}>
          <View style={[styles.section, styles.healthMetricsSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profile.healthMetrics')}</Text>
              <TouchableOpacity onPress={() => setIsEditingMetrics(true)}>
                <Text style={styles.editButton}>{t('profile.edit')}</Text>
              </TouchableOpacity>
            </View>
            <BlurView intensity={40} tint="light" style={styles.card}>
              <View style={styles.metricsGrid}>
                <Animatable.View 
                  animation="zoomIn" 
                  duration={500} 
                  delay={300}
                  style={styles.metricItem}
                >
                  <View style={styles.metricIconContainer}>
                    <Text style={styles.metricIcon}>📏</Text>
                  </View>
                  <Text style={styles.metricLabel}>{t('profile.height')}</Text>
                  <Text style={styles.metricValue}>
                    {healthMetrics.height ? `${healthMetrics.height} cm` : t('profile.notSet')}
                  </Text>
                </Animatable.View>

                <Animatable.View 
                  animation="zoomIn" 
                  duration={500} 
                  delay={400}
                  style={styles.metricItem}
                >
                  <View style={styles.metricIconContainer}>
                    <Text style={styles.metricIcon}>⚖️</Text>
                  </View>
                  <Text style={styles.metricLabel}>{t('profile.weight')}</Text>
                  <Text style={styles.metricValue}>
                    {healthMetrics.weight ? `${healthMetrics.weight} kg` : t('profile.notSet')}
                  </Text>
                </Animatable.View>

                <Animatable.View 
                  animation="zoomIn" 
                  duration={500} 
                  delay={500}
                  style={styles.metricItem}
                >
                  <View style={styles.metricIconContainer}>
                    <Text style={styles.metricIcon}>🎂</Text>
                  </View>
                  <Text style={styles.metricLabel}>{t('profile.age')}</Text>
                  <Text style={styles.metricValue}>
                    {healthMetrics.age ? `${healthMetrics.age} ${t('profile.years')}` : t('profile.notSet')}
                  </Text>
                </Animatable.View>

                <Animatable.View 
                  animation="zoomIn" 
                  duration={500} 
                  delay={600}
                  style={styles.metricItem}
                >
                  <View style={styles.metricIconContainer}>
                    <Text style={styles.metricIcon}>👤</Text>
                  </View>
                  <Text style={styles.metricLabel}>{t('profile.gender')}</Text>
                  <Text style={styles.metricValue}>
                    {healthMetrics.gender || t('profile.notSet')}
                  </Text>
                </Animatable.View>
              </View>
            </BlurView>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={1000} delay={600}>
          <View style={[styles.section, styles.languageSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
            </View>
            <BlurView intensity={40} tint="light" style={styles.card}>
              <View style={styles.languageGrid}>
                {languages.map((lang) => (
                      <TouchableOpacity
                    key={lang.code}
                        style={[
                      styles.languageOption,
                      language === lang.code && styles.languageOptionSelected
                    ]}
                    onPress={() => handleLanguageChange(lang.code)}
                  >
                    <Text style={styles.languageName}>{lang.name}</Text>
                    <Text style={styles.languageLocalName}>{lang.localName}</Text>
                    {language === lang.code && (
                      <View style={styles.selectedIndicator} />
                    )}
                      </TouchableOpacity>
                ))}
              </View>
            </BlurView>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={1000} delay={400}>
          <View style={[styles.section, styles.alarmSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profile.sleepSchedule')}</Text>
              <Switch
                value={profile.isAlarmEnabled}
                onValueChange={toggleAlarm}
                trackColor={{ false: '#767577', true: '#FF6B6B' }}
                thumbColor={profile.isAlarmEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
            <BlurView intensity={40} tint="light" style={styles.card}>
              <View style={styles.alarmContainer}>
                <Animatable.View animation="slideInLeft" duration={500} delay={500}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    setSelectedTimeType('wakeUp');
                    setIsTimePickerVisible(true);
                  }}
                >
                    <Clock size={24} color="#4FC3F7" />
                    <Text style={styles.timeLabel}>{t('profile.wakeUpTime')}</Text>
                    <Text style={styles.timeValue}>
                      {profile.wakeUpTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || t('profile.notSet')}
                    </Text>
                </TouchableOpacity>
                </Animatable.View>
                <Animatable.View animation="slideInRight" duration={500} delay={600}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    setSelectedTimeType('sleep');
                    setIsTimePickerVisible(true);
                  }}
                >
                    <Bell size={24} color="#4FC3F7" />
                    <Text style={styles.timeLabel}>{t('profile.sleepTime')}</Text>
                    <Text style={styles.timeValue}>
                      {profile.sleepTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || t('profile.notSet')}
                    </Text>
                </TouchableOpacity>
                </Animatable.View>
              </View>
            </BlurView>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={1000} delay={300}>
          <View style={[styles.section, styles.diseaseSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profile.diseases')}</Text>
            </View>
            <BlurView intensity={40} tint="light" style={styles.card}>
              <View style={styles.metricsGrid}>
                {diseaseOptions.map((disease) => {
                  const Icon = disease.icon;
                  const isSelected = (profile.diseases || []).includes(disease.id);
                  return (
                    <Animatable.View
                      key={disease.id}
                      animation="zoomIn"
                      duration={500}
                      style={styles.metricItem}
                    >
                      <View style={[styles.metricIconContainer, { backgroundColor: isSelected ? disease.color + '20' : colors.background }]}>
                        <Icon size={24} color={isSelected ? disease.color : '#4FC3F7'} />
                      </View>
                        <Text style={[
                        styles.metricLabel,
                        isSelected && { color: disease.color },
                        ]}>
                        {t(disease.id)}
                        </Text>
                      <TouchableOpacity
                        style={[
                          styles.diseaseToggle,
                          isSelected && { backgroundColor: disease.color + '20', borderColor: disease.color },
                        ]}
                        onPress={() => {
                          const updatedDiseases = isSelected ? [] : [disease.id];
                          updateProfile({ diseases: updatedDiseases });
                        }}
                      >
                        <Text style={[
                          styles.diseaseToggleText,
                          isSelected && { color: disease.color },
                        ]}>
                          {isSelected ? t('profile.selected') : t('profile.select')}
                  </Text>
                      </TouchableOpacity>
                    </Animatable.View>
                  );
                })}
                </View>
            </BlurView>
          </View>
        </Animatable.View>

      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <BlurView intensity={80} tint="dark" style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('profile.editProfile')}</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('profile.height')} (cm)</Text>
              <TextInput
                style={styles.input}
                value={profile.height?.toString() ?? undefined}
                onChangeText={(text) => updateProfile({ height: parseFloat(text) || null })}
                keyboardType="numeric"
                placeholder={t('profile.enterHeight')}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('profile.weight')} (kg)</Text>
              <TextInput
                style={styles.input}
                value={profile.weight?.toString() ?? undefined}
                onChangeText={(text) => updateProfile({ weight: parseFloat(text) || null })}
                keyboardType="numeric"
                placeholder={t('profile.enterWeight')}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('profile.gender')}</Text>
              <TextInput
                style={styles.input}
                value={profile.gender ?? undefined}
                onChangeText={(text) => updateProfile({ gender: text || null })}
                placeholder={t('profile.enterGender')}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('profile.age')}</Text>
              <TextInput
                style={styles.input}
                value={profile.age?.toString() ?? undefined}
                onChangeText={(text) => updateProfile({ age: parseFloat(text) || null })}
                keyboardType="numeric"
                placeholder={t('profile.enterAge')}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsEditModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>{t('profile.close')}</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>

        <Modal
          visible={isEditingMetrics}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsEditingMetrics(false)}
        >
          <View style={styles.modalContainer}>
            <BlurView intensity={80} tint="dark" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('profile.editHealthMetrics')}</Text>
                <TouchableOpacity onPress={() => setIsEditingMetrics(false)}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('profile.height')} (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={healthMetrics.height?.toString() ?? ''}
                  onChangeText={(text) => setHealthMetrics(prev => ({ ...prev, height: parseFloat(text) || null }))}
                  keyboardType="numeric"
                  placeholder={t('profile.enterHeight')}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('profile.weight')} (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={healthMetrics.weight?.toString() ?? ''}
                  onChangeText={(text) => setHealthMetrics(prev => ({ ...prev, weight: parseFloat(text) || null }))}
                  keyboardType="numeric"
                  placeholder={t('profile.enterWeight')}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('profile.age')}</Text>
                <TextInput
                  style={styles.input}
                  value={healthMetrics.age?.toString() ?? ''}
                  onChangeText={(text) => setHealthMetrics(prev => ({ ...prev, age: parseFloat(text) || null }))}
                  keyboardType="numeric"
                  placeholder={t('profile.enterAge')}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('profile.gender')}</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={healthMetrics.gender || ''}
                    onValueChange={(value) => setHealthMetrics(prev => ({ ...prev, gender: value || null }))}
                    style={styles.picker}
                    dropdownIconColor="#4FC3F7"
                  >
                    <Picker.Item label={t('profile.selectGender')} value="" />
                    <Picker.Item label={t('profile.male')} value="Male" />
                    <Picker.Item label={t('profile.female')} value="Female" />
                  </Picker>
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => updateHealthMetrics(healthMetrics)}
              >
                <Text style={styles.saveButtonText}>{t('profile.saveChanges')}</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>

      {isTimePickerVisible && (
        <DateTimePicker
          value={selectedTimeType === 'wakeUp' ? profile.wakeUpTime || new Date() : profile.sleepTime || new Date()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  loadingText: {
    color: colors.text,
    fontSize: 18,
  } as TextStyle,
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  } as ViewStyle,
  scrollView: {
    flex: 1,
  } as ViewStyle,
  header: {
    padding: '3%',
    paddingTop: Platform.OS === 'ios' ? '12%' : '6%',
  } as ViewStyle,
  profileContainer: {
    padding: '4%',
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  } as ViewStyle,
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    justifyContent: 'space-between',
  } as ViewStyle,
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  } as ViewStyle,
  signOutButton: {
    marginTop: '5%',
  } as ViewStyle,
  signOutGradient: {
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  profileImageContainer: {
    position: 'relative',
    marginBottom: '5%',
    alignSelf: 'center',
  } as ViewStyle,
  profileImage: {
    width: Platform.OS === 'ios' ? 120 : 100,
    height: Platform.OS === 'ios' ? 120 : 100,
    borderRadius: Platform.OS === 'ios' ? 60 : 50,
    borderWidth: 4,
    borderColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  } as ImageStyle,
  editImageButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.secondary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: '3%',
    letterSpacing: 0.5,
  } as TextStyle,
  email: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: '1%',
    opacity: 0.8,
  } as TextStyle,
  section: {
    padding: '3%',
    marginBottom: '2%',
  } as ViewStyle,
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2%',
    paddingHorizontal: '2%',
  } as ViewStyle,
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 0.5,
  } as TextStyle,
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.card,
    padding: '3%',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Platform.OS === 'ios' ? 10 : 8,
  } as ViewStyle,
  metricItem: {
    width: '48%',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 15,
    padding: '3%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: '2%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,
  metricIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '6%',
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  metricIcon: {
    fontSize: 24,
  } as TextStyle,
  metricLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: '3%',
    letterSpacing: 0.5,
  } as TextStyle,
  metricValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  } as TextStyle,
  languageSection: {
    marginTop: '2%',
  } as ViewStyle,
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Platform.OS === 'ios' ? 10 : 8,
    padding: '2%',
  } as ViewStyle,
  languageOption: {
    width: '48%',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 15,
    padding: '3%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: '2%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,
  languageOptionSelected: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  } as ViewStyle,
  languageName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: '2%',
    letterSpacing: 0.5,
  } as TextStyle,
  languageLocalName: {
    color: colors.text,
    fontSize: 14,
    marginTop: '2%',
    opacity: 0.8,
  } as TextStyle,
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  } as ViewStyle,
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
  } as ViewStyle,
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: '5%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5%',
  } as ViewStyle,
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  } as TextStyle,
  inputGroup: {
    marginBottom: '5%',
  } as ViewStyle,
  inputLabel: {
    color: colors.text,
    fontSize: 16,
    marginBottom: '2%',
  } as TextStyle,
  input: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 10,
    padding: '3%',
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  } as TextStyle,
  saveButton: {
    backgroundColor: colors.primary,
    padding: '4%',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: '5%',
  } as ViewStyle,
  saveButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  } as TextStyle,
  closeButton: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    padding: '4%',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: '3%',
  } as ViewStyle,
  closeButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  } as TextStyle,
  bmiContainer: {
    alignItems: 'center',
    marginTop: 20,
  } as ViewStyle,
  bmiTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  } as TextStyle,
  bmiText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 10,
  } as TextStyle,
  speedometerText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  } as TextStyle,
  bmiLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
    marginTop: 10,
    paddingHorizontal: 20,
  } as ViewStyle,
  labelText: {
    color: colors.disabled,
    fontSize: 12,
  } as TextStyle,
  activeLabel: {
    color: colors.accent,
    fontWeight: 'bold',
  } as TextStyle,
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  } as ViewStyle,
  infoContent: {
    marginLeft: 12,
    flex: 1,
  } as ViewStyle,
  infoLabel: {
    fontSize: 14,
    color: colors.accent,
  } as TextStyle,
  infoValue: {
    fontSize: 16,
    color: colors.text,
    marginTop: 2,
  } as TextStyle,
  separator: {
    height: 1,
    backgroundColor: colors.border,
  } as ViewStyle,
  conditionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  conditionText: {
    color: colors.text,
    fontSize: 16,
  } as TextStyle,
  removeButton: {
    color: colors.error,
    fontSize: 24,
    fontWeight: 'bold',
  } as TextStyle,
  noConditions: {
    color: colors.disabled,
    padding: 16,
    textAlign: 'center',
  } as TextStyle,
  alarmSection: {
    marginTop: 15,
  } as ViewStyle,
  alarmContainer: {
    padding: 15,
    gap: 15,
  } as ViewStyle,
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 15,
    gap: 12,
  } as ViewStyle,
  timeLabel: {
    color: colors.primary,
    fontSize: 16,
    flex: 1,
  } as TextStyle,
  timeValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
  bmiIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  } as ViewStyle,
  bmiLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  } as ViewStyle,
  speedometerContent: {
    alignItems: 'center',
  } as ViewStyle,
  speedometerLabel: {
    color: colors.text,
    fontSize: 14,
    marginTop: 5,
  } as TextStyle,
  conditionDetailsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  } as ViewStyle,
  conditionDetails: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    backgroundColor: colors.card,
  } as ViewStyle,
  closeDetailsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
  } as ViewStyle,
  closeDetailsText: {
    color: colors.text,
    fontSize: 20,
  } as TextStyle,
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  } as ViewStyle,
  conditionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  } as TextStyle,
  conditionDescription: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  } as TextStyle,
  conditionSection: {
    marginBottom: 20,
  } as ViewStyle,
  sectionSubtitle: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  } as TextStyle,
  symptomsList: {
    gap: 10,
  } as ViewStyle,
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  symptomDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
  symptomText: {
    color: colors.text,
    fontSize: 16,
  } as TextStyle,
  managementList: {
    gap: 10,
  } as ViewStyle,
  managementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  managementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
  managementText: {
    color: colors.text,
    fontSize: 16,
  } as TextStyle,
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  } as ViewStyle,
  conditionOption: {
    width: '45%',
    padding: 15,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  } as ViewStyle,
  conditionOptionText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  } as TextStyle,
  inputContainer: {
    marginBottom: 20,
  } as ViewStyle,
  editButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
  healthMetricsSection: {
    marginTop: 15,
  } as ViewStyle,
  bmiSection: {
    position: 'relative',
    top: -20,
  } as ViewStyle,
  medicalSection: {
    marginTop: 20,
    padding: 16,
  } as ViewStyle,
  diseaseSection: {
    marginTop: 15,
    padding: 12,
  } as ViewStyle,
  diseaseToggle: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  } as ViewStyle,
  diseaseToggleText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  } as TextStyle,
  pickerContainer: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 5,
  } as ViewStyle,
  picker: {
    color: colors.text,
    height: 50,
  } as TextStyle,
});