#!/usr/bin/env bash
# 临时测试环境：启动独立的 PostgreSQL/Redis 容器，迁移并写入种子账号，在该环境中执行命令，结束后销毁。
# 用法：scripts/test-env.sh [--browser] <命令...>；--browser 额外启动容器内的 Playwright 浏览器，
# 并通过 PW_TEST_CONNECT_* 让测试在本机运行、浏览器在 Linux 容器中访问本机服务。
# 命令可读取的环境：DATABASE_URL、REDIS_URL、JWT_SECRET、PROVIDER_ENCRYPTION_KEY、ADMIN_PASSWORD，
# 以及 E2E_ENV_FILE（数据库与 Redis 连接）和 E2E_LOGIN_ENV_FILE（管理员与普通账号）。
set -euo pipefail

profiles=()
if [[ "${1:-}" == --browser ]]; then
  profiles=(--profile browser)
  shift
fi
if [[ $# -eq 0 ]]; then
  printf '用法：scripts/test-env.sh [--browser] <命令...>\n' >&2
  exit 2
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
project="elinter-test-$$"
work="$(mktemp -d)"
compose=(docker compose --progress quiet -p "$project" -f "$root/compose.test.yaml" ${profiles[@]+"${profiles[@]}"})
seed_pid=""

cleanup() {
  [[ -n "$seed_pid" ]] && kill "$seed_pid" 2>/dev/null
  "${compose[@]}" down -v --remove-orphans >/dev/null 2>&1 || printf '容器清理失败：docker compose -p %s down -v\n' "$project" >&2
  rm -rf "$work"
}
trap cleanup EXIT

"${compose[@]}" up -d --wait >/dev/null
port() { "${compose[@]}" port "$1" "$2" | awk -F: '{print $NF}'; }
free_port() { python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])'; }

export DATABASE_URL="postgres://elinter:elinter@127.0.0.1:$(port postgres 5432)/elinter?sslmode=disable"
export REDIS_URL="redis://127.0.0.1:$(port redis 6379)/0"
export JWT_SECRET="$(openssl rand -hex 32)"
export PROVIDER_ENCRYPTION_KEY="$(openssl rand -base64 32)"
# 满足密码规则：8–16 位 ASCII，含字母、数字与符号。
export ADMIN_PASSWORD="Aa1!$(openssl rand -hex 4)"
user_password="Bb2@$(openssl rand -hex 4)"
# 已导出的变量优先于 server 目录下的 dotenv，测试不会连到开发库。
export ELINTER_ENV=test

if [[ ${#profiles[@]} -gt 0 ]]; then
  browser_port="$(port browser 3000)"
  for _ in $(seq 120); do curl -s "http://127.0.0.1:$browser_port/" >/dev/null && break; sleep 0.5; done
  export PW_TEST_CONNECT_WS_ENDPOINT="ws://127.0.0.1:$browser_port/" PW_TEST_CONNECT_EXPOSE_NETWORK='<loopback>'
fi

cd "$root/server"
go build -o "$work/server" ./cmd/server
go run ./cmd/migrate up >/dev/null
go run ./cmd/init >/dev/null

# 普通账号经真实管理接口创建，与产品入口保持一致。
seed_port="$(free_port)"
PORT="$seed_port" LOG_DIR="$work/logs" "$work/server" >"$work/seed.log" 2>&1 &
seed_pid=$!
api="http://127.0.0.1:$seed_port"
for _ in $(seq 100); do curl -fsS "$api/readyz" >/dev/null 2>&1 && break; sleep 0.1; done
token="$(curl -fsS "$api/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"account\":\"admin\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -er '.data.token')"
curl -fsS "$api/api/admin/users" -H 'Content-Type: application/json' -H "Authorization: Bearer $token" \
  -d "{\"account\":\"member\",\"password\":\"$user_password\"}" | jq -e '.code == 0' >/dev/null
kill "$seed_pid" && wait "$seed_pid" 2>/dev/null || true
seed_pid=""

printf 'DATABASE_URL=%s\nREDIS_URL=%s\n' "$DATABASE_URL" "$REDIS_URL" >"$work/server.env"
printf 'admin_account=admin\nadmin_password=%s\naccount=member\npassword=%s\n' "$ADMIN_PASSWORD" "$user_password" >"$work/login.env"
export E2E_ENV_FILE="$work/server.env" E2E_LOGIN_ENV_FILE="$work/login.env" ELINTER_TEST_ENV=1

cd "$root"
printf '临时测试环境就绪（project %s），执行：%s\n' "$project" "$*"
"$@"
