export type SimilarItem = {
  id: number
  name: string
  imageUrl: string
  similarity: number
  shopUrl: string
}

export const mockResults: SimilarItem[] = [
  {
    id: 1,
    name: '미니멀 크림 니트 가디건',
    imageUrl:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=80',
    similarity: 96,
    shopUrl: 'https://example.com/products/cream-cardigan',
  },
  {
    id: 2,
    name: '오버핏 코튼 셔츠',
    imageUrl:
      'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=700&q=80',
    similarity: 93,
    shopUrl: 'https://example.com/products/oversize-shirt',
  },
  {
    id: 3,
    name: '슬림 스트레이트 데님',
    imageUrl:
      'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=700&q=80',
    similarity: 89,
    shopUrl: 'https://example.com/products/straight-denim',
  },
  {
    id: 4,
    name: '클래식 싱글 블레이저',
    imageUrl:
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=700&q=80',
    similarity: 86,
    shopUrl: 'https://example.com/products/single-blazer',
  },
  {
    id: 5,
    name: '소프트 플리츠 스커트',
    imageUrl:
      'https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=700&q=80',
    similarity: 82,
    shopUrl: 'https://example.com/products/pleats-skirt',
  },
  {
    id: 6,
    name: '라이트 트렌치 코트',
    imageUrl:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=700&q=80',
    similarity: 78,
    shopUrl: 'https://example.com/products/light-trench-coat',
  },
]

export function searchSimilarItems(imageUrl?: string) {
  void imageUrl

  return mockResults
}
