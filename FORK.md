# Fork 유지보수

## 원격 및 브랜치 구조

- **원격**: `origin`은 upstream `getpaseo/paseo`, `fork`는 `ruuuuubyist/paseo`입니다.
- **`main`**: `origin/main`을 `--ff-only`로 반영하는 미러입니다. fork 전용 커밋은 넣지 않습니다.
- **`downstream/main`**: fork 전용 작업을 통합하는 장기 브랜치입니다. 작업 PR은 squash merge로 통합합니다(merge commit으로 통합하면 rebase 때 충돌을 다시 해결해야 합니다). force push는 통합 담당자만 합니다.
- **`feat/*`**: `downstream/main`에서 분기합니다. upstream에 기여할 변경은 `origin/main`에서 분기해 `getpaseo/paseo`에 PR을 엽니다.

## PR 생성

- **GitHub 웹**: fork 브랜치 PR 생성 시 base 저장소가 기본적으로 upstream으로 지정되므로, base를 `ruuuuubyist/paseo`의 `downstream/main`으로 변경합니다.
- **`gh` CLI**: 최초 1회 기본 저장소를 설정한 후 생성합니다.

```bash
gh repo set-default ruuuuubyist/paseo
gh pr create --base downstream/main
```

## upstream 갱신 절차

GitHub에서 머지된 PR은 `fork/downstream/main`에만 있으므로 rebase 전에 `--ff-only`로 반영합니다. `--force-with-lease`만 쓰면 fetch 후 로컬에 반영하지 않은 머지 커밋을 덮어쓸 수 있으므로 `--force-if-includes`를 함께 지정합니다.

```bash
git fetch origin main
git fetch fork

git switch main
git merge --ff-only origin/main
git push fork main

git switch downstream/main
git merge --ff-only fork/downstream/main
git rebase origin/main
npm run typecheck
npm run lint
git push --force-with-lease --force-if-includes fork downstream/main
```

## 열린 작업 브랜치 이동

`downstream/main`을 base로 하는 열린 PR 브랜치를 새 `downstream/main` 위로 옮깁니다. 옮기지 않으면 PR diff에 rebase 이전 커밋이 섞입니다.

로컬 git 기록으로 각 PR의 분기점을 찾아 PR 고유 커밋만 이동합니다. 다른 worktree에서 체크아웃된 브랜치와 push하지 않은 로컬 커밋이 있는 브랜치는 건너뜁니다. rebase 충돌이나 push 거절이 발생한 브랜치는 수동으로 해결합니다.

```bash
git fetch fork

gh pr list --repo ruuuuubyist/paseo --base downstream/main --state open \
  --json headRefName,isCrossRepository \
  --jq '.[] | select(.isCrossRepository == false) | .headRefName' | \
while read -r branch; do
  [ -z "$branch" ] && continue

  if git worktree list --porcelain | grep -Fxq "branch refs/heads/$branch"; then
    echo "건너뜀 (worktree에서 사용 중): $branch"
    continue
  fi

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    if [ "$(git rev-list --count "fork/$branch..$branch" 2>/dev/null)" -gt 0 ]; then
      echo "건너뜀 (push하지 않은 로컬 커밋 있음): $branch"
      continue
    fi
  fi

  git branch -f "$branch" "fork/$branch"

  base=$(git merge-base --fork-point fork/downstream/main "$branch" 2>/dev/null)
  if [ -z "$base" ]; then
    echo "분기점 확인 실패 (수동 해결 필요): $branch"
    continue
  fi

  if ! git rebase --onto downstream/main "$base" "$branch"; then
    git rebase --abort
    echo "rebase 실패 (수동 해결 필요): $branch"
    continue
  fi

  if ! git push --force-with-lease --force-if-includes fork "$branch"; then
    echo "push 실패 (수동 해결 필요): $branch"
    continue
  fi
done

git switch downstream/main
```
