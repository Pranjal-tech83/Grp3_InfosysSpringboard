import requests

try:
    res_admin = requests.post("http://127.0.0.1:8000/api/admin/auth/register", json={
        "name": "Admin User", "email": "admin@supportpilot.ai", "password": "password"
    })
    print("Admin:", res_admin.text)
except Exception as e:
    print(e)

try:
    res_emp = requests.post("http://127.0.0.1:8000/api/employee/auth/register", json={
        "name": "Employee User", "email": "employee@supportpilot.ai", "password": "password"
    })
    print("Employee:", res_emp.text)
except Exception as e:
    print(e)
