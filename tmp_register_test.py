import json
import urllib.request
import urllib.error

url = 'https://billing.qtechx.com/api/auth/register'
data = {
    'name': 'Test',
    'email': 'test@example.com',
    'phone': '1234567890',
    'password': 'Password123!'
}

req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    res = urllib.request.urlopen(req, timeout=20)
    print('status', res.status)
    print(res.read().decode())
except urllib.error.HTTPError as e:
    print('status', e.code)
    print(e.read().decode())
except Exception as e:
    print('error', e)
