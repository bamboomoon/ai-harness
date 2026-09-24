#!/usr/bin/env bash
# 交付关卡：对本次未提交改动影响的模块运行集成、E2E 与改动行变异测试，全部通过后记录与改动指纹绑定的标记。
# Stop hook 据此确认交付前已完成 L2/L3 验证；之后再改代码，指纹变化，标记自动失效。
# 集成测试只跑受影响的包，变异测试只变异改动的文件；
# E2E 只跑 smoke 加上传入的领域标签（server 的 Ginkgo label 与 web 的 Playwright tag 同名），全量留给 CI。
# 用法：scripts/verify-delivery.sh [领域...]    运行关卡，例如 scripts/verify-delivery.sh billing auth
#       scripts/verify-delivery.sh --all          E2E 跑全量
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

e2e_label="" web_grep=""
if [[ "${1:-}" != --all ]]; then
  areas=(smoke "$@")
  e2e_label="$(printf ' || %s' "${areas[@]}")" && e2e_label="${e2e_label:4}"
  web_grep="$(printf '|@%s' "${areas[@]}")" && web_grep="${web_grep:1}"
fi

changed="$({ git diff --name-only HEAD; git ls-files --others --exclude-standard; } | grep -v '\.md$' || true)"
has() { grep -q "^$1/" <<<"$changed"; }

# 集成测试只跑改动的 Go 包及（含测试代码）依赖它们的包；改了迁移、go.mod 等非 Go 文件或无法解析时跑全量。
integration_pkgs() {
  local files targets
  files="$(grep '^server/' <<<"$changed")"
  if grep -qv '\.go$' <<<"$files" || ! targets="$(cd server && go list -e $(sed 's|/[^/]*$||; s|^server|.|' <<<"$files" | sort -u))"; then
    echo ./internal/...
    return
  fi
  (cd server && go list -tags=integration -test -f '{{with .ForTest}}{{.}}{{else}}{{.ImportPath}}{{end}} {{join .Deps " "}}' ./internal/...) |
    awk -v t="$targets" 'BEGIN { n = split(t, a, "\n"); for (i = 1; i <= n; i++) want[a[i]] = 1 }
      { for (i = 1; i <= NF; i++) if ($i in want) { print $1; next } }' |
    grep -v '\.test$' | sort -u | xargs
}

steps=()
if has server; then
  pkgs="$(integration_pkgs)"
  [[ -n "$pkgs" ]] && steps+=("make -C server integration PKGS=$(printf %q "$pkgs")")
  steps+=("make -C server e2e LABEL=$(printf %q "$e2e_label")")
fi
# web E2E 连接真实 server，server 改动同样需要回归浏览器链路。
{ has web || has server; } && steps+=("npm --prefix web run test:e2e${web_grep:+ -- --grep $(printf %q "$web_grep")}")
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
