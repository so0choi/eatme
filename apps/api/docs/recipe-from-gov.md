# 공공기관 레시피 DB 시드 데이터 적재하기

## 요청 세팅값

- base url: <http://openapi.foodsafetykorea.go.kr/api/keyId/serviceId/dataType/startIdx/endIdx>
- api key: 5aeb07f376d24e059179

## 요청 방법

1. 추가요청인자가 없을 경우 <http://openapi.foodsafetykorea.go.kr/api/인증키/서비스명/요청파일타입/요청시작위치/요청종료위치>
2. 추가요청인자가 있을 경우 <http://openapi.foodsafetykorea.go.kr/api/인증키/서비스명/요청파일타입/요청시작위치/요청종료위치/변수명=값&변수명=값2>

예시: <http://openapi.foodsafetykorea.go.kr/api/sample/COOKRCP01/xml/1/5/RCP_NM=값> &RCP_PARTS_DTLS=값 &CHNG_DT=값 &RCP_PAT2=값

## 변수 설명

| 번호 | 변수명         | 타입         | 변수설명                       | 값설명                                                                   |
| ---- | -------------- | ------------ | ------------------------------ | ------------------------------------------------------------------------ |
| 1    | keyId          | STRING(필수) | 인증키                         | OpenAPI 에서 발급된 인증키                                               |
| 2    | serviceId      | STRING(필수) | 서비스명                       | 요청대상인 해당 서비스명                                                 |
| 3    | dataType       | STRING(필수) | 요청파일 타입                  | xml : xml파일, json : json파일                                           |
| 4    | startIdx       | STRING(필수) | 요청시작위치                   | 정수입력                                                                 |
| 5    | endIdx         | STRING(필수) | 요청종료위치                   | 정수입력                                                                 |
| 6    | RCP_NM         | STRING(선택) | 메뉴명                         | 추가 파라미터값                                                          |
| 7    | RCP_PARTS_DTLS | STRING(선택) | 재료정보1                      | 추가 파라미터값                                                          |
| 8    | CHNG_DT        | STRING(선택) | 변경일자(YYYYMMDD)             | 변경일자 기준 이후 자료를 출력한다. 정수입력 : 20170101 (2017년 1월 1일) |
| 9    | RCP_PAT2       | STRING(선택) | 요리종류(ex 반찬, 국, 후식 등) | 추가 파라미터값                                                          |
