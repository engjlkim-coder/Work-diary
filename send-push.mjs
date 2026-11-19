// 매일 아침 GitHub Actions 에서 실행: 오늘이 공지 날짜인 공지를 찾아 지정한 근무자에게 푸시 발송
import admin from 'firebase-admin';

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.SA)) });
const db = admin.firestore();
const APP_URL = (process.env.APP_URL || '').trim();            // 예: https://아이디.github.io/저장소/index.html (비워도 발송은 됨)
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜
console.log('대상 날짜(KST):', today);

const snap = await db.collection('notices').where('noticeDate', '==', today).get();
let sentCount = 0;
for (const d of snap.docs) {
  const n = d.data();
  if (n.enabled === false) continue;
  if (n.pushSent === today) continue;                         // 오늘 이미 보낸 공지
  const emails = (n.pushTo || []).map(e => String(e).toLowerCase());
  if (!emails.length) continue;

  const owner = new Map();                                    // 토큰 -> 이메일 (만료 토큰 정리용)
  for (const email of emails) {
    const t = await db.collection('push_tokens').doc(email).get();
    if (t.exists) (t.data().tokens || []).forEach(tok => owner.set(tok, email));
  }
  const tokens = [...owner.keys()];
  if (!tokens.length) { console.log(`${d.id}: 알림을 설정한 대상자가 없어 건너뜀`); continue; }

  const title = (n.title || '').trim() || '공지사항';
  const body = String(n.message || '').replace(/\s+/g, ' ').trim().slice(0, 120) || '새 공지가 있습니다.';
  const message = { tokens, notification: { title: `📢 ${title}`, body } };
  // 긴급 우선순위(절전 중인 안드로이드에도 빨리 전달) + 24시간 안에 전달되지 않으면 폐기
  message.webpush = { headers: { Urgency: 'high', TTL: '86400' } };
  if (APP_URL) { message.webpush.fcmOptions = { link: APP_URL }; message.data = { link: APP_URL }; }

  const res = await admin.messaging().sendEachForMulticast(message);
  console.log(`${d.id}: 성공 ${res.successCount} / 실패 ${res.failureCount}`);

  // 대상자별 등록 기기 수와, 실패한 기기의 오류 이유를 로그에 남김 (이메일은 앞 3글자만 표시)
  const per = {};
  tokens.forEach(t => { const e = owner.get(t); per[e] = (per[e] || 0) + 1; });
  console.log('등록 기기 수:', Object.entries(per).map(([e, c]) => `${e.slice(0, 3)}***: ${c}`).join(', '));

  // 더 이상 유효하지 않은 토큰은 지움
  const dead = [];
  res.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (r.error) console.log(`  실패 [${owner.get(tokens[i]).slice(0, 3)}***] ${code} - ${r.error.message}`);
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') dead.push(tokens[i]);
  });
  for (const tok of dead) {
    await db.collection('push_tokens').doc(owner.get(tok)).update({ tokens: admin.firestore.FieldValue.arrayRemove(tok) });
  }
  if (res.successCount > 0) { await d.ref.update({ pushSent: today }); sentCount++; }
}
console.log('발송한 공지 수:', sentCount);
