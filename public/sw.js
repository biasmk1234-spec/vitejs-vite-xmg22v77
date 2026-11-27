// 홈 화면 앱 설치용. 아무것도 저장(캐시)하지 않는다 — 항상 최신 사이트를 불러온다.
// 문제가 생기면 이 파일 내용을 self.registration.unregister() 로 바꿔 배포하면 해제된다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
