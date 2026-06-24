document.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('login-form');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const submitMessage = document.getElementById('submit-message');
  const themeToggle = document.getElementById('theme-toggle');
  const togglePassword = document.getElementById('toggle-password');

  // Theme init
  const savedTheme = localStorage.getItem('theme');
  if(savedTheme === 'dark') document.body.classList.add('dark');
  function updateTheme(){
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  }
  themeToggle && themeToggle.addEventListener('click', updateTheme);

  // Toggle password visibility
  togglePassword && togglePassword.addEventListener('click', ()=>{
    if(password.type === 'password'){
      password.type = 'text';
      togglePassword.setAttribute('aria-label','隐藏密码');
    } else {
      password.type = 'password';
      togglePassword.setAttribute('aria-label','显示密码');
    }
  });

  function validateEmail(v){
    if(!v) return '请填写邮箱或用户名。';
    // 简单的邮箱格式检查（也接受短用户名）
    const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if(v.includes('@') && !re.test(v)) return '请输入有效的邮箱地址。';
    return '';
  }

  function validatePassword(v){
    if(!v) return '请填写密码。';
    if(v.length < 6) return '密码至少 6 个字符。';
    return '';
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    emailError.textContent = '';
    passwordError.textContent = '';
    submitMessage.textContent = '';

    const eVal = email.value.trim();
    const pVal = password.value;

    const eErr = validateEmail(eVal);
    const pErr = validatePassword(pVal);

    if(eErr){ emailError.textContent = eErr; animateInvalid(email); return; }
    if(pErr){ passwordError.textContent = pErr; animateInvalid(password); return; }

    // 优先使用 data-api 指定的后端接口；否则回退到本地模拟
    const api = form.dataset.api || '/api/login';
    const btn = form.querySelector('button[type=submit]');
    submitMessage.textContent = '正在登录...';
    btn.disabled = true;

    // 发起请求（超时后回退到模拟，以便静态预览仍能使用）
    const payload = { email: eVal, password: pVal, remember: !!document.getElementById('remember').checked };
    let didRespond = false;
    const timeout = setTimeout(()=>{
      if(didRespond) return;
      // 回退到模拟逻辑
      btn.classList.remove('loading');
      btn.disabled = false;
      submitMessage.textContent = '';
      if(eVal === 'demo@example.com' && pVal === 'password'){
        showSuccessScreen();
      } else {
        passwordError.textContent = '邮箱或密码错误（模拟）。';
        animateInvalid(password);
      }
    }, 1200);

    fetch(api, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(async res => {
        didRespond = true; clearTimeout(timeout);
        btn.classList.remove('loading');
        btn.disabled = false; submitMessage.textContent = '';
        if(res.ok){
          const data = await res.json().catch(()=>({}));
          showSuccessScreen(data.message || '登录成功');
        } else {
          const err = await res.json().catch(()=>({}));
          passwordError.textContent = err.message || '邮箱或密码错误。';
          animateInvalid(password);
        }
      }).catch(()=>{
        // 如果网络错误则等待超时逻辑处理回退
      });
  });

  // helper: animate invalid field and shake card
  function animateInvalid(input){
    input.classList.add('invalid');
    const card = document.querySelector('.card');
    card.classList.add('shake');
    setTimeout(()=>{ input.classList.remove('invalid'); card.classList.remove('shake'); }, 700);
    input.focus();
  }

  // helper: show success screen with SPA-like transition
  function showSuccessScreen(msg){
    const card = document.querySelector('.card');
    const success = document.getElementById('success-screen');
    card.classList.add('fade-out');
    setTimeout(()=>{
      success.classList.add('show');
      success.setAttribute('aria-hidden','false');
    }, 420);
  }

  // wire success continue button
  const successContinue = document.getElementById('success-continue');
  successContinue && successContinue.addEventListener('click', ()=>{
    // 简单示例：关闭 success 屏幕并重置表单
    const success = document.getElementById('success-screen');
    success.classList.remove('show');
    document.querySelector('.card').classList.remove('fade-out');
    form.reset();
  });
});
