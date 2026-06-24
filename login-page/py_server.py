from flask import Flask, request, jsonify, make_response
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import time
import os
import json
import secrets

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('PY_JWT_SECRET', 'dev_py_secret')

TOKENS_FILE = os.path.join(os.path.dirname(__file__), 'py_refresh_tokens.json')
if os.path.exists(TOKENS_FILE):
    with open(TOKENS_FILE,'r',encoding='utf8') as f:
        try:
            stored = json.load(f)
        except:
            stored = []
else:
    stored = []
refresh_tokens = set(stored)

users = {}
if 'demo@example.com' not in users:
    users['demo@example.com'] = {'password': generate_password_hash('password')}

def save_tokens():
    with open(TOKENS_FILE,'w',encoding='utf8') as f:
        json.dump(list(refresh_tokens), f, indent=2)

def generate_access(payload, exp=900):
    data = payload.copy()
    data['exp'] = int(time.time()) + exp
    return jwt.encode(data, app.config['SECRET_KEY'], algorithm='HS256')

def generate_refresh(payload, exp=7*24*3600):
    data = payload.copy()
    data['exp'] = int(time.time()) + exp
    return jwt.encode(data, app.config['SECRET_KEY'], algorithm='HS256')

@app.route('/api/login', methods=['POST'])
def login():
    body = request.get_json() or {}
    email = body.get('email')
    password = body.get('password')
    user = users.get(email)
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'message':'邮箱或密码不正确'}), 401
    payload = {'email': email}
    access = generate_access(payload)
    refresh = generate_refresh(payload)
    refresh_tokens.add(refresh)
    save_tokens()
    csrf = secrets.token_hex(24)
    resp = make_response(jsonify({'accessToken': access, 'email': email, 'csrfToken': csrf}))
    resp.set_cookie('refreshToken', refresh, httponly=True, samesite='Lax')
    resp.set_cookie('csrfToken', csrf, httponly=False, samesite='Lax')
    return resp

@app.route('/api/refresh', methods=['POST'])
def refresh():
    csrf_header = request.headers.get('x-csrf-token')
    csrf_cookie = request.cookies.get('csrfToken')
    if not csrf_header or not csrf_cookie or csrf_header != csrf_cookie:
        return jsonify({'message':'CSRF token mismatch'}), 403
    token = request.cookies.get('refreshToken')
    if not token or token not in refresh_tokens:
        return jsonify({'message':'No refresh token'}), 401
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
    except Exception:
        return jsonify({'message':'Invalid refresh token'}), 403
    access = generate_access({'email': payload.get('email')})
    return jsonify({'accessToken': access})

@app.route('/api/logout', methods=['POST'])
def logout():
    csrf_header = request.headers.get('x-csrf-token')
    csrf_cookie = request.cookies.get('csrfToken')
    if not csrf_header or not csrf_cookie or csrf_header != csrf_cookie:
        return jsonify({'message':'CSRF token mismatch'}), 403
    token = request.cookies.get('refreshToken')
    if token and token in refresh_tokens:
        refresh_tokens.remove(token)
        save_tokens()
    resp = make_response(jsonify({'success': True}))
    resp.delete_cookie('refreshToken')
    resp.delete_cookie('csrfToken')
    return resp

@app.route('/api/protected')
def protected():
    auth = request.headers.get('Authorization','')
    parts = auth.split(' ')
    if len(parts) != 2 or parts[0] != 'Bearer':
        return jsonify({'message':'Missing token'}), 401
    token = parts[1]
    try:
        p = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return jsonify({'message': f"Hello {p.get('email')}, this is protected data."})
    except Exception:
        return jsonify({'message':'Invalid or expired token'}), 401

if __name__ == '__main__':
    app.run(port=3001)
