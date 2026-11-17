// 백그라운드(앱이 닫혀 있을 때) 푸시 알림 수신용. index.html 과 같은 폴더(저장소 맨 위)에 둡니다.
// Firebase 라이브러리를 불러오지 않고(외부 파일 의존 없음) 푸시 이벤트를 직접 처리합니다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let d = {};
  try{ d = event.data ? event.data.json() : {}; }catch(e){ d = { notification: { body: event.data ? event.data.text() : '' } }; }
  const n = d.notification || d.data || {};
  const title = n.title || '공지사항';
  const link = (d.fcmOptions && d.fcmOptions.link) || (d.data && d.data.link) || n.click_action || './';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: n.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { link }
    }).then(updateBadge)
  );
});

// 아이폰만: 앱 아이콘 배지에 아직 확인하지 않은 알림 수를 표시 (안드로이드·PC는 기존 방식 그대로)
const IS_IOS = /iPhone|iPad|iPod/i.test(self.navigator.userAgent || '');
async function updateBadge(){
  if(!IS_IOS) return;
  try{
    const list = await self.registration.getNotifications();
    if(!list.length){ if(self.navigator.clearAppBadge) await self.navigator.clearAppBadge(); }
    else if(self.navigator.setAppBadge) await self.navigator.setAppBadge(list.length);
  }catch(e){}
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(updateBadge());
  const link = (event.notification.data && event.notification.data.link) || './';
  const url = new URL(link, self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for(const c of list){ if('focus' in c) return c.focus(); }      // 이미 열려 있으면 그 창으로
    return self.clients.openWindow(url);
  }));
});
