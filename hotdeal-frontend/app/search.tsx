import React, { useState} from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen() {
    // 상태관리
    const [searchQuery, setSearchOuery] = useState('');
    const [activeTab, setActiveTab] = useState('recent');

    // 가짜 데이터
    const dummyRecentSearches = ['면도기', '데스크탑', '이어폰', '아이폰'];
    const dummyPopularSearches = ['s26', '키보드', '모니터', 'TV'];

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
                <View style={[styles.rankCircle, isTop3 && styles.rankCircleTop3]}>
                    <Text style={[styles.rankText, isTop3 && styles.rankTextTop3]}>{index + 1}</Text>
                </View>
                <Text style={styles.listText}>{item}</Text>
            </View>
        );
    };

    return (
    <SafeAreaView style={styles.container}>
      {/* 검색창 영역 */}
      <View style={styles.searchHeader}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="검색어를 입력하세요"
            value={searchQuery}
            onChangeText={setSearchOuery}
            onSubmitEditing={() => console.log(`${searchQuery} 검색 실행!`)}
          />
          <TouchableOpacity>
            <Ionicons name="search" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 탭 선택 영역 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'recent' && styles.activeTab]}
          onPress={() => setActiveTab('recent')}
        >
          <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>최근 검색어</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'popular' && styles.activeTab]}
          onPress={() => setActiveTab('popular')}
        >
          <Text style={[styles.tabText, activeTab === 'popular' && styles.activeTabText]}>인기 검색어</Text>
        </TouchableOpacity>
      </View>

      {/* 리스트 영역 */}
      <View style={styles.listContainer}>
        {activeTab === 'recent' && (
          <View>
            <View style={styles.recentHeader}>
              <TouchableOpacity>
                <Text style={styles.clearAllText}>전체삭제</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={dummyRecentSearches}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderRecentItem}
            />
          </View>
        )}

        {activeTab === 'popular' && (
          <FlatList
            data={dummyPopularSearches}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderPopularItem}
            contentContainerStyle={{ paddingTop: 10 }}
          />
        )}
      </View>
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
  rankTextTop3: { color: '#fff' }
});