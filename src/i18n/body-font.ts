import { koreanLocale, type Locale } from "./locale-registry.ts";

export type BodyFontContract = {
  readonly family: "Geist" | "Noto Sans KR";
  readonly coveredKoreanCharacters?: string;
};

const geistBodyFontContract = Object.freeze({
  family: "Geist",
}) satisfies BodyFontContract;

const koreanBodyFontContract = Object.freeze({
  family: "Noto Sans KR",
  coveredKoreanCharacters:
    "가각간감갑값강갖같개거건걸검것게겨격겪견결겼경계고곳공과곽관광교구굴권귀규그극근글금급기길깊까깝께껴꿀끊끝나날남납났내낸냅너넌널넓네넷년노녹논높누뉴느는늘능니님닝다단닫달담답당대더덕던덤데덱도독돌동됐되된될됨됩두둘뒤뒷드득든들듭듯등디딩따때떤떻떼또뛰뜻라란람랑래랙랜램랩랫략량러럼렇레렌렘려력련렬렵령로록론롭롯뢰료루룬류르른를름릅리릭린릴림립릿링마만많말맞매머먼멀멈메멤며면명몇모목못무묶문물뮤므미믿밀밋밍및바반받발방배백버번범법벗베벤변별병보복본볼부북분불붙브블비빌빠빼뿐사삭산살상새색샘생샷서선설성세섹셋션소속손송쇄수숙순술숨숫스슬습승시식신실심십싱싶쓰아안않알암압앗았앙앞애액앱앵야약양어언얼업없엇었에엔여역엮연열염영예오온올옮옵와완왑왕왜외요용우운움워원월웨위유윤으은을음응의이익인일읽잃임입있자작잔잘잠장재잭쟁저적전절점접정제젝젠져졌조존졸종좋죄주준줄중즉즘증지직진질집째차착찬참창찾채책처천청체쳐초총최추축춘출충춰취측층치칙침커컨컬컴케켓코콘콜퀀크큰클키타탁탄탈탐태택탬터털테텍템토톱통투툴트특티틱틴팁팅파판패퍼펌펑페펴편펼평폐포폭폼표푸풀퓨프픈플피필핑하학한할함합항해핵했행향허험혀현협형호혹혼홈화확환활황회획후휴흐흔흰히",
}) satisfies BodyFontContract;

export function getBodyFontContract(locale: Locale): BodyFontContract {
  return locale === koreanLocale
    ? koreanBodyFontContract
    : geistBodyFontContract;
}
