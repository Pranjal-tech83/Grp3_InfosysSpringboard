import requests

try:
    res_admin = requests.post("https://grp3-infosysspringboard.onrender.com/api/admin/auth/register", json={
        "name": "Admin User", "email": "admin@supportpilot.ai", "password": "password"
    })
    print("Admin:", res_admin.text)
except Exception as e:
    print(e)

try:
    res_emp = requests.post("https://grp3-infosysspringboard.onrender.com/api/employee/auth/register", json={
        "name": "Employee User", "email": "employee@supportpilot.ai", "password": "password"
    })
    print("Employee:", res_emp.text)
except Exception as e:
    print(e)
