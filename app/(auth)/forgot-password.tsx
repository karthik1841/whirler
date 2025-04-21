import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/config/firebase';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
      setError('');
    } catch (err: any) {
      setError(err.message);
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFD1DC', '#B3E5FC']}
      style={styles.container}
    >
      <View style={styles.content}>
        <LottieView
          source={{ uri: 'https://lottie.host/157ef719-5b59-44e9-bf5b-85e6b11e8f0f/BBjl5t8B0S.json' }}
          autoPlay
          loop
          style={styles.lottie}
        />

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email to receive reset instructions</Text>

        {message && <Text style={styles.message}>{message}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? <ActivityIndicator color="#fff" /> : 'Reset Password'}
          </Text>
        </TouchableOpacity>

        <Link href="/sign-in" style={styles.link}>
          Back to Sign In
        </Link>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#ffffff',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0F7FA',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
    width: '100%',
  },
  button: {
    backgroundColor: '#6A1B9A',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  message: {
    color: '#34c759',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  error: {
    color: '#ff3b30',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#007AFF',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  lottie: {
    width: 250,
    height: 250,
    marginBottom: 30,
  },
});
