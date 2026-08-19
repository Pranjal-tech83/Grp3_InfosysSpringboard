import requests

res_admin = requests.post("https://grp3-infosysspringboard.onrender.com/api/admin/auth/register", json={
    "name": "Pranjal", 
    "email": "theman838303@gmail.com", 
    "password": "Pranjal@"
})
print("Admin Registration:", res_admin.status_code, res_admin.text)
