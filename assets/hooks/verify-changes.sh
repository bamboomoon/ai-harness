#!/usr/bin/env bash
# Stop hook：回合结束前检查未提交改动，兼容 Claude Code 与 Codex。
# 1. 有代码改动的模块运行 check 与单元/公共测试，失败即退回 agent 修复；
# 2. 测试防篡改检查与先红后绿证明发现待审项时退回一次，要求修复或在交付说明「测试改动说明」中解释；
# 3. 有模块代码改动但交付关卡（scripts/verify-delivery.sh：集成、E2E、变异测试）未对当前改动通过时退回一次。
#    同一组提醒只退回一次，避免阶段性汇报或提问的回合被反复阻塞；CI 仍全量复核。
set -uo pipefail

input="$(cat)"
cwd="$(jq -r '.cwd // empty' <<<"$input" 2>/dev/null)"
# 优先用会话项目根（Claude Code 提供）：主会话临时 cd 进其他 worktree 时仍检查自己的仓库；Codex 无此变量时退回 hook 输入的 cwd。
root="$(git -C "${CLAUDE_PROJECT_DIR:-${cwd:-$PWD}}" rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$root" || exit 0
already_continued="$(jq -r '.stop_hook_active // false' <<<"$input" 2>/dev/null)"

# 以 decision=block 把原因交回 agent 继续处理；已因本 hook 继续过一轮时改为提示用户，避免死循环。
block() {
  if [[ "$already_continued" == true ]]; then
    jq -n --arg msg "$1" '{systemMessage: ("检查仍未通过，请人工确认：\n" + $msg)}'
  else
    jq -n --arg reason "$1" '{decision: "block", reason: $reason}'
  fi
  exit 0
}

all_changed="$(git status --porcelain --untracked-files=all | sed -E 's/^.{3}//; s/.* -> //')"
[[ -z "$all_changed" ]] && exit 0
# 模块检查只按代码改动触发；纯 Markdown 变更只检查文档链接。
changed="$(grep -v '\.md$' <<<"$all_changed" || true)"
modules=()
for module in web server daemon; do
  grep -q "^$module/" <<<"$changed" && modules+=("$module")
done

failures=""
if grep -q '\.md$' <<<"$all_changed" && ! output="$(node scripts/check-doc-links.mjs 2>&1)"; then
  failures+=$'\n'"## 文档链接失败"$'\n'"$output"$'\n'
fi
# 顺序执行，避免并行负载导致进程启动类测试超时误报。
for module in ${modules[@]+"${modules[@]}"}; do
  case "$module" in
    web) checks='npm run check && npm run test:unit' ;;
    server) checks='make check && make test' ;;
    daemon) checks='npm run check && npm test' ;;
  esac
  if ! output="$(cd "$module" && bash -c "$checks" 2>&1)"; then
    failures+=$'\n'"## $module 失败：$checks"$'\n'"$(tail -n 40 <<<"$output")"$'\n'
  fi
done
[[ -n "$failures" ]] && block "快速检查未通过，请修复后再结束：$failures"

# 测试可信度：只关心被标记的条目，结论相同则不重复阻塞。
guard="$(node scripts/test-guard.mjs 2>&1 | grep '^- ' || true)"
red_green="$(node scripts/red-green.mjs 2>&1 | grep -E '^- (⚠️|❌)' || true)"
review="$(printf '%s\n%s' "$guard" "$red_green" | grep -v '^$' || true)"
state_dir="$(git rev-parse --git-dir)/agent-hooks"
mkdir -p "$state_dir"

# 同一提醒只退回一次：指纹与上次记录相同则放行。
remind_once() {
  local name="$1" key="$2" message="$3"
  [[ "$(cat "$state_dir/$name" 2>/dev/null)" == "$key" ]] && return 0
  printf '%s\n' "$key" >"$state_dir/$name"
  block "$message"
}

if [[ -n "$review" ]]; then
  remind_once stop-review.sha "$(shasum -a 256 <<<"$review" | cut -d' ' -f1)" "测试改动需要处理：能修的直接修（删除意外的 skip/only、补测试使其在旧实现失败），有意的改动在交付说明「测试改动说明」中按组解释理由：
$review"
fi

# 交付关卡：有模块代码改动时，要求对当前改动运行过集成、E2E 与变异测试。
if [[ ${#modules[@]} -gt 0 ]]; then
  current="$(scripts/verify-delivery.sh --fingerprint)"
  if [[ "$(cat "$state_dir/delivery-verified" 2>/dev/null)" != "$current" ]]; then
    remind_once delivery-reminded "$current" "交付前需运行 scripts/verify-delivery.sh <本次改动涉及的 E2E 领域标签>（受影响包的集成测试、smoke 与所传领域的 E2E、改动文件的变异测试），通过后再交付；若本回合只是阶段性汇报或提问，请在回复中明确说明「未交付，尚未运行交付关卡」。"
  fi
fi
