import redis
import ssl

# 建立 Redis 連線
r = redis.Redis(
    host='amusing-monster-60852.upstash.io',
    port=6379,
    password='Ae20AAIncDFjMjJlNDdiNzdjNDI0ZGIzOGUzMjNjODdlYzAxZWY5N3AxNjA4NTI',
    ssl=True,  # 啟用 TLS
    decode_responses=True  # 可選：返回字串而非位元組
)

try:
    r.ping()
    print("連線成功 ✅")
except Exception as e:
    print(f"連線失敗 ❌ {e}")