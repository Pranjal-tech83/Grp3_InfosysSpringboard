import requests

res_admin = requests.post("http://127.0.0.1:8000/api/admin/auth/register", json={
    "name": "Pranjal", 
    "email": "theman838303@gmail.com", 
    "password": "Pranjal@"
})
print("Admin Registration:", res_admin.status_code, res_admin.text)
