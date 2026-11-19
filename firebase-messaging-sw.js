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
  const noticeId = (d.data && d.data.noticeId) || '';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: n.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: noticeId ? 'notice-' + noticeId : undefined,     // 같은 공지 알림은 하나로 합침
      renotify: !!noticeId,                                  // 같은 공지를 다시 보내도 소리·배너로 다시 알림
      data: { link, noticeId }
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
  const d = event.notification.data || {};
  let url;
  try{
    url = new URL(d.link || './', self.registration.scope);
    if(d.noticeId) url.searchParams.set('notice', d.noticeId);       // 앱이 새로 열릴 때 이 공지를 팝업으로 보여줌
  }catch(e){ url = new URL('./', self.registration.scope); }
  event.waitUntil((async () => {
    try{ await updateBadge(); }catch(e){}
    let handled = false;
    try{                                                              // 이미 열려 있는 앱 창이 있으면 그 창으로 이동 + 공지 번호 전달
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const c = list.find(x => 'focus' in x && x.url.startsWith(self.registration.scope));
      if(c){
        if(d.noticeId) c.postMessage({ type: 'open-notice', id: d.noticeId });
        await c.focus();
        handled = true;
      }
    }catch(e){}
    if(!handled){                                                     // 열려 있는 창이 없거나 실패하면 새로 열기 (실패하면 앱 첫 화면으로)
      try{ await self.clients.openWindow(url.href); }
      catch(e){ try{ await self.clients.openWindow(self.registration.scope); }catch(_){} }
    }
  })());
});
