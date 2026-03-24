import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

// 타입 정의
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

// 앱에서 보여줄 카테고리 목록
const CATEGORIES = ['전체', 'PC/하드웨어', '가전/TV', '생활/식품', '패션/의류', 'SW/게임', '기타'];

export default function HomeScreen() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  
  // 무한 스크롤을 위한 핵심 상태값들
  const [page, setPage] = useState(0); // 현재 요청할 페이지 번호
  const [loading, setLoading] = useState(true); // 처음 앱을 켰을 때의 로딩 상태
  const [fetchingMore, setFetchingMore] = useState(false); // 바닥에 닿아서 추가로 가져오는 중인지 여부
  const [isListEnd, setIsListEnd] = useState(false); // 더 이상 가져올 데이터가 없는지 확인

  // 현재 선택된 카테고리 상태 (기본값 : '전체')
  const [selectedCategory, setSelectedCategory] = useState('전체');

  // 당겨서 새로고침 상태
  const [refreshing, setRefreshing] = useState(false);

  // 위로가기 버튼 표시 여부 & FlatList 참조 조종기
  const [showTopButton, setShowTopButton] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 처음 앱 화면이 뜰 때 0번 페이지를 호출합니다.
  // 카테고리가 바뀔 때마다 상태를 먼저 초기화하고 새 데이터를 부르도록 변경
  useEffect(() => {
    setDeals([]); // 바구니 비우기
    setPage(0); // 페이지 초기화
    setIsListEnd(false); // 리스트 끝남 해제
    fetchDeals(0, selectedCategory);
  }, [selectedCategory]);

  const fetchDeals = async (pageNumber: number, category: string = '전체') => {
    // 이미 모든 데이터를 다 불러왔다면 API 요청을 멈춥니다.
    if (isListEnd && pageNumber !== 0) return;

    try {
      if (pageNumber === 0 && !refreshing) setLoading(true);
      else if (pageNumber > 0) setFetchingMore(true);

      let BACKEND_URL = `http://172.30.1.37:8080/api/deals?page=${pageNumber}&size=30`; 

      // 펨코 DB에 맞게 카테고리 이름 변경
      let queryCategory = category;
      if (category === '생활/식품') queryCategory = '먹거리';
      if (category === '패션/의류') queryCategory = '의류/패션';

      // '전체'가 아니라면 URL 뒤에 카테고리를 붙여서 요청
      // 번경된 이름(queryCategory)으로 요청하도록 수정
      if (queryCategory !== '전체') {
        BACKEND_URL += `&category=${encodeURIComponent(queryCategory)}`;
      }
      
      const response = await fetch(BACKEND_URL);
      const newData = await response.json();
      
      // 새로 받아온 데이터가 있다면
      if (newData.length > 0) {
        if (pageNumber === 0) {
          setDeals(newData); // 0번 페이지면 바구니를 새 데이터로 꽉 채움
        } else {
          setDeals(prevDeals => [...prevDeals, ...newData]); // 다음 페이지면 기존 리스트 밑에 이어 붙임
        }
        setPage(pageNumber + 1); // 다음을 위한 페이지 번호 
        setIsListEnd(false);
      } else {
        // 새로 받아온 데이터가 없다면 더 이상 부를 페이지가 없다는 뜻
        if (pageNumber === 0) setDeals([]);
        setIsListEnd(true);
      }
    } catch (error) {
      console.error("데이터를 불러오는데 실패했습니다:", error);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  };

  // 당겨서 새로고침 실행 함수
  const onRefresh = async () => {
    setRefreshing(true); // 새로고침
    setPage(0); // 페이지 0으로 초기화
    await fetchDeals(0, selectedCategory); // 0번 페이지 데이터 다시 가져오기
    setRefreshing(false); // 종료
  };

  // 스크롤이 바닥에 닿았을 때 실행되는 함수
  const handleLoadMore = () => {
    //  무한 로딩 버그 방어 (데이터가 비어있을 땐 다음 페이지 호출을 강제로 막음)
    if (deals.length === 0) return;

    // 로딩 중이 아니고, 리스트 끝이 아닐 때만 다음 페이지를 부릅니다.
    if (!loading && !fetchingMore && !isListEnd && !refreshing) {
      fetchDeals(page, selectedCategory);
    }
  };

  // 카테고리 버튼을 눌렀을 때 실행되는 함수
  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) return; // 이미 선택된 거면 무시
    
    // 데이터 비우는 로직은 위쪽 useEffect가 알아서 하도록 맡기고 여기선 카테고리만 변경
    setSelectedCategory(category); 
  };

  // 스크롤 위치를 감지해서 위로가기 버튼 띄우기
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 300) { // 스크롤을 300 이상 내리면
      setShowTopButton(true); // 버튼 표시
    } else {
      setShowTopButton(false); // 다시 위로 가면 숨기기
    }
  };

  // 맨 위로 올라가는 함수
  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // 리스트 맨 아래에 보여줄 로딩 스피너
  const renderFooter = () => {
    if (!fetchingMore) return null;
    return <ActivityIndicator size="large" color="#E53935" style={styles.footerLoader} />;
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
      <Image 
        source={{ uri: item.thumbnailUrl || 'https://via.placeholder.com/100?text=No+Image' }} 
        style={[styles.thumbnail, item.isExpired && styles.expiredThumbnail]} 
      />
      <View style={styles.infoContainer}>
        {item.isExpired && <Text style={styles.expiredBadge}>종료된 핫딜</Text>}
        <Text style={[styles.title, item.isExpired && styles.expiredText]} numberOfLines={2}>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔥 실시간 핫딜</Text>
      </View>

      {/* 가로로 스와이프 되는 카테고리 필터 영역 */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat, index) => (
            <TouchableOpacity 
              key={index} 
              // 선택된 카테고리면 빨간색 배경, 아니면 하얀색 배경 스타일을 줍니다
              style={[styles.categoryButton, selectedCategory === cat && styles.categoryButtonActive]}
              onPress={() => handleCategoryPress(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E53935" />
        </View>
      ) : deals.length === 0 ? (
        // 해당 카테고리에 핫딜이 없을 때 보여줄 화면
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>해당 카테고리에 핫딜이 없습니다. </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={deals}
          keyExtractor={(item, index) => `${item.externalId}-${index}`} // 만약 같은 ID가 넘어올 경우를 대비해 index 추가
          renderItem={renderDealItem}
          contentContainerStyle={styles.listContainer}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1} // 텅 빈 상태에서 훅훅 넘어가지 않도록 바닥 감지 민감도를 최적화 (0.5 -> 0.1)
          ListFooterComponent={renderFooter}
                         
          refreshing={refreshing}
          onRefresh={onRefresh}
                       
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      )}

      {/* 위로가기 플로팅 버튼 (showTopButton이 true일 때만 보여줌) */}
      {showTopButton && (
        <TouchableOpacity style={styles.fab} onPress={scrollToTop} activeOpacity={0.8}>
          <Text style={styles.fabText}>↑</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#E53935' },
  categoryContainer: { backgroundColor: '#FFFFFF', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  categoryScroll: { paddingHorizontal: 15, alignItems: 'center' },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0', marginRight: 8 },
  categoryButtonActive: { backgroundColor: '#E53935' }, 
  categoryText: { fontSize: 14, color: '#666666', fontWeight: '600' },
  categoryTextActive: { color: '#FFFFFF' }, 
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#888888' },
  listContainer: { padding: 15 },
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  expiredCard: { backgroundColor: '#F0F0F0' },
  thumbnail: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#EEEEEE' },
  expiredThumbnail: { opacity: 0.5 },
  infoContainer: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  expiredBadge: { fontSize: 12, color: '#FFFFFF', backgroundColor: '#999999', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4, fontWeight: 'bold' },
  title: { fontSize: 16, fontWeight: '600', color: '#333333', marginBottom: 6, lineHeight: 22 },
  expiredText: { color: '#999999', textDecorationLine: 'line-through' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  
  // mallName에 flex: 1과 여백을 줘서 가격 텍스트가 밀리지 않게 방어합니다.
  mallName: { flex: 1, fontSize: 13, color: '#1E88E5', fontWeight: 'bold', marginRight: 10 },

  price: { fontSize: 16, fontWeight: 'bold', color: '#E53935' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shipping: { fontSize: 12, color: '#888888' },
  stats: { fontSize: 12, color: '#888888' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  footerLoader: { paddingVertical: 20 },
  
  // 위로가기 플로팅 버튼 스타일
  fab: {
    position: 'absolute',
    bottom: 30, // 화면 아래에서 30 띄움
    right: 20,  // 화면 오른쪽에서 20 띄움
    backgroundColor: '#E53935',
    width: 50,
    height: 50,
    borderRadius: 25, // 완벽한 원
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // 안드로이드 그림자
    shadowColor: '#000', // 아이폰 그림자
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
});