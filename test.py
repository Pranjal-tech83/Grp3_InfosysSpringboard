import urllib.request, json, urllib.error
req = urllib.request.Request('https://grp3-infosysspringboard.onrender.com/api/employee/auth/register', data=json.dumps({'name': 'Test', 'email': 'test22@example.com', 'password': 'Pass'}).encode(), headers={'Content-Type': 'application/json', 'Origin': 'https://grp3-infosys-springboard.vercel.app'})
try:
    urllib.request.urlopen(req)
    print("Success")
except urllib.error.HTTPError as e:
    print(e.read().decode())
