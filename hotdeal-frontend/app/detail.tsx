// app/detail.tsx
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function DetailScreen() {
  const router = useRouter();
  
  // 1. 이전 화면(index.tsx)에서 넘겨준 데이터를 받아옵니다.
  const { dealData } = useLocalSearchParams();
  
  // 2. 문자열로 넘어온 데이터를 다시 객체(JSON)로 풀어줍니다.
  const item = dealData ? JSON.parse(dealData as string) : null;

  // 에러 방어: 데이터가 없으면 뒤로가기 버튼만 보여줍니다.
  if (!item) {
    return (
      <View style={styles.center}>
        <Text>데이터를 불러올 수 없습니다.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={{color: 'white'}}>뒤로 가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ⭐️ 기기(스마트폰)의 기본 브라우저를 열어주는 마법의 함수!
  const openLink = async (url?: string) => {
    if (url) {
      await Linking.openURL(url);
    } else {
      alert('연결된 링크가 없습니다. 😢');
    }
  };

  return (
    <View style={styles.container}>
      {/* 상세페이지 상단 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{item.mallName} 핫딜</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. 상품 썸네일 */}
        <Image 
          source={{ uri: item.thumbnailUrl || 'https://via.placeholder.com/300?text=No+Image' }} 
          style={styles.mainImage} 
        />

        {/* 2. 상품 핵심 정보 (제목, 가격 등) */}
        <View style={styles.infoBox}>
          {item.isExpired && <Text style={styles.expiredBadge}>종료된 핫딜</Text>}
          <Text style={[styles.title, item.isExpired && styles.expiredText]}>{item.title}</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.mallName}>{item.mallName}</Text>
            <Text style={styles.price}>
              {!item.price || item.price === 0 ? '가격 확인' : `${item.price.toLocaleString()}원`}
            </Text>
          </View>
          
          <Text style={styles.shipping}>🚚 {item.shippingFee || '배송비 정보 없음'}</Text>
          <Text style={styles.stats}>👍 추천 {item.upvotes || 0}   💬 댓글 {item.commentCount || 0}</Text>
        </View>

        {/* 3. 본문 내용 영역 */}
        <View style={styles.contentBox}>
          <Text style={styles.contentLabel}>📝 상세 내용</Text>
          {/* 나중에 HTML 렌더링 라이브러리를 쓰면 더 예쁘게 만들 수 있습니다! */}
          <Text style={styles.contentText}>
            {item.content || '본문 내용이 없습니다.'}
          </Text>
        </View>

        {/* 4. 🚀 2개의 하단 액션 버튼 */}
        <View style={styles.buttonRow}>
          {/* 핫딜 사이트(펨코 등) 원본 글로 가는 버튼 */}
          <TouchableOpacity 
            style={[styles.linkButton, styles.sourceButton]} 
            onPress={() => openLink(item.sourceUrl)}
            activeOpacity={0.8}
          >
            <Text style={styles.linkButtonText}>핫딜 원본 보기</Text>
          </TouchableOpacity>

          {/* 실제 상품 파는 곳(네이버, 알리 등)으로 가는 버튼 */}
          <TouchableOpacity 
            style={[styles.linkButton, styles.shopButton]} 
            onPress={() => openLink(item.shopUrl)}
            activeOpacity={0.8}
          >
            <Text style={styles.linkButtonText}>상품 바로가기 🛒</Text>
          </TouchableOpacity>
        </View>

        {/* 5. 💬 나중에 추가할 댓글 영역 (미리 자리만 잡아둠) */}
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>💬 댓글 (개발 예정)</Text>
          <View style={styles.commentPlaceholder}>
            <Text style={{color: '#999'}}>이곳에 사용자들의 댓글이 표시될 예정입니다.</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// 상세페이지 전용 예쁜 디자인
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { marginTop: 20, padding: 10, backgroundColor: '#E53935', borderRadius: 8 },
  
  header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn: { marginRight: 15 },
  backBtnText: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 },
  
  scrollContent: { paddingBottom: 50 },
  mainImage: { width: '100%', height: 300, backgroundColor: '#EEEEEE', resizeMode: 'contain' },
  
  infoBox: { backgroundColor: '#FFFFFF', padding: 20, marginBottom: 12 },
  expiredBadge: { fontSize: 12, color: '#FFFFFF', backgroundColor: '#999999', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 8, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111', marginBottom: 15, lineHeight: 28 },
  expiredText: { color: '#999999', textDecorationLine: 'line-through' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mallName: { fontSize: 16, color: '#1E88E5', fontWeight: 'bold' },
  price: { fontSize: 24, fontWeight: 'bold', color: '#E53935' },
  shipping: { fontSize: 14, color: '#666', marginBottom: 6 },
  stats: { fontSize: 14, color: '#888' },

  contentBox: { backgroundColor: '#FFFFFF', padding: 20, marginBottom: 12 },
  contentLabel: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  contentText: { fontSize: 15, color: '#444', lineHeight: 24 },

  buttonRow: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15 },
  linkButton: { flex: 1, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 5, elevation: 2 },
  sourceButton: { backgroundColor: '#424242' }, // 원본 보기 (어두운 색)
  shopButton: { backgroundColor: '#E53935' },  // 사러 가기 (강조색)
  linkButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  commentSection: { backgroundColor: '#FFFFFF', padding: 20, minHeight: 200 },
  commentLabel: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  commentPlaceholder: { flex: 1, backgroundColor: '#F9F9F9', borderRadius: 8, padding: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EEE', borderStyle: 'dashed' },
});