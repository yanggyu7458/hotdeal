import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications'; // 푸시 알림 라이브러리
import * as Device from 'expo-device';               // 기기 체크 라이브러리

const CATEGORIES = ['전체', 'PC/하드웨어', '가전/TV', '생활/식품', '패션/의류', 'SW/게임', '기타'];

export default function KeywordScreen() {
  const router = useRouter();
  
  const [keyword, setKeyword] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [isSubmitting, setIsSubmitting] = useState(false); // 로딩 상태 추가

  // Expo Push Token 발급 함수
  const getPushToken = async () => {
    // 1. 시뮬레이터가 아닌 실제 기기인지 확인
    if (!Device.isDevice) {
      Alert.alert('오류', '푸시 알림은 실제 스마트폰에서만 테스트할 수 있습니다.');
      return null;
    }

    // 2. 알림 권한 요청 (처음 앱 깔고 알림 허용하시겠습니까? 뜨는 팝업)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // 3. 권한 거부 시
    if (finalStatus !== 'granted') {
      Alert.alert('권한 필요', '푸시 알림을 받으려면 알림 권한을 허용해야 합니다.');
      return null;
    }

    // 4. 안드로이드 전용 채널 설정 (필수)
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    // 5. 토큰 발급
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data; // 예: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
    } catch (error) {
      console.error("토큰 발급 실패:", error);
      Alert.alert('오류', '알림 토큰을 발급받지 못했습니다.');
      return null;
    }
  };
    // 등록 버튼 눌렀을 때 실행되는 함수
  const handleRegister = async () => {
    if (!keyword.trim()) {
      Alert.alert('알림', '키워드를 입력해주세요!');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 기기에서 엑스포 토큰 따오기
      const pushToken = await getPushToken();
      if (!pushToken) {
        setIsSubmitting(false);
        return; // 토큰 못 따오면 중단
      }

      console.log("내 폰의 Push Token:", pushToken);

      // 2. 백엔드로 보낼 데이터 준비
      const requestData = {
        expoToken: pushToken,
        keyword: keyword.trim(),
        minPrice: minPrice ? parseInt(minPrice) : null,
        maxPrice: maxPrice ? parseInt(maxPrice) : null,
        category: selectedCategory
      };

      // 3. 스프링부트 API 호출
      const response = await fetch('http://43.201.101.111:8080/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        Alert.alert('성공', `[${keyword}] 알림이 등록되었습니다!`);
        router.back();
      } else {
        Alert.alert('서버 오류', '등록에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('등록 에러:', error);
      Alert.alert('네트워크 오류', '서버와 연결할 수 없습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>키워드 알림 설정</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 안드로이드는 behavior를 undefined로 주어야 시스템 네이티브 작동과 충돌하지 않는다. */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          
          <Text style={styles.label}>어떤 핫딜을 찾으시나요?</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 아이패드, 아이폰, 노트북 등"
            value={keyword}
            onChangeText={setKeyword}
          />

          <Text style={styles.label}>카테고리</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.categoryButton, selectedCategory === cat && styles.categoryButtonActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>가격대 (선택사항)</Text>
          <View style={styles.priceRow}>
            <TextInput style={styles.priceInput} placeholder="최소 금액" keyboardType="numeric" value={minPrice} onChangeText={setMinPrice} />
            <Text style={styles.priceWave}>~</Text>
            <TextInput style={styles.priceInput} placeholder="최대 금액" keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} />
            <Text style={{ marginLeft: 10, fontSize: 16 }}>원</Text>
          </View>
          <Text style={styles.helperText}>* 비워두시면 가격 상관없이 알림이 울립니다.</Text>

        </ScrollView>

      </KeyboardAvoidingView>

      {/* 등록 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleRegister} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>알림 등록하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 60, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { padding: 5, marginLeft: -5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  content: { padding: 20 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 25, marginBottom: 10 },
  input: { height: 55, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 15, fontSize: 16, backgroundColor: '#FAFAFA' },
  
  categoryScroll: { flexDirection: 'row', marginBottom: 5 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F0F0F0', marginRight: 8 },
  categoryButtonActive: { backgroundColor: '#E53935' },
  categoryText: { fontSize: 14, color: '#666', fontWeight: '600' },
  categoryTextActive: { color: '#fff' },
  
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceInput: { flex: 1, height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 15, fontSize: 16, textAlign: 'right', backgroundColor: '#FAFAFA' },
  priceWave: { marginHorizontal: 15, fontSize: 20, color: '#666' },
  helperText: { marginTop: 10, fontSize: 13, color: '#999' },
  
  footer: { padding: 20, paddingBottom: 30, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  submitButton: { backgroundColor: '#E53935', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});