import { timingSafeEqual } from 'node:crypto';

// 비밀번호를 길이와 상관없이 일정한 시간으로 비교한다.
export function samePassword(given) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real) return false;
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(real);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
