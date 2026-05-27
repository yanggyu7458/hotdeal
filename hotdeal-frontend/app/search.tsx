import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

// 핫딜 데이터 타입 정의(index.tsx에서 사용한 Deal 타입과 동일하게 정의)
interface Deal {
  externalId: string;
  title: string;
  mallName: string;
  price: number;
  shippingFee: string;
  upvotes: number;
  commentCount: number;
  thumbnailUrl: string;
  isExpired: boolean;
  category?: string;
  content?: string; 
  sourceUrl?: string; 
  shopUrl?: string;
}

export default function SearchScreen() {
  const router = useRouter();
  // 상태관리
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'popular'>('recent');

  // 검색 전용 새로운 상태 추가 (검색 결과 저장용)
  const [searchResults, setSearchResults] = useState<Deal[]>([]); // 검색 결과를 저장할 상태
  const [isSearching, setIsSearching] = useState<boolean>(false); // 검색 중 상태
  const [hasSearched, setHasSearched] = useState<boolean>(false); // 검색 실행 여부

  const [popularSearches, setPopularSearches] = useState<string[]>([]); // 백엔드에서 받아온 인기 검색어 저장용 상태

  const [recentSearches, setRecentSearches] = useState<string[]>([]); // AsyncStorage에서 불러온 최근 검색어 저장용 상태

  const dummyRecentSearches: string[] = ['면도기', '브라운 면도기', '맥심', '이어폰'];
  const dummyPopularSearches: string[] = ['s26', '키보드', '스위치2', '에어컨', '모니터', '쌀'];

  useEffect(() => {
    loadRecentSearches();
    fetchPopularSearches(); // (인기 검색어 로딩)
  }, []);

  const loadRecentSearches = async () => {
    try {
      // 'RECENT_SEARCHES'라는 이름의 박스를 찾아서 꺼냄
      const savedSearches = await AsyncStorage.getItem('RECENT_SEARCHES'); 
      if (savedSearches !== null) {
        setRecentSearches(JSON.parse(savedSearches)); // 글자를 다시 배열로 조립
      }
    } catch (error) {
      console.error('검색 기록 불러오기 실패:', error);
    }
  };

  // 검색할 때: 새로운 기록 저장하기
  const saveRecentSearch = async (keyword: string) => {
    try {
      // 기존 배열에서 똑같은 단어가 있으면 지우고(중복 방지), 새 단어를 맨 앞에 추가
      const filtered = recentSearches.filter(item => item !== keyword);
      const updatedSearches = [keyword, ...filtered].slice(0, 10); // 최대 10개까지만 유지
      
      setRecentSearches(updatedSearches); // 화면(상태) 즉시 업데이트
      await AsyncStorage.setItem('RECENT_SEARCHES', JSON.stringify(updatedSearches)); // 창고에 텍스트로 압축해서 저장
    } catch (error) {
      console.error('검색 기록 저장 실패:', error);
    }
  };

  // 전체 삭제 버튼 누를 때
  const clearAllRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem('RECENT_SEARCHES'); // 박스 자체를 폐기
      setRecentSearches([]); // 화면에서도 싹 비움
    } catch (error) {
      console.error('검색 기록 삭제 실패:', error);
    }
  };

  const fetchPopularSearches = async () => {
      try {
        const response = await fetch('http://43.201.101.111:8080/api/deals/popular-searches');
        if (response.ok) {
          const data = await response.json();
          setPopularSearches(data); // 받아온 인기 검색어를 상태에 저장
        }
      } catch (error) {
        console.error('인기 검색어 가져오기 실패:', error);
      }
    };

  // 백엔드 API 호출 함수
  const handleSearch = async () => {

    console.log(" [1] 돋보기/엔터 입력됨! 현재 검색어:", searchQuery);

    if (!searchQuery.trim()) {
      console.log(" [2] 검색어가 비어있어서(공백) 로직 중단됨");
      return;
    }

    saveRecentSearch(searchQuery.trim());

    setIsSearching(true);
    setHasSearched(true);

    try {
      const BACKEND_URL = `http://43.201.101.111:8080/api/deals/search?keyword=${encodeURIComponent(searchQuery)}`;
      const response = await fetch(BACKEND_URL);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data); // 검색 결과를 상태에 저장
      } else {
        console.error('검색 실패:', data.message || '알 수 없는 오류');
        setSearchResults([]); // 검색 실패 시 결과 초기화
      }
    } catch (error) {
      console.error('검색 중 오류 발생:', error);
      setSearchResults([]); // 오류 발생 시 결과 초기화
    } finally {
      setIsSearching(false);
    }
 };
    
  // 검색어 지우기 버튼(x버튼) 클릭 시 초기화
  const clearSearch = () => {
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
  }

  // 최근 검색어 렌더링
  const renderRecentItem = ({ item } : { item : string }) => (
      <View style={styles.listItem}>
          <Text style={styles.listText}>{item}</Text>
          <TouchableOpacity onPress={() => console.log(`최근 검색어 ${item} 삭제`)}>
              <Ionicons name="close" size={20} color="#999"/>
          </TouchableOpacity>
      </View>
  );

  // 인기 검색어 렌더링
  const renderPopularItem = ({ item, index } : { item : string; index : number }) => {
      const isTop3 = index < 3;
      return (
          <View style={styles.listItem}>
              <View style={[styles.rankCircle, isTop3 ? styles.rankCircleTop3 : null]}>
                  <Text style={[styles.rankText, isTop3 ? styles.rankTextTop3 : null]}>{index + 1}</Text>
              </View>
              <Text style={styles.listText}>{item}</Text>
          </View>
      );
  };

  const renderDealItem = ({ item }: { item: Deal }) => (
      <TouchableOpacity style={[styles.card, item.isExpired && styles.expiredCard]} activeOpacity={0.7}
      onPress={() => {
          router.push({
            pathname: '/detail',
            params: { dealData: JSON.stringify(item) }
          });
        }}
        >
        <Image source={{ uri: item.thumbnailUrl || 'https://via.placeholder.com/100?text=No+Image' }} style={[styles.thumbnail, item.isExpired ? styles.expiredThumbnail : null]} />
        <View style={styles.infoContainer}>
          {item.isExpired ? <Text style={styles.expiredBadge}>종료된 핫딜</Text> : null}
          <Text style={[styles.title, item.isExpired ? styles.expiredText : null]} numberOfLines={2}>
            {item.title || '제목 없음'}
          </Text>
          <View style={styles.priceRow}>
            {/* 쇼핑몰 이름이 너무 길면 줄임표(...) 처리해서 가격을 보호합니다 */}
            <Text style={styles.mallName} numberOfLines={1}>
              {item.mallName || '쇼핑몰'}
            </Text>
            <Text style={styles.price}>
              {!item.price || item.price === 0 
                ? '가격 확인' 
                : `${item.price.toLocaleString()}원`}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.shipping}>{item.shippingFee || '배송비'}</Text>
            <Text style={styles.stats}>👍 {item.upvotes || 0}   💬 {item.commentCount || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. 검색창 영역 */}
      <View style={styles.searchHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="검색어를 입력하세요"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length === 0) setHasSearched(false); // 다 지우면 다시 최근/인기 검색어 표시
            }}
            onSubmitEditing={handleSearch} // 🌟 엔터 쳤을 때 API 호출
            autoFocus={true} // 화면 켜지면 바로 키보드 올라오게
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={clearSearch} style={{ marginRight: 10 }}>
              <Ionicons name="close-circle" size={20} color="#ccc" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={handleSearch}>
            <Ionicons name="search" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 🌟 2. 화면 분기 처리 (검색했는가? 안 했는가?) */}
      {!hasSearched ? (
        // 🔹 [상태 1] 검색하기 전: 최근/인기 검색어 탭 보여주기
        <>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'recent' ? styles.activeTab : null]}
              onPress={() => setActiveTab('recent')}
            >
              <Text style={[styles.tabText, activeTab === 'recent' ? styles.activeTabText : null]}>최근 검색어</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'popular' ? styles.activeTab : null]}
              onPress={() => setActiveTab('popular')}
            >
              <Text style={[styles.tabText, activeTab === 'popular' ? styles.activeTabText : null]}>인기 검색어</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {activeTab === 'recent' && (
              <View style={{ flex: 1 }}>
                <View style={styles.recentHeader}>
                  <TouchableOpacity onPress={clearAllRecentSearches}>
                    <Text style={styles.clearAllText}>전체삭제</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={recentSearches}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={renderRecentItem}
                  ListEmptyComponent={
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ color: '#999' }}>최근 검색 기록이 없습니다.</Text>
                    </View>
                  }
                />
              </View>
            )}

            {activeTab === 'popular' && (
              <FlatList
                data={popularSearches} // 가짜 데이터 대신 진짜 상태값을 꽂아줍니다!
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderPopularItem}
                contentContainerStyle={{ paddingTop: 10 }}
                // 만약 Redis에 데이터가 하나도 없을 때 보여줄 화면
                ListEmptyComponent={
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#999' }}>아직 검색 데이터가 없습니다.</Text>
                  </View>
                }
              />
            )}
          </View>
        </>
      ) : (
        // 🔹 [상태 2] 검색 실행 후: 핫딜 검색 결과 리스트 보여주기
        <View style={styles.resultContainer}>
          {isSearching ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#E53935" />
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>'{searchQuery}'에 대한 검색 결과가 없습니다.</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => `${item.externalId}-${index}`}
              renderItem={renderDealItem}
              contentContainerStyle={{ padding: 15 }}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// 스타일링
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { marginRight: 15 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, fontSize: 16 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabButton: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#333' },
  tabText: { fontSize: 15, color: '#999' },
  activeTabText: { color: '#333', fontWeight: 'bold' },
  listContainer: { flex: 1, paddingHorizontal: 20 },
  recentHeader: { alignItems: 'flex-end', paddingVertical: 10 },
  clearAllText: { fontSize: 13, color: '#999' },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  listText: { flex: 1, fontSize: 16, color: '#333', marginLeft: 10 },
  rankCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  rankCircleTop3: { backgroundColor: '#ff4d4d' },
  rankText: { fontSize: 12, color: '#666', fontWeight: 'bold' },
  rankTextTop3: { color: '#fff' },

  // 검색 결과 영역
  resultContainer: { flex: 1, backgroundColor: '#F5F6F8' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
  
  // 핫딜 카드 스타일 (index.tsx에서 복사)
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  expiredCard: { backgroundColor: '#F0F0F0' },
  thumbnail: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#EEEEEE' },
  expiredThumbnail: { opacity: 0.5 },
  infoContainer: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  expiredBadge: { fontSize: 12, color: '#FFFFFF', backgroundColor: '#999999', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4, fontWeight: 'bold' },
  title: { fontSize: 16, fontWeight: '600', color: '#333333', marginBottom: 6, lineHeight: 22 },
  expiredText: { color: '#999999', textDecorationLine: 'line-through' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mallName: { flex: 1, fontSize: 13, color: '#1E88E5', fontWeight: 'bold', marginRight: 10 },
  price: { fontSize: 16, fontWeight: 'bold', color: '#E53935' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shipping: { fontSize: 12, color: '#888888' },
  stats: { fontSize: 12, color: '#888888' },
  
});