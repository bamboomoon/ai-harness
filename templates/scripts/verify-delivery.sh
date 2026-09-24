#!/usr/bin/env bash
# 交付关卡：对本次未提交改动影响的模块运行集成、E2E 与改动行变异测试，全部通过后记录与改动指纹绑定的标记。
# Stop hook 据此确认交付前已完成 L2/L3 验证；之后再改代码，指纹变化，标记自动失效。
# 用法：scripts/verify-delivery.sh            运行关卡
#       scripts/verify-delivery.sh --fingerprint  只输出当前改动指纹（供 Stop hook 比对）
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"
marker="$(git rev-parse --git-dir)/agent-hooks/delivery-verified"

# 指纹覆盖已跟踪文件的改动与未跟踪文件内容，任何代码变化都会改变它。
fingerprint() {
  {
    git diff HEAD --binary
    git ls-files --others --exclude-standard -z | xargs -0 shasum -a 256 2>/dev/null || true
  } | shasum -a 256 | cut -d' ' -f1
}

if [[ "${1:-}" == --fingerprint ]]; then
  fingerprint
  exit 0
fi

changed="$({ git diff --name-only HEAD; git ls-files --others --exclude-standard; } | grep -v '\.md$' || true)"
has() { grep -q "^$1/" <<<"$changed"; }
steps=()
has server && steps+=("make -C server integration" "make -C server e2e")
# web E2E 连接真实 server，server 改动同样需要回归浏览器链路。
{ has web || has server; } && steps+=("npm --prefix web run test:e2e")
{ has server || has web; } && steps+=("scripts/test-env.sh node scripts/mutation.mjs")

if [[ ${#steps[@]} -eq 0 ]]; then
  echo "交付关卡：没有需要集成或 E2E 验证的模块改动"
else
  for step in "${steps[@]}"; do
    echo "== $step"
    bash -c "$step"
  done
fi

mkdir -p "$(dirname "$marker")"
fingerprint >"$marker"
echo "交付关卡通过：已运行 ${#steps[@]} 项（${steps[*]:-无}），标记与当前改动绑定"
