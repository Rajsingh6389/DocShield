import pymysql
import sys

def test_local_mysql():
    params = [
        {"user": "root", "password": ""},
        {"user": "root", "password": "password"},
        {"user": "root", "password": "root"},
    ]
    
    for p in params:
        try:
            print(f"Trying to connect with user={p['user']}, password={p['password']}...")
            conn = pymysql.connect(
                host='127.0.0.1',
                user=p['user'],
                password=p['password'],
                port=3306,
                connect_timeout=2
            )
            print("Successfully connected!")
            with conn.cursor() as cursor:
                cursor.execute("SHOW DATABASES")
                databases = cursor.fetchall()
                print("Databases found:", [db[0] for db in databases])
            conn.close()
            return
        except Exception as e:
            print(f"Failed: {e}")

if __name__ == "__main__":
    test_local_mysql()
