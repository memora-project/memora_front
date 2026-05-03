/**
 * 대전광역시 5개 자치구 + 행정동 목록
 * 출처: 대전광역시청 행정구역 (2024년 기준 주요 동)
 */

export type District = {
  gu: string;       // 구 이름
  dong: string;     // 동 이름
  label: string;    // 화면 표시용 ("유성구 봉명동")
  value: string;    // 식별자 ("yuseong-bongmyeong")
};

export const DAEJEON_DISTRICTS: District[] = [
  // ─── 유성구 ───
  { gu: '유성구', dong: '봉명동', label: '유성구 봉명동', value: 'yuseong-bongmyeong' },
  { gu: '유성구', dong: '어은동', label: '유성구 어은동', value: 'yuseong-eoeun' },
  { gu: '유성구', dong: '구암동', label: '유성구 구암동', value: 'yuseong-guam' },
  { gu: '유성구', dong: '관평동', label: '유성구 관평동', value: 'yuseong-gwanpyeong' },
  { gu: '유성구', dong: '노은동', label: '유성구 노은동', value: 'yuseong-noeun' },
  { gu: '유성구', dong: '도룡동', label: '유성구 도룡동', value: 'yuseong-doryong' },
  { gu: '유성구', dong: '반석동', label: '유성구 반석동', value: 'yuseong-banseok' },
  { gu: '유성구', dong: '신성동', label: '유성구 신성동', value: 'yuseong-sinseong' },
  { gu: '유성구', dong: '온천동', label: '유성구 온천동', value: 'yuseong-oncheon' },
  { gu: '유성구', dong: '원신흥동', label: '유성구 원신흥동', value: 'yuseong-wonsinheung' },
  { gu: '유성구', dong: '전민동', label: '유성구 전민동', value: 'yuseong-jeonmin' },
  { gu: '유성구', dong: '죽동', label: '유성구 죽동', value: 'yuseong-juk' },
  { gu: '유성구', dong: '진잠동', label: '유성구 진잠동', value: 'yuseong-jinjam' },
  { gu: '유성구', dong: '학하동', label: '유성구 학하동', value: 'yuseong-hakha' },

  // ─── 서구 ───
  { gu: '서구', dong: '갈마동', label: '서구 갈마동', value: 'seo-galma' },
  { gu: '서구', dong: '관저동', label: '서구 관저동', value: 'seo-gwanjeo' },
  { gu: '서구', dong: '괴정동', label: '서구 괴정동', value: 'seo-goejeong' },
  { gu: '서구', dong: '내동', label: '서구 내동', value: 'seo-nae' },
  { gu: '서구', dong: '도마동', label: '서구 도마동', value: 'seo-doma' },
  { gu: '서구', dong: '둔산동', label: '서구 둔산동', value: 'seo-dunsan' },
  { gu: '서구', dong: '만년동', label: '서구 만년동', value: 'seo-mannyeon' },
  { gu: '서구', dong: '변동', label: '서구 변동', value: 'seo-byeon' },
  { gu: '서구', dong: '복수동', label: '서구 복수동', value: 'seo-boksu' },
  { gu: '서구', dong: '용문동', label: '서구 용문동', value: 'seo-yongmun' },
  { gu: '서구', dong: '월평동', label: '서구 월평동', value: 'seo-wolpyeong' },
  { gu: '서구', dong: '정림동', label: '서구 정림동', value: 'seo-jeongnim' },
  { gu: '서구', dong: '탄방동', label: '서구 탄방동', value: 'seo-tanbang' },
  { gu: '서구', dong: '가수원동', label: '서구 가수원동', value: 'seo-gasuwon' },

  // ─── 중구 ───
  { gu: '중구', dong: '대흥동', label: '중구 대흥동', value: 'jung-daeheung' },
  { gu: '중구', dong: '문창동', label: '중구 문창동', value: 'jung-munchang' },
  { gu: '중구', dong: '문화동', label: '중구 문화동', value: 'jung-munhwa' },
  { gu: '중구', dong: '석교동', label: '중구 석교동', value: 'jung-seokgyo' },
  { gu: '중구', dong: '선화동', label: '중구 선화동', value: 'jung-seonhwa' },
  { gu: '중구', dong: '오류동', label: '중구 오류동', value: 'jung-oryu' },
  { gu: '중구', dong: '용두동', label: '중구 용두동', value: 'jung-yongdu' },
  { gu: '중구', dong: '유천동', label: '중구 유천동', value: 'jung-yucheon' },
  { gu: '중구', dong: '은행동', label: '중구 은행동', value: 'jung-eunhaeng' },
  { gu: '중구', dong: '중촌동', label: '중구 중촌동', value: 'jung-jungchon' },
  { gu: '중구', dong: '태평동', label: '중구 태평동', value: 'jung-taepyeong' },
  { gu: '중구', dong: '산성동', label: '중구 산성동', value: 'jung-sanseong' },

  // ─── 동구 ───
  { gu: '동구', dong: '가양동', label: '동구 가양동', value: 'dong-gayang' },
  { gu: '동구', dong: '대동', label: '동구 대동', value: 'dong-dae' },
  { gu: '동구', dong: '대청동', label: '동구 대청동', value: 'dong-daecheong' },
  { gu: '동구', dong: '삼성동', label: '동구 삼성동', value: 'dong-samseong' },
  { gu: '동구', dong: '성남동', label: '동구 성남동', value: 'dong-seongnam' },
  { gu: '동구', dong: '소제동', label: '동구 소제동', value: 'dong-soje' },
  { gu: '동구', dong: '신인동', label: '동구 신인동', value: 'dong-sinin' },
  { gu: '동구', dong: '용운동', label: '동구 용운동', value: 'dong-yongun' },
  { gu: '동구', dong: '용전동', label: '동구 용전동', value: 'dong-yongjeon' },
  { gu: '동구', dong: '자양동', label: '동구 자양동', value: 'dong-jayang' },
  { gu: '동구', dong: '중앙동', label: '동구 중앙동', value: 'dong-jungang' },
  { gu: '동구', dong: '판암동', label: '동구 판암동', value: 'dong-panam' },
  { gu: '동구', dong: '홍도동', label: '동구 홍도동', value: 'dong-hongdo' },
  { gu: '동구', dong: '효동', label: '동구 효동', value: 'dong-hyo' },

  // ─── 대덕구 ───
  { gu: '대덕구', dong: '법1동', label: '대덕구 법1동', value: 'daedeok-beob1' },
  { gu: '대덕구', dong: '법2동', label: '대덕구 법2동', value: 'daedeok-beob2' },
  { gu: '대덕구', dong: '비래동', label: '대덕구 비래동', value: 'daedeok-birae' },
  { gu: '대덕구', dong: '석봉동', label: '대덕구 석봉동', value: 'daedeok-seokbong' },
  { gu: '대덕구', dong: '송촌동', label: '대덕구 송촌동', value: 'daedeok-songchon' },
  { gu: '대덕구', dong: '신탄진동', label: '대덕구 신탄진동', value: 'daedeok-sintanjin' },
  { gu: '대덕구', dong: '연축동', label: '대덕구 연축동', value: 'daedeok-yeonchuk' },
  { gu: '대덕구', dong: '오정동', label: '대덕구 오정동', value: 'daedeok-ojeong' },
  { gu: '대덕구', dong: '읍내동', label: '대덕구 읍내동', value: 'daedeok-eupnae' },
  { gu: '대덕구', dong: '중리동', label: '대덕구 중리동', value: 'daedeok-jungri' },
  { gu: '대덕구', dong: '회덕동', label: '대덕구 회덕동', value: 'daedeok-hoedeok' },
];

/**
 * 구별로 그룹화한 객체
 * 모달에서 구 단위로 섹션 표시할 때 활용
 */
export const DISTRICTS_BY_GU: Record<string, District[]> = DAEJEON_DISTRICTS.reduce(
  (acc, district) => {
    if (!acc[district.gu]) {
      acc[district.gu] = [];
    }
    acc[district.gu].push(district);
    return acc;
  },
  {} as Record<string, District[]>,
);

export const GU_LIST = ['유성구', '서구', '중구', '동구', '대덕구'] as const;