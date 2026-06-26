// fetchWithAuth: attaches access token, sends CSRF header from cookie, auto-refreshes once on 401
async function getCsrfFromCookie(){
  const m = document.cookie.match(/(?:^|; )csrfToken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function fetchWithAuth(input, init={}){
  const token = localStorage.getItem('accessToken');
  const headers = new Headers(init.headers || {});
  if(token) headers.set('Authorization', `Bearer ${token}`);
  const csrf = await getCsrfFromCookie();
  if(csrf) headers.set('x-csrf-token', csrf);

  const res = await fetch(input, {...init, credentials: 'include', headers});
  if(res.status === 401){
    // try refresh once
    const refreshed = await tryRefresh();
    if(refreshed){
      const newToken = localStorage.getItem('accessToken');
      if(newToken) headers.set('Authorization', `Bearer ${newToken}`);
      return fetch(input, {...init, credentials: 'include', headers});
    }
  }
  return res;
}

async function tryRefresh(){
  const csrf = await (async ()=>{ const m = document.cookie.match(/(?:^|; )csrfToken=([^;]+)/); return m ? decodeURIComponent(m[1]) : null })();
  try{
    const r = await fetch('/api/refresh', { method: 'POST', credentials: 'include', headers: csrf ? { 'x-csrf-token': csrf } : {} });
    if(r.ok){ const j = await r.json(); if(j.accessToken){ localStorage.setItem('accessToken', j.accessToken); return true } }
  }catch(e){}
  return false;
}

export async function logout(){
  const csrf = await (async ()=>{ const m = document.cookie.match(/(?:^|; )csrfToken=([^;]+)/); return m ? decodeURIComponent(m[1]) : null })();
  await fetch('/api/logout', { method: 'POST', credentials: 'include', headers: csrf ? { 'x-csrf-token': csrf } : {} });
  localStorage.removeItem('accessToken');
}

export default fetchWithAuth;
