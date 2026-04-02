#!/usr/bin/env bash
# ============================================================
# nightly-security-audit.sh
# OpenClaw 极简安全实践指南 v2.8 — 夜间安全巡检脚本
# Generated: 2026-04-02 by 樱桃 (Cherry) 🍒
# ============================================================
set -uo pipefail

# --- Configuration ---
OC="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
REPORT_DIR="$OC/security-reports"
KNOWN_ISSUES="$OC/.security-audit-known-issues.json"
BASELINE_CONFIG="$OC/.config-baseline.sha256"
BASELINE_SKILL="$OC/.skill-baseline.sha256"
TIMESTAMP=$(date '+%Y-%m-%d_%H%M%S')
REPORT_FILE="$REPORT_DIR/audit-${TIMESTAMP}.txt"
TODAY_MEMORY="$OC/workspace/memory/$(date '+%Y-%m-%d').md"

# --- Counters ---
CRITICAL=0
WARN=0
OK_COUNT=0

inc_c() { CRITICAL=$((CRITICAL + 1)); }
inc_w() { WARN=$((WARN + 1)); }
inc_o() { OK_COUNT=$((OK_COUNT + 1)); }

header() { printf '\n=== [%s] %s ===\n' "$1" "$2"; }

# --- Create report dir ---
mkdir -p "$REPORT_DIR"

# --- Known Issues Filter ---
# Reads stdin, marks lines matching known-issue patterns for the given check
filter_known_issues() {
    local check_name="$1"
    if [[ ! -f "$KNOWN_ISSUES" ]] || [[ ! -s "$KNOWN_ISSUES" ]] || ! command -v python3 &>/dev/null; then
        cat
        return
    fi
    python3 -c "
import sys, json, re
try:
    with open('${KNOWN_ISSUES}') as f:
        issues = json.load(f)
except Exception:
    issues = []
patterns = [(i['pattern'], i.get('reason', 'known issue'))
            for i in issues if i.get('check') == '${check_name}']
for line in sys.stdin:
    line = line.rstrip('\n')
    matched = False
    for pat, reason in patterns:
        try:
            if re.search(pat, line, re.IGNORECASE):
                print(f'[已知问题-忽略: {reason}] {line}')
                matched = True
                break
        except re.error:
            pass
    if not matched:
        print(line)
" 2>/dev/null || cat
}

# Count non-excluded lines in input
count_real_issues() {
    grep -cv "\[已知问题-忽略" 2>/dev/null || echo "0"
}

# --- Redirect all output to tee → report file + stdout ---
exec > >(tee "$REPORT_FILE") 2>&1

echo "============================================="
echo "  OpenClaw Nightly Security Audit Report"
echo "  Time : $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "  Host : $(hostname)"
echo "  User : $(whoami)"
echo "============================================="

# =============================================================
# [1] OpenClaw Platform Audit
# =============================================================
header 1 "OpenClaw Platform Audit"
if command -v openclaw &>/dev/null; then
    echo "Version: $(openclaw --version 2>&1)"
    GW_STATUS=$(openclaw gateway status 2>&1 | head -n 20) || true
    echo "$GW_STATUS"
    if echo "$GW_STATUS" | grep -qiE "running|active|online"; then
        echo "✅ Gateway is running"
        inc_o
    else
        echo "⚠️ WARN: Gateway may not be running"
        inc_w
    fi
else
    echo "🚨 CRITICAL: openclaw command not found!"
    inc_c
fi

# =============================================================
# [2] Process & Network Audit
# =============================================================
header 2 "Process & Network Audit"

echo "--- Listening Ports (TCP) ---"
TCP_LISTEN=$(sudo ss -tlnp 2>/dev/null || ss -tlnp 2>/dev/null || echo "[ss failed]")
echo "$TCP_LISTEN" | head -n 30
echo ""

echo "--- Listening Ports (UDP) ---"
UDP_LISTEN=$(sudo ss -ulnp 2>/dev/null || ss -ulnp 2>/dev/null || echo "[ss failed]")
echo "$UDP_LISTEN" | head -n 20
echo ""

echo "--- Outbound Established Connections ---"
OUTBOUND=$(sudo ss -tnp state established 2>/dev/null || ss -tnp state established 2>/dev/null || echo "[ss failed]")
OUTBOUND_EXT=$(echo "$OUTBOUND" | grep -vE "127\.0\.0\.1.*127\.0\.0\.1|::1.*::1|\[::1\].*\[::1\]" || true)
echo "$OUTBOUND_EXT" | head -n 30
echo ""

echo "--- Top 15 by CPU ---"
ps aux --sort=-%cpu 2>/dev/null | head -n 16
echo ""

echo "--- Top 15 by Memory ---"
ps aux --sort=-%mem 2>/dev/null | head -n 16

# Check for suspicious outbound
SUSPICIOUS=$(echo "$OUTBOUND_EXT" | grep -vE ":(443|80|53|22|8080|18789|8443|993|587|465) |^$|^Netid|^State|^Recv-Q" 2>/dev/null \
    | head -n 10) || true
if [[ -n "$SUSPICIOUS" ]] && [[ $(echo "$SUSPICIOUS" | grep -c '[0-9]') -gt 0 ]]; then
    echo ""
    echo "⚠️ WARN: Outbound connections to non-standard ports:"
    echo "$SUSPICIOUS" | filter_known_issues "network"
    REAL=$(echo "$SUSPICIOUS" | filter_known_issues "network" | count_real_issues)
    if [[ "$REAL" -gt 0 ]]; then inc_w; else inc_o; fi
else
    echo ""
    echo "✅ No suspicious outbound connections"
    inc_o
fi

# =============================================================
# [3] Sensitive Directory Changes (24h)
# =============================================================
header 3 "Sensitive Directory Changes (24h)"
DIRS_TO_CHECK=("$OC" "/etc" "$HOME/.ssh" "$HOME/.gnupg" "/usr/local/bin")
TOTAL_CHANGES=0

for dir in "${DIRS_TO_CHECK[@]}"; do
    if [[ -d "$dir" ]]; then
        CHANGES=$(find "$dir" -maxdepth 3 -mtime -1 -type f 2>/dev/null | head -n 50)
        COUNT=0
        [[ -n "$CHANGES" ]] && COUNT=$(echo "$CHANGES" | wc -l)
        echo "--- $dir ($COUNT file(s) changed) ---"
        if [[ $COUNT -gt 0 ]]; then
            echo "$CHANGES" | filter_known_issues "dir_changes"
            TOTAL_CHANGES=$((TOTAL_CHANGES + COUNT))
        fi
    else
        echo "--- $dir (not found, skipped) ---"
    fi
done

if [[ $TOTAL_CHANGES -gt 50 ]]; then
    echo "⚠️ WARN: $TOTAL_CHANGES files changed in sensitive dirs"
    inc_w
else
    echo "✅ $TOTAL_CHANGES file(s) changed in sensitive dirs (normal range)"
    inc_o
fi

# =============================================================
# [4] System Scheduled Tasks
# =============================================================
header 4 "System Scheduled Tasks"

echo "--- User crontab ---"
CRONTAB_OUT=$(crontab -l 2>&1) || true
if echo "$CRONTAB_OUT" | grep -qi "no crontab"; then
    echo "(no user crontab)"
else
    echo "$CRONTAB_OUT" | head -n 20
fi

echo ""
echo "--- /etc/cron.d/ ---"
ls -la /etc/cron.d/ 2>/dev/null | head -n 20 || echo "(not accessible)"

echo ""
echo "--- systemd timers (system) ---"
systemctl list-timers --all --no-pager 2>/dev/null | head -n 20 || echo "(not accessible)"

echo ""
echo "--- systemd timers (user) ---"
systemctl --user list-timers --all --no-pager 2>/dev/null | head -n 20 || echo "(not accessible)"

echo ""
echo "--- User systemd units ---"
if [[ -d "$HOME/.config/systemd/user" ]]; then
    ls -la "$HOME/.config/systemd/user/" 2>/dev/null | head -n 20
else
    echo "(no user systemd units directory)"
fi
echo "✅ Scheduled tasks listed for review"
inc_o

# =============================================================
# [5] OpenClaw Cron Jobs
# =============================================================
header 5 "OpenClaw Cron Jobs"
OC_CRON=$(openclaw cron list 2>&1 | head -n 30) || true
if [[ -n "$OC_CRON" ]]; then
    echo "$OC_CRON"
else
    echo "(no cron jobs or command failed)"
fi
echo "✅ OpenClaw cron jobs listed for review"
inc_o

# =============================================================
# [6] Login & SSH
# =============================================================
header 6 "Login & SSH"

echo "--- Recent logins ---"
last -n 15 2>/dev/null || echo "(last command not available)"
echo ""

echo "--- SSH auth failures (last 24h) ---"
SSH_FAILS=""
if command -v journalctl &>/dev/null; then
    SSH_FAILS=$(sudo journalctl -u sshd -u ssh --since "24 hours ago" --no-pager 2>/dev/null \
        | grep -iE "fail|invalid|refused" | tail -n 100) || true
elif [[ -f /var/log/auth.log ]]; then
    SSH_FAILS=$(sudo grep -iE "sshd.*(fail|invalid|refused)" /var/log/auth.log 2>/dev/null | tail -n 100) || true
fi

if [[ -n "$SSH_FAILS" ]]; then
    FAIL_COUNT=$(echo "$SSH_FAILS" | wc -l)
    echo "$SSH_FAILS" | tail -n 20
    echo "(Total SSH failures in 24h: $FAIL_COUNT)"
    if [[ $FAIL_COUNT -gt 50 ]]; then
        echo "🚨 CRITICAL: $FAIL_COUNT SSH failures — possible brute force!"
        inc_c
    elif [[ $FAIL_COUNT -gt 10 ]]; then
        echo "⚠️ WARN: $FAIL_COUNT SSH auth failures"
        inc_w
    else
        echo "✅ SSH failures within normal range ($FAIL_COUNT)"
        inc_o
    fi
else
    echo "✅ No SSH auth failures in last 24h"
    inc_o
fi

# =============================================================
# [7] Critical File Integrity
# =============================================================
header 7 "Critical File Integrity"

echo "--- Config hash baseline ---"
if [[ -f "$BASELINE_CONFIG" ]]; then
    HASH_CHECK=$(sha256sum -c "$BASELINE_CONFIG" 2>&1) || true
    echo "$HASH_CHECK"
    if echo "$HASH_CHECK" | grep -q "FAILED"; then
        echo "🚨 CRITICAL: Config file hash mismatch!"
        inc_c
    else
        echo "✅ Config hash baseline intact"
        inc_o
    fi
else
    echo "⚠️ WARN: No config baseline at $BASELINE_CONFIG"
    inc_w
fi

echo ""
echo "--- File permissions ---"
declare -A EXPECTED_PERMS=(
    ["$OC/openclaw.json"]="600"
    ["$OC/devices/paired.json"]="600"
)
[[ -f "$HOME/.ssh/authorized_keys" ]] && EXPECTED_PERMS["$HOME/.ssh/authorized_keys"]="600"
[[ -f "/etc/ssh/sshd_config" ]] && EXPECTED_PERMS["/etc/ssh/sshd_config"]="644"

PERM_CLEAN=true
for filepath in "${!EXPECTED_PERMS[@]}"; do
    expected="${EXPECTED_PERMS[$filepath]}"
    if [[ -f "$filepath" ]]; then
        actual=$(stat -c '%a' "$filepath" 2>/dev/null || echo "???")
        if [[ "$actual" == "$expected" ]]; then
            echo "  ✅ $filepath (perm=$actual)"
        else
            echo "  🚨 $filepath expected=$expected actual=$actual"
            PERM_CLEAN=false
        fi
    else
        echo "  ⚠️ $filepath (not found)"
    fi
done

if $PERM_CLEAN; then
    echo "✅ All file permissions correct"
    inc_o
else
    echo "🚨 CRITICAL: Permission mismatch detected!"
    inc_c
fi

# =============================================================
# [8] Yellow-Line Cross Validation
# =============================================================
header 8 "Yellow-Line Cross Validation"

echo "--- sudo commands in logs (last 24h, excluding audit commands) ---"
SUDO_LOG=""
if [[ -f /var/log/auth.log ]]; then
    SUDO_LOG=$(sudo grep "sudo:" /var/log/auth.log 2>/dev/null \
        | grep -v "pam_unix" \
        | grep -vE "COMMAND=.*(ss |journalctl|grep |head |tail |cat |sha256sum|find .*mtime|stat |tee )" \
        | tail -n 30) || true
elif command -v journalctl &>/dev/null; then
    SUDO_LOG=$(sudo journalctl --since "24 hours ago" --no-pager 2>/dev/null \
        | grep "sudo:" \
        | grep -v "pam_unix" \
        | grep -vE "COMMAND=.*(ss |journalctl|grep |head |tail |cat |sha256sum|find .*mtime|stat |tee )" \
        | tail -n 30) || true
fi

if [[ -n "$SUDO_LOG" ]]; then
    echo "$SUDO_LOG" | head -n 20
    echo ""
    echo "--- Memory yellow-line entries (today) ---"
    if [[ -f "$TODAY_MEMORY" ]]; then
        grep -iE "黄线|yellow.line|sudo|\[yellow\]" "$TODAY_MEMORY" 2>/dev/null | head -n 20 \
            || echo "(no yellow-line entries in today's memory)"
    else
        echo "(today's memory file not found)"
    fi
    echo "⚠️ WARN: Non-audit sudo commands found — verify against memory logs"
    inc_w
else
    echo "✅ No non-audit sudo commands in last 24h"
    inc_o
fi

# =============================================================
# [9] Disk Usage
# =============================================================
header 9 "Disk Usage"

echo "--- Overall ---"
df -h / 2>/dev/null || echo "[df failed]"
USAGE_PCT=$(df / 2>/dev/null | tail -1 | awk '{gsub(/%/,""); print $5}') || true

if [[ -n "$USAGE_PCT" ]] && [[ "$USAGE_PCT" =~ ^[0-9]+$ ]]; then
    if [[ $USAGE_PCT -gt 85 ]]; then
        echo "🚨 CRITICAL: Disk usage at ${USAGE_PCT}% (>85%)"
        inc_c
    elif [[ $USAGE_PCT -gt 70 ]]; then
        echo "⚠️ WARN: Disk usage at ${USAGE_PCT}%"
        inc_w
    else
        echo "✅ Disk usage at ${USAGE_PCT}%"
        inc_o
    fi
else
    echo "⚠️ WARN: Could not determine disk usage"
    inc_w
fi

echo ""
echo "--- Large files (>100MB) created in last 24h ---"
LARGE_FILES=$(find "$HOME" /tmp /var -maxdepth 4 -mtime -1 -size +100M -type f 2>/dev/null | head -n 20) || true
if [[ -n "$LARGE_FILES" ]]; then
    echo "$LARGE_FILES"
    echo "⚠️ WARN: Large files detected"
    inc_w
else
    echo "✅ No large files (>100MB) created in last 24h"
    inc_o
fi

# =============================================================
# [10] Gateway Environment Variables
# =============================================================
header 10 "Gateway Environment Variables"

GW_PID=$(pgrep -f "openclaw.*gateway\|node.*openclaw" 2>/dev/null | head -1) || true
if [[ -n "$GW_PID" ]]; then
    echo "Gateway PID: $GW_PID"
    ENV_SENSITIVE=$(sudo cat "/proc/$GW_PID/environ" 2>/dev/null \
        | tr '\0' '\n' \
        | grep -iE "KEY|TOKEN|SECRET|PASSWORD|API" \
        | sed 's/=.*/=***REDACTED***/' \
        | sort) || true
    if [[ -n "$ENV_SENSITIVE" ]]; then
        FILTERED=$(echo "$ENV_SENSITIVE" | filter_known_issues "gateway_env")
        echo "$FILTERED"
        REAL=$(echo "$FILTERED" | count_real_issues)
        if [[ "$REAL" -gt 0 ]]; then
            echo "⚠️ WARN: Review sensitive env vars above (${REAL} unrecognized)"
            inc_w
        else
            echo "✅ All sensitive env vars match known whitelist"
            inc_o
        fi
    else
        echo "✅ No sensitive env vars detected (or process not readable)"
        inc_o
    fi
else
    # Try alternative: systemd service
    GW_PID2=$(systemctl --user show openclaw-gateway -p MainPID --value 2>/dev/null) || true
    if [[ -n "$GW_PID2" ]] && [[ "$GW_PID2" != "0" ]]; then
        echo "Gateway PID (systemd): $GW_PID2"
        echo "(env check skipped — rerun with sudo if needed)"
        inc_o
    else
        echo "⚠️ WARN: Gateway process not found"
        inc_w
    fi
fi

# =============================================================
# [11] DLP Scan (Plaintext Keys/Credentials)
# =============================================================
header 11 "DLP Scan (Plaintext Keys/Credentials)"

DLP_HITS_FILE=$(mktemp)
SCAN_DIRS=("$OC/workspace")

for dir in "${SCAN_DIRS[@]}"; do
    [[ ! -d "$dir" ]] && continue
    # Private key headers
    grep -rl "BEGIN.*PRIVATE KEY" "$dir" \
        --include="*.md" --include="*.txt" --include="*.json" \
        --include="*.log" --include="*.yaml" --include="*.yml" \
        --include="*.env" --include="*.conf" \
        2>/dev/null | grep -vE "node_modules|advisories/|\.git/" \
        >> "$DLP_HITS_FILE" || true

    # Ethereum-style hex private keys (0x + 64 hex chars)
    grep -rlE "0x[a-fA-F0-9]{64}" "$dir" \
        --include="*.md" --include="*.txt" --include="*.json" \
        --include="*.log" --include="*.yaml" --include="*.yml" \
        --include="*.env" --include="*.conf" \
        2>/dev/null | grep -vE "node_modules|advisories/|\.git/|example|test" \
        >> "$DLP_HITS_FILE" || true

    # Mnemonic-like patterns (12+ lowercase words on one line)
    grep -rlE "^(\s*[a-z]{3,10}\s+){11,}[a-z]{3,10}\s*$" "$dir" \
        --include="*.md" --include="*.txt" --include="*.json" \
        --include="*.log" --include="*.env" \
        2>/dev/null | grep -vE "node_modules|advisories/|\.git/|example|test" \
        >> "$DLP_HITS_FILE" || true
done

# Deduplicate
DLP_UNIQUE=$(sort -u "$DLP_HITS_FILE") || true
rm -f "$DLP_HITS_FILE"

if [[ -n "$DLP_UNIQUE" ]]; then
    echo "Files with potential credential patterns:"
    FILTERED_DLP=$(echo "$DLP_UNIQUE" | filter_known_issues "dlp_scan")
    echo "$FILTERED_DLP"
    REAL_DLP=$(echo "$FILTERED_DLP" | count_real_issues)
    if [[ "$REAL_DLP" -gt 0 ]]; then
        echo "🚨 CRITICAL: Potential plaintext credentials in ${REAL_DLP} file(s)!"
        echo "(Values NOT printed for safety — inspect files manually)"
        inc_c
    else
        echo "✅ All DLP matches are known/excluded"
        inc_o
    fi
else
    echo "✅ No plaintext private keys or credential patterns detected"
    inc_o
fi

# =============================================================
# [12] Skill/MCP Integrity
# =============================================================
header 12 "Skill/MCP Integrity"

SKILL_DIR="$OC/workspace/skills"
if [[ -d "$SKILL_DIR" ]] && [[ -n "$(ls -A "$SKILL_DIR" 2>/dev/null)" ]]; then
    CURRENT_HASH=$(find "$SKILL_DIR" -type f -not -path '*/.git/*' \
        -exec sha256sum {} \; 2>/dev/null | sort | sha256sum | awk '{print $1}')
    echo "Current aggregated hash: ${CURRENT_HASH:0:16}..."

    if [[ -f "$BASELINE_SKILL" ]]; then
        BASELINE_HASH=$(awk '{print $1}' "$BASELINE_SKILL")
        echo "Baseline hash:          ${BASELINE_HASH:0:16}..."
        if [[ "$CURRENT_HASH" == "$BASELINE_HASH" ]]; then
            echo "✅ Skill/MCP integrity verified — no changes"
            inc_o
        else
            echo "🚨 CRITICAL: Skill/MCP files changed since last baseline!"
            find "$SKILL_DIR" -type f -not -path '*/.git/*' -mtime -1 2>/dev/null | head -n 20
            inc_c
        fi
    else
        echo "⚠️ WARN: No skill baseline at $BASELINE_SKILL"
        echo "  Generate with: find \$SKILL_DIR -type f -not -path '*/.git/*' -exec sha256sum {} \\; | sort | sha256sum > $BASELINE_SKILL"
        inc_w
    fi
else
    echo "✅ No skills installed (directory empty or not found)"
    inc_o
fi

# =============================================================
# [13] Brain Backup (Git Sync)
# =============================================================
header 13 "Brain Backup (Git Sync)"

if (cd "$OC" 2>/dev/null && git rev-parse --is-inside-work-tree &>/dev/null); then
    echo "Git repo: $OC"
    REMOTE_INFO=$(cd "$OC" && git remote -v 2>/dev/null | head -n 2) || true
    if [[ -n "$REMOTE_INFO" ]]; then
        echo "$REMOTE_INFO"
        cd "$OC"
        git add -A 2>/dev/null || true
        CHANGES=$(git diff --cached --stat 2>/dev/null) || true
        if [[ -n "$CHANGES" ]]; then
            echo "Changes:"
            echo "$CHANGES" | head -n 20
            COMMIT_OUT=$(git commit -m "nightly-audit: auto-backup $(date '+%Y-%m-%d')" 2>&1) || true
            echo "$COMMIT_OUT" | tail -n 3
            PUSH_OUT=$(git push 2>&1) || true
            if echo "$PUSH_OUT" | grep -qiE "error|fatal|reject"; then
                echo "⚠️ WARN: Git push failed"
                echo "$PUSH_OUT" | tail -n 5
                inc_w
            else
                echo "✅ Brain backup pushed successfully"
                inc_o
            fi
        else
            echo "✅ No changes to backup (repo is clean)"
            inc_o
        fi
    else
        echo "⚠️ WARN: Git repo exists but no remote configured"
        inc_w
    fi
else
    echo "⚠️ Brain backup not configured (no git repo in $OC)"
    echo "  (Optional — setup: cd $OC && git init && git remote add origin <url>)"
    inc_w
fi

# =============================================================
# Summary
# =============================================================
echo ""
echo "============================================="
echo "  Summary: $CRITICAL critical · $WARN warn · $OK_COUNT ok"
echo "  Report : $REPORT_FILE"
echo "============================================="

# --- Report rotation: keep last 30 days ---
find "$REPORT_DIR" -name "audit-*.txt" -mtime +30 -delete 2>/dev/null || true

# Wait for tee process to finish writing
sleep 1
