// 백그라운드(앱이 닫혀 있을 때) 푸시 알림 수신용. index.html 과 같은 폴더(저장소 맨 위)에 둡니다.
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAZxNMz_RR0vyos7My8wYq6NLPiDk5smD8",
  authDomain: "work-dairy-48ffb.firebaseapp.com",
  projectId: "work-dairy-48ffb",
  storageBucket: "work-dairy-48ffb.firebasestorage.app",
  messagingSenderId: "744194512360",
  appId: "1:744194512360:web:81c7177afc8013bd71005d"
});

// notification 형식으로 보낸 메시지는 브라우저가 알아서 알림창에 표시하고,
// 알림을 누르면 보낼 때 지정한 링크(fcmOptions.link)로 열립니다.
firebase.messaging();
