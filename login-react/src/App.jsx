import React, { useState, useMemo } from 'react'
import fetchWithAuth, { logout as apiLogout } from './api'
import * as yup from 'yup'

const I18N = {
  zh: {
    emailRequired: '请填写邮箱或用户名。',
    emailInvalid: '请输入有效的邮箱地址。',
    passwordRequired: '请填写密码。',
    passwordMin: '密码至少 6 个字符。',
    networkError: '网络错误'
  },
  en: {
    emailRequired: 'Please enter your email or username.',
    emailInvalid: 'Please enter a valid email address.',
    passwordRequired: 'Please enter a password.',
    passwordMin: 'Password must be at least 6 characters.',
    networkError: 'Network error'
  }
}

export default function App(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)
  const [dark, setDark] = useState(localStorage.getItem('theme') === 'dark')
  const [lang, setLang] = useState('zh')

  const t = I18N[lang]

  const schema = useMemo(()=>{
    return yup.object({
      email: yup.string().required(t.emailRequired).test('emailOrUser', t.emailInvalid, v=>{
        if(!v) return false
        if(v.includes('@')){
          const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
          return re.test(v)
        }
        return true
      }),
      password: yup.string().required(t.passwordRequired).min(6, t.passwordMin)
    })
  }, [t])

  function passwordStrength(p){
    let score = 0
    if(!p) return 0
    if(p.length >= 8) score++
    if(/[A-Z]/.test(p)) score++
    if(/[0-9]/.test(p)) score++
    if(/[^A-Za-z0-9]/.test(p)) score++
    return Math.min(score, 4)
  }

  async function onSubmit(e){
    e.preventDefault()
    setErrors({})
    try{
      const value = await schema.validate({ email, password }, { abortEarly:false })
      // validated
      setLoading(true)
      try{
        // include credentials so server can set HttpOnly refresh cookie
        const res = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(value), credentials: 'include'})
        if(res.ok){ setSuccess(true) }
        else{ const j = await res.json().catch(()=>({})); setErrors({ form: j.message || '登录失败' }) }
      }catch(err){ setErrors({ form: t.networkError }) }
      setLoading(false)
    }catch(validationError){
      // collect errors
      const eObj = {}
      if(validationError.inner && validationError.inner.length){
        validationError.inner.forEach(err => { if(err.path) eObj[err.path] = err.message })
      } else if(validationError.path){
        eObj[validationError.path] = validationError.message
      }
      setErrors(eObj)
    }
  }

  // try to refresh access token on mount
  React.useEffect(()=>{
    async function tryRefresh(){
      try{
        const r = await fetch('/api/refresh', { method: 'POST', credentials: 'include' });
        if(r.ok){
          const j = await r.json();
          localStorage.setItem('accessToken', j.accessToken);
        }
      }catch(e){ }
    }
    tryRefresh();
  }, [])

  // helper to call protected API using wrapper
  async function fetchProtected(){
    try{
      const r = await fetchWithAuth('/api/protected');
      const j = await r.json().catch(()=>({}));
      if(r.ok) alert(j.message);
      else alert(j.message || '访问受保护资源失败');
    }catch(e){ alert(t.networkError) }
  }

  function logout(){
    apiLogout().finally(()=>{ localStorage.removeItem('accessToken'); setSuccess(false); });
  }

  function toggleTheme(){
    const next = !dark; setDark(next); localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const strength = passwordStrength(password)

  if(success) return (
    <div className={"success-screen"}>
      <div className="success-card">
        <h2>登录成功</h2>
        <p>欢迎回来！</p>
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button className="btn" onClick={()=>{fetchProtected()}}>访问受保护接口</button>
          <button className="btn" onClick={()=>{logout()}}>登出</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={"page " + (dark ? 'dark' : '')}>
      <section className="card" aria-labelledby="login-title">
        <div className="card-header">
          <h1 id="login-title">登录到你的账户</h1>
          <div>
            <select aria-label="语言" value={lang} onChange={e=>setLang(e.target.value)} style={{marginRight:8}}>
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
            <button className="theme-toggle" onClick={toggleTheme}>{dark? '☀️':'🌙'}</button>
          </div>
        </div>
        <form onSubmit={onSubmit} className="form" noValidate>
          <label htmlFor="email">邮箱或用户名</label>
          <input id="email" value={email} onChange={e=>setEmail(e.target.value)} aria-describedby="email-error" aria-invalid={!!errors.email} />
          {errors.email && <div id="email-error" className="error">{errors.email}</div>}

          <label htmlFor="password">密码</label>
          <input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} aria-describedby="password-error" aria-invalid={!!errors.password} />
          <div className="pw-meter" aria-hidden>
            <div className={"pw-bar pw-"+strength}></div>
          </div>
          {errors.password && <div id="password-error" className="error">{errors.password}</div>}

          {errors.form && <div className="error">{errors.form}</div>}

          <button className={"btn " + (loading ? 'loading' : '')} disabled={loading} aria-live="polite">
            <span className="btn-text">{lang==='zh'?'登录':'Sign in'}</span>
            <span className="spinner" aria-hidden></span>
          </button>
        </form>
      </section>
    </div>
  )
}
